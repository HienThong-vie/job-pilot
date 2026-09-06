import Image from "next/image";

import dashboardDemo from "@/public/images/dashboard-demo.png";

export function DashboardPreview() {
  return (
    <section className="flex justify-center border-t border-border-light bg-background px-4 py-6 sm:px-8 lg:px-0 lg:pt-[26px] lg:pb-[13px]">
      <Image
        src={dashboardDemo}
        alt="The JobPilot dashboard showing job stats, recent activity and company research activity"
        priority
        sizes="(min-width: 1024px) 1191px, 100vw"
        className="h-auto w-full min-w-0 max-w-[1191px]"
      />
    </section>
  );
}
