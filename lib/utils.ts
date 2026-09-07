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
