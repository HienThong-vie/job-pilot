import { Check, X } from "lucide-react";

type Props = {
  matched: string[];
  missing: string[];
};

const CHIP =
  "flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px]/4 font-medium";

export function SkillsComparison({ matched, missing }: Props) {
  return (
    <section className="rounded-2xl border border-border bg-surface p-6 shadow-sm">
      <h2 className="text-xs/4 font-semibold tracking-wider text-text-secondary uppercase">
        Required Skills vs Your Profile
      </h2>

      <h3 className="mt-4 text-[13px]/4 text-text-muted">You have</h3>
      {matched.length > 0 ? (
        <ul className="mt-2 flex flex-wrap gap-2">
          {matched.map((skill) => (
            <li
              key={skill}
              className={`${CHIP} bg-success-lightest text-success-foreground`}
            >
              <Check aria-hidden="true" className="size-3.5" />
              {skill}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-text-muted">
          None of the skills this listing names are on your profile.
        </p>
      )}

      <h3 className="mt-3 text-[13px]/4 text-text-muted">Gap skills</h3>
      {missing.length > 0 ? (
        <ul className="mt-2 flex flex-wrap gap-2">
          {missing.map((skill) => (
            <li key={skill} className={`${CHIP} bg-accent-muted text-accent`}>
              <X aria-hidden="true" className="size-3.5" />
              {skill}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-text-muted">
          No gaps — your profile covers every skill the listing names.
        </p>
      )}
    </section>
  );
}
