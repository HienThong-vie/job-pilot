import type { ReactNode } from "react";

type Props = {
  title: string;
  action?: ReactNode;
  children: ReactNode;
};

export function FormSection({ title, action, children }: Props) {
  return (
    <section className="border-t border-border py-12">
      <div className="flex min-h-6 items-center justify-between gap-4">
        <h3 className="text-base font-semibold text-text-primary">{title}</h3>
        {action}
      </div>
      <div className="mt-6">{children}</div>
    </section>
  );
}
