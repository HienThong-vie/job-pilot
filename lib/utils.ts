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
 * The original wording was "Could not extract text from this PDF", which
 * was both less accurate and less actionable.
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
 * The spec calls for a *single-page* PDF. @react-pdf/renderer does not
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
 * Scoring runs in parallel, so the slowest single call sets the search's wait.
 * A score measured 3-8 seconds; 20 is a hung call, not a slow one. With the
 * Adzuna timeout (10s) this bounds a search at about 30 seconds plus database
 * writes — inside the route's `maxDuration` and the "under a minute" the UI
 * promises.
 */
export const JOB_SCORE_TIMEOUT_MS = 20_000;

/**
 * The dashboard waits on this before it paints. PostHog caps a query's own
 * execution at 10 seconds, so 12 covers a query that runs to that cap plus the
 * round trip; past it the charts say "unavailable" rather than hold the page.
 */
export const POSTHOG_QUERY_TIMEOUT_MS = 12_000;

/**
 * The generate and find routes refuse an incomplete profile before it reaches
 * GPT-4o — a blank profile would spend model calls producing an empty PDF or
 * scores that mean nothing. The gate is `getProfileCompletion().isComplete`,
 * the same ten fields the completion ring and the attention banner already use,
 * so the missing field labels it hands back are the ones the user has seen.
 */
export const profileIncompleteError = (
  missingFields: string[],
  action: string,
): string =>
  `Complete your profile before ${action}. Still missing: ${missingFields.join(", ")}.`;

/**
 * A job at or above this score is a "strong match". Feature 11's High / Low
 * Match filters split on it too, so it is defined once here.
 */
export const MATCH_THRESHOLD = 70;

/**
 * Adzuna syndicates one posting under many ad ids — one employer's listing
 * repeated city by city filled a whole page of 10 in feature 10's testing. So a
 * search asks for a deep page (still one request against the quota), collapses
 * the copies, and scores at most MAX_SCORED_PER_SEARCH of what is left. The
 * second number is the ceiling on GPT-4o calls per Find Jobs press.
 */
export const ADZUNA_RESULTS_PER_PAGE = 50;
export const MAX_SCORED_PER_SEARCH = 10;

/** The Find Jobs table's page size. */
export const JOBS_PAGE_SIZE = 20;

export const JOB_SEARCH_ERROR =
  "Could not search for jobs right now. Please try again.";

/**
 * Company research limits. One Browserbase session visits
 * the homepage and at most MAX_RESEARCH_SUBPAGES more, and ends itself after
 * RESEARCH_SESSION_SECONDS even if our `close()` never runs. Each page gets
 * RESEARCH_PAGE_TIMEOUT_MS to load, so four slow pages still fit the session.
 *
 * Page text is cut at MAX_RESEARCH_PAGE_TEXT before it reaches GPT-4o: the
 * opening of a page says what it is about, and the rest is input tokens paid
 * for footers and legal copy.
 */
export const RESEARCH_SESSION_SECONDS = 120;
export const RESEARCH_PAGE_TIMEOUT_MS = 20_000;
export const MAX_RESEARCH_SUBPAGES = 3;
export const MAX_RESEARCH_PAGE_TEXT = 12_000;

/**
 * The research route's time budget. Every step is bounded, so the worst case
 * fits the route's `maxDuration` of 240 seconds:
 *
 *   redirect 5 + search 8 + extension upload wait 45 + launch 20
 *   + browsing 60 (+ one page started at the deadline, 21.5)
 *   + last extraction 20 + synthesis 45 = 224.5, plus the save and the flush.
 *
 * Measured 2026-10-10: the extension upload took 25 to 45 seconds, and is
 * normally already done by the time a research starts (`instrumentation.ts`
 * uploads it at boot). A launch reusing it took 5 to 7 seconds. A typical run
 * with the extension ready is about a minute.
 *
 * Research model calls get one attempt each. A retry would double a timeout
 * the budget cannot afford, and a failed page extraction only costs that page.
 */
export const RESEARCH_REDIRECT_TIMEOUT_MS = 5_000;
export const RESEARCH_SEARCH_TIMEOUT_MS = 8_000;
/** How long a research waits for the boot-time extension upload to finish. */
export const RESEARCH_EXTENSION_TIMEOUT_MS = 45_000;
export const RESEARCH_LAUNCH_TIMEOUT_MS = 20_000;
/** Counted from when the session is open. No new page is opened after it. */
export const RESEARCH_BROWSE_BUDGET_MS = 60_000;
export const RESEARCH_EXTRACT_TIMEOUT_MS = 20_000;
export const RESEARCH_SYNTHESIS_TIMEOUT_MS = 45_000;

/** The longest list in a dossier — the prompt asks for it and Zod enforces it. */
export const MAX_DOSSIER_ITEMS = 5;
/** Tech stack entries are single names, not sentences, so more of them fit. */
export const MAX_TECH_STACK_ITEMS = 12;

export const RESEARCH_ERROR =
  "Could not research this company right now. Please try again.";

/**
 * A re-run that could not reach the company's website keeps the earlier,
 * website-backed dossier rather than replacing it with a thinner one.
 */
/**
 * OpenRouter answers 402 when the account cannot pay for the request. Nothing
 * the user retries will change that, so it gets its own message instead of
 * RESEARCH_ERROR's "try again".
 */
export const RESEARCH_AI_UNAVAILABLE_ERROR =
  "Company research is unavailable: the AI service has run out of credits.";

export const RESEARCH_KEPT_ERROR =
  "Could not reach the company's website this time, so your earlier research was kept. Please try again later.";

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
