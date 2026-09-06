import Image, { type StaticImageData } from "next/image";

type FeatureItem = {
  title: string;
  description: string;
  highlighted?: boolean;
};

type Props = {
  headingLines: string[];
  items: FeatureItem[];
  image: StaticImageData;
  imageAlt: string;
  imageClassName: string;
  imageSizes: string;
  mediaSide: "left" | "right";
};

export function FeatureSection({
  headingLines,
  items,
  image,
  imageAlt,
  imageClassName,
  imageSizes,
  mediaSide,
}: Props) {
  return (
    <section className="grid grid-cols-1 border-t border-border-light lg:grid-cols-2">
      <div className="min-w-0 bg-surface">
        <div className="flex py-10 pl-6 sm:pl-10 lg:h-[223px] lg:items-center lg:py-0 lg:pl-12">
          <div className="flex w-full items-center border-l border-border-light pl-4 sm:pl-6">
            <h2 className="text-[28px]/[34px] font-bold tracking-[-0.02em] text-text-slate sm:text-[36px]/[42px] lg:text-[44px]/[50px]">
              {headingLines.map((line, index) => (
                <span key={line} className="lg:block">
                  {index > 0 ? " " : null}
                  {line}
                </span>
              ))}
            </h2>
          </div>
        </div>
        {items.map((item) => (
          <div
            key={item.title}
            className="border-t border-border-light pl-6 sm:pl-10 lg:pl-12"
          >
            <div
              className={`flex flex-col justify-center py-7 pl-4 pr-6 sm:pl-6 sm:pr-10 lg:h-[153px] lg:py-0 lg:pr-0 ${
                item.highlighted
                  ? "-ml-px border-l-2 border-accent-dark"
                  : "border-l border-border-light"
              }`}
            >
              <h3 className="text-lg/7 font-semibold text-text-darker lg:text-xl/7">
                {item.title}
              </h3>
              <p className="mt-2 max-w-[545px] text-[15px]/[26px] text-text-slate-medium lg:mt-2.5 lg:text-[17.5px]/[30px]">
                {item.description}
              </p>
            </div>
          </div>
        ))}
      </div>
      <div
        className={`flex min-w-0 items-center justify-center border-t border-border-light bg-background px-6 py-10 sm:px-10 lg:border-t-0 lg:px-0 lg:py-0 ${
          mediaSide === "left" ? "lg:order-first" : ""
        }`}
      >
        <Image
          src={image}
          alt={imageAlt}
          sizes={imageSizes}
          className={`h-auto w-full min-w-0 ${imageClassName}`}
        />
      </div>
    </section>
  );
}
