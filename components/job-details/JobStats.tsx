import { DollarSign, Briefcase, Calendar, MapPin } from "lucide-react";
import type { ReactNode } from "react";

import { IconTile } from "@/components/job-details/IconTile";

type Props = {
  salary: string | null;
  location: string | null;
  jobType: string | null;
  foundAt: string;
};

type Stat = {
  label: string;
  value: string | null;
  tone: "green" | "blue" | "purple" | "gray";
  icon: ReactNode;
};

const EMPTY_VALUE = "—";

export function JobStats({ salary, location, jobType, foundAt }: Props) {
  const stats: Stat[] = [
    {
      label: "Salary Est.",
      value: salary ? salary.replace(" - ", " – ") : null,
      tone: "green",
      icon: <DollarSign />,
    },
    { label: "Location", value: location, tone: "blue", icon: <MapPin /> },
    { label: "Job Type", value: jobType, tone: "purple", icon: <Briefcase /> },
    { label: "Date Found", value: foundAt, tone: "gray", icon: <Calendar /> },
  ];

  return (
    <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map(({ label, value, tone, icon }) => (
        <div
          key={label}
          className="flex min-w-0 items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-4 shadow-sm"
        >
          <IconTile tone={tone} size="lg">
            {icon}
          </IconTile>
          <div className="min-w-0">
            <dd className="truncate text-base/6 font-semibold text-text-primary">
              {value ?? EMPTY_VALUE}
            </dd>
            <dt className="text-xs/4 font-medium tracking-wider text-text-secondary uppercase">
              {label}
            </dt>
          </div>
        </div>
      ))}
    </dl>
  );
}
