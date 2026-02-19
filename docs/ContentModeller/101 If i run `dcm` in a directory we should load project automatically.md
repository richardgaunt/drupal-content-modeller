
Add project base directory to `dcm` create project. This tells the root of the project / git repository.

If we load dcm in a project directory it should automatically load that project. It should search through available projects and see which one to load.

## Implementation Plan

### Current state

- Projects have `configDirectory` (path to Drupal config dir) but no `baseDirectory` (project/repo root)
- `showMainMenu()` always shows a project selection prompt
- Projects are stored in `projects/<slug>/project.json`

### Changes needed

#### 1. Add `baseDirectory` to project schema

- **`src/utils/project.js`** — Add `baseDirectory` field to `createProjectObject()` default
- **`src/commands/project.js`** — Accept `baseDirectory` in `createProject()` and `updateProject()`
- **`src/cli/menus.js`** — Add "Project base directory" prompt during project creation
- **`src/cli/commands.js`** — Add `--base-dir` option to `cmdProjectCreate` and `cmdProjectEdit`
- **`index.mjs`** — Add `--base-dir` option to `project create` and `project edit` commands

#### 2. Auto-detect project from current directory

- **`src/cli/menus.js`** — In `showMainMenu()`, before showing the main menu:
  1. Get `process.cwd()`
  2. Call `listProjects()` to load all projects
  3. For each project, check if `cwd` starts with `project.baseDirectory` (or falls within `project.configDirectory`)
  4. If exactly one match: auto-load that project, skip to `showProjectMenu(project)` with a message like "Auto-loaded project: X"
  5. If multiple matches: show only matching projects to choose from
  6. If no match: show normal main menu

### Files to Modify

| File | Change |
|------|--------|
| `src/utils/project.js` | Add `baseDirectory` to project object defaults |
| `src/commands/project.js` | Pass through `baseDirectory` in create/update |
| `src/cli/menus.js` | Add base directory prompt in create flow; add auto-detect in `showMainMenu()` |
| `src/cli/commands.js` | Add `--base-dir` option to project create/edit handlers |
| `index.mjs` | Add `--base-dir` option to project create/edit command definitions |

### Notes

- `baseDirectory` should be optional — existing projects without it just won't auto-detect
- Matching logic: `process.cwd().startsWith(project.baseDirectory)` — the cwd must be inside the project root
- If the user has set `configDirectory` but not `baseDirectory`, we could also try matching against `configDirectory` as a fallback
