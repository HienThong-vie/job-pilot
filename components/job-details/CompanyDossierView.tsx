import { ExternalLink } from "lucide-react";

import { DossierList } from "@/components/job-details/DossierList";
import type { CompanyDossier } from "@/types";

type Props = {
  dossier: CompanyDossier;
};

const HEADING = "text-xs/4 font-semibold tracking-wider text-text-secondary uppercase";
const PARAGRAPH = "mt-2 text-[15px]/[23px] text-text-primary";

/** Hostname and path, without the scheme — what a person reads a link as. */
const sourceLabel = (url: string): string => {
  try {
    const { hostname, pathname } = new URL(url);
    return `${hostname}${pathname === "/" ? "" : pathname}`;
  } catch {
    return url;
  }
};

export function CompanyDossierView({ dossier }: Props) {
  return (
    <div className="flex flex-col gap-6 px-6 py-6">
      <div>
        <h3 className={HEADING}>Company Overview</h3>
        <p className={PARAGRAPH}>{dossier.companyOverview}</p>
      </div>

      <div>
        <h3 className={HEADING}>Tech Stack</h3>
        {dossier.techStack.length > 0 ? (
          <ul className="mt-2 flex flex-wrap gap-2">
            {dossier.techStack.map((tech) => (
              <li
                key={tech}
                className="rounded-full bg-info-lightest px-3 py-1 text-[13px]/4 font-medium text-info-dark"
              >
                {tech}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-text-muted">
            The company&apos;s site and the posting name no specific technologies.
          </p>
        )}
      </div>

      <div>
        <h3 className={HEADING}>Culture</h3>
        <DossierList items={dossier.culture} empty="Nothing stated about how the team works." />
      </div>

      <div>
        <h3 className={HEADING}>Why This Role</h3>
        <p className={PARAGRAPH}>{dossier.whyThisRole}</p>
      </div>

      {/* The part written for this candidate alone — set apart from the
          company facts around it. */}
      <div className="rounded-xl border border-success-light bg-success-lightest p-4">
        <h3 className="text-xs/4 font-semibold tracking-wider text-success-dark uppercase">
          Your Edge
        </h3>
        <DossierList items={dossier.yourEdge} empty="No specific links to your profile were found." />
      </div>

      <div>
        <h3 className={HEADING}>Gaps to Address</h3>
        <DossierList items={dossier.gapsToAddress} empty="No gaps to prepare for." />
      </div>

      <div>
        <h3 className={HEADING}>Smart Questions</h3>
        <DossierList items={dossier.smartQuestions} empty="No questions suggested." />
      </div>

      <div>
        <h3 className={HEADING}>Interview Prep</h3>
        <DossierList items={dossier.interviewPrep} empty="No prep topics suggested." />
      </div>

      <div className="border-t border-border pt-4">
        <h3 className="text-xs/4 font-medium text-text-muted">Sources</h3>
        {dossier.sources.length > 0 ? (
          <ul className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
            {dossier.sources.map((url) => (
              <li key={url}>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-text-secondary underline-offset-2 hover:underline"
                >
                  {sourceLabel(url)}
                  <ExternalLink aria-hidden="true" className="size-3" />
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1.5 text-xs text-text-muted">
            The company&apos;s website could not be read, so this briefing is
            based on the job posting and your profile.
          </p>
        )}
      </div>
    </div>
  );
}
