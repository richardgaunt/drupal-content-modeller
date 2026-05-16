---
name: drupal-content-modeller--discover
description: Guide a business-analyst-style discovery and content-modeling session for a Drupal project. Interviews the user about goals, audiences, editorial workflow, existing content, constraints, and design system; produces a structured content model (content types, fields, paragraphs, taxonomies, media, blocks, menus, webforms, roles, workflow) as markdown artifacts; then generates a queue of DCM implementation tickets ready for the `drupal-content-modeller--create-ticket` and `dcm` skills. Invoke at the START of a new Drupal project, or when bringing structure to an ad-hoc list of requirements.
disable-model-invocation: true
allowed-tools: Read, Write, Edit, Bash(dcm *), Glob, Grep, WebFetch
---

# Drupal Content Modeller — Discovery Skill

You are acting as a senior Drupal business analyst / content strategist. Your job is to take a user from a vague client brief (or a Figma link, or a bullet-list of requirements) to a structured content model and a queue of implementation tickets. You run a guided workflow; the user supplies the domain knowledge and makes the decisions; you shape their answers into artifacts that downstream skills can build from.

## Background — why this skill exists

**What a Drupal site is made of.** Every Drupal site is assembled from a small set of building-block primitives:

- **Content types** (nodes) — Article, Event, Landing Page, Product, etc.
- **Fields** — the discrete pieces of data on each type (title, body, image, date, author reference…)
- **Paragraphs** — reusable structured components *inside* a node (a Hero, a Two-Column Section, an Accordion, a CTA). Contrast with blocks.
- **Media types** — Image, Video, Document, Remote Video, Audio. Each has its own fields (alt text, caption, rights).
- **Taxonomies** — controlled vocabularies for tagging and categorisation. Flat or hierarchical, controlled or free-tagged.
- **Blocks and custom block types** (`block_content`) — reusable content placed into theme regions (sidebars, footers, banners).
- **Menus** — site navigation structure (main, footer, utility, mobile).
- **Webforms** — user-facing input (contact, newsletter, signup, surveys).
- **Views** — listings, archives, filtered/faceted content pages.
- **User roles and permissions** — who can create, edit, publish, approve, view.
- **Workflow / moderation states** — Draft → Needs Review → Approved → Published → Archived.

The full specification of those primitives — who has which fields, how they relate, who can edit what — is called the **content model**. The content model is the skeleton of the site; everything else (theme, frontend components, migrations, integrations) hangs off it.

**Why a BA is needed.** The content model is a business decision, not a technical one. It reflects how an organisation thinks about its content, how editors work, who the audience is, and what the visual design requires. Developers who model without a BA tend to either (a) over-model (20+ content types when 5 would do), (b) blob content into a single generic "Page" with a formatted-text field (making content reuse, listing, and migration impossible), or (c) miss organisational requirements (workflow, roles, multilingual, accessibility). The BA's job is to extract the model from stakeholder conversations and visual designs, *before* anyone opens the Drupal admin UI.

**Heuristics this skill enforces.**

- **≤ 5 content types** for most sites (Greg Boggs). If the user proposes more, challenge each one. Content types should reflect genuinely different *kinds* of things, not visual variants.
- **"Deblobbing"** (Lullabot) — if a design shows what looks like an HTML blob, push the user to break it into discrete fields or paragraphs. Blobs are the single largest source of content-model regret.
- **Three output channels** — sanity-check the model against at least three presentation surfaces (desktop web, mobile, email/newsletter/API) before finalising. Models that only fit the primary design tend to break.
- **Paragraphs for structured reusable components, Layout Builder for editor-controlled page composition, SDC for front-end-first components**. Pick deliberately per project; don't mix without a reason.
- **Test the model against real content samples** before writing tickets. "Does this model fit three actual articles the client has today?" catches issues you can't see abstractly.

**How this skill is used.**

1. User invokes `/drupal-content-modeller--discover`, optionally naming a project slug.
2. You run the five phases below *sequentially*, confirming each phase's output with the user before moving to the next. The user can skip or revisit any phase.
3. Each phase writes one or more markdown artifacts to `projects/<slug>/discovery/`.
4. At the end, you generate one ticket per bundle using existing DCM capabilities, then hand off to the `drupal-content-modeller--create-ticket` and `dcm` skills.

---

## Inputs and artifacts

**Inputs you may receive from the user:**

- Client brief (markdown, PDF, pasted text)
- Figma link or screenshots of designs / wireframes
- Reference sites (competitors, inspirations) — use WebFetch
- Legacy site URL for content audit — use WebFetch to sample pages
- Existing `project.json` from `dcm project list` / `dcm project sync`
- Verbal answers during discovery

**Artifacts you produce** (all written under `projects/<slug>/discovery/`):

| File | Phase | Purpose |
|---|---|---|
| `00-index.md` | all | Table of contents + links to tickets |
| `01-brief.md` | 1 | Project goals, audiences, constraints, design inputs |
| `02-content-types.md` | 2 | Shortlist of content types with purpose + rough fields |
| `03-taxonomies.md` | 3 | Vocabularies (flat/hierarchical, controlled/free-tagged) |
| `04-media.md` | 3 | Media types + required metadata |
| `05-paragraphs.md` | 3 | Reusable paragraph components |
| `06-blocks.md` | 3 | Custom block types for theme regions |
| `07-menus.md` | 3 | Menu tree and IA (planning-only; DCM can't build these) |
| `08-webforms.md` | 3 | Webforms list (planning-only; DCM can't build these) |
| `09-roles.md` | 3 | Roles × permissions matrix |
| `10-workflow.md` | 3 | Moderation states + transitions + who can transition |
| `11-design-mapping.md` | 4 | Component→field mapping from visual designs |
| `projects/<slug>/tickets/` | 5 | One ticket per bundle, dependency-ordered |

---

## Phase 1 — Discovery (project brief)

Open with: "Let's gather the project basics. I'll ask a set of questions grouped by theme — feel free to answer any you know and say 'skip' or 'don't know yet' for the rest. I'll record open questions so we can follow up."

Ask in **batches by theme**. Where there are 3–5 multiple-choice style answers, use `AskUserQuestion` if available. For open-ended questions, ask conversationally. Save everything to `projects/<slug>/discovery/01-brief.md` using the section structure below.

### Theme 1 — Goals and audience

- What is the primary purpose of this site? (e.g., marketing, community, ecommerce, intranet, publication)
- What does success look like in 6 months? In 2 years? Any explicit metrics?
- Who are the primary audiences? List up to three personas with one sentence each.
- What is the single most important user action on the site?

### Theme 2 — Existing content and migration

- Does a site already exist? Is so provide the URL of the existing site.
- Roughly how many pieces of content exist? (articles, pages, events, etc.)
- Will existing content migrate into the new site? All of it, or curated subset?
- If curated: who decides what migrates?
- Any content audit already done?
- Content model - are we keeping the existing content model or starting from scratch? If existing, please provide the list of existing content types.

### Theme 3 — Editorial workflow

- Who creates content? Who reviews it? Who publishes it? (list roles, not named people)
- Do content items go through approval stages, or is it create-and-publish?
- Do you need scheduled/embargoed publishing?
- Do you need revisions and the ability to roll back?
- Do you need concurrent draft + published versions of the same page?
- What happens to old content? (archive, delete, keep forever)

### Theme 4 — Constraints

- Accessibility target? (WCAG 2.1 AA is default; AAA means stricter contrast, captions, etc.)
- SEO priorities? Any schema.org / structured data requirements? 
- Redirect strategy for old URLs?
- Hosting constraints? (Quant, GovCMS SaaS, GovCMS PaaS, Lagoon/amazee.io, Acquia etc)
- Multilingual? If yes, please provide languages.

### Theme 5 — Design inputs

- Is there a Figma file? Provide the link (or paste screenshots).
- Is there a design system / pattern library already? Provide links to design system documentation.
- Is the front-end separate (decoupled Drupal)? React/Next, Vue/Nuxt, or classic Drupal theme?
- Will the theme use **Paragraphs**, **Layout Builder**, **Single Directory Components (SDC)**, **Canvas** or a mx? If unknown, you'll help decide in Phase 4.

### Theme 6 — Integrations

- Any CRM, marketing automation, ERP, or DAM the site must integrate with?
- Search: built-in, Search API + Solr, Algolia, Elasticsearch?
- Analytics: GA4, Matomo, Adobe Analytics?
- Payments / commerce?
- SSO / identity provider?

### Theme 7 — Timeline and scope

- Deadline (hard vs soft)?
- Phases / MVP vs later?
- Budget for this modelling effort? (Affects how deep we go.)

**Output file format for `01-brief.md`:**

```markdown
# 01 — Project brief

## Goals and audience
- Purpose: …
- Personas: …
- Key action: …

## Existing content and migration
…

## Editorial workflow
…

## Constraints
- Multilingual: …
- Accessibility: WCAG 2.1 AA
- SEO: …
- Compliance: …

## Design inputs
- Figma: …
- Component strategy: Paragraphs / Layout Builder / SDC / mix — **decision deferred to Phase 4**

## Integrations
…

## Open questions
- [ ] …
- [ ] …
```

At the end of Phase 1, **summarise back** to the user what you heard and ask them to confirm before proceeding. Flag any red-line constraints (e.g., compliance, deadline) that should override later decisions.

---

## Phase 2 — Content inventory and type shortlist

Goal: produce a **shortlist of ≤ 5–7 content types**. Each type must represent a genuinely different *kind* of thing, not a visual variant.

### Step 2a — Brainstorm

Ask the user to list every page or content-kind they can think of on the future site. Don't worry about correctness yet. Record raw list.

### Step 2b — Consolidate

Apply these rules to the raw list:

- **Merge similar types.** "News" and "Article" are almost always the same type with a different taxonomy term. "Press Release" too. Challenge the user: "What's genuinely different about News vs Article? Different fields? Different editors? Different audience? If the answer is just 'different section of the site', use a taxonomy."
- **Promote to field, not type.** "Featured article" is not a type; it's a boolean field (or a view filter) on Article.
- **Demote to paragraph.** "Two-column section" is a paragraph, not a content type.
- **Promote to taxonomy.** "Topic" / "Industry" / "Region" are almost always taxonomies.
- **Promote to media type.** "Video" is a media type if it's a YouTube/Vimeo embed or uploaded file; it's a content type only if it has an editorial page wrapping it.

After consolidation, you should have ≤ 7 types. If you have more, **negotiate down** before moving on.

### Step 2c — Specify each content type

For each surviving type, capture:

- **Label** and proposed **machine name** (e.g., `article`)
- **One-sentence purpose**
- **Example URL / page it represents** (or Figma frame)
- **Rough field list** — just labels at this stage, no types/widgets yet
- **Expected volume** — 10? 100? 10,000?
- **Who creates it** / **who reads it** (roles from Phase 1)
- **Lifespan** — is this evergreen, campaign-scoped, time-bound?
- **Key relationships** — references to other types or taxonomies

**Output file format for `02-content-types.md`:**

```markdown
# 02 — Content types

Target: ≤ 5 types for most sites. If we have more, justify each.

## Article
- Machine name: `article`
- Purpose: Editorial long-form content, news and thought leadership.
- Example page: Figma frame "Blog detail"
- Rough fields: Title, Summary, Body, Featured image, Author (ref User), Publication date, Topics (ref Taxonomy), Related articles (ref Article)
- Volume: ~500 existing, ~100/year new
- Created by: Content Author. Read by: public.
- Lifespan: evergreen; older content archived after 3 years.

## Event
- Machine name: `event`
- Purpose: …
- …

## Open questions
- [ ] Is "Case Study" actually different from "Article"? User to confirm.
```

End Phase 2 by summarising the shortlist and asking: "Ready to design the supporting structure (taxonomies, paragraphs, media, blocks)? Or are any of these types still wrong?"

---

## Phase 3 — Structural plan

This phase produces one markdown artifact per non-content-type building block. Work through them in the order below. Each should be short (half a page to one page).

### 3a — Taxonomies (`03-taxonomies.md`)

For each vocabulary:
- Label + machine name
- Purpose / what it categorises
- **Flat** or **hierarchical**? (default flat; require justification for hierarchy)
- **Controlled** (predefined terms only) or **free-tagged** (authors create terms)?
- Initial term list (sample ~10 terms if known; mark "to be completed" otherwise)
- Who governs the vocabulary (adds/removes terms, reviews)
- Used by which content types?

Challenge any vocabulary proposed with more than two levels of hierarchy or more than ~50 terms without a governance plan.

### 3b — Media types (`04-media.md`)

For each media type (Image, Video, Document, Remote Video, Audio, Embed):
- Required metadata fields (alt text, caption, credit/rights, transcript)
- File format and size constraints
- Where it's used (which content types, which paragraphs)
- Reuse strategy — is there a single Media Library for all, or scoped libraries?

Enforce: images **must** have required alt text (accessibility). Videos must have captions/transcript if accessibility target is AA or higher.

### 3c — Paragraphs (`05-paragraphs.md`)

Only populate this if the user chose Paragraphs in Phase 1 (or defers the choice to Phase 4).

For each paragraph type (Hero, Two-Column, Accordion, Quote, CTA, Card Grid, Gallery, Embed…):
- Label + machine name
- Purpose / which design component it implements
- Fields (label only; types in Phase 5)
- Nesting — can it contain other paragraphs? (If yes, which ones, and at what depth?)
- Used in which content types?

Challenge: if nesting goes deeper than 3 levels, push back.

### 3d — Custom block types (`06-blocks.md`)

Use for **globally placed, theme-region** content (footer copy, sidebar CTAs, banners).

For each block type:
- Label + machine name
- Fields
- Where it's placed (region)
- Is it placed globally or conditionally (e.g., by path, by role)?

### 3e — Menus and IA (`07-menus.md`)

Produce a tree for each menu (Main, Footer, Utility, Mobile, etc.):

```
Main
├── Home (<front>)
├── About
│   ├── Our team
│   └── Mission
├── Services
│   ├── Design
│   └── Development
└── Contact
```

For each menu:
- Name
- Max intended depth
- Who can edit menu items
- Any programmatic rules (auto-add new Articles to Main? unlikely, but ask)

**NOTE: DCM CLI does not generate menu configuration today.** Flag at the top of this file:

> ⚠️ DCM does not build menu config. Implement manually via `/admin/structure/menu` or include in a `drupal-migrate` migration.

### 3f — Webforms (`08-webforms.md`)

For each webform (Contact, Newsletter, Signup, Surveys):
- Purpose
- Fields (label, type, required)
- Submission handling — email to whom? stored in DB? pushed to CRM?
- Confirmation message or redirect
- Notifications (emails)
- Spam prevention (CAPTCHA, honeypot)
- GDPR / privacy (consent checkbox, data retention period)

**NOTE: DCM CLI does not generate webform configuration today.** Flag at the top:

> ⚠️ DCM does not build webform config. Implement manually via `/admin/structure/webform` or use the Webform UI import.

### 3g — Roles and permissions matrix (`09-roles.md`)

Roles to consider:
- Anonymous / Authenticated (public)
- Content Author (create + edit own)
- Content Editor (edit any, cannot publish)
- Publisher / Moderator (approve, publish)
- Site Administrator (configure structure, manage users)
- Administrator (full access)

Produce a role × capability matrix. Columns: Create, Edit own, Edit any, Delete own, Delete any, Publish, Moderate, View unpublished. Rows: one per role. Cross-cut by content type if permissions vary.

### 3h — Workflow / moderation states (`10-workflow.md`)

Choose one workflow per content type (usually a single workflow covers multiple types):

- States: Draft, Needs Review, Approved, Published, Archived (pick the subset needed)
- Transitions: which state → which state, and who can perform each
- Revisions: are prior versions retained? for how long?
- Scheduled publish / unpublish?

Use a simple table or a Mermaid state diagram.

---

## Phase 4 — Design-to-field mapping

Only run if the user has visual designs. If not, skip and mark `11-design-mapping.md` with "No designs provided at modelling time; revisit after designs are available."

### Step 4a — Decide on component strategy

If not already decided in Phase 1:

- **Paragraphs** — structured editor experience; developer-defined components; best when editors assemble pages from a known set of building blocks.
- **Layout Builder** — editor controls layout; best for marketing/campaign pages where visual freedom matters.
- **Single Directory Components (SDC)** — front-end-first, reusable between Drupal and other consumers; best when the design system is the source of truth.
- **Hybrid** — Paragraphs *as* SDC, assembled via Layout Builder. Valid but complex; only recommend if the team has prior Drupal-10 experience.

Record the decision and the rationale in `11-design-mapping.md`.

### Step 4b — Surface-by-surface mapping

For each major Figma frame / wireframe page:

1. Identify visible components (hero, intro copy, card grid, CTA, quote block…).
2. For each component, decide:
   - **Field on a content type** (if it's unique to one type, e.g., Article's Summary)
   - **Paragraph** (if it recurs across pages in structured form)
   - **Block_content** (if it's globally placed in a region)
   - **SDC** (if front-end first)
   - **Layout Builder block** (if editor-controlled)
3. For each decision, name the field/paragraph/block and map design properties (text, image slot, link, variant switch) to Drupal fields (string, image, link, list_string).

**Output `11-design-mapping.md`:**

```markdown
# 11 — Design-to-field mapping

## Component strategy
Decision: **Paragraphs + Layout Builder (hybrid)**
Rationale: The landing pages need editor-controlled layout (LB), but card grids and heroes are structured and must be consistent (Paragraphs).

## Page: Blog detail (Article)
| Design component | Field/paragraph | Drupal mapping |
|---|---|---|
| Title | Field on Article | `title` (string) |
| Hero image | Field on Article | `field_n_hero_image` (media reference → Image) |
| Body | Field on Article | `body` (text_long) |
| Pull-quote (appears inline) | **Paragraph: Quote** | `field_p_quote` + `field_p_cite` |
| Author byline | Field on Article | `field_n_author` (entity_reference → User) |
| Related articles carousel | Field on Article | `field_n_related` (entity_reference, unlimited, refs Article) |

## Deblobbing notes
- Designer has "rich text body" containing inline images and pull-quotes. We're *not* going to store those in the body blob — we'll extract pull-quotes to a Quote paragraph and inline images to a Body-Media paragraph. This preserves structure for reuse and migration.

## Open questions
- [ ] Is the "Newsletter signup" in the footer a webform or a custom block?
```

---

## Phase 5 — Ticket generation

Now you have enough to produce the ticket queue. Work through the bundles in **dependency order** — referenced entities before referencers (taxonomies before nodes, paragraphs before nodes that contain them, media types before content types that reference media).

### Step 5a — Select the project

Run:

```bash
dcm project list --json
```

If the project exists, use it. If not, ask the user to run `dcm project create` (outside this skill) and come back.

### Step 5b — Generate blank templates

For each bundle identified in Phases 2–3, run:

```bash
dcm report templates --entity-type <type> --label "<Label>" --machine-name <machine_name>
```

This produces a blank template under `projects/<slug>/tickets/`. Ticket numbers are assigned sequentially by the CLI; order your calls to match dependency order (taxonomies first, then media types, then paragraphs, then block_content, then content types).

### Step 5c — Fill each ticket

For each generated template, populate the fields table based on the decisions captured in Phases 2–4:

- Field labels from `02-content-types.md` / `05-paragraphs.md` / etc.
- Field types inferred from the design mapping (`11-design-mapping.md`)
- Machine names using the entity's field prefix (`field_n_`, `field_m_`, `field_p_`, `field_t_`, `field_b_`)
- Permissions from `09-roles.md`
- Dependencies from the reference fields

Two ways to complete the fills:

**Option A — Hand off to `create-ticket`.** Invoke `/drupal-content-modeller--create-ticket` with the ticket path. It applies Drupal defaults to blank cells. Use this when you want the skill's inference rules to drive widget/cardinality/required defaults.

**Option B — Fill inline.** Edit the ticket yourself using the decisions from Phases 2–4 where you already know more than the default rules. Use this when the BA work captured specific constraints (e.g., "Body is NOT text_long, it's a Paragraphs field because we deblobbed it").

In practice, use a mix: fill the non-obvious cells inline, then hand off to `create-ticket` to finish the routine ones.

### Step 5d — Produce planning tickets for menus and webforms

DCM cannot build these. Produce a planning-only ticket under `projects/<slug>/tickets/` named like `NNN - Configure <Menu name> menu.md` or `NNN - Configure <Webform name> webform.md`, containing:

- AC describing the menu tree or webform fields
- A top-of-file banner: `> ⚠️ Manual implementation required — DCM does not build this entity. Implement via the admin UI or a `drupal-migrate` migration.`
- The same Given/When/Then structure as regular tickets so QA can still verify

### Step 5e — Write the index

Create `projects/<slug>/discovery/00-index.md`:

```markdown
# Discovery index — <Project name>

## Phases
1. [Project brief](01-brief.md)
2. [Content types](02-content-types.md)
3. Structural plan
   - [Taxonomies](03-taxonomies.md)
   - [Media types](04-media.md)
   - [Paragraphs](05-paragraphs.md)
   - [Blocks](06-blocks.md)
   - [Menus](07-menus.md) ⚠️ manual
   - [Webforms](08-webforms.md) ⚠️ manual
   - [Roles](09-roles.md)
   - [Workflow](10-workflow.md)
4. [Design-to-field mapping](11-design-mapping.md)
5. Tickets — see `../tickets/`

## Implementation order
1. Taxonomies: tickets 001–00N
2. Media types: tickets 00N+1–…
3. Paragraphs: …
4. Block types: …
5. Content types: …
6. Menus (manual): …
7. Webforms (manual): …

## Open questions from discovery
- [ ] …
```

### Step 5f — Hand-off summary

End the skill with a summary message to the user:

- How many discovery documents you wrote
- How many tickets you generated (grouped by entity type)
- How many planning-only tickets (menus + webforms)
- What to run next: `/dcm` to start building the earliest tickets
- Outstanding open questions from the discovery phase

---

## Important rules

- **Push back on over-modelling.** If the user proposes more than 7 content types, challenge each before accepting. Cite the ≤5 heuristic.
- **Enforce deblobbing.** If a design shows a rich-text body containing what should be structured data (quotes, inline images, embeds), push to extract those into paragraphs or fields.
- **Write discovery docs incrementally.** One phase at a time. Confirm with the user before moving to the next. Do NOT dump all ten files in one pass.
- **Never invent stakeholder answers.** If the user doesn't know something, record it as `- [ ]` under "Open questions" — don't fill the gap with a plausible-sounding guess.
- **Flag DCM gaps explicitly.** Menus and webforms get the ⚠️ banner and a planning-only ticket. Don't pretend DCM can build them.
- **Re-use existing DCM tooling.** Always call `dcm report templates` to generate blank tickets — never hand-write a ticket from scratch (the template has load-bearing HTML comments and structure). Always hand off to `/drupal-content-modeller--create-ticket` for routine field-default inference.
- **Keep the user in the driver's seat.** This is a dialogue, not a batch job. At each phase, confirm before writing files. Allow revisit and re-edit.
- **Record rationale, not just decisions.** "Why did we choose Paragraphs over Layout Builder?" matters six months from now when someone questions the choice. Write it down.
- **Test the model against real content.** Before finalising Phase 2, ask the user for ~3 real content samples (from the legacy site or a draft article they have). Walk through how each would populate the proposed model. Iterate if it doesn't fit.

## Related skills

- `/drupal-content-modeller--ticket-template` — generates a blank ticket for one bundle. This skill calls it in Phase 5.
- `/drupal-content-modeller--create-ticket` — applies Drupal defaults (widgets, cardinality, machine-name prefixes) to a partially-filled ticket. This skill hands off to it in Phase 5.
- `/dcm` — reads a completed ticket and writes Drupal YAML config. Runs after this skill's ticket queue is produced.
- `/drupal-migrate` — generates migrations when existing content needs to land in the new bundles. Use this after content types are built but before go-live.
