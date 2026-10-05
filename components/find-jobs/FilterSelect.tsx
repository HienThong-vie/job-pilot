import { ChevronDown } from "lucide-react";

type Option<Value extends string> = { value: Value; label: string };

type Props<Value extends string> = {
  label: string;
  value: Value;
  options: readonly Option<Value>[];
  onChange: (value: Value) => void;
};

export function FilterSelect<Value extends string>({
  label,
  value,
  options,
  onChange,
}: Props<Value>) {
  return (
    <div className="relative">
      <select
        aria-label={label}
        value={value}
        onChange={(event) => {
          // The option list is the only source of values, so the match is a
          // lookup rather than a cast from the event's plain string.
          const next = options.find(
            (option) => option.value === event.target.value,
          );
          if (next) onChange(next.value);
        }}
        className="h-[34px] appearance-none rounded-md border border-border bg-surface pr-8 pl-3.5 text-sm font-medium text-text-dark shadow-sm focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-3 my-auto size-4 text-text-label"
      />
    </div>
  );
}
