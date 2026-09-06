import { HeroActions } from "@/components/homepage/HeroActions";

export function Hero() {
  return (
    <section className="mesh-hero border-t border-border-light px-6 py-14 text-center sm:px-10 lg:px-20 lg:pt-[59px] lg:pb-[63px]">
      <h1 className="text-[28px]/[36px] font-bold tracking-[-0.02em] text-text-slate sm:text-[44px]/[52px] lg:text-[56px]/[64px] xl:text-[64px]/[72px]">
        <span className="lg:block">Job hunting is hard.</span>{" "}
        <span className="lg:block">Your tools shouldn&rsquo;t be.</span>
      </h1>
      <p className="mx-auto mt-4 max-w-[640px] text-base/[26px] text-text-slate-medium lg:mt-[17px] lg:text-lg/[30px]">
        Stop applying blind. JobPilot finds the jobs, researches the companies,
        and gives you everything you need to stand out.
      </p>
      <div className="mt-6">
        <HeroActions />
      </div>
    </section>
  );
}
