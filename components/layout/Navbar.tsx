import Link from "next/link";
import { Menu } from "lucide-react";

import { Logo } from "@/components/layout/Logo";
import { getPrimaryCta } from "@/lib/insforge-server";

const navItems = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Find Jobs", href: "/find-jobs" },
  { label: "Profile", href: "/profile" },
];

export async function Navbar() {
  const primaryCta = await getPrimaryCta("Start for free");

  return (
    <header className="border-b border-border-light bg-surface">
      <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center gap-4 px-4 sm:px-8 lg:h-20 lg:px-12 xl:px-20">
        <Logo />
        <nav className="hidden flex-1 items-center justify-center gap-8 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-[15px] font-medium text-text-darker"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <Link
            href={primaryCta.href}
            className="flex h-10 items-center rounded-md bg-text-slate px-4 text-sm font-medium text-accent-foreground sm:px-[21px]"
          >
            {primaryCta.label}
          </Link>
          <details className="relative md:hidden [&::-webkit-details-marker]:hidden">
            <summary
              className="flex size-10 cursor-pointer list-none items-center justify-center rounded-md text-text-darker"
              aria-label="Open navigation"
            >
              <Menu className="size-5" />
            </summary>
            <nav className="absolute right-0 z-10 mt-2 flex w-44 flex-col rounded-lg border border-border-light bg-surface p-2 shadow-lg">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-md px-3 py-2 text-[15px] font-medium text-text-darker hover:bg-surface-secondary"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </details>
        </div>
      </div>
    </header>
  );
}
