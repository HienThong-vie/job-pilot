import { Building2 } from "lucide-react";

import { CompanyDossierView } from "@/components/job-details/CompanyDossierView";
import { ResearchPanel } from "@/components/job-details/ResearchPanel";
import type { CompanyDossier } from "@/types";

type Props = {
  jobId: string;
  company: string;
  dossier: CompanyDossier | null;
};

export function CompanyResearch({ jobId, company, dossier }: Props) {
  return (
    <ResearchPanel jobId={jobId} company={company} hasDossier={dossier !== null}>
      {dossier ? (
        <CompanyDossierView dossier={dossier} />
      ) : (
        <div className="flex flex-col items-center px-6 py-12 text-center">
          <span
            aria-hidden="true"
            className="flex size-12 items-center justify-center rounded-xl bg-surface-secondary"
          >
            <Building2 className="size-6 text-text-muted" />
          </span>
          <p className="mt-2.5 text-[15px]/6 font-medium text-text-primary">
            No research yet
          </p>
          <p className="mt-0.5 max-w-[320px] text-sm/5 text-text-muted">
            Click “Research Company” to let the AI browse {company}&apos;s public
            pages and build a dossier.
          </p>
        </div>
      )}
    </ResearchPanel>
  );
}
