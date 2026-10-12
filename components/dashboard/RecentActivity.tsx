import type { ActivityItem, ActivityTone } from "@/types";

type Props = {
  items: ActivityItem[];
};

const DOT_TONES: Record<ActivityTone, { ring: string; dot: string }> = {
  accent: { ring: "bg-accent-light", dot: "bg-accent" },
  info: { ring: "bg-info-light", dot: "bg-info" },
  success: { ring: "bg-success-light", dot: "bg-success-alt" },
};

export function RecentActivity({ items }: Props) {
  return (
    <section className="rounded-2xl border border-border bg-surface shadow-sm">
      <h2 className="border-b border-border px-6 py-5 text-base/6 font-semibold text-text-primary">
        Recent Activity
      </h2>
      {items.length === 0 ? (
        <p className="px-6 py-16 text-center text-sm text-text-muted">
          No activity yet. Search for jobs to get started.
        </p>
      ) : (
        <ul className="flex flex-col gap-6 px-6 py-6">
          {items.map((item, index) => {
            const tone = DOT_TONES[item.tone];
            const isLast = index === items.length - 1;

            return (
              <li key={item.id} className="relative pl-[26px]">
                <span
                  aria-hidden="true"
                  className={`absolute top-0.5 -left-2 flex size-4 items-center justify-center rounded-full ${tone.ring}`}
                >
                  <span className={`size-2 rounded-full ${tone.dot}`} />
                </span>
                {!isLast && (
                  <span
                    aria-hidden="true"
                    className="absolute top-5 bottom-0 -left-px w-px bg-border"
                  />
                )}
                <p className="text-sm/5 font-medium text-text-primary">{item.message}</p>
                <p className="mt-1 text-xs/4 text-text-muted">{item.timeAgo}</p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
