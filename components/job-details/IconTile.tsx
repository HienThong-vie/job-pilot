import type { ReactNode } from "react";

type Tone = "green" | "blue" | "purple" | "gray";
type Size = "sm" | "lg";

type Props = {
  tone: Tone;
  size?: Size;
  children: ReactNode;
};

const TONE: Record<Tone, string> = {
  green: "bg-success-lightest text-success",
  blue: "bg-info-lightest text-info-dark",
  purple: "bg-accent-muted text-accent",
  gray: "bg-surface-secondary text-text-secondary",
};

const SIZE: Record<Size, string> = {
  sm: "size-7 rounded-lg [&>svg]:size-4",
  lg: "size-10 rounded-xl [&>svg]:size-5",
};

export function IconTile({ tone, size = "sm", children }: Props) {
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center ${SIZE[size]} ${TONE[tone]}`}
    >
      {children}
    </span>
  );
}
