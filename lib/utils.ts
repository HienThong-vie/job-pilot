/**
 * Resume upload limits. Shared because both sides need them: `ResumeUpload`
 * rejects an oversized file before it is ever sent — Next refuses a Server
 * Action body over `serverActions.bodySizeLimit` before the action runs, which
 * would otherwise surface as a framework error page instead of our message —
 * and `uploadResume` re-checks because the client is not a security boundary.
 */
export const RESUME_MIME_TYPE = "application/pdf";
export const MAX_RESUME_BYTES = 5 * 1024 * 1024;

export const RESUME_TYPE_ERROR = "Only PDF files can be uploaded.";
export const RESUME_SIZE_ERROR = "That file is larger than the 5MB limit.";
export const RESUME_MISSING_ERROR = "Choose a PDF to upload.";
export const RESUME_EMPTY_ERROR = "That file is empty.";

/**
 * Resume text extraction limits, used by `agent/resume-extractor.ts`.
 *
 * A PDF that is a scan rather than a document parses without error and yields
 * almost nothing, so "short" is the only signal we get that there was no text
 * layer to read. 200 characters is below any real resume and well above the
 * stray header an image-only file leaves behind.
 *
 * The cap is on the other side of the same problem: a 5MB PDF is an unbounded
 * input-token bill. 12,000 characters is roughly four pages, past which a
 * resume has stopped saying anything new about the person.
 */
export const MIN_RESUME_TEXT_LENGTH = 200;
export const MAX_RESUME_TEXT_LENGTH = 12_000;

/**
 * Reached only when a PDF has neither a text layer nor a page image big enough
 * to read — a scan now falls back to GPT-4o's vision instead of failing here.
 * `build-plan.md` 07 words this "Could not extract text from this PDF", which
 * was both less accurate and less actionable; a deliberate departure recorded
 * in `progress-tracker.md`.
 */
export const RESUME_TEXT_ERROR =
  "We could not read any text or images from this PDF. Please try a different file.";

/**
 * A scanned resume has no text layer, so the page itself is read as an image by
 * the same GPT-4o call. Two pages is the cap: a resume's third page is almost
 * never new information about the person, and each page costs both vision
 * tokens and about a megabyte of request body.
 *
 * The pixel floor keeps logos, headshots and signature images out of it — an
 * embedded image narrower or shorter than this is decoration, not a page.
 */
export const MAX_OCR_PAGES = 2;
export const MIN_SCAN_IMAGE_PIXELS = 600;
export const RESUME_NOT_UPLOADED_ERROR =
  "Upload a resume before extracting your profile from it.";
export const RESUME_EXTRACTION_ERROR =
  "Could not read your resume. Please try again.";

/**
 * Shown wherever the access token has aged out mid-session. Shared because the
 * profile actions, the extract route and the button that calls it all have to
 * say the same thing when it happens.
 */
export const SESSION_EXPIRED_ERROR =
  "Your session has expired. Please sign in again.";

/**
 * Resume generation limits, used by `agent/resume-writer.ts` to bound GPT-4o's
 * prose and by `components/pdf/ResumeDocument.tsx` to bound what it renders.
 *
 * `build-plan.md` 08 asks for a *single-page* PDF. @react-pdf/renderer does not
 * enforce that — it flows silently onto page two — so the page is kept to one
 * by limiting what can go on it. Three roles (MAX_ROLES) at three bullets each,
 * a short summary and one line of skills is about three quarters of an A4 page
 * at these font sizes, which leaves room for a long name or a third industry.
 *
 * The bullet limit is generous on purpose: a bullet is prose, and cutting one
 * mid-clause reads worse than letting it run to two lines.
 */
export const MAX_BULLETS_PER_ROLE = 3;
export const MAX_BULLET_LENGTH = 180;
export const MAX_SUMMARY_LENGTH = 600;
export const MAX_PDF_SKILLS = 18;

export const RESUME_GENERATION_ERROR =
  "Could not generate your resume. Please try again.";

export const RESUME_NO_ROLES_ERROR =
  "Add a job title or company to your work experience before generating a resume.";

/**
 * Timeouts for the OpenRouter calls. Without one the SDK waits indefinitely and
 * a hung upstream leaves the button spinning with no way out but a reload.
 *
 * The client default has to cover the extractor's vision pass, which reads a
 * scanned resume off page images and measured around 23 seconds in feature 07's
 * verification — hence the wide ceiling. Writing prose is a five-second call, so
 * `agent/resume-writer.ts` passes the tighter per-request value.
 *
 * Retries multiply these: the SDK defaults to 2, so `lib/openai.ts` pins it to 1
 * to keep the worst case bounded.
 */
export const OPENAI_TIMEOUT_MS = 60_000;
export const RESUME_WRITE_TIMEOUT_MS = 30_000;

/**
 * The generate route refuses an incomplete profile before it reaches GPT-4o —
 * a blank profile would spend a model call producing an empty PDF. The gate is
 * `getProfileCompletion().isComplete`, the same ten fields the completion ring
 * and the attention banner already use, so the missing field labels it hands
 * back are the ones the user is already looking at.
 */
export const profileIncompleteError = (missingFields: string[]): string =>
  `Complete your profile before generating a resume. Still missing: ${missingFields.join(", ")}.`;

/**
 * Profile field limits. Shared because three layers have to agree on them: the
 * Zod schema in `lib/profile-form.ts` enforces them, `WorkExperienceList`
 * decides when to stop offering "Add role", and `lib/resume-extraction.ts`
 * trims GPT-4o's output to fit before validating it.
 *
 * They were previously written out separately in each place, which meant the
 * form could offer a fourth role the schema would then reject.
 */
export const MAX_ROLES = 3;
export const MAX_TAGS = 50;
export const MAX_TAG_LENGTH = 60;
export const MAX_FIELD_LENGTH = 200;
export const MAX_PHONE_LENGTH = 50;
export const MAX_RESPONSIBILITIES_LENGTH = 2000;
