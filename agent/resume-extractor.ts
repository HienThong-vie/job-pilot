import type { InsForgeClient } from "@insforge/sdk";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { PDFParse } from "pdf-parse";

import { createOpenAI, GPT_4O } from "@/lib/openai";
import { DEGREES, EXPERIENCE_LEVELS } from "@/lib/profile-options";
import {
  extractedProfileSchema,
  normalizeExtracted,
  type ExtractedProfile,
} from "@/lib/resume-extraction";
import {
  MAX_OCR_PAGES,
  MAX_RESUME_TEXT_LENGTH,
  MIN_RESUME_TEXT_LENGTH,
  MIN_SCAN_IMAGE_PIXELS,
  RESUME_EXTRACTION_ERROR,
  RESUME_TEXT_ERROR,
} from "@/lib/utils";

export type ExtractionResult =
  | { success: true; data: ExtractedProfile }
  | { success: false; error: string };

const TOO_LONG_ERROR =
  "That resume was too long to read in one pass. Try a shorter version.";

/**
 * `library-docs.md` budgets 800 output tokens for this call. The prompt holds
 * the response inside it by capping each role's responsibilities at a sentence
 * — without that cap three roles alone would overrun, and a truncated
 * json_object response fails to parse, which reads to the user as a broken
 * resume rather than a budget we set too low.
 */
const MAX_TOKENS = 800;

const list = (values: readonly string[]): string => values.join(" | ");

const SYSTEM_PROMPT = `You extract structured profile data from a resume. Return only valid JSON.

Return an object with exactly these keys:

- full_name: string
- phone: string
- location: string — "City, Country" or "City, State"
- linkedin_url: string
- portfolio_url: string — personal site or GitHub
- current_title: string — the most recent job title
- experience_level: one of ${list(EXPERIENCE_LEVELS)}
- years_experience: integer — total years of professional experience
- skills: array of strings — technologies and tools, one per entry
- industries: array of strings — the sectors worked in
- work_experience: array of at most 3 objects, most recent first, each with:
    company: string
    title: string
    start_date: string — "YYYY-MM"
    end_date: string — "YYYY-MM", or "" if the role is current
    is_current: boolean
    responsibilities: string — ONE sentence, at most 200 characters
- education: object with:
    degree: one of ${list(DEGREES)}
    field: string — field of study
    institution: string
    graduation_year: string — "YYYY"

Rules:
- Use "" for any string and null for any number the resume does not state. Never guess.
- Dates must be "YYYY-MM". If a resume gives only a year, use month 01.
- responsibilities is one sentence per role. Never a list, never a paragraph.
- Return at most 3 roles even if the resume lists more. Keep the most recent.`;

/**
 * Reads the PDF already in storage and returns what GPT-4o found in it.
 *
 * Takes the InsForge client rather than creating one so nothing in `agent/`
 * depends on `next/headers` — the caller is holding a client for the session
 * check anyway.
 */
export async function extractProfileFromResume(
  insforge: InsForgeClient,
  resumeKey: string,
): Promise<ExtractionResult> {
  try {
    const openai = createOpenAI();
    if (!openai) {
      console.error("[agent/resume-extractor] OPENROUTER_API_KEY is not set");
      return { success: false, error: RESUME_EXTRACTION_ERROR };
    }

    // Read the object directly. A signed URL would be a round trip to mint a
    // credential for a fetch this process is already authorised to make.
    const { data: file, error: downloadError } = await insforge.storage
      .from("resumes")
      .download(resumeKey);

    if (downloadError || !file) {
      console.error("[agent/resume-extractor] download", downloadError);
      return { success: false, error: RESUME_EXTRACTION_ERROR };
    }

    const { text, pageImages } = await readPdf(await file.arrayBuffer());

    // An image-only PDF parses without error and yields no text at all, so a
    // short result is the only signal that there was no text layer. Logged
    // because this is the one failure a real user hits and reports, and without
    // the character count there is nothing on the server to diagnose it from.
    const isScan = text.length < MIN_RESUME_TEXT_LENGTH;

    if (isScan && pageImages.length === 0) {
      console.error(
        `[agent/resume-extractor] unreadable: ${text.length} characters (minimum ${MIN_RESUME_TEXT_LENGTH}) and no page image`,
      );
      return { success: false, error: RESUME_TEXT_ERROR };
    }

    if (isScan) {
      console.warn(
        `[agent/resume-extractor] no text layer, reading ${pageImages.length} page image(s) instead`,
      );
    }

    const response = await openai.chat.completions.create({
      model: GPT_4O,
      response_format: { type: "json_object" },
      temperature: 0.3,
      max_tokens: MAX_TOKENS,
      messages: isScan
        ? scanMessages(pageImages)
        : [
            { role: "system", content: SYSTEM_PROMPT },
            { role: "user", content: text.slice(0, MAX_RESUME_TEXT_LENGTH) },
          ],
    });

    const choice = response.choices[0];

    // Without this the same failure arrives as a JSON.parse error, and a
    // budget we set too low would be reported as a malformed response.
    if (choice?.finish_reason === "length") {
      console.error("[agent/resume-extractor] response truncated at max_tokens");
      return { success: false, error: TOO_LONG_ERROR };
    }

    const content = choice?.message.content;
    if (!content) {
      console.error("[agent/resume-extractor] empty completion");
      return { success: false, error: RESUME_EXTRACTION_ERROR };
    }

    const parsed = extractedProfileSchema.safeParse(
      normalizeExtracted(JSON.parse(content)),
    );

    if (!parsed.success) {
      console.error("[agent/resume-extractor] schema", parsed.error);
      return { success: false, error: RESUME_EXTRACTION_ERROR };
    }

    return { success: true, data: parsed.data };
  } catch (error) {
    console.error("[agent/resume-extractor] extractProfileFromResume", error);
    return { success: false, error: RESUME_EXTRACTION_ERROR };
  }
}

/**
 * The same prompt, but the resume arrives as pictures of pages. GPT-4o is
 * multimodal, so a scan needs no OCR dependency — the model that structures the
 * text is the one that reads it off the page.
 */
const scanMessages = (pageImages: string[]): ChatCompletionMessageParam[] => [
  { role: "system", content: SYSTEM_PROMPT },
  {
    role: "user",
    content: [
      {
        type: "text",
        text: "This resume has no text layer. Read it from the page images and return the JSON.",
      },
      ...pageImages.map((url) => ({
        type: "image_url" as const,
        image_url: { url },
      })),
    ],
  },
];

type PdfContent = {
  text: string;
  /** Data URLs of the page images, empty unless there is no text layer. */
  pageImages: string[];
};

/**
 * pdf-parse 2.x is a class holding a pdf.js document, not the single call the
 * 1.x API was — the document has to be destroyed or the worker it opened stays
 * alive for the life of the process. Text and images come off the same open
 * document rather than parsing the file twice.
 *
 * Images are only pulled when there is no text to read — a normal resume never
 * needs them. `getScreenshot` would rasterise any page, but it needs a canvas
 * Node does not have; embedded images are exactly what a scan-to-PDF produces.
 *
 * The text is joined from `pages` rather than read off `result.text`, which
 * interleaves a "-- 1 of 20 --" marker per page. Those markers are text as far
 * as a length check is concerned: a 20-page scan with no text layer at all
 * produces ~350 characters of them, clears MIN_RESUME_TEXT_LENGTH, and sends
 * pure page numbers to GPT-4o to invent a profile from. `pages[].text` carries
 * only what was actually on the page.
 */
async function readPdf(bytes: ArrayBuffer): Promise<PdfContent> {
  const parser = new PDFParse({ data: new Uint8Array(bytes) });

  try {
    const result = await parser.getText();
    const text = result.pages
      .map((page) => page.text)
      .join("\n")
      .trim();

    if (text.length >= MIN_RESUME_TEXT_LENGTH) return { text, pageImages: [] };

    const images = await parser.getImage({
      imageDataUrl: true,
      imageBuffer: false,
      imageThreshold: MIN_SCAN_IMAGE_PIXELS,
      last: MAX_OCR_PAGES,
    });

    // One image per page, the largest — a scanned page is a single full-page
    // image, and anything alongside it is decoration.
    const pageImages = images.pages
      .flatMap((page) => {
        const largest = [...page.images]
          .filter((image) => image.dataUrl)
          .sort(
            (left, right) =>
              right.width * right.height - left.width * left.height,
          )[0];
        return largest ? [largest.dataUrl] : [];
      })
      .slice(0, MAX_OCR_PAGES);

    return { text, pageImages };
  } finally {
    await parser.destroy();
  }
}
