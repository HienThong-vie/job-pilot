type Props = {
  company: string;
  applyUrl: string;
};

export function ApplyButton({ company, applyUrl }: Props) {
  return (
    <a
      href={applyUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex h-11 w-full items-center justify-center rounded-xl bg-accent px-4 text-sm font-semibold text-accent-foreground"
    >
      Apply Now at {company}
    </a>
  );
}
