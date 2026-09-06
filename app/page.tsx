import { Footer } from "@/components/layout/Footer";
import { Navbar } from "@/components/layout/Navbar";
import { CallToAction } from "@/components/homepage/CallToAction";
import { DashboardPreview } from "@/components/homepage/DashboardPreview";
import { FeatureSection } from "@/components/homepage/FeatureSection";
import { Hero } from "@/components/homepage/Hero";
import { Testimonial } from "@/components/homepage/Testimonial";

import agentLog from "@/public/images/agnet-log.png";
import jobsList from "@/public/images/jobs-lists.png";

const searchFeatures = [
  {
    title: "Find jobs that actually fit",
    description:
      "Search by title and location or paste a job link. Get matched roles you can quickly scan.",
    highlighted: true,
  },
  {
    title: "Know the Company Before You Apply",
    description:
      "Stop guessing what a company is about. JobPilot browses their site and gives you everything you need to apply with confidence.",
  },
  {
    title: "Keep track of every application",
    description:
      "Keep a clear view of every job you've found, tailored. Your activity and progress all stay in one simple place.",
  },
];

const confidenceFeatures = [
  {
    title: "Understand your match score",
    description:
      "See how your profile lines up with each role before you apply. Get a clear breakdown of what fits and what's missing.",
  },
  {
    title: "AI-Powered Job Matching",
    description:
      "Stop guessing which jobs are worth applying to. JobPilot scores every role against your actual skills so you focus on the ones that matter.",
    highlighted: true,
  },
  {
    title: "Focus on the right roles",
    description:
      "Filter out low fit jobs and stay on the ones that actually matter. Spend less time sorting and more time applying.",
  },
];

export default function Home() {
  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-[1440px] px-4 sm:px-8 lg:px-12 xl:px-20">
        <div className="h-10 lg:h-15" />
        <div className="border-x border-border-light">
          <Hero />
          <DashboardPreview />
          <div className="h-10 border-t border-border-light lg:h-[72px]" />
          <FeatureSection
            headingLines={["Manage Your Job", "Search With Ease"]}
            items={searchFeatures}
            image={jobsList}
            imageAlt="A list of matched jobs with company, match score, salary estimate and source"
            imageClassName="max-w-[584px]"
            imageSizes="(min-width: 1024px) 584px, 100vw"
            mediaSide="right"
          />
          <div className="hatch-band h-10 border-y border-border-light lg:h-[76px]" />
          <FeatureSection
            headingLines={["Apply With More", "Confidence, Every Time"]}
            items={confidenceFeatures}
            image={agentLog}
            imageAlt="An agent log showing JobPilot scanning, filtering and tailoring for matching roles"
            imageClassName="max-w-[532px]"
            imageSizes="(min-width: 1024px) 532px, 100vw"
            mediaSide="left"
          />
          <div className="hatch-band h-10 border-y border-border-light lg:h-[70px]" />
          <Testimonial />
          <div className="hatch-band h-10 border-y border-border-light lg:h-[78px]" />
          <CallToAction />
        </div>
        <div className="hatch-band h-10 border-y border-border-light lg:h-[78px]" />
        <Footer />
      </main>
    </>
  );
}
