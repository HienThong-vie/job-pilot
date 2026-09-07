"use client";

import { useState } from "react";
import { X } from "lucide-react";

import { FormField } from "@/components/profile/FormField";

type Props = {
  id: string;
  name: string;
  label: string;
  placeholder: string;
  initialTags: string[];
};

export function TagInput({ id, name, label, placeholder, initialTags }: Props) {
  const [tags, setTags] = useState<string[]>(initialTags);
  const [draft, setDraft] = useState("");

  const addTag = () => {
    const value = draft.trim();
    if (value.length === 0 || tags.includes(value)) return;
    setTags([...tags, value]);
    setDraft("");
  };

  return (
    <div>
      <FormField label={label} htmlFor={id}>
        <div className="flex gap-2">
          <input
            id={id}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              addTag();
            }}
            placeholder={placeholder}
            className="h-[42px] w-full rounded-md border border-border bg-surface px-4 text-sm text-text-darkest placeholder:text-text-darkest/50 focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
          />
          <button
            type="button"
            onClick={addTag}
            className="h-[42px] shrink-0 rounded-md bg-surface-tertiary px-4 text-sm font-medium text-text-dark"
          >
            Add
          </button>
        </div>
      </FormField>

      {tags.length > 0 && (
        <ul className="mt-3.5 flex flex-wrap gap-2">
          {tags.map((tag) => (
            <li
              key={tag}
              className="flex items-center gap-1.5 rounded-md border border-border bg-background py-1.5 pr-2.5 pl-3 text-sm text-text-darkest"
            >
              <input type="hidden" name={name} value={tag} />
              {tag}
              <button
                type="button"
                onClick={() => setTags(tags.filter((item) => item !== tag))}
                aria-label={`Remove ${tag}`}
                className="text-text-muted"
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
