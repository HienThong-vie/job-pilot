type Props = {
  children: string;
};

/** Stands in for a chart that has nothing to draw, in the same 288px slot. */
export function ChartMessage({ children }: Props) {
  return (
    <p className="flex h-full items-center justify-center px-6 text-center text-sm text-text-muted">
      {children}
    </p>
  );
}
