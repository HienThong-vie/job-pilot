import { HeroActions } from "@/components/homepage/HeroActions";

export function CallToAction() {
  return (
    <section className="mesh-cta border-t border-border-light px-6 py-16 text-center sm:px-10 lg:px-20 lg:pt-[76px] lg:pb-[79px]">
      <h2 className="text-[28px]/[36px] font-bold tracking-[-0.02em] text-text-slate sm:text-[40px]/[46px] lg:text-[48px]/[52px] xl:text-[56px]/[58px]">
        <span className="lg:block">Your next job search can feel a</span>{" "}
        <span className="lg:block">lot less overwhelming</span>
      </h2>
      <p className="mx-auto mt-4 max-w-[720px] text-base/[26px] text-text-slate-medium lg:mt-[30px] lg:text-lg/[30px]">
        Set up your profile, upload your resume, and start finding matches in
        minutes.
      </p>
      <div className="mt-6 lg:mt-7">
        <HeroActions />
      </div>
    </section>
  );
}
