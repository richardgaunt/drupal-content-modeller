---
name: drupal-content-modeller--personal-loop
description: Use when starting or resuming business-analyst content-modelling work on an existing Drupal project — eliciting or refining requirements, drafting per-bundle tickets, or handing a sequenced ticket queue off to the team. Use to pick up an in-progress Personal Loop, to ingest new stakeholder input against already-settled requirements, or to move a project from discovery toward handoff. Requires the project to already exist (`dcm project create`).
disable-model-invocation: true
allowed-tools: Read, Write, Edit, Bash(dcm *), Glob, Grep, WebFetch
---

# Personal Loop — content-modelling BA orchestrator

You run the **Personal Loop** for content modelling. The project must already
exist (`dcm project create …`); BA state lives in the project's resolved BA
directory — DCM-side `projects/<slug>/ba/` for a legacy project, or
`<repo>/.dcm/ba/` for an externalized one — and is owned by `dcm ba …`.
`state.json` is the single source of truth; never hand-edit it or `manifest.md`.

## On every invocation (resume-first)

1. Run `dcm ba status -p <slug> --json`. If it errors that the project does
   not exist, stop and tell the human to run `dcm project create` first. If it
   errors that no Personal Loop state exists, run `dcm ba init -p <slug> --json`.
   Read `phase` and the requirement ledger.
2. **Settled-work gate.** Before any elicitation/drafting, for each incoming
   input signal call `dcm ba gate -p <slug> -k <new|match|conflict> [-r REQ-NNN]`.
   You decide `new`/`match`/`conflict` semantically; the command enforces the
   rule (skip refined matches; `amends`/`amended by` cross-link on refined
   conflicts; reopen artefacts on non-refined conflicts). Never re-analyse a
   `refined` or `synced-back` REQ.

## Dispatch by phase

- **audit** → gather "what the site already has" using available `dcm`
  introspection (project/bundle/field/component/view-mode reports). Write
  `projects/<slug>/ba/capability-inventory.md`. Pause for human review.
- **requirements** → elicit (in-session Q&A + ingest human-supplied
  transcripts/briefs). For each *new* requirement, run `dcm ba gate … -k new`
  to allocate a `REQ-NNN`; write it into `projects/<slug>/ba/requirements.md`
  wrapped in `<!-- REQ-NNN START -->` / `<!-- REQ-NNN END -->` markers
  (required so `sync-down` can rewrite the block in place — see Task 8).
  Classify each against the inventory into
  `capability-gap.md` (reuse / modify / override / build-new). Maintain
  `coverage.md` and `open-questions.md`. **Surface uncovered areas and
  unresolved questions before asking anything new.** Pause for human approval.
- **draft-tickets** → write a fully-populated `projects/<slug>/discovery/01-brief.md`
  in the structure `drupal-content-modeller--discover` expects, derived from
  `requirements.md` + `capability-gap.md`. Invoke `/drupal-content-modeller--discover`
  with this explicit instruction: *"The Phase 1 project brief is already
  complete at `projects/<slug>/discovery/01-brief.md`. Do not re-run Phase 1
  questioning — read it, confirm or adjust with the user, and start at Phase 2."*
  Discover composes the per-bundle skills in dependency order; the per-ticket
  completeness loop below applies to each bundle it produces. Record the
  REQ↔ticket mapping in `requirements.md` ticket headers.
- **ticket-refinement** → refine tickets across sessions, ingest new input
  through the settled-work gate, run the per-ticket completeness loop until
  each ticket is ready, then per-ticket human review until approved.

### Per-ticket completeness loop

A ticket is **not ready** until every step below is done, in this order, for
that bundle. Do not hand off a REQ whose ticket is incomplete.

1. `/drupal-content-modeller--ticket-template` — generate the blank template
   for the bundle (template *before* fill — it owns the load-bearing structure
   and HTML comments).
2. `/drupal-content-modeller--create-ticket` — fill the field rows with Drupal
   defaults. It leaves the permissions matrix blank for step 3.
3. `/drupal-content-modeller--suggest-permissions` — populate the permissions
   matrix from synced precedent. On a greenfield project with no synced
   precedent, it falls back to the BA matrix in `09-roles.md` instead.
4. BA reviews the completed ticket. On approval, the mapped REQ becomes
   eligible for handoff; reflect this through `dcm ba gate`/`dcm ba status` —
   the ledger, not a heuristic, is the source of truth for "all requirements
   for this ticket are met."

Compose all three skills **unchanged** — pre-populate inputs and steer at
invocation time only.

## Outbound stage — handoff

When the BA approves a ticket/batch, run
`dcm ba handoff -p <slug> -r REQ-NNN[,REQ-MMM] --json`. This marks the REQs
`refined`, writes an immutable `projects/<slug>/ba/handoff/<ts>.md`, and runs
the **stubbed sync-up** (no Jira push — deferred). Refined REQs leave the
working set; the loop continues for net-new REQs.

## Inbound stage — sync-down

After the Team Loop returns team-refined tickets, run
`dcm ba sync-down -p <slug> -i '<json array of {reqId,ticketId,content,hash}>'`.
**Tickets win**: the mapped REQ in `requirements.md` is rewritten/annotated and
set `synced-back`. Idempotent on identical input; repeatable on changed input.
The Jira-fetch is stubbed (operate on local returned files).

## Hard rules

- Compose the existing DCM skills **strictly unchanged** — only pre-populate
  their inputs and steer at invocation time. Never edit their SKILL.md files.
- Never invent answers — unknowns go to `open-questions.md`.
- Persist through `dcm ba …` after every step; it regenerates `manifest.md`.
- One-way guarantee: never silently mutate a `refined`/`synced-back` REQ;
  conflicts create a new cross-linked REQ (`amends` / `amended by`).
- Stop at the Personal/Team boundary. The Team Loop, real Jira transport, and
  sibling BA loops (views, search, metadata) are out of scope.

## Related skills

Loop order: **this skill** → `discover` → `ticket-template` → `create-ticket`
→ `suggest-permissions` → (per-ticket review) → handoff.

- `/drupal-content-modeller--discover` — composed at draft-tickets (steered);
  it runs the per-bundle skills below in dependency order.
- `/drupal-content-modeller--ticket-template` → `/drupal-content-modeller--create-ticket`
  → `/drupal-content-modeller--suggest-permissions` — the per-ticket
  completeness loop, composed unchanged, in that order.
- `/dcm`, `/drupal-content-modeller--theme-ticket`, `/drupal-migrate` —
  downstream, after the Team Loop boundary. Not invoked here.
