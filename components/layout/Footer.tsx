import Link from "next/link";

import { Logo } from "@/components/layout/Logo";

const footerLinks = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Privacy Policy", href: "/privacy-policy" },
  { label: "Terms & Condition", href: "/terms" },
];

export function Footer() {
  return (
    <footer className="flex flex-col items-center gap-6 py-10 sm:flex-row sm:justify-between sm:gap-4 lg:h-[130px] lg:py-0 lg:pl-10 lg:pr-14">
      <Logo />
      <nav className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2">
        {footerLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="text-[15px] font-medium text-text-darker"
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </footer>
  );
}
