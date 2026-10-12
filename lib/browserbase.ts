import { createReadStream, existsSync } from "node:fs";
import path from "node:path";

import Browserbase from "@browserbasehq/sdk";
import {
  browserbase,
  Stagehand,
  type Page,
  type StagehandBrowser,
} from "@browserbasehq/stagehand";

import {
  MAX_RESEARCH_PAGE_TEXT,
  RESEARCH_EXTENSION_TIMEOUT_MS,
  RESEARCH_LAUNCH_TIMEOUT_MS,
  RESEARCH_PAGE_TIMEOUT_MS,
  RESEARCH_SEARCH_TIMEOUT_MS,
  RESEARCH_SESSION_SECONDS,
} from "@/lib/utils";

/**
 * Stagehand 4 is used as the browser driver only. `browserbase.launch` opens
 * the Browserbase session; `Stagehand.create({ browser })` attaches to it,
 * without which `browser.context` throws. Its `extract()` is not used:
 * Stagehand 4's model config has no `baseURL`, so it cannot reach OpenRouter,
 * and every model call in this project goes through `lib/openai.ts`. The
 * project is inferred from the API key, so no BROWSERBASE_PROJECT_ID is needed.
 */

const apiKey = () => process.env.BROWSERBASE_API_KEY;

export type ResearchSession = {
  page: Page;
  /** Ends the Browserbase session. Safe to call more than once. Never throws. */
  close: () => Promise<void>;
};

/**
 * Rejects after `ms`. Neither `browserbase.launch` nor `browserbase.search`
 * takes an abort signal, so a race is the only way to bound them.
 */
function timeout(ms: number, label: string): Promise<never> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
}

async function closeBrowser(browser: StagehandBrowser): Promise<void> {
  try {
    await browser.close();
  } catch (error) {
    console.error("[lib/browserbase] close", error);
  }
}

/**
 * Stagehand drives the page through a browser extension it ships as a zip.
 * Left to itself, `browserbase.launch` uploads that zip to Browserbase before
 * every session and deletes it after. The upload is the slow part: 25 to 45
 * seconds measured on 2026-10-10 (7 to 9 on 2026-10-05). A launch that reuses
 * an uploaded extension took 5 to 7 seconds.
 *
 * So the extension is uploaded once per server process and its id passed to
 * every launch. `instrumentation.ts` starts the upload at boot, so the first
 * research usually finds it ready. The cache lives on `globalThis` because
 * instrumentation and route handlers are separate bundles, and so it survives
 * dev hot reloads. Stagehand only deletes extensions it uploaded itself, so
 * this one persists; a server restart leaves one behind on Browserbase.
 *
 * The path is the one Stagehand itself reads the zip from
 * (`STAGEHAND_EXTENSION_ARCHIVE_PATH`'s default). The zip and the SDK come
 * from the same install, so their versions always match.
 */
const EXTENSION_ARCHIVE = path.join(
  process.cwd(),
  "node_modules",
  "@browserbasehq",
  "stagehand",
  "dist",
  "assets",
  "stagehand-extension.zip",
);

const extensionCache = globalThis as typeof globalThis & {
  stagehandExtensionUpload?: Promise<string>;
};

/**
 * The uploaded extension's id, uploading it on first call. Null when there is
 * no key or no zip — `openResearchSession` then lets Stagehand upload its own.
 * A failed upload is forgotten, so the next call tries again.
 */
export function prepareStagehandExtension(): Promise<string> | null {
  const key = apiKey();
  if (!key || !existsSync(EXTENSION_ARCHIVE)) return null;

  if (!extensionCache.stagehandExtensionUpload) {
    const upload = new Browserbase({ apiKey: key }).extensions
      .create({ file: createReadStream(EXTENSION_ARCHIVE) })
      .then((extension) => extension.id);
    extensionCache.stagehandExtensionUpload = upload;
    upload.catch((error: unknown) => {
      console.error("[lib/browserbase] extension upload", String(error));
      if (extensionCache.stagehandExtensionUpload === upload) {
        extensionCache.stagehandExtensionUpload = undefined;
      }
    });
  }
  return extensionCache.stagehandExtensionUpload;
}

/** Drops a cached extension id the API no longer accepts. */
function forgetExtension(upload: Promise<string>): void {
  if (extensionCache.stagehandExtensionUpload === upload) {
    extensionCache.stagehandExtensionUpload = undefined;
  }
}

/**
 * One Browserbase session with a page ready to drive, or null when the key is
 * absent — like `createOpenAI()`. With the extension already uploaded, measured
 * 5 to 7 seconds to launch and 7 to 10 to the first page.
 */
export async function openResearchSession(): Promise<ResearchSession | null> {
  const key = apiKey();
  if (!key) return null;

  // Waiting here, not in the launch, keeps the upload alive for the next run
  // if this one gives up on it.
  const upload = prepareStagehandExtension();
  const extensionId = upload
    ? await Promise.race([
        upload,
        timeout(RESEARCH_EXTENSION_TIMEOUT_MS, "Stagehand extension upload"),
      ])
    : undefined;

  // `api_timeout` ends the session on Browserbase's side even if close() never
  // runs — the free plan allows one session at a time.
  const launching = browserbase.launch({
    apiKey: key,
    api_timeout: RESEARCH_SESSION_SECONDS,
    ...(extensionId ? { extensionId } : {}),
  });

  let browser: StagehandBrowser;
  try {
    browser = await Promise.race([
      launching,
      timeout(RESEARCH_LAUNCH_TIMEOUT_MS, "Browserbase launch"),
    ]);
  } catch (error) {
    // A launch that lands after the timeout would hold the plan's only session
    // slot until api_timeout. Close it as soon as it arrives.
    launching.then(closeBrowser, () => undefined);
    // A rejected launch with a cached id may mean the extension is gone on
    // Browserbase's side. Upload a fresh one next time.
    if (upload) launching.catch(() => forgetExtension(upload));
    throw error;
  }

  let stagehand: Stagehand | null = null;
  let closing: Promise<void> | null = null;

  const close = (): Promise<void> => {
    closing ??= (async () => {
      try {
        await stagehand?.close();
      } catch (error) {
        console.error("[lib/browserbase] stagehand close", error);
      }
      await closeBrowser(browser);
    })();
    return closing;
  };

  try {
    stagehand = await Stagehand.create({ browser, logging: { level: "warn" } });
    const page =
      (await browser.context.activePage()) ?? (await browser.context.newPage());
    return { page, close };
  } catch (error) {
    await close();
    throw error;
  }
}

/**
 * Result URLs for a web search, through Browserbase's search API. Used to find
 * a company's own site: Adzuna answers both our server and a Browserbase
 * browser with "Access Denied", so its redirect cannot be followed. Measured
 * about one second. Empty on any failure.
 */
export async function searchWeb(query: string): Promise<string[]> {
  const key = apiKey();
  if (!key) return [];

  try {
    const result = await Promise.race([
      browserbase.search({ query, numResults: 5, apiKey: key }),
      timeout(RESEARCH_SEARCH_TIMEOUT_MS, "Browserbase search"),
    ]);
    return result.results.map((item) => item.url);
  } catch (error) {
    console.error("[lib/browserbase] search", String(error));
    return [];
  }
}

export type PageLink = { url: string; text: string };

export type PageContent = {
  /** Where the browser ended up, after any redirect. */
  url: string;
  title: string;
  text: string;
  links: PageLink[];
};

const MAX_LINKS = 150;

// Runs in the page. A string rather than a function, so nothing depends on how
// the driver serialises closures.
const READ_TEXT = `(() => (document.body ? document.body.innerText : "").replace(/\\n{3,}/g, "\\n\\n").trim())()`;

const READ_LINKS = `(() => Array.from(document.querySelectorAll("a[href]"))
  .map((a) => ({ url: a.href, text: (a.innerText || a.getAttribute("aria-label") || "").trim().slice(0, 80) }))
  .filter((link) => link.url.startsWith("http")))()`;

/** Loads a URL in the session's page and reads its rendered text and links. */
export async function readPage(page: Page, url: string): Promise<PageContent> {
  await page.goto(url, {
    waitUntil: "domcontentloaded",
    timeout: RESEARCH_PAGE_TIMEOUT_MS,
  });
  // Client-rendered sites fill in after DOMContentLoaded. A short settle is
  // cheaper than waiting for network idle, which analytics beacons can delay
  // indefinitely.
  await page.waitForTimeout(1_500);

  const [finalUrl, title, text, links] = await Promise.all([
    page.url(),
    page.title(),
    page.evaluate<string>(READ_TEXT),
    page.evaluate<PageLink[]>(READ_LINKS),
  ]);

  return {
    url: finalUrl,
    title,
    text: typeof text === "string" ? text.slice(0, MAX_RESEARCH_PAGE_TEXT) : "",
    links: Array.isArray(links) ? links.slice(0, MAX_LINKS) : [],
  };
}
