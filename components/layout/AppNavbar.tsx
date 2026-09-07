"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Search, User } from "lucide-react";

import { Logo } from "@/components/layout/Logo";

const navItems = [
  { label: "Dashboard", href: "/dashboard", Icon: LayoutGrid },
  { label: "Find Jobs", href: "/find-jobs", Icon: Search },
  { label: "Profile", href: "/profile", Icon: User },
] as const;

export function AppNavbar() {
  const pathname = usePathname();

  return (
    <header className="h-16 border-b border-border bg-surface">
      <div className="flex h-full items-center justify-between px-4 sm:px-6">
        <Logo href="/dashboard" />
        <nav className="flex h-full items-center gap-0.5 sm:gap-2.5">
          {navItems.map(({ label, href, Icon }) => {
            const isActive =
              pathname === href || pathname.startsWith(`${href}/`);

            return (
              <Link
                key={href}
                href={href}
                aria-current={isActive ? "page" : undefined}
                className={`flex h-full items-center gap-2 border-b-2 px-2 text-sm font-medium sm:px-4 ${
                  isActive
                    ? "border-accent text-accent"
                    : "border-transparent text-text-label"
                }`}
              >
                <Icon
                  className={`size-4 shrink-0 ${isActive ? "text-accent" : "text-text-muted"}`}
                />
                <span className="hidden sm:inline">{label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
