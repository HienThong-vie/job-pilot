"use client";

import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";

type Props = {
  className: string;
  children: React.ReactNode;
};

export function SubmitButton({ className, children }: Props) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={`${className} disabled:cursor-not-allowed disabled:opacity-60`}
    >
      {pending ? <Loader2 className="size-5 animate-spin" /> : children}
    </button>
  );
}
