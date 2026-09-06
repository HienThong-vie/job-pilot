import Link from "next/link";
import { Play } from "lucide-react";

import { getPrimaryCta } from "@/lib/insforge-server";

export async function HeroActions() {
  const primaryCta = await getPrimaryCta("Get Started");

  return (
    <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center sm:gap-4">
      <Link
        href={primaryCta.href}
        className="flex h-12 items-center justify-center gap-2.5 rounded-md bg-text-slate bg-linear-to-b from-accent-foreground/10 to-accent-foreground/0 px-6 text-base font-medium text-accent-foreground lg:px-[30px]"
      >
        {primaryCta.label}
        <Play className="size-3 fill-current text-accent-foreground/55" strokeWidth={0} />
      </Link>
      <Link
        href="/find-jobs"
        className="flex h-12 items-center justify-center rounded-md border border-border-muted bg-surface/55 px-6 text-base font-medium text-text-slate backdrop-blur-sm lg:px-[30px]"
      >
        Find Your First Match
      </Link>
    </div>
  );
}
