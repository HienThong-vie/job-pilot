import { describe, expect, it } from "vitest";

import { getProfileCompletion, type ProfileCompletionInput } from "@/lib/profile-completion";

const COMPLETE = {
  full_name: "Ada Lovelace",
  email: "ada@example.com",
  phone: "+1 555 0100",
  location: "London",
  current_title: "Engineer",
  experience_level: "senior",
  years_experience: 8,
  skills: ["TypeScript"],
  work_experience: [{}],
  education: { institution: "University of London", graduation_year: "2012" },
} as unknown as ProfileCompletionInput;

describe("getProfileCompletion", () => {
  it("is 100% and complete when every required field is filled", () => {
    expect(getProfileCompletion(COMPLETE)).toEqual({
      percentage: 100,
      missingFields: [],
      isComplete: true,
    });
  });

  it("reports each missing field and a percentage in steps of ten", () => {
    const result = getProfileCompletion({ ...COMPLETE, phone: "   ", skills: [] });

    expect(result.percentage).toBe(80);
    expect(result.missingFields).toEqual(["PHONE", "SKILLS"]);
    expect(result.isComplete).toBe(false);
  });

  it("needs both institution and graduation year for education", () => {
    const result = getProfileCompletion({
      ...COMPLETE,
      education: { institution: "University of London", graduation_year: "" },
    } as unknown as ProfileCompletionInput);

    expect(result.missingFields).toEqual(["EDUCATION"]);
  });

  it("counts zero years of experience as filled but null as missing", () => {
    expect(getProfileCompletion({ ...COMPLETE, years_experience: 0 }).isComplete).toBe(true);
    expect(getProfileCompletion({ ...COMPLETE, years_experience: null }).missingFields).toEqual([
      "YEARS OF EXPERIENCE",
    ]);
  });
});
