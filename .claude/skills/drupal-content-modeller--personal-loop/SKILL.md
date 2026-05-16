---
name: drupal-content-modeller--personal-loop
description: BA-owned, resumable Personal Loop orchestrator for Drupal content modelling. Runs a capability audit, an elicitation loop with coverage tracking and an open-questions register, drafts tickets by composing the existing DCM discover/ticket skills unchanged, and manages staged, one-way handoff with stable REQ-NNN traceability and BA-initiated sync-down. Invoke to start or resume content-modelling BA work on a project; it never re-analyses refined requirements.
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
  Then use `/drupal-content-modeller--ticket-template` and
  `/drupal-content-modeller--create-ticket` unchanged. Record the
  REQ↔ticket mapping in `requirements.md` ticket headers.
- **ticket-refinement** → refine tickets across sessions, ingest new input
  through the settled-work gate, per-ticket human review until approved.

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

- `/drupal-content-modeller--discover` — composed at draft-tickets (steered).
- `/drupal-content-modeller--ticket-template`, `/drupal-content-modeller--create-ticket`
  — composed unchanged.
- `/dcm` — downstream build, after the Team Loop. Not invoked here.
