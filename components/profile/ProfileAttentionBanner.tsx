import { CircleAlert } from "lucide-react";

import { CompletionIndicator } from "@/components/profile/CompletionIndicator";
import type { ProfileCompletion } from "@/lib/profile-completion";

type Props = {
  completion: ProfileCompletion;
};

export function ProfileAttentionBanner({ completion }: Props) {
  return (
    <section className="flex items-center justify-between gap-6 rounded-2xl border border-error-light bg-error-tint px-8 py-9.5 shadow-sm">
      <div className="min-w-0">
        <h2 className="flex items-center gap-2.5 text-xl/6 font-semibold text-text-primary">
          <CircleAlert className="size-5 shrink-0 text-error-strong" />
          Profile needs attention
        </h2>
        <p className="mt-3 max-w-[430px] text-sm/[23px] text-text-dark">
          Complete the missing fields to improve your chance of getting tailored
          matches and generating quality resumes.
        </p>
        <ul className="mt-4 flex flex-wrap gap-2">
          {completion.missingFields.map((field) => (
            <li
              key={field}
              className="rounded-md bg-error-lightest px-2.5 py-1 text-xs/4 font-bold tracking-[0.02em] text-error-strong"
            >
              {field}
            </li>
          ))}
        </ul>
      </div>
      <CompletionIndicator percentage={completion.percentage} className="mr-2" />
    </section>
  );
}
