"use client";

import { useActionState } from "react";

import { saveProfile, type ProfileActionState } from "@/actions/profile";
import { SubmitButton } from "@/components/auth/SubmitButton";
import { FormField } from "@/components/profile/FormField";
import { FormSection } from "@/components/profile/FormSection";
import { SelectInput } from "@/components/profile/SelectInput";
import { TagInput } from "@/components/profile/TagInput";
import { TextInput } from "@/components/profile/TextInput";
import { WorkExperienceList } from "@/components/profile/WorkExperienceList";
import {
  DEGREE_OPTIONS,
  EXPERIENCE_LEVEL_OPTIONS,
  REMOTE_PREFERENCE_OPTIONS,
  WORK_AUTHORIZATION_OPTIONS,
} from "@/lib/profile-options";
import type { Profile } from "@/types";

const GRID = "grid grid-cols-1 gap-5 sm:grid-cols-2";

// A "use server" module can only export async functions, so the initial state
// for useActionState is declared on the client side of the boundary.
const INITIAL_STATE: ProfileActionState = { status: "idle", message: "" };

type Props = {
  profile: Profile;
};

export function ProfileForm({ profile }: Props) {
  const [state, formAction] = useActionState(saveProfile, INITIAL_STATE);

  return (
    <form
      action={formAction}
      className="rounded-2xl border border-border bg-surface p-8 shadow-sm"
    >
      <header className="pb-4">
        <h2 className="text-xl/6 font-semibold text-text-primary">
          Profile Information
        </h2>
        <p className="mt-1.5 text-sm text-text-secondary">
          This context is used to accurately represent you in agent
          interactions.
        </p>
      </header>

      <FormSection title="Personal Info">
        <div className={GRID}>
          <FormField label="Full Name" htmlFor="full_name">
            <TextInput
              id="full_name"
              name="full_name"
              placeholder="E.g. Faizan Ali"
              defaultValue={profile.full_name ?? ""}
            />
          </FormField>
          <FormField label="Email" htmlFor="email">
            <TextInput
              readOnly
              id="email"
              name="email"
              placeholder="you@example.com"
              defaultValue={profile.email}
            />
          </FormField>
          <FormField label="Phone Number" htmlFor="phone">
            <TextInput
              type="tel"
              id="phone"
              name="phone"
              placeholder="+1 (555) 000-0000"
              defaultValue={profile.phone ?? ""}
            />
          </FormField>
          <FormField label="Location" htmlFor="location">
            <TextInput
              id="location"
              name="location"
              placeholder="City, Country"
              defaultValue={profile.location ?? ""}
            />
          </FormField>
          <FormField label="LinkedIn URL" htmlFor="linkedin_url">
            <TextInput
              type="url"
              id="linkedin_url"
              name="linkedin_url"
              placeholder="https://linkedin.com/in/you"
              defaultValue={profile.linkedin_url ?? ""}
            />
          </FormField>
          <FormField label="Portfolio / GitHub" htmlFor="portfolio_url">
            <TextInput
              type="url"
              id="portfolio_url"
              name="portfolio_url"
              placeholder="https://github.com/you"
              defaultValue={profile.portfolio_url ?? ""}
            />
          </FormField>
          <FormField label="Work Authorization" htmlFor="work_authorization">
            <SelectInput
              id="work_authorization"
              name="work_authorization"
              options={WORK_AUTHORIZATION_OPTIONS}
              defaultValue={profile.work_authorization ?? ""}
            />
          </FormField>
        </div>
      </FormSection>

      <FormSection title="Professional Info">
        <div className="flex flex-col gap-5">
          <FormField label="Current/Recent Job Title" htmlFor="current_title">
            <TextInput
              id="current_title"
              name="current_title"
              placeholder="E.g. Frontend Engineer"
              defaultValue={profile.current_title ?? ""}
            />
          </FormField>
          <div className={GRID}>
            <FormField label="Experience Level" htmlFor="experience_level">
              <SelectInput
                id="experience_level"
                name="experience_level"
                options={EXPERIENCE_LEVEL_OPTIONS}
                defaultValue={profile.experience_level ?? ""}
              />
            </FormField>
            <FormField label="Years of Experience" htmlFor="years_experience">
              <TextInput
                type="number"
                id="years_experience"
                name="years_experience"
                placeholder="E.g. 4"
                defaultValue={profile.years_experience ?? ""}
              />
            </FormField>
          </div>
          <TagInput
            id="skills"
            name="skills"
            label="Skills"
            placeholder="Add a skill"
            initialTags={profile.skills}
          />
          <TagInput
            id="industries"
            name="industries"
            label="Industries Worked In (Optional)"
            placeholder="E.g. FinTech, Healthcare"
            initialTags={profile.industries}
          />
        </div>
      </FormSection>

      <WorkExperienceList initialRoles={profile.work_experience} />

      <FormSection title="Education">
        <div className={GRID}>
          <FormField label="Highest Degree" htmlFor="education_degree">
            <SelectInput
              id="education_degree"
              name="education_degree"
              options={DEGREE_OPTIONS}
              defaultValue={profile.education?.degree ?? ""}
            />
          </FormField>
          <FormField label="Field of Study" htmlFor="education_field">
            <TextInput
              id="education_field"
              name="education_field"
              placeholder="E.g. Computer Science"
              defaultValue={profile.education?.field ?? ""}
            />
          </FormField>
          <FormField label="Institution Name" htmlFor="education_institution">
            <TextInput
              id="education_institution"
              name="education_institution"
              placeholder="E.g. State University"
              defaultValue={profile.education?.institution ?? ""}
            />
          </FormField>
          <FormField label="Graduation Year" htmlFor="education_graduation_year">
            <TextInput
              id="education_graduation_year"
              name="education_graduation_year"
              placeholder="YYYY"
              defaultValue={profile.education?.graduation_year ?? ""}
            />
          </FormField>
        </div>
      </FormSection>

      <FormSection title="Job Preferences">
        <div className="flex flex-col gap-5">
          <TagInput
            id="job_titles_seeking"
            name="job_titles_seeking"
            label="Job Titles Seeking"
            placeholder="E.g. Frontend Engineer"
            initialTags={profile.job_titles_seeking}
          />
          <div className={GRID}>
            <FormField label="Remote Preference" htmlFor="remote_preference">
              <SelectInput
                id="remote_preference"
                name="remote_preference"
                options={REMOTE_PREFERENCE_OPTIONS}
                defaultValue={profile.remote_preference ?? ""}
              />
            </FormField>
            <FormField
              label="Salary Expectation (Optional)"
              htmlFor="salary_expectation"
            >
              <TextInput
                id="salary_expectation"
                name="salary_expectation"
                placeholder="E.g. $120k+"
                defaultValue={profile.salary_expectation ?? ""}
              />
            </FormField>
          </div>
          <TagInput
            id="preferred_locations"
            name="preferred_locations"
            label="Preferred Locations (Optional)"
            placeholder="E.g. San Francisco, CA"
            initialTags={profile.preferred_locations}
          />
        </div>
      </FormSection>

      <div className="border-t border-border pt-8">
        {state.status !== "idle" && (
          <p
            role={state.status === "error" ? "alert" : "status"}
            className={`mb-4 text-sm ${
              state.status === "error" ? "text-error-strong" : "text-text-dark"
            }`}
          >
            {state.message}
          </p>
        )}
        <SubmitButton className="flex h-12 w-full items-center justify-center rounded-lg bg-accent text-base font-semibold text-accent-foreground">
          Save Profile
        </SubmitButton>
      </div>
    </form>
  );
}
