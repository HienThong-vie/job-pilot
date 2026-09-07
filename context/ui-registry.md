# UI Registry

Living document. Updated after every component is built. Read this before building any new component — match existing patterns exactly before inventing new ones.

---

## How to Use

Before building any component:

1. Check if a similar component already exists here
2. If yes — match its exact classes
3. If no — build it following ui-rules.md and ui-tokens.md, then add it here

After building any component — update this file with the component name, file path, and exact classes used.

---

## Components

### Page Shell

File: `app/page.tsx`
Last updated: 2026-09-03

| Property        | Class                                                        |
| --------------- | ------------------------------------------------------------ |
| Page width      | `mx-auto w-full max-w-[1440px] px-4 sm:px-8 lg:px-12 xl:px-20` |
| Content rules   | `border-x border-border-light` on the Hero→CTA wrapper        |
| Section divider | `border-t border-border-light`                                |
| Hatched divider | `hatch-band h-10 border-y border-border-light lg:h-[78px]`    |

**Pattern notes:**
The marketing page is a 1280px column inside a 1440px page at `xl`; the gutter steps down to 48/32/16px on smaller screens. The column's vertical rules wrap **only the Hero through the CallToAction** — the spacer above the hero and the trailing hatch band plus footer sit outside the `border-x` wrapper so no rules dangle at the top or bottom of the page. Every section owns its own `border-t`; the shell never adds one. Hatched spacer bands use the `hatch-band` utility from globals.css (45° 1px stripes in `--color-hatch`) and carry `border-y` because neither neighbour owns that rule.

---

### Logo

File: `components/layout/Logo.tsx`
Last updated: 2026-09-03

| Property        | Class                                       |
| --------------- | ------------------------------------------- |
| Mark background | `bg-linear-45 from-accent to-accent-deep`   |
| Mark size       | `size-9` (36px)                             |
| Border radius   | `rounded-[10px]`                            |
| Glyph           | `size-5 text-accent-foreground`             |
| Text — primary  | `text-[19px]/7 font-bold text-text-darkest` |
| Spacing         | `gap-2.5`                                   |
| Shadow          | none                                        |

**Pattern notes:**
The only place the 45° accent gradient is used. Mark size and radius are fixed by ui-tokens.md (36×36, 10px) — never scale them per placement. Used by both Navbar and Footer; a new placement should reuse this component rather than re-render the mark.

---

### Navbar

File: `components/layout/Navbar.tsx`
Last updated: 2026-09-03

| Property         | Class                                      |
| ---------------- | ------------------------------------------ |
| Background       | `bg-surface`                               |
| Border           | `border-b border-border-light`             |
| Height           | `h-16 lg:h-20`                             |
| Horizontal inset | `px-4 sm:px-8 lg:px-12 xl:px-20`           |
| Nav link         | `text-[15px] font-medium text-text-darker` |
| Nav gap          | `gap-8`                                    |
| Mobile menu      | `<details>` + `<summary>`, panel `absolute right-0 z-10 w-44 rounded-lg border border-border-light bg-surface p-2 shadow-lg` |
| Shadow           | none                                       |

**Pattern notes:**
Full-bleed white bar; the page's vertical rules deliberately start **below** it, so the navbar sits outside the bordered column. Nav links are centred with `flex-1 justify-center` between the logo and the CTA. Links are 15px — not the 14px in ui-tokens.md, which describes the in-app navbar; the marketing navbar is likewise 80px tall (`h-16 lg:h-20`) rather than the 64px in ui-rules.md. Below `md` the centre nav is replaced by a `<details>`/`<summary>` disclosure — no JS and no `"use client"`, so the navbar stays a Server Component. Reuse that pattern for any future menu rather than reaching for client state.

---

### Buttons — dark primary / translucent secondary

File: `components/homepage/HeroActions.tsx`
Last updated: 2026-09-03

| Property         | Primary                                                 | Secondary                               |
| ---------------- | ------------------------------------------------------- | --------------------------------------- |
| Background       | `bg-text-slate bg-linear-to-b from-accent-foreground/10 to-accent-foreground/0` | `bg-surface/55 backdrop-blur-sm` |
| Border           | none                                                     | `border border-border-muted`            |
| Border radius    | `rounded-md`                                             | `rounded-md`                            |
| Text             | `text-base font-medium text-accent-foreground`           | `text-base font-medium text-text-slate` |
| Height / padding | `h-12 px-[30px]`                                         | `h-12 px-[30px]`                        |
| Gap between pair | `gap-4`                                                  | —                                       |

**Pattern notes:**
The marketing CTAs are **dark**, not accent purple — `bg-text-slate` plus a 10%→0% top gradient reproduces the design's subtly lit button face. That gradient uses `--color-accent-foreground` (which is `#ffffff`), not the raw `white` Tailwind class — never reach for `bg-white`/`text-white`/`from-white` even at an opacity, since a token already covers every case that needs pure white. The secondary button is translucent so the mesh gradient reads through it; on a solid background use `bg-surface` instead. The navbar's "Start for free" is the same dark fill at `h-10 px-[21px] text-sm`. Purple `bg-accent` stays reserved for in-app primary actions per ui-tokens.md — see the Login Page entry below for the actual in-app instance. Both CTAs get their `{ href, label }` from `getPrimaryCta(loggedOutLabel)` in `lib/insforge-server.ts` — never hardcode `/login` or a static label in a component; `getPrimaryCta` checks the real session and returns "Go to Dashboard" for a signed-in visitor. (`lib/utils.ts` and its old `PRIMARY_CTA_HREF` constant are gone — corrected here since a stale reference to it survived one edit past the constant's removal.)

---

### Hero and CallToAction (mesh panels)

Files: `components/homepage/Hero.tsx`, `components/homepage/CallToAction.tsx`
Last updated: 2026-09-03

| Property     | Class                                                   |
| ------------ | ------------------------------------------------------- |
| Background   | `mesh-hero` / `mesh-cta`                                |
| Border       | `border-t border-border-light`                          |
| Heading      | `font-bold tracking-[-0.02em] text-text-slate`          |
| Heading size | hero `text-[28px]/[36px] sm:text-[44px]/[52px] lg:text-[56px]/[64px] xl:text-[64px]/[72px]`; CTA `text-[28px]/[36px] sm:text-[40px]/[46px] lg:text-[48px]/[52px] xl:text-[56px]/[58px]` |
| Body         | `text-base/[26px] lg:text-lg/[30px] text-text-slate-medium` |
| Alignment    | `text-center`, body centred with `mx-auto max-w-[…]`    |
| Shadow       | none                                                    |

**Pattern notes:**
Both mesh utilities live in globals.css and share the same blob layout — only the base colour differs (`--color-mesh-base` vs `--color-mesh-lilac`). Headings use `text-text-slate` (#272835), not `text-text-primary`; that is the design's display colour throughout the marketing page. Heading lines are `<span className="lg:block">` separated by a space — they flow as normal text below `lg` and snap to the designed break at `lg` and above. Never a bare `<br />`; it cannot be switched off responsively.

---

### FeatureSection

File: `components/homepage/FeatureSection.tsx`
Last updated: 2026-09-03

| Property           | Class                                                                                  |
| ------------------ | -------------------------------------------------------------------------------------- |
| Layout             | `grid grid-cols-1 border-t border-border-light lg:grid-cols-2`                          |
| Text column        | `min-w-0 bg-surface`                                                                    |
| Media column       | `flex min-w-0 ... bg-background`, `lg:order-first` when `mediaSide` is `left`            |
| Heading block      | `py-10 lg:h-[223px] lg:py-0`, heading `text-[28px]/[34px] sm:text-[36px]/[42px] lg:text-[44px]/[50px]` |
| Item block         | `border-t border-border-light`, inner `flex flex-col justify-center py-7 lg:h-[153px] lg:py-0` |
| Item rail          | `pl-6 sm:pl-10 lg:pl-12` then `border-l border-border-light` then `pl-4 sm:pl-6`         |
| Item rail (active) | `-ml-px border-l-2 border-accent-dark`                                                  |
| Item title         | `text-lg/7 font-semibold text-text-darker lg:text-xl/7`                                 |
| Item body          | `mt-2 max-w-[545px] text-[15px]/[26px] text-text-slate-medium lg:mt-2.5 lg:text-[17.5px]/[30px]` |
| Image `sizes`      | required prop `imageSizes`, e.g. `"(min-width: 1024px) 584px, 100vw"` — matches the image's own `imageClassName` max-width |

**Pattern notes:**
Items are **fixed-height blocks with vertically centred content**, not padding-driven — that is why a three-line description occupies the same height as a two-line one, exactly as the design does it. The 48px rail carries a continuous hairline; the highlighted item swaps it for a 2px `accent-dark` bar with `-ml-px` so the text never shifts. Body copy is 17.5px because Inter renders ~3.5% narrower than the design's face — that size reproduces the designed line breaks. Every call site must pass `imageSizes` matching its `imageClassName` breakpoint value — the image is CSS-responsive (`w-full` down to `lg`, fixed above it), and Next's `sizes` prop is required whenever CSS makes an image responsive; omitting it makes the browser assume 100vw and fetch an oversized file at every width.

---

### Testimonial

File: `components/homepage/Testimonial.tsx`
Last updated: 2026-09-03

| Property      | Class                                                                 |
| ------------- | --------------------------------------------------------------------- |
| Background    | `bg-surface` (inherited)                                              |
| Border        | `border-t border-border-light`                                        |
| Eyebrow label | `text-sm/5 font-semibold tracking-[0.08em] text-accent-dark uppercase` |
| Quote         | `text-[20px]/[30px] sm:text-[26px]/[38px] lg:text-[30px]/[44px] font-medium text-text-darker` |
| Attribution   | `text-base font-semibold text-text-darkest`                           |
| Role          | `text-sm text-text-secondary`                                         |
| Avatar        | `size-12 rounded-[10px] object-cover`                                 |
| Spacing       | `gap-3` between avatar and name                                       |

**Pattern notes:**
The eyebrow is the only uppercase tracked label on the page and the only marketing use of `text-accent-dark`. Avatar radius matches the logo mark (`rounded-[10px]`), not the card radius.

---

### DashboardPreview

File: `components/homepage/DashboardPreview.tsx`
Last updated: 2026-09-03

| Property      | Class                                     |
| ------------- | ----------------------------------------- |
| Background    | `bg-background`                           |
| Border        | `border-t border-border-light`            |
| Image         | `h-auto w-full min-w-0 max-w-[1191px]`    |
| Image `sizes` | `"(min-width: 1024px) 1191px, 100vw"`     |
| Spacing       | `px-4 py-6 sm:px-8 lg:px-0 lg:pt-[26px] lg:pb-[13px]` |

**Pattern notes:**
The asset carries its own rounded corners and a transparent shadow margin (120px sides, 112 top, 200 bottom), so no CSS rounding or shadow is added and the element is sized to the whole asset, not the visible card. Marked `priority` because it is above the fold; every other image on the page stays lazy. `sizes` matches the `max-w`, not the viewport — this image never exceeds 1191px even at very wide screens.

---

### Footer

File: `components/layout/Footer.tsx`
Last updated: 2026-09-03

| Property | Class                                      |
| -------- | ------------------------------------------ |
| Height   | `py-10 lg:h-[130px] lg:py-0`               |
| Inset    | `lg:pl-10 lg:pr-14`                        |
| Link     | `text-[15px] font-medium text-text-darker` |
| Link gap | `gap-8`                                    |
| Border   | none (the hatched band above carries it)   |

**Pattern notes:**
Footer content is inset 40px inside the page column — unlike the navbar, which sits flush to it. The right inset is 56px rather than 40px; that asymmetry is in the design and is deliberate here, not a mistake to "correct".

---

### Login Page

Files: `app/(auth)/login/page.tsx`, `components/auth/OAuthButton.tsx` (pending state: `components/auth/SubmitButton.tsx`, own entry below)
Last updated: 2026-09-05

| Property         | Class                                                                 |
| ---------------- | ---------------------------------------------------------------------- |
| Page             | `flex min-h-screen items-center justify-center bg-background px-4`     |
| Card             | `w-full max-w-[400px] rounded-2xl border border-border bg-surface p-6 shadow-sm` |
| Heading          | `text-lg font-semibold text-text-primary`                              |
| Subtext          | `text-sm text-text-secondary`                                          |
| Error banner     | `rounded-md bg-error/10 px-3 py-2 text-center text-sm text-error`       |
| Google button    | `flex h-11 w-full items-center justify-center gap-3 rounded-md border border-border bg-surface text-sm font-medium text-text-primary` |
| GitHub button    | same shape, `bg-accent text-accent-foreground` (no border) — the app's Primary button token per `ui-tokens.md` |
| Pending state    | via `SubmitButton` — see its own entry below |

**Pattern notes:**
No design asset exists for this page (every other page has a PNG in `context/designs/`), so it's built directly from `ui-tokens.md`/`ui-rules.md` card and button conventions rather than measured. Each `OAuthButton` is its own `<form action={signInWithOAuthAction.bind(null, provider)}>` wrapping a `SubmitButton` — the form itself needs no `"use client"` (the whole page stays a Server Component tree since OAuth kickoff is a Server Action), but `SubmitButton` (`components/auth/SubmitButton.tsx`) is a small client component because `useFormStatus()` must run in a child of the `<form>`, never the component that renders the `<form>` tag itself. The GitHub button uses `bg-accent` — the same in-app Primary button token used everywhere else — not the marketing-only `bg-text-slate` dark fill from the homepage CTAs; that fill is reserved for the marketing page per its own registry entry above. Google and GitHub marks are inline SVGs (`lucide-react` has no brand logos — only generic `Git*` icons), following the same pattern `Logo.tsx` uses for the one other brand mark on the site. The error banner renders when `?error=oauth_failed` is present, read via `PageProps<"/login">`'s `searchParams` promise.

---

### SubmitButton (pending-state wrapper)

File: `components/auth/SubmitButton.tsx`
Last updated: 2026-09-05

| Property        | Class                                                        |
| --------------- | ------------------------------------------------------------- |
| Base            | takes the caller's full button `className` as a prop — no styling of its own |
| Disabled state  | `disabled:cursor-not-allowed disabled:opacity-60`              |
| Pending content | swaps `children` for `<Loader2 className="size-5 animate-spin" />` |

**Pattern notes:**
Generic — not auth-specific despite living in `components/auth/`. Any `<form action={someServerAction}>` that wants a pending/disabled submit state should reuse this rather than re-implementing `useFormStatus()`. It exists as its own component only because `useFormStatus()` must run in a child of the `<form>` element, never in the same component that renders the `<form>` tag — so the button half of any Server-Action form has to be a separate client component. If this pattern gets used outside `auth/`, move the file to a shared location (e.g. `components/ui/`) rather than importing across feature folders.

---

### App Shell (signed-in pages)

Files: `app/(app)/layout.tsx`, `components/layout/AppNavbar.tsx`
Last updated: 2026-09-06

| Property             | Class                                                                 |
| -------------------- | --------------------------------------------------------------------- |
| Page background      | `bg-background` on the layout wrapper (root `body` stays `bg-surface`) |
| Navbar               | `h-16 border-b border-border bg-surface` — height on the **header**, inner row `h-full` |
| Navbar inset         | `px-4 sm:px-6` (24px at the design width), full-bleed — no max-width   |
| Nav item             | `flex h-full items-center gap-2 border-b-2 px-2 text-sm font-medium sm:px-4` |
| Nav item — active    | `border-accent text-accent`, icon `text-accent`                        |
| Nav item — inactive  | `border-transparent text-text-label`, icon `text-text-muted`           |
| Nav gap              | `gap-0.5 sm:gap-2.5`                                                   |
| Page column          | `mx-auto w-full max-w-[1000px] px-4 py-9 sm:px-8` → 936px cards        |

**Pattern notes:**
The in-app navbar is a **separate component from the marketing `Navbar`** — different height rules, different link styling, no CTA. It is the one `"use client"` component in `layout/`, because the active item comes from `usePathname()`; `Logo` is reused unchanged.

Two design/rules conflicts were resolved in the design's favour, per ui-rules.md's own "design assets are the source of truth for visual decisions": the active item carries a **2px accent underline** (ui-rules.md says "colour change only, no underline") and every item has a **leading icon** (ui-rules.md does not mention icons). Inactive links are `#4A5565`, which ui-rules.md specifies but no token covered — added as `--color-text-label`, which is also the colour of every form label on this page.

**Height must sit on the `<header>`, not the inner row.** With `border-box`, `h-16` on the header makes the 1px bottom border part of the 64px; putting `h-16` on the inner div instead yields 65px and pushes the whole page down by a pixel.

The page column is `max-w-[1000px]` with `px-8`, not `max-w-[936px]`, so the **cards** land on the designed 936px while the gutter still collapses on small screens.

---

### Profile Page

Files: `app/(app)/profile/page.tsx` and `components/profile/*`
Last updated: 2026-09-07

| Property                 | Class                                                                   |
| ------------------------ | ----------------------------------------------------------------------- |
| Card                     | `rounded-2xl border border-border bg-surface p-8 shadow-sm` (32px padding, not the 24px in ui-rules.md) |
| Card gap                 | `gap-9` (36px) between cards, `py-9` page padding                        |
| Card heading             | `text-xl/6 font-semibold text-text-primary`                             |
| Card subtext             | `mt-1.5 text-sm text-text-secondary`                                    |
| Section                  | `border-t border-border py-12` — the divider is the section's own top border |
| Section heading          | `text-base font-semibold text-text-primary`, content `mt-6`             |
| Field label              | `text-xs font-semibold tracking-[0.01em] text-text-label uppercase`, control `mt-1.5` |
| Field grid               | `grid grid-cols-1 gap-5 sm:grid-cols-2` (20px, both axes)               |
| Input                    | `h-[42px] rounded-md border border-border px-4 text-sm text-text-darkest` |
| Input — filled vs empty  | `bg-surface-secondary placeholder-shown:bg-surface`                     |
| Input — nested variant   | `h-[38px] bg-surface disabled:bg-surface-secondary disabled:text-text-darkest/50` |
| Placeholder              | `placeholder:text-text-darkest/50`                                      |
| Focus                    | `focus:border-accent focus:ring-1 focus:ring-accent focus:outline-none`  |
| Select                   | same as input + `appearance-none pr-10`, `ChevronDown` `absolute right-2 size-4 text-text-label` |
| Tag chip                 | `rounded-md border border-border bg-background py-1.5 pr-2.5 pl-3 text-sm` (34px tall), list `mt-3.5 gap-2` |
| Add button (tag input)   | `h-[42px] rounded-md bg-surface-tertiary px-4 text-sm font-medium text-text-dark` |
| Work-experience card     | `rounded-lg border border-border bg-surface-secondary p-5`, rows `gap-4` |
| Dropzone                 | `h-[252px] rounded-xl border-2 border-dashed border-border bg-surface-secondary`, content centred |
| Dropzone icon            | `size-13 rounded-full bg-surface shadow-sm` + `CloudUpload size-7 text-accent` |
| Primary button (in-card) | `h-10 rounded-md bg-accent px-5 text-sm font-semibold text-accent-foreground` |
| Save button              | `flex h-12 w-full items-center justify-center rounded-lg bg-accent text-base font-semibold`, above it `border-t border-border pt-8` |
| Form status line         | `text-sm` — `text-error-strong` when the action failed, `text-text-dark` otherwise; `mb-4` above the Save button, `mt-4` under the dropzone |
| Attention banner         | `rounded-2xl border border-error-light bg-error-tint px-8 py-9.5 shadow-sm` |
| Missing-field tag        | `rounded-md bg-error-lightest px-2.5 py-1 text-xs/4 font-bold text-error-strong` (not a pill) |
| Completion ring          | `size-32` SVG, `r=58`, `strokeWidth=12`, `-rotate-90`, track `stroke-error-light`, fill `stroke-error` |

**Pattern notes:**
Measured off `context/designs/profile.png` (2940px export of a 1470px canvas — **scale exactly 2**, confirmed by the 36px logo mark and the 64px navbar). Every card boundary and section height renders within **2px** of the design.

**Inputs signal "has a value" with a tint.** On a white card an input carrying a value is `bg-surface-secondary` and an empty one is `bg-surface` — done with the CSS `placeholder-shown:` variant, so it stays correct as the user types with no JS. Inside the tinted work-experience card the rule inverts: inputs are always white and only a **disabled** one takes the tint, so give those `nested`. Every input therefore needs a `placeholder` — without one, `:placeholder-shown` never matches and an empty field renders tinted.

**Placeholders are `text-text-darkest/50`, not `text-text-muted`.** The design's placeholder colour is `#888B93`, which is exactly Chrome's default (input colour at 50%); `--color-text-muted` (#99A1AF) from ui-rules.md is visibly lighter. The opacity modifier reproduces the design and stays consistent across browsers.

**Dates are `<input type="month">`** — "January 2022" and the empty `---------- ----` in the design are Chrome's own month-input rendering, and the schema stores `YYYY-MM`. The "Currently working here" checkbox is left **unstyled** (native blue) because that is what the design shows; its label needs `text-sm/4` so the label row stays 16px and the row height matches the plain fields. The textarea needs `block` — as an inline-block it adds ~6px of baseline gap below itself.

**Avoid `py-[38px]`-style arbitrary values for spacing here.** `py-[38px]` silently produced *no* rule in this project's Tailwind build while `h-[38px]` and `h-[252px]` worked; `py-9.5` (the fractional step on v4's dynamic spacing scale) is the reliable way to reach 38px. A missing padding class fails silently — always confirm a computed style after using one.

**Form feedback (feature 06).** Both cards report the result of their Server Action with a single `<p role="status">` line rather than a toast or a banner — the design has no state for either. Error copy is `text-error-strong`; success and the resting "a resume is on file" note are `text-text-dark`. The line is the only element the design does not specify, so it stays to one line of body text.

**Error text uses `role="alert"`, everything else `role="status"`.** A polite live region is not reliably announced for a failed save, so the status line switches role with its severity.

**Two `text[]` fields moved from comma-separated inputs to `TagInput`** — Job Titles Seeking and Preferred Locations. A single comma-separated input cannot represent a value that itself contains a comma ("San Francisco, CA" split into two rows), and both columns are `text[]` exactly like Skills and Industries. This is a deliberate deviation from `profile.png`, which shows plain inputs for both; the trade was correctness over a pixel match, and it reuses a component already on the page rather than introducing a pattern.

**The dropzone validates before it submits.** Type and size are checked in the input's `onChange`; a rejected file sets a local error, clears the input, and never reaches the Server Action — Next refuses an over-limit action body before the action can return its own message. `uploadResume` re-checks server-side regardless.

**Pending states reuse `SubmitButton`.** The Save button is the shared `components/auth/SubmitButton.tsx` (`useFormStatus` → spinner + `disabled:opacity-60`), so it needs `flex items-center justify-center` to centre the swapped-in `Loader2`. The dropzone has no button to disable, so it shows pending by swapping its `CloudUpload` glyph for a spinning `Loader2` and its heading for "Uploading your resume…", and by disabling the file input.

Section dividers are the section's own `border-t`, so sections stack without a separate divider element and the card header just carries `pb-4`.

---

## Responsive Rules

Last updated: 2026-09-03

Mobile-first. The design is the `xl` (1440px) target; every smaller breakpoint steps down from it.

| Breakpoint     | What changes                                                                 |
| -------------- | ---------------------------------------------------------------------------- |
| base (<640)    | Single column, CTA buttons stack full width, navbar menu collapses to `<details>` |
| `sm` (≥640)    | CTA buttons go side by side, footer becomes a row, gutters grow to 32px       |
| `md` (≥768)    | Navbar's centre nav appears, mobile menu hides                                |
| `lg` (≥1024)   | Feature sections become two columns, fixed design heights and the designed line breaks switch on |
| `xl` (≥1280)   | Full design type scale and the 80px page gutter                              |

**Pattern notes:**

- **Designed line breaks are `lg`-only.** Heading lines are `<span className="lg:block">` separated by a space, so they read as flowing text on small screens and snap to the designed two-line break at `lg`. Never use a bare `<br />` — it cannot be turned off responsively.
- **Fixed design heights are `lg`-only.** Feature blocks are `py-7 lg:h-[153px] lg:py-0`; the heading block is `py-10 lg:h-[223px] lg:py-0`. Below `lg` the content sets the height so nothing clips.
- **Every image inside a flex or grid parent needs `min-w-0`** alongside `w-full max-w-[…]`. A replaced element's automatic minimum size is its intrinsic width clamped by `max-width`, which otherwise becomes a hard floor that overflows narrow viewports.
- Media columns render after the text column in the DOM and use `lg:order-first` when `mediaSide` is `left`, so mobile always reads text first.
