import { z } from "zod";

import { MAX_DOSSIER_ITEMS, MAX_TECH_STACK_ITEMS } from "@/lib/utils";
import type { CompanyDossier } from "@/types";

/**
 * Trimmed, blank entries dropped, duplicates removed, capped. A list the model
 * overfilled is cut rather than rejected — the first items are its best ones.
 */
const list = (max: number) =>
  z
    .array(z.unknown())
    .catch([])
    .transform((items) => [
      ...new Set(
        items
          .filter((item): item is string => typeof item === "string")
          .map((item) => item.trim())
          .filter((item) => item.length > 0),
      ),
    ].slice(0, max));

/**
 * The dossier's shape — used to validate GPT-4o's synthesis before it is
 * saved, and the stored jsonb before the page renders it. The two paragraphs
 * are required: a dossier without them is not one.
 */
export const companyDossierSchema = z.object({
  companyOverview: z.string().trim().min(1),
  techStack: list(MAX_TECH_STACK_ITEMS),
  culture: list(MAX_DOSSIER_ITEMS),
  whyThisRole: z.string().trim().min(1),
  yourEdge: list(MAX_DOSSIER_ITEMS),
  gapsToAddress: list(MAX_DOSSIER_ITEMS),
  smartQuestions: list(MAX_DOSSIER_ITEMS),
  interviewPrep: list(MAX_DOSSIER_ITEMS),
  sources: list(MAX_DOSSIER_ITEMS),
}) satisfies z.ZodType<CompanyDossier, unknown>;
