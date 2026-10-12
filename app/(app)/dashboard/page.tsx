import { redirect } from "next/navigation";

import { ChartCard } from "@/components/dashboard/ChartCard";
import { ChartMessage } from "@/components/dashboard/ChartMessage";
import { JobsFoundChart } from "@/components/dashboard/JobsFoundChart";
import { MatchScoreChart } from "@/components/dashboard/MatchScoreChart";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import { ResearchActivityChart } from "@/components/dashboard/ResearchActivityChart";
import { StatsBar } from "@/components/dashboard/StatsBar";
import { ProfileAttentionBanner } from "@/components/profile/ProfileAttentionBanner";
import { hasChartData } from "@/lib/chart-data";
import { getDashboardCharts } from "@/lib/dashboard-charts";
import { getJobStats } from "@/lib/jobs";
import { MOCK_ACTIVITY } from "@/lib/mock-dashboard";
import { getCurrentProfile } from "@/lib/profile";
import { getProfileCompletion } from "@/lib/profile-completion";

const UNAVAILABLE = "Analytics are unavailable right now.";

export default async function DashboardPage() {
  const [result, statsResult, chartsResult] = await Promise.all([
    getCurrentProfile(),
    getJobStats(),
    getDashboardCharts(),
  ]);

  if (
    result.status === "unauthenticated" ||
    statsResult.status === "unauthenticated" ||
    chartsResult.status === "unauthenticated"
  ) {
    redirect("/login");
  }
  // A read failure goes to the segment's error boundary rather than showing
  // zeros that claim the user has no jobs.
  if (result.status === "error") {
    throw new Error("Could not load profile");
  }
  if (statsResult.status === "error") {
    throw new Error("Could not load dashboard stats");
  }

  const completion = getProfileCompletion(result.profile);
  // Unlike the stats, analytics being down does not throw: the page still has
  // its real numbers, and each chart says why it has nothing to draw.
  const charts = chartsResult.status === "ok" ? chartsResult.charts : null;

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 px-4 py-8 sm:px-8 xl:px-13">
      {!completion.isComplete && <ProfileAttentionBanner completion={completion} />}
      <StatsBar stats={statsResult.stats} />
      <div className="grid gap-6 lg:grid-cols-2">
        <RecentActivity items={MOCK_ACTIVITY} />
        <ChartCard title="Company Research Activity">
          {!charts ? (
            <ChartMessage>{UNAVAILABLE}</ChartMessage>
          ) : hasChartData(charts.research) ? (
            <ResearchActivityChart data={charts.research} />
          ) : (
            <ChartMessage>No companies researched in the last 7 days.</ChartMessage>
          )}
        </ChartCard>
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,2.06fr)_minmax(0,1fr)]">
        <ChartCard title="Jobs Found Over Time">
          {!charts ? (
            <ChartMessage>{UNAVAILABLE}</ChartMessage>
          ) : hasChartData(charts.jobsFound) ? (
            <JobsFoundChart data={charts.jobsFound} />
          ) : (
            <ChartMessage>No jobs found in the last 30 days.</ChartMessage>
          )}
        </ChartCard>
        <ChartCard title="Match Score Distribution">
          {!charts ? (
            <ChartMessage>{UNAVAILABLE}</ChartMessage>
          ) : hasChartData(charts.scores) ? (
            <MatchScoreChart data={charts.scores} />
          ) : (
            <ChartMessage>No scored jobs yet.</ChartMessage>
          )}
        </ChartCard>
      </div>
    </div>
  );
}
