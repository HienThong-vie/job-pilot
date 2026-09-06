import Link from "next/link";

type Props = {
  href?: string;
};

export function Logo({ href = "/" }: Props) {
  return (
    <Link href={href} className="flex items-center gap-2.5">
      <span className="flex size-9 items-center justify-center rounded-[10px] bg-linear-45 from-accent to-accent-deep">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
          className="size-5 text-accent-foreground"
        >
          <rect x="3" y="11" width="8" height="10" rx="2" />
          <rect x="3" y="3" width="8" height="5" rx="2" />
          <rect x="14" y="3" width="7" height="7" rx="2" />
          <rect x="14" y="14" width="7" height="7" rx="2" />
        </svg>
      </span>
      <span className="text-[19px]/7 font-bold text-text-darkest">JobPilot</span>
    </Link>
  );
}
