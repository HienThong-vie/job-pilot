export type ExperienceLevel = "junior" | "mid" | "senior" | "lead";

export type RemotePreference = "remote" | "onsite" | "hybrid" | "any";

export type WorkAuthorization = "citizen" | "permanent_resident" | "visa_required";

export type WorkExperienceEntry = {
  company: string;
  title: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  responsibilities: string;
};

export type Education = {
  degree: string;
  field: string;
  institution: string;
  graduation_year: string;
};

/**
 * Mirrors a row of the InsForge `profiles` table exactly — column names
 * included — so the mock data feature 05 renders from can be swapped for a
 * real query in feature 06 without touching any component.
 */
export type Profile = {
  id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  location: string | null;
  current_title: string | null;
  experience_level: ExperienceLevel | null;
  years_experience: number | null;
  skills: string[];
  industries: string[];
  work_experience: WorkExperienceEntry[];
  education: Education | null;
  job_titles_seeking: string[];
  remote_preference: RemotePreference | null;
  preferred_locations: string[];
  salary_expectation: string | null;
  cover_letter_tone: string | null;
  linkedin_url: string | null;
  portfolio_url: string | null;
  work_authorization: WorkAuthorization | null;
  resume_pdf_url: string | null;
  is_complete: boolean;
  profile_completed_at: string | null;
  created_at: string;
  updated_at: string;
};
