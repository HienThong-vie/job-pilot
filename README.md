# Job Pilot

Job Pilot finds jobs that fit a candidate's profile, scores each one against it, and researches the employer, all from one dashboard.

## Features

- **Profile and resume** — a complete profile form with a completion ring. A resume can be uploaded, read into the form (scanned PDFs are read by vision), or generated from the profile as a single-page PDF.
- **Job discovery** — searches Adzuna, collapses syndicated copies of the same posting, and scores each job against the profile with an LLM (score, reasoning, matched and missing skills).
- **Find Jobs** — filter, sort and paginate scored jobs, with filter state kept in the URL. Each job has a details page with the score breakdown and an apply link.
- **Company research** — a Browserbase and Stagehand session browses the employer's website, and the model turns what it finds into a nine-field dossier.
- **Dashboard** — stat cards computed from the user's jobs, plus Recharts charts built from PostHog events through the HogQL Query API.

## Tech stack

| Area | Choice |
| --- | --- |
| Framework | Next.js (App Router), React 19, TypeScript |
| Styling | Tailwind CSS 4 |
| Backend | InsForge: Postgres with row-level security, auth, file storage |
| LLM | OpenRouter, through the OpenAI SDK |
| Browser automation | Browserbase and Stagehand |
| Jobs data | Adzuna API |
| Analytics | PostHog (events and Query API) |
| PDF | `@react-pdf/renderer` for generation, `pdf-parse` for extraction |
| Validation | Zod |

## Project structure

```
app/          routes, route handlers (app/api) and layouts
actions/      server actions for UI mutations
agent/        matcher, resume extractor and writer, company research, Adzuna client
components/   UI components grouped by page
lib/          data access, pure helpers and shared constants
db/schema.sql database schema and row-level-security policies
```

## Getting started

```bash
npm install
cp .env.example .env.local   # then fill in the values below
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Environment variables

| Variable | Purpose |
| --- | --- |
| `INSFORGE_PROJECT_URL`, `NEXT_PUBLIC_INSFORGE_URL`, `NEXT_PUBLIC_INSFORGE_ANON_KEY` | InsForge project URL (server and browser) and anon key |
| `OPENROUTER_API_KEY`, `OPENROUTER_MODEL` | LLM access and model id |
| `ADZUNA_APP_ID`, `ADZUNA_APP_KEY` | Job search |
| `BROWSERBASE_API_KEY` | Company research sessions |
| `NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST` | Event capture |
| `POSTHOG_PROJECT_ID`, `POSTHOG_PERSONAL_API_KEY` | Dashboard charts (a personal key with the `query:read` scope only) |

Without the PostHog query key the page still renders, and the charts show an "unavailable" message.

### Database

Apply `db/schema.sql` to the InsForge Postgres database. Every statement is idempotent, so it is safe to re-run.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the development server |
| `npm run build` | Production build |
| `npm start` | Serve the production build |
| `npm run lint` | Run ESLint |
