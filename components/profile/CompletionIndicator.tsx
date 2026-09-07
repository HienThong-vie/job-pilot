const RADIUS = 58;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

type Props = {
  percentage: number;
  className?: string;
};

export function CompletionIndicator({ percentage, className }: Props) {
  const filled = (Math.min(Math.max(percentage, 0), 100) / 100) * CIRCUMFERENCE;

  return (
    <div className={`relative size-32 shrink-0 ${className ?? ""}`}>
      <svg viewBox="0 0 128 128" aria-hidden="true" className="size-full -rotate-90">
        <circle
          cx="64"
          cy="64"
          r={RADIUS}
          fill="none"
          strokeWidth="12"
          className="stroke-error-light"
        />
        <circle
          cx="64"
          cy="64"
          r={RADIUS}
          fill="none"
          strokeWidth="12"
          strokeDasharray={`${filled} ${CIRCUMFERENCE - filled}`}
          className="stroke-error"
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-3xl font-bold text-text-primary">
        {percentage}%
      </span>
    </div>
  );
}
