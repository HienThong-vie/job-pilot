type Props = {
  items: string[];
  /** Shown instead of the list when it is empty. */
  empty: string;
};

export function DossierList({ items, empty }: Props) {
  if (items.length === 0) {
    return <p className="mt-2 text-sm text-text-muted">{empty}</p>;
  }
  return (
    <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-5 text-sm/[22px] text-text-primary marker:text-text-muted">
      {items.map((item) => (
        <li key={item}>{item}</li>
      ))}
    </ul>
  );
}
