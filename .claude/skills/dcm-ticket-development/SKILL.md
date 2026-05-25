---
name: dcm-ticket-development
description: Use when asked to implement, build out, or "develop" a drupal-content-modeller dev ticket from the obsidian todo folder (/home/rgaunt/obsidian/main/AI/drupal-content-modeller/todo) — orchestrates an isolated dev/review loop and opens a PR for human review. Triggers on "develop this ticket", "work the X ticket", "/dcm-ticket-development". Not for Drupal content-model tickets (use /dcm) — these are dev tasks against this repo.
disable-model-invocation: true
allowed-tools: Read, Write, Edit, Glob, Grep, Skill, Agent, Bash(git *), Bash(gh *), Bash(npm *), Bash(ls *), Bash(mv *), Bash(cat *)
---

# DCM Ticket Development — orchestrated dev/review loop

You are the **orchestrator**. You do not write feature code yourself. You own a
single git worktree, dispatch stateless subagents to develop and review inside
it, run CodeRabbit, and open a PR for the human to review. You never merge.

Tickets are freeform markdown dev tasks for **this repo** (the DCM CLI and its
skills), stored in `/home/rgaunt/obsidian/main/AI/drupal-content-modeller/todo`.

## Workflow

```dot
digraph d {
  "Select ticket" -> "Create worktree";
  "Create worktree" -> "Dispatch dev subagent";
  "Dispatch dev subagent" -> "Dispatch reviewer subagent";
  "Dispatch reviewer subagent" -> "blocking empty?" [label="result"];
  "blocking empty?" -> "CodeRabbit review" [label="yes"];
  "blocking empty?" -> "round < 3?" [label="no"];
  "round < 3?" -> "Dispatch dev subagent" [label="yes, with feedback"];
  "round < 3?" -> "Surface to human" [label="no — stop"];
  "CodeRabbit review" -> "fix findings (dev subagent)" -> "commit + push + open PR" -> "move ticket to done";
}
```

### 1. Select the ticket
If a ticket name/path was passed as an argument, resolve it under `todo/`. Else
`ls` the `todo/` folder, show the list, and ask which one. Read the ticket file
fully — you will inline its **entire contents** into the dev prompt.

### 2. Create the worktree (orchestrator owns it)
**REQUIRED:** Use `superpowers:using-git-worktrees` to create one worktree off
`main` for this ticket (branch e.g. `ticket/<slug>`). Record the absolute
**worktree path** and **branch name**. Every subagent operates in this one path
— do NOT let subagents create their own worktrees. This keeps all rounds and the
CodeRabbit/PR steps against the same tree, and survives a subagent dying.

### 3. Dispatch the development subagent (round 1)
Dispatch a `general-purpose` Agent. Because the subagent cannot see this
conversation, the prompt MUST inline everything below (see contract). It
implements, runs tests + lint, and **commits** on the branch before returning.

### 4. Dispatch the reviewer subagent
Dispatch a fresh read-only reviewer Agent pointed at the worktree path and
branch. It returns a structured result. The loop exits only when `blocking` is
empty.

### 5. Loop (cap 3 rounds)
If `blocking` is non-empty and you are under 3 dev/review rounds: dispatch a NEW
dev subagent with the same contract **plus the reviewer's blocking items**
inlined, then re-review. After 3 rounds with blocking items still open, **stop
and surface the outstanding items to the human** — do not loop further or open a
PR.

### 6. CodeRabbit review + fix
Once the reviewer is clean, invoke the `coderabbit:code-review` skill against the
branch's changes. Triage findings: route any real fixes through one more dev
subagent dispatch (implement + tests + lint + commit). Skip false positives but
say which and why.

### 7. Commit, push, open PR
Ensure all work is committed on the branch. Push the branch and run
`gh pr create` against `main` of the current `origin` (the repo's convention).
The PR body must describe: the ticket being implemented, what changed and why,
the review rounds run, CodeRabbit findings + dispositions, and a test plan.
**Do not merge.** Return the PR URL.

### 8. Move the ticket
After the PR is open, move the obsidian ticket file from `todo/` to the sibling
`done/` folder (`mv`). Do this only at PR creation — leave it in `todo/` while
work is in flight.

## Dev subagent prompt contract

The dispatched dev agent has zero context. Inline ALL of:

- **Goal:** implement the ticket below for the DCM repo.
- **Worktree path:** `<abs path>` — do all work here; it is a git worktree on
  branch `<branch>`. Operate with absolute paths under it; do NOT create another
  worktree or touch the main checkout.
- **Ticket (verbatim):** the full markdown contents of the ticket file.
- **Repo conventions:** `CLAUDE.md` is at the worktree root — read it. ES modules,
  pure functions separated from I/O, reuse the registries it lists, never
  hardcode entity-type constants.
- **Verify before done:** run `npm run test:all` and `npm run lint` (or
  `npm run lint:fix`). Tests must pass and lint must be clean.
- **Commit:** stage the relevant files and commit on the branch with a clear
  message. (No co-author/Claude references — repo rule.) Commit is mandatory
  before returning — the reviewer and CodeRabbit only see committed code.
- **Round feedback (rounds 2+):** the reviewer's `blocking` items to address.
- **Report:** what you changed (files), test + lint output, and anything you
  could not resolve.

## Reviewer subagent prompt contract

Read-only. Inline ALL of:

- **Worktree path + branch**, and that it should review the diff vs `main`
  (`git -C <path> diff main...<branch>`).
- **Ticket (verbatim)** so it can judge against intent.
- **Check:** does the change fully satisfy the ticket? Does it follow `CLAUDE.md`
  conventions and reuse existing utilities/registries? Are tests added/updated
  and passing? Any correctness, security, or I/O-purity-boundary issues?
- **Required output shape:**
  ```
  blocking:   [ concrete must-fix items, or empty ]
  suggestions:[ non-blocking nice-to-haves ]
  verdict:    LGTM | CHANGES_REQUESTED
  ```
  Empty `blocking` ⇒ the orchestrator proceeds to CodeRabbit.

## Hard rules

- Orchestrator owns the one worktree; subagents are stateless and work in it.
- Dev subagent must commit before any review step — uncommitted work is invisible
  to the reviewer and CodeRabbit.
- Loop is capped at **3** dev/review rounds; then surface, never silently spin.
- Never merge the PR. The PR is for human review.
- Never put Claude/AI co-author trailers in commits or the PR (repo rule).
- Move the ticket `todo/` → `done/` only after the PR exists.
