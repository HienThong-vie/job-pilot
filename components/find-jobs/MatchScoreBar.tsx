import { getScoreTone, type ScoreTone } from "@/lib/match-score";

type Props = {
  score: number;
};

// A <progress> rather than a div with an inline width: the fill length is
// dynamic, and code-standards forbids inline styles. Each engine styles its
// own pseudo-element, so every fill rule is written twice.
const FILL: Record<ScoreTone, string> = {
  high: "[&::-webkit-progress-value]:bg-success [&::-moz-progress-bar]:bg-success",
  good: "[&::-webkit-progress-value]:bg-info-medium [&::-moz-progress-bar]:bg-info-medium",
  fair: "[&::-webkit-progress-value]:bg-warning [&::-moz-progress-bar]:bg-warning",
};

export function MatchScoreBar({ score }: Props) {
  return (
    <div className="flex items-center gap-2">
      <progress
        value={score}
        max={100}
        aria-label="Match score"
        className={`h-1.5 w-[92px] appearance-none overflow-hidden rounded-full bg-border-light [&::-webkit-progress-bar]:bg-border-light [&::-webkit-progress-value]:rounded-full [&::-moz-progress-bar]:rounded-full ${FILL[getScoreTone(score)]}`}
      />
      <span className="w-9 text-sm font-semibold text-text-primary tabular-nums">
        {score}%
      </span>
    </div>
  );
}
