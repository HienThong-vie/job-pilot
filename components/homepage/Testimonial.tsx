import Image from "next/image";

import userIcon from "@/public/images/user-icon.png";

export function Testimonial() {
  return (
    <section className="border-t border-border-light px-6 py-12 text-center sm:px-10 lg:px-20 lg:pt-[57px] lg:pb-[58px]">
      <p className="text-sm/5 font-semibold tracking-[0.08em] text-accent-dark uppercase">
        Success Stories
      </p>
      <blockquote className="mx-auto mt-4 max-w-[900px] text-[20px]/[30px] font-medium text-text-darker sm:text-[26px]/[38px] lg:mt-5 lg:text-[30px]/[44px]">
        &ldquo;I used to spend my evenings copy-pasting resumes. Now I open my
        dashboard to see interviews waiting. It feels like cheating. Had 3
        offers on the table simultaneously.&rdquo;
      </blockquote>
      <figcaption className="mt-6 flex items-center justify-center gap-3 lg:mt-[21px]">
        <Image
          src={userIcon}
          alt=""
          width={48}
          height={48}
          className="size-12 rounded-[10px] object-cover"
        />
        <span className="text-left">
          <span className="block text-base font-semibold text-text-darkest">
            Tom Wilson
          </span>
          <span className="block text-sm text-text-secondary">
            Junior Developer
          </span>
        </span>
      </figcaption>
    </section>
  );
}
