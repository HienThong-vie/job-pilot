import type { ReactNode } from "react";

import { AppNavbar } from "@/components/layout/AppNavbar";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-full flex-col bg-background">
      <AppNavbar />
      <main className="flex-1">{children}</main>
    </div>
  );
}
