import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { ApplyButton } from "@/components/job-details/ApplyButton";
import { CompanyResearch } from "@/components/job-details/CompanyResearch";
import { JobDescription } from "@/components/job-details/JobDescription";
import { JobHeader } from "@/components/job-details/JobHeader";
import { JobStats } from "@/components/job-details/JobStats";
import { MatchReasoning } from "@/components/job-details/MatchReasoning";
import { SkillsComparison } from "@/components/job-details/SkillsComparison";
import { getJob } from "@/lib/jobs";

export default async function JobDetailsPage(
  props: PageProps<"/find-jobs/[id]">,
) {
  const { id } = await props.params;
  const result = await getJob(id);

  if (result.status === "unauthenticated") redirect("/login");
  if (result.status === "not_found") notFound();
  // A read failure goes to the segment's error boundary rather than a page
  // that claims the job does not exist.
  if (result.status === "error") {
    throw new Error("Could not load job");
  }

  const { job } = result;

  return (
    <div className="mx-auto flex w-full max-w-[856px] flex-col gap-6 px-4 pt-7 pb-12 sm:px-8">
      <Link
        href="/find-jobs"
        className="flex w-fit items-center gap-2 py-1 text-sm font-medium text-text-secondary"
      >
        <ChevronLeft aria-hidden="true" className="size-4" />
        Back to Jobs
      </Link>
      <JobHeader
        title={job.title}
        company={job.company}
        matchScore={job.match_score}
        viewUrl={job.view_url}
      />
      <JobStats
        salary={job.salary}
        location={job.location}
        jobType={job.job_type_label}
        foundAt={job.found_at_label}
      />
      <MatchReasoning reason={job.match_reason} />
      <SkillsComparison
        matched={job.matched_skills}
        missing={job.missing_skills}
      />
      <JobDescription description={job.description} />
      <CompanyResearch company={job.company} />
      {job.apply_url ? (
        <ApplyButton company={job.company} applyUrl={job.apply_url} />
      ) : null}
    </div>
  );
}
