import type { ReactNode } from "react";

type Props = {
  label: string;
  htmlFor: string;
  action?: ReactNode;
  className?: string;
  children: ReactNode;
};

export function FormField({
  label,
  htmlFor,
  action,
  className,
  children,
}: Props) {
  return (
    <div className={className}>
      <div className="flex min-h-4 items-center justify-between gap-3">
        <label
          htmlFor={htmlFor}
          className="text-xs font-semibold tracking-[0.01em] text-text-label uppercase"
        >
          {label}
        </label>
        {action}
      </div>
      <div className="mt-1.5">{children}</div>
    </div>
  );
}
