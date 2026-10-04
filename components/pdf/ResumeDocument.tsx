import "server-only";

import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";

import { DEGREE_OPTIONS } from "@/lib/profile-options";
import {
  bulletsForRole,
  resumeRoles,
  type GeneratedResume,
} from "@/lib/resume-generation";
import { MAX_PDF_SKILLS } from "@/lib/utils";
import type { Profile } from "@/types";

/**
 * The resume PDF, and the one function that renders it.
 *
 * Server-only. `renderToBuffer` is the Node entry point of
 * @react-pdf/renderer, and this module is imported by exactly one place —
 * `app/api/resume/generate/route.ts`. Keeping the render call here rather than
 * in the route is what lets the route stay a plain `.ts` file with no JSX in
 * it, which is how `architecture.md` declares it. There is no `"use client"`
 * here and there must never be one: importing this into a client component
 * would pull pdfkit into the browser bundle.
 *
 * These components render to a PDF, not to the DOM. Tailwind classes and the
 * project's CSS custom properties mean nothing here — see PDF_COLORS.
 */

/**
 * A deliberate, recorded exception to `ui-rules.md`'s "never use hardcoded hex".
 *
 * That rule exists so the app's UI cannot drift from the token set.
 * @react-pdf/renderer's StyleSheet resolves to PDF drawing operations and
 * cannot read a CSS custom property, so a PDF has no way to honour it. These
 * three values are copied from `ui-tokens.md` with the token they came from
 * named on each — if a token changes, this changes with it.
 *
 * `--color-accent` is deliberately absent. A resume is a print and ATS artifact
 * before it is a branded surface, and near-monochrome parses more reliably.
 */
const PDF_COLORS = {
  /** --color-text-primary */
  text: "#101828",
  /** --color-text-secondary */
  muted: "#6a7282",
  /** --color-border */
  rule: "#e7eaf3",
} as const;

const styles = StyleSheet.create({
  page: {
    paddingVertical: 44,
    paddingHorizontal: 48,
    fontFamily: "Helvetica",
    color: PDF_COLORS.text,
  },
  name: { fontSize: 22, fontFamily: "Helvetica-Bold", letterSpacing: -0.4 },
  headline: { marginTop: 4, fontSize: 11, color: PDF_COLORS.muted },
  contact: {
    marginTop: 8,
    fontSize: 9,
    lineHeight: 1.5,
    color: PDF_COLORS.muted,
  },
  sectionHeading: {
    marginTop: 18,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: PDF_COLORS.rule,
    fontSize: 8.5,
    fontFamily: "Helvetica-Bold",
    letterSpacing: 1.1,
  },
  summary: { fontSize: 9.5, lineHeight: 1.55 },
  role: { marginBottom: 10 },
  roleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },
  roleTitle: { flex: 1, fontSize: 10.5, fontFamily: "Helvetica-Bold" },
  roleDates: { marginLeft: 12, fontSize: 9, color: PDF_COLORS.muted },
  roleCompany: { marginTop: 2, fontSize: 9.5, color: PDF_COLORS.muted },
  bullet: { flexDirection: "row", marginTop: 4 },
  bulletMark: { width: 10, fontSize: 9.5, lineHeight: 1.5 },
  bulletText: { flex: 1, fontSize: 9.5, lineHeight: 1.5 },
  body: { fontSize: 9.5, lineHeight: 1.55 },
});

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/**
 * "2022-03" reads as "Mar 2022". Feature 07 normalises every date it extracts to
 * "YYYY-MM" and the form enforces the same, but a row written before that, or by
 * hand, can hold anything — so an unparseable value is printed as it was stored
 * rather than replaced with a wrong-looking guess.
 */
const formatMonth = (value: string): string => {
  const match = /^(\d{4})-(\d{2})$/.exec(value.trim());
  if (!match) return value.trim();

  const month = MONTHS[Number(match[2]) - 1];
  return month ? `${month} ${match[1]}` : match[1];
};

const dateRange = (start: string, end: string, isCurrent: boolean): string => {
  const from = formatMonth(start);
  const to = isCurrent ? "Present" : formatMonth(end);

  if (!from) return to;
  if (!to) return from;
  return `${from} — ${to}`;
};

/** Drops the scheme and any trailing slash: a printed URL does not need them. */
const displayUrl = (url: string): string =>
  url.replace(/^https?:\/\//i, "").replace(/\/+$/, "");

const degreeLabel = (degree: string): string =>
  DEGREE_OPTIONS.find((option) => option.value === degree)?.label ?? "";

/** Every non-empty part, joined — so a missing phone leaves no stray separator. */
const joined = (parts: (string | null)[], separator: string): string =>
  parts
    .map((part) => (part ?? "").trim())
    .filter((part) => part.length > 0)
    .join(separator);

const educationLine = (education: Profile["education"]): string => {
  if (!education) return "";

  const degree = joined(
    [degreeLabel(education.degree), education.field],
    " in ",
  );

  return joined([degree, education.institution, education.graduation_year], " · ");
};

type Props = {
  profile: Profile;
  written: GeneratedResume;
};

function ResumeDocument({ profile, written }: Props) {
  const name = profile.full_name?.trim() || "";
  const headline = joined([profile.current_title], "");
  const contact = joined(
    [
      profile.email,
      profile.phone,
      profile.location,
      profile.linkedin_url ? displayUrl(profile.linkedin_url) : null,
      profile.portfolio_url ? displayUrl(profile.portfolio_url) : null,
    ],
    "  ·  ",
  );

  // The same list the writer was given — the bullets are indexed against it, so
  // filtering differently here would print one job's bullets under another's.
  const roles = resumeRoles(profile);
  const skills = profile.skills.slice(0, MAX_PDF_SKILLS);
  const education = educationLine(profile.education);

  return (
    <Document title={name ? `${name} — Resume` : "Resume"} author={name}>
      <Page size="A4" style={styles.page}>
        <View>
          <Text style={styles.name}>{name}</Text>
          {headline !== "" && <Text style={styles.headline}>{headline}</Text>}
          {contact !== "" && <Text style={styles.contact}>{contact}</Text>}
        </View>

        {written.summary !== "" && (
          <View>
            <Text style={styles.sectionHeading}>SUMMARY</Text>
            <Text style={styles.summary}>{written.summary}</Text>
          </View>
        )}

        {roles.length > 0 && (
          <View>
            <Text style={styles.sectionHeading}>EXPERIENCE</Text>
            {roles.map((role, index) => (
              <View key={index} style={styles.role}>
                <View style={styles.roleHeader}>
                  <Text style={styles.roleTitle}>{role.title}</Text>
                  <Text style={styles.roleDates}>
                    {dateRange(role.start_date, role.end_date, role.is_current)}
                  </Text>
                </View>
                {role.company.trim() !== "" && (
                  <Text style={styles.roleCompany}>{role.company}</Text>
                )}
                {/* An empty bullet list is a role the model skipped. The title,
                    company and dates are still true, so the role is still
                    printed — just without prose under it. */}
                {bulletsForRole(written, index).map((bullet, bulletIndex) => (
                  <View key={bulletIndex} style={styles.bullet}>
                    <Text style={styles.bulletMark}>•</Text>
                    <Text style={styles.bulletText}>{bullet}</Text>
                  </View>
                ))}
              </View>
            ))}
          </View>
        )}

        {skills.length > 0 && (
          <View>
            <Text style={styles.sectionHeading}>SKILLS</Text>
            <Text style={styles.body}>{skills.join("  ·  ")}</Text>
          </View>
        )}

        {education !== "" && (
          <View>
            <Text style={styles.sectionHeading}>EDUCATION</Text>
            <Text style={styles.body}>{education}</Text>
          </View>
        )}
      </Page>
    </Document>
  );
}

/**
 * Renders the document to the buffer the generate route uploads. Nothing is
 * ever written to disk — `renderToFile` exists and must not be used here.
 */
export function renderResumePdf(
  profile: Profile,
  written: GeneratedResume,
): Promise<Buffer> {
  return renderToBuffer(<ResumeDocument profile={profile} written={written} />);
}
