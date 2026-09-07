import { ChevronDown } from "lucide-react";

type Option = { value: string; label: string };

type Props = {
  id: string;
  name: string;
  options: Option[];
  defaultValue?: string;
};

export function SelectInput({ id, name, options, defaultValue }: Props) {
  return (
    <div className="relative">
      <select
        id={id}
        name={name}
        defaultValue={defaultValue ?? ""}
        className="h-[42px] w-full appearance-none rounded-md border border-border bg-surface pr-10 pl-4 text-sm text-text-darkest focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <ChevronDown
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-2 my-auto size-4 text-text-label"
      />
    </div>
  );
}
