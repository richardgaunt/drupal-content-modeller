---
name: drupal-content-modeller--theme-ticket
description: Use after BA content-model tickets are drafted and before `/dcm` builds config, when a Tech Lead needs presentation-layer tickets decided per bundle — view modes, component/SDC bindings, text-format assignments, block region placements, or Twig/preprocess overrides — against the live site. Use when the editor-facing content model is settled but how each bundle renders publicly is not.
disable-model-invocation: true
allowed-tools: Read, Write, Edit, Bash(dcm *), Glob, Grep
---

# Theme Ticket Skill

You are helping a Tech Lead produce **theme tickets** — the presentation-layer counterpart to the BA's content-model tickets. Where the BA ticket says *what a bundle holds*, the theme ticket says *how it renders*.

## Background — why this skill exists

**The BA / Tech Lead split.** The Business Analyst owns the content model: bundles, fields, taxonomies, workflow. The Tech Lead owns how that model connects to the theme and frontend: which view modes expose which fields, which SDC components render which paragraphs, which text formats are allowed on which fields, which theme regions host which blocks, and when a bundle needs a custom Twig template or preprocess. Those decisions require live inspection of the target Drupal site — you cannot make them abstractly. DCM's introspection commands (`view-mode`, `component`, `filter-list`, `theme-regions`, `theme-suggestions`, `theme-preprocesses`) exist to feed this skill.

**Where the output lives.** One theme ticket per bundle, named `<NNN> - Theme — <Bundle>.md`, written under `projects/<slug>/tickets/` alongside the BA ticket. A BA ticket and a theme ticket for the same bundle share a number stem (e.g. `012 - Article.md` + `012 - Theme — Article.md`) so they sort together.

**Where the skill sits in the pipeline.** This is Tech-Lead-owned and runs
*outside* the BA Personal Loop, after BA tickets exist:

1. BA loop produces content-model tickets (`personal-loop` → `discover` → `ticket-template` → `create-ticket` → `suggest-permissions`)
2. **Theme tickets — *this skill*** produces per-bundle theme tickets alongside the BA tickets
3. Build → `/dcm` reads both ticket types and writes Drupal YAML. BA tickets drive bundles, fields, form displays, and permissions (editor UX); theme tickets drive view modes, component bindings, text-format assignments, and block placements (public rendering).
4. Migrate (optional) → `/drupal-migrate`

**Form display stays with the BA ticket.** Form displays are editor experience — field order, widget choice, field groups, tabs. They belong to the content-model decision, not the theme. This skill does not touch form displays.

## Step 0: Learn the tool

Before doing anything else, run the following to understand the current CLI:

```bash
dcm help --json
dcm help view-mode --json
dcm help component --json
dcm help filter-list --json
dcm help theme-regions --json
dcm help theme-suggestions --json
dcm help theme-preprocesses --json
```

Use the live help output as your reference for exact subcommands, flags, and JSON shapes. Do not rely on hardcoded command syntax — the CLI evolves.

## Step 1: Select the project and read inputs

Run `dcm project list --json` and ask the user which project to work against. Then read:

- `projects/<slug>/tickets/` — BA tickets that already exist. These name the bundles you are producing theme tickets for.
- `projects/<slug>/discovery/11-design-mapping.md` if present — component-strategy decision (Paragraphs / Layout Builder / SDC / hybrid) and any pre-agreed field → component mappings.

If no BA tickets exist, stop and tell the user to run `/drupal-content-modeller--discover` or `/drupal-content-modeller--create-ticket` first.

## Step 2: Introspect the live site

Using the command shapes from Step 0, run the six introspection commands in JSON mode and cache the output:

- View modes per entity type
- Available components (SDC registry)
- Text formats and their enabled filters
- Regions in the active theme
- Available theme suggestions
- Existing preprocess functions

These are your ground truth. Never invent view modes, regions, components, or text formats that are not in these lists — if a needed one is missing, record it as an open question or a sub-ticket to be created manually.

## Step 3: Decide which bundles need a theme ticket

Walk the BA tickets. For each bundle, decide which theme concerns apply:

| Entity type | View modes | Components | Text formats | Regions | Twig overrides |
|---|---|---|---|---|---|
| node | ✅ always | — | ✅ if text fields | — | optional |
| paragraph | rarely | ✅ always | ✅ if text fields | — | optional |
| media | ✅ (Thumbnail, Full) | — | — | — | optional |
| taxonomy_term | rarely | — | — | — | rare |
| block_content | rarely | optional | ✅ if text fields | ✅ always | optional |

If every column for a bundle is "rare" or "optional" with nothing to specify, the bundle does not need a theme ticket — note it in the index and move on.

## Step 4: Fill each theme ticket

Use the template below. Keep it one page max per bundle. Omit sections that do not apply (e.g. leave out **Block placements** for a node).

```markdown
# <NNN> - Theme — <Bundle Label>

<!-- bundle_ref: <NNN> - <Bundle Label>.md -->
<!-- entity_type: <type> -->
<!-- machine_name: <machine_name> -->

## View modes

| View mode | Purpose | Fields shown (in order) | Formatter notes |
|---|---|---|---|
| Teaser | Listing pages, search results | title, summary, hero_image | Image: "Medium (220×)" style |
| Card | Related-content carousels | title, summary, hero_image, author | — |
| Full | Detail page | all | — |

Only list view modes that appear in `dcm view-mode list`. If a needed view mode is missing, flag it under **Open questions**.

## Component bindings (paragraphs and blocks only)

| Component | Source | Field → prop mapping |
|---|---|---|
| `site:hero` | SDC | `field_p_heading` → `heading`, `field_p_media` → `image`, `field_p_cta` → `cta` |

If no suitable component exists, flag it and propose a new one as an open question. Do not invent component names.

## Text format assignments (text fields only)

| Field | Field type | Text format | Rationale |
|---|---|---|---|
| `body` | text_long | `rich_text` | Editorial long-form; needs embeds and tables |
| `field_p_quote` | string_long | `plain_text` | Short, no HTML needed |

Text formats must come from `dcm filter-list`. Default to the most restrictive format that fits the audience.

## Block placements (block_content only)

| Region | Visibility | Weight |
|---|---|---|
| `footer_secondary` | all pages | 0 |

Regions must come from `dcm theme-regions`.

## Twig overrides / preprocess

Only populate when a bundle genuinely needs a custom template or preprocess.

- **Template:** `paragraph--hero.html.twig` (suggestion from `dcm theme-suggestions`)
- **Preprocess:** none needed / `<theme>_preprocess_paragraph__hero` (check `dcm theme-preprocesses` first — reuse if present)

## Acceptance criteria

- [ ] Given an editor views a <Bundle> node in Teaser view mode, When the page renders, Then only `title`, `summary`, and `hero_image` are visible in that order.
- [ ] Given a paragraph of type Hero, When it renders, Then it uses the `site:hero` SDC component with the correct prop mapping.
- [ ] Given the `body` field, When an editor edits it, Then only the `rich_text` format is available.

## Open questions

- [ ] …
```

## Step 5: Index the theme tickets

Update `projects/<slug>/discovery/00-index.md` (or create it) with a **Theme tickets** section listing each theme ticket and the bundle it pairs with. Re-confirm implementation order — theme tickets build on their paired BA ticket, so a theme ticket never runs before the bundle is created.

## Step 6: Hand-off summary

End with a short summary for the user:

- How many theme tickets you wrote (grouped by entity type)
- Which bundles you skipped because no theme concerns applied
- Open questions that blocked decisions (missing view modes, missing components, missing regions)
- What to run next: `/dcm` to build view modes and component bindings once the theme tickets are reviewed

## Important rules

- **Introspect first, decide second.** Never write a view mode name, component name, region name, text format, or theme suggestion that is not in the live introspection output. If a needed one is missing, record an open question.
- **One ticket per bundle.** A theme ticket shares the bundle's ticket number stem for ordering. Do not merge multiple bundles into one ticket.
- **Prefer existing.** Reuse an existing view mode, component, preprocess, or text format before proposing a new one. Justify every new addition in the Open questions section.
- **Stay out of the BA's lane.** Do not modify field lists, cardinality, or required flags — those are in the BA ticket. If a theme concern reveals a content-model issue, flag it back to the BA, do not fix it here.
- **Text format rule of thumb.** The most restrictive format that fits the audience. Author-facing fields rarely need Full HTML; public-commenter fields should default to Basic.
- **No Twig override or preprocess without justification.** Default to out-of-the-box rendering. Only override when a design requirement or SDC gap forces it.
- **Never invent region, component, view-mode, format, suggestion, or preprocess names.** They must come from the live introspection output.

## Related skills

Theme tickets are produced *after* the BA Personal Loop hands off, not inside
it. They pair with BA tickets by number stem.

- `/drupal-content-modeller--discover` — produces the BA content-model tickets this skill builds on (canonical primitives glossary lives there).
- `/drupal-content-modeller--create-ticket` / `/drupal-content-modeller--suggest-permissions` — complete the BA ticket (fields + permissions). Run before this skill.
- `/dcm` — builds Drupal YAML from both BA and theme tickets.
- `/drupal-migrate` — migrations; independent of theme work.
