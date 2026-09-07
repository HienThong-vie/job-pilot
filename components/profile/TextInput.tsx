type Props = {
  id: string;
  name: string;
  placeholder: string;
  type?: "text" | "tel" | "url" | "number" | "month";
  defaultValue?: string | number;
  readOnly?: boolean;
  disabled?: boolean;
  /**
   * Inputs inside the Work Experience card sit on a tinted surface, so they
   * stay white at every value and shrink by 4px. Everywhere else an input
   * carrying a value is tinted and an empty one is white.
   */
  nested?: boolean;
};

const BASE =
  "w-full rounded-md border border-border px-4 text-sm text-text-darkest placeholder:text-text-darkest/50 focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none";

const SURFACE = "h-[42px] bg-surface-secondary placeholder-shown:bg-surface";

const NESTED =
  "h-[38px] bg-surface disabled:bg-surface-secondary disabled:text-text-darkest/50";

export function TextInput({
  id,
  name,
  placeholder,
  type = "text",
  defaultValue,
  readOnly,
  disabled,
  nested,
}: Props) {
  return (
    <input
      id={id}
      name={name}
      type={type}
      placeholder={placeholder}
      defaultValue={defaultValue}
      readOnly={readOnly}
      disabled={disabled}
      className={`${BASE} ${nested ? NESTED : SURFACE}`}
    />
  );
}
