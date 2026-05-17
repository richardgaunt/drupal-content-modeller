# Project save location + legacy in-DCM path purge — design

Date: 2026-05-16
Branch: feat/personal-loop
Source request: `~/obsidian/main/AI/drupal-content-modeller/todo/Creating a new project.md`

## Problem

A single interactive prompt — "Project base directory" — does double duty: it
decides where `.dcm/project.json` is written **and** acts as the auto-load
anchor (`projectMatchesCwd` matches when cwd is at or under `baseDirectory`).
In the reported run the user typed the config-sync path
(`/…/project/main/src`), so `.dcm` landed deep in the repo instead of at the
directory they ran `dcm` from (`~/work/civictheme-elements`).

The user wants `.dcm` to default to the directory `dcm` is run in, with the
ability to override, and — having reviewed the code paths — wants the now-dead
legacy in-DCM storage path removed entirely (creation **and** resolution),
accepting that this is a breaking change for any project that was never
externalized.

## Decisions (user-approved)

1. **Default save directory = `process.cwd()`**, editable. (User: "Current
   working directory but with option to change to something else.")
2. **Both creation systems get the cwd default** — interactive menu flow and
   the non-interactive `dcm project create` command. (User chose "Default
   `--base-dir` to cwd too" for consistency.)
3. **Full purge** of the legacy in-DCM path: remove the creation `else` branch
   *and* the `getProjectJsonPath` resolution fallbacks. After this, a project
   only exists if it has a registry stub pointing at an externalized
   `<baseDirectory>/.dcm/project.json`. Non-externalized projects can no longer
   be created or loaded. (User chose "Full purge incl. resolution".)

### Resolved open question — prompt shape (deliberate departure)

The user's todo note shows the prompt example with the **full file path** as
the default: `Where do you want the project saved? (/…/src/.dcm/project.json):`.

This design instead prompts for a **directory** (default `process.cwd()`) and
states in the message that `.dcm/project.json` is created inside it. Rationale:
`baseDirectory` is a directory in the data model and is also the auto-load
anchor; round-tripping a full file path back to a directory is lossy and
error-prone. The resulting full path is echoed back in the success message.
Flagged here so the user can correct if they meant the literal full-path form.

## Architecture / surface

`baseDirectory` already equals the save dir and the auto-load anchor — no new
data field, no change to `createProjectObject`, `projectMatchesCwd`, the
registry stub format, or `getExternalProjectJsonPath`. The change is: (a) the
two entry points always supply a directory, and (b) the legacy fallbacks are
deleted so externalization is the only model.

### Post-purge function shapes — `src/commands/project.js`

- `createProject(name, configDir, baseUrl, options)` — **require**
  `options.baseDirectory`. If empty/missing after trim, throw
  `Error('A save directory is required (baseDirectory)')`. Delete the `else`
  branch that wrote `getProjectJsonPath(slug)`. Keep the existing
  directory-exists check and the "already exists → use `dcm project register`"
  guard.
- `loadProject(slug)` — unchanged logic, but the not-found message must cover
  the new failure mode (see Error paths).
- `saveProject(slug)` — unchanged; now always resolves to the external path.
- Drop the `getProjectJsonPath` import.

### Post-purge function shapes — `src/io/fileSystem.js`

- **Remove** `getProjectJsonPath(slug)` — the function and its `export`.
- `resolveProjectJsonPath(slug)` — read the registry stub; if present return
  `getExternalProjectJsonPath(stub.baseDirectory)`; if absent **throw**
  `Error('Project "<slug>" is not registered (no .dcm registry stub). It may predate externalization — recreate it with \`dcm project create\` from your repo root.')`.
- `resolveBaDir(slug)` — same: stub present → `<baseDirectory>/.dcm/ba`; stub
  absent → throw the same class of error (BA wording). Remove the
  `join(getProjectPath(slug), 'ba')` legacy fallback.
- `projectExists(slug)` — becomes stub-only:
  `existsSync(getProjectPath(slug)) && existsSync(getRegistryStubPath(slug))`.
  Drop the `getProjectJsonPath` disjunct.
- `getProjectPath`, `getReportsDir`, `getTicketsDir`, `getLogPath`,
  `getRegistryStubPath` stay — the DCM-side `projects/<slug>/` dir still holds
  the stub, reports, tickets, logs.

### Entry point 1 — interactive (`src/cli/menus/mainMenu.js`, `handleCreateProject`)

Replace the prompt:

- from: `'Project base directory (optional, repo root — used to auto-load dcm when run inside it)?'`, `default: ''`
- to: `'Where do you want the project saved? (.dcm/project.json is created here; dcm auto-loads when run inside this directory)'`, `default: process.cwd()`

Pass the trimmed value as `options.baseDirectory` (unchanged call site).
Success message: always print `Config stored at: <dir>/.dcm/project.json` and
the "Commit .dcm/project.json…" hint — no longer gated on a non-empty value
(it is always set now). Use the actual resolved path.

### Entry point 2 — command (`src/cli/commands/projectCmds.js` + `index.mjs`)

- `cmdProjectCreate`: `const baseDir = (options.baseDir || process.cwd())`,
  pass as `baseDirectory`. Success message always shows
  `<baseDir>/.dcm/project.json` (drop the `if (options.baseDir)` gate).
- `index.mjs` `-b, --base-dir` option description: note it defaults to the
  current working directory.

## Error paths

- Creating with an unwritable/nonexistent explicit dir → existing
  `directoryExists` check throws `Base directory does not exist: <dir>`.
- Creating where `<dir>/.dcm/project.json` already exists → existing guard
  points at `dcm project register`.
- `createProject` with no base dir (only reachable by direct/programmatic
  callers now) → throws `A save directory is required (baseDirectory)`.
- Loading a pre-externalization `projects/<slug>/` (stub absent) → throws the
  explicit "not registered … recreate with `dcm project create`" message from
  `resolveProjectJsonPath`. `loadProject`'s existing stub-missing branch
  becomes unreachable for the no-stub case (the resolver throws first); its
  message for *stub present but file missing* stays.

## Test impact (per file — verified counts)

| File | Change |
|---|---|
| `tests/project.test.mjs` (69 hits) | Largest. Every `createProject('…', tempConfigDir)` call lacking a base dir (in `createProject`, `loadProject`, `saveProject`, `listProjects`, `deleteProject`, `updateProject` describe blocks) must pass `{ baseDirectory: tempBaseDir }`. Promote `tempBaseDir` setup to the outer `Project Commands` scope so all blocks can use it. The `createProjectObject` pure tests (no I/O) and `projectMatchesCwd` tests are **unchanged**. The existing `externalized projects` describe block largely already passes; add a case asserting `createProject` throws without a base dir. |
| `tests/baResolveDir.test.mjs` (6 hits) | **Delete** the `'legacy project resolves DCM-side under projects/<slug>/ba'` case (lines 23–25) and replace with a case asserting `resolveBaDir('unregistered')` **rejects**. Keep the externalized case. |
| `tests/sync.test.mjs` (10 hits) | Audit each `createProject`; add `baseDirectory` where missing. No legacy-specific assertions expected — confirm during impl. |
| `tests/baStore.test.mjs` (7 hits) | Audit; add `baseDirectory` to project setup so `resolveBaDir` resolves via stub. |
| `tests/baCommands.test.mjs` (5 hits) | Audit; add `baseDirectory` to setup. |
| `tests/baIntegration.test.mjs` (5 hits) | Audit; add `baseDirectory` to setup. |
| `tests/baCliCmds.test.mjs` (2 hits) | Audit; likely add `baseDirectory`. |
| `tests/cli.test.mjs` (2 hits) | Audit; likely add `baseDirectory`. |

Per-file audits happen during implementation; the table commits to the *kind*
of change. New coverage to add: (a) `cmdProjectCreate` with no `--base-dir`
writes the external `.dcm` path + registry stub at cwd; (b) `createProject`
throws without `baseDirectory`; (c) `resolveProjectJsonPath` /`resolveBaDir`
throw for an unregistered slug.

## Out of scope

- Migration tooling for existing legacy on-disk projects (user accepted the
  break; no auto-upgrade).
- Changing `registerProject`, the stub format, or `getExternalProjectJsonPath`.
- Menus/webforms generation, BA artefact content — untouched.

## Verification

- `npm run lint`
- `npm run test:all` green after test rewrites.
- Manual: `cd /tmp/somerepo && dcm` → Create project → confirm default save
  prompt shows `/tmp/somerepo`, accept, confirm
  `/tmp/somerepo/.dcm/project.json` written and stub at
  `projects/<slug>/registry.json`; `cd /tmp/somerepo/sub && dcm` auto-loads it.
- Manual: `dcm project create -n X -c <cfg>` (no `-b`) from a repo dir →
  `.dcm/project.json` in that dir.
