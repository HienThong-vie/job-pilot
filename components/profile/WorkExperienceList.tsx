"use client";

import { useState } from "react";
import { Plus } from "lucide-react";

import { FormField } from "@/components/profile/FormField";
import { FormSection } from "@/components/profile/FormSection";
import { TextInput } from "@/components/profile/TextInput";
import type { WorkExperienceEntry } from "@/types";

const MAX_ROLES = 3;

const EMPTY_ROLE: WorkExperienceEntry = {
  company: "",
  title: "",
  start_date: "",
  end_date: "",
  is_current: false,
  responsibilities: "",
};

type Role = WorkExperienceEntry & { key: string };

type Props = {
  initialRoles: WorkExperienceEntry[];
};

export function WorkExperienceList({ initialRoles }: Props) {
  const [roles, setRoles] = useState<Role[]>(
    initialRoles.map((role, index) => ({ ...role, key: `role-${index}` })),
  );

  const addRole = () =>
    setRoles((current) => [
      ...current,
      { ...EMPTY_ROLE, key: `role-${Date.now()}` },
    ]);

  const setCurrent = (key: string, isCurrent: boolean) =>
    setRoles((current) =>
      current.map((role) =>
        role.key === key ? { ...role, is_current: isCurrent } : role,
      ),
    );

  return (
    <FormSection
      title="Work Experience"
      action={
        roles.length < MAX_ROLES ? (
          <button
            type="button"
            onClick={addRole}
            className="flex items-center gap-1.5 text-sm font-semibold text-accent"
          >
            <Plus className="size-4" />
            Add role
          </button>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-5">
        {roles.map((role, index) => (
          <fieldset
            key={role.key}
            className="rounded-lg border border-border bg-surface-secondary p-5"
          >
            <legend className="sr-only">Role {index + 1}</legend>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                label="Company Name"
                htmlFor={`${role.key}-company`}
              >
                <TextInput
                  nested
                  id={`${role.key}-company`}
                  name={`work_experience[${index}][company]`}
                  placeholder="E.g. Vercel"
                  defaultValue={role.company}
                />
              </FormField>
              <FormField label="Job Title" htmlFor={`${role.key}-title`}>
                <TextInput
                  nested
                  id={`${role.key}-title`}
                  name={`work_experience[${index}][title]`}
                  placeholder="E.g. Frontend Engineer"
                  defaultValue={role.title}
                />
              </FormField>
              <FormField label="Start Date" htmlFor={`${role.key}-start`}>
                <TextInput
                  nested
                  type="month"
                  id={`${role.key}-start`}
                  name={`work_experience[${index}][start_date]`}
                  placeholder=""
                  defaultValue={role.start_date}
                />
              </FormField>
              <FormField
                label="End Date"
                htmlFor={`${role.key}-end`}
                action={
                  <label className="flex items-center gap-2 text-sm/4 text-text-dark">
                    <input
                      type="checkbox"
                      name={`work_experience[${index}][is_current]`}
                      checked={role.is_current}
                      onChange={(event) =>
                        setCurrent(role.key, event.target.checked)
                      }
                      className="size-4"
                    />
                    Currently working here
                  </label>
                }
              >
                <TextInput
                  nested
                  type="month"
                  id={`${role.key}-end`}
                  name={`work_experience[${index}][end_date]`}
                  placeholder=""
                  defaultValue={role.end_date}
                  disabled={role.is_current}
                />
              </FormField>
              <FormField
                className="sm:col-span-2"
                label="Key Responsibilities"
                htmlFor={`${role.key}-responsibilities`}
              >
                <textarea
                  id={`${role.key}-responsibilities`}
                  name={`work_experience[${index}][responsibilities]`}
                  rows={3}
                  defaultValue={role.responsibilities}
                  placeholder="What did you own, ship, or improve?"
                  className="block w-full rounded-md border border-border bg-surface px-4 py-2 text-sm/5 text-text-darkest placeholder:text-text-darkest/50 focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none"
                />
              </FormField>
            </div>
          </fieldset>
        ))}
      </div>
    </FormSection>
  );
}
