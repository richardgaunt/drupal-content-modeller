# Project Save Location + Legacy In-DCM Path Purge — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Default the project save directory to the cwd in both creation flows, and remove the now-dead legacy in-DCM storage path (creation and resolution) entirely.

**Architecture:** `baseDirectory` already is both the `.dcm` save dir and the auto-load anchor. The two entry points (interactive menu, `dcm project create`) are changed to always supply a directory (default `process.cwd()`). The legacy `getProjectJsonPath` fallback is deleted from creation and from `resolveProjectJsonPath` / `resolveBaDir` / `projectExists`, so a project only exists when it has a registry stub pointing at an externalized `<baseDirectory>/.dcm/project.json`.

**Tech Stack:** Node.js ESM, Jest, Commander, Inquirer (`@inquirer/prompts`), chalk.

**Spec:** `docs/superpowers/specs/2026-05-16-project-save-location-and-legacy-purge-design.md`

---

## File Structure

- Modify `src/commands/project.js` — `createProject` requires `baseDirectory`, delete `else` legacy-write branch, drop `getProjectJsonPath` import.
- Modify `src/io/fileSystem.js` — remove `getProjectJsonPath`; `resolveProjectJsonPath` and `resolveBaDir` throw when no stub; `projectExists` becomes stub-only.
- Modify `src/cli/menus/mainMenu.js` — reframe the save prompt, default `process.cwd()`, always print the stored-path lines.
- Modify `src/cli/commands/projectCmds.js` — default `--base-dir` to `process.cwd()`, always print stored path.
- Modify `index.mjs` — update `--base-dir` option help text.
- Modify `tests/project.test.mjs` — pass `baseDirectory` everywhere, fix legacy-specific assertions, add new throw cases.
- Modify `tests/baResolveDir.test.mjs` — delete legacy-fallback case, add reject case.
- Modify `tests/sync.test.mjs`, `tests/baStore.test.mjs`, `tests/baCommands.test.mjs`, `tests/baIntegration.test.mjs`, `tests/baCliCmds.test.mjs`, `tests/cli.test.mjs` — supply `baseDirectory` to project setup as needed (suite-green gate).

---

## Task 1: Make all existing tests externalize their projects (no source change)

Passing `baseDirectory` is already supported, so this task keeps the suite green while removing every test's dependence on legacy creation. Do this BEFORE any source change.

**Files:**
- Modify: `tests/project.test.mjs`
- Modify: `tests/sync.test.mjs`, `tests/baStore.test.mjs`, `tests/baCommands.test.mjs`, `tests/baIntegration.test.mjs`, `tests/baCliCmds.test.mjs`, `tests/cli.test.mjs`

- [ ] **Step 1: Promote a shared base dir in `tests/project.test.mjs`**

In the `describe('Project Commands', …)` block, add a `tempBaseDir` alongside `tempDir`/`tempConfigDir`. Replace the existing `beforeEach`/`afterEach` in that block with:

```javascript
  let tempDir;
  let tempConfigDir;
  let tempBaseDir;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'dcm-test-'));
    tempConfigDir = await mkdtemp(join(tmpdir(), 'dcm-config-'));
    tempBaseDir = await mkdtemp(join(tmpdir(), 'dcm-repo-'));
    await writeFile(join(tempConfigDir, 'test.yml'), 'test: true');
    setProjectsDir(tempDir);
  });

  afterEach(async () => {
    setProjectsDir(null);
    await rm(tempDir, { recursive: true, force: true });
    await rm(tempConfigDir, { recursive: true, force: true });
    await rm(tempBaseDir, { recursive: true, force: true });
  });
```

Then delete the now-duplicate `tempBaseDir` declaration and its `beforeEach`/`afterEach` inside the nested `describe('externalized projects (.dcm/project.json)', …)` block (the outer one now provides it).

- [ ] **Step 2: Add `baseDirectory` to every `createProject` call lacking one in `tests/project.test.mjs`**

In the `createProject`, `loadProject`, `saveProject`, `listProjects`, `deleteProject`, and `updateProject` describe blocks, change every `await createProject('Name', tempConfigDir)` / `createProject('Name', tempConfigDir)` to pass options. Examples (apply the same transform to all such calls, including the two-project cases):

```javascript
// before
const project = await createProject('My Project', tempConfigDir);
// after
const project = await createProject('My Project', tempConfigDir, '', { baseDirectory: tempBaseDir });
```

For describe blocks that create TWO projects in the same test (`listProjects` "returns all projects", `updateProject` "throws for slug conflict"), give each its own base dir so the external `.dcm/project.json` paths do not collide:

```javascript
const baseA = await mkdtemp(join(tmpdir(), 'dcm-repo-a-'));
const baseB = await mkdtemp(join(tmpdir(), 'dcm-repo-b-'));
try {
  await createProject('Project One', tempConfigDir, '', { baseDirectory: baseA });
  await createProject('Project Two', tempConfigDir, '', { baseDirectory: baseB });
  // …existing assertions…
} finally {
  await rm(baseA, { recursive: true, force: true });
  await rm(baseB, { recursive: true, force: true });
}
```

- [ ] **Step 3: Fix the legacy-specific assertion in the `deleteProject` block**

The test `'removes project directory'` asserts `result.externalConfigPath` is `null`. For an externalized project it is the external path. Update it:

```javascript
    test('removes project directory', async () => {
      await createProject('My Project', tempConfigDir, '', { baseDirectory: tempBaseDir });
      expect(existsSync(join(tempDir, 'my-project'))).toBe(true);

      const result = await deleteProject('my-project');

      expect(result.deleted).toBe(true);
      expect(result.externalConfigPath).toBe(getExternalProjectJsonPath(tempBaseDir));
      expect(existsSync(join(tempDir, 'my-project'))).toBe(false);
    });
```

- [ ] **Step 4: Audit the other six test files**

For each of `tests/sync.test.mjs`, `tests/baStore.test.mjs`, `tests/baCommands.test.mjs`, `tests/baIntegration.test.mjs`, `tests/baCliCmds.test.mjs`, `tests/cli.test.mjs`: find every `createProject(` call. If it does not pass `{ baseDirectory: <dir> }`, add one — create a `mkdtemp` repo dir in the surrounding `beforeEach` (mirroring the pattern in Step 1) and pass it, cleaning it up in `afterEach`. Do not change any other behavior. If a file has no `createProject` call that omits `baseDirectory`, leave it unchanged.

- [ ] **Step 5: Run the full suite — must stay green**

Run: `npm run test:all`
Expected: PASS (all suites green). This proves no test depends on legacy creation before we delete it.

- [ ] **Step 6: Commit**

```bash
git add tests/
git commit -m "test: externalize all project fixtures ahead of legacy-path removal"
```

---

## Task 2: `createProject` requires `baseDirectory`; delete legacy-write branch

**Files:**
- Modify: `src/commands/project.js`
- Test: `tests/project.test.mjs`

- [ ] **Step 1: Write the failing test**

Add to the `describe('createProject', …)` block in `tests/project.test.mjs`:

```javascript
    test('rejects when no base directory is given', async () => {
      await expect(createProject('No Base', tempConfigDir)).rejects.toThrow(
        'A save directory is required'
      );
    });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- -t "rejects when no base directory is given"`
Expected: FAIL — currently `createProject` writes the legacy path instead of throwing.

- [ ] **Step 3: Implement the change**

In `src/commands/project.js`:

Remove `getProjectJsonPath` from the import block (lines ~13). The import list should no longer contain `getProjectJsonPath`.

Replace the storage block (currently lines ~69-89, the `const baseDirectory = … if (baseDirectory) { … } else { … }`) with:

```javascript
  const baseDirectory = (options.baseDirectory || '').trim();
  if (!baseDirectory) {
    throw new Error('A save directory is required (baseDirectory)');
  }
  if (!directoryExists(baseDirectory)) {
    throw new Error(`Base directory does not exist: ${baseDirectory}`);
  }
  const externalPath = getExternalProjectJsonPath(baseDirectory);
  if (existsSync(externalPath)) {
    throw new Error(
      `A DCM project config already exists at ${externalPath}. ` +
      `Use \`dcm project register -b ${baseDirectory}\` to register it instead.`
    );
  }
  await writeJsonFile(externalPath, project);
  await writeRegistryStub(slug, {
    slug,
    baseDirectory,
    createdAt: new Date().toISOString()
  });
```

Update the `createProject` JSDoc: `options.baseDirectory` is now **required**; remove wording implying a legacy in-DCM fallback.

- [ ] **Step 4: Run the new test and the project suite**

Run: `npm run test -- -t "rejects when no base directory is given"`
Expected: PASS

Run: `npm run test:all`
Expected: PASS (Task 1 already externalized every fixture)

- [ ] **Step 5: Commit**

```bash
git add src/commands/project.js tests/project.test.mjs
git commit -m "refactor(project): require baseDirectory, drop legacy in-DCM write"
```

---

## Task 3: Purge legacy resolution from `fileSystem.js`

**Files:**
- Modify: `src/io/fileSystem.js`
- Test: `tests/project.test.mjs`, `tests/baResolveDir.test.mjs`

- [ ] **Step 1: Write the failing tests**

Add to the `describe('externalized projects (.dcm/project.json)', …)` block in `tests/project.test.mjs`:

```javascript
    test('loadProject rejects an unregistered slug with a clear message', async () => {
      await expect(loadProject('never-registered')).rejects.toThrow('not found');
    });
```

Rewrite `tests/baResolveDir.test.mjs` so the legacy case becomes a rejection:

```javascript
  test('unregistered project rejects (no legacy fallback)', async () => {
    await expect(resolveBaDir('legacy-site')).rejects.toThrow('not registered');
  });

  test('externalized project resolves to <baseDirectory>/.dcm/ba', async () => {
    await writeRegistryStub('ext-site', { slug: 'ext-site', baseDirectory: repoDir });
    expect(await resolveBaDir('ext-site')).toBe(join(repoDir, '.dcm', 'ba'));
  });
```

(Delete the old `'legacy project resolves DCM-side under projects/<slug>/ba'` test entirely. `resolveBaDir` is async — note the `await` + `rejects`.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `npm run test -- -t "no legacy fallback"`
Expected: FAIL — `resolveBaDir` currently returns a path instead of rejecting.

- [ ] **Step 3: Implement the purge in `src/io/fileSystem.js`**

Delete the entire `getProjectJsonPath` function and its `export` (currently lines ~80-88).

Replace `resolveProjectJsonPath` with:

```javascript
export async function resolveProjectJsonPath(slug) {
  const stub = await readRegistryStub(slug);
  if (!stub) {
    throw new Error(
      `Project "${slug}" is not registered (no .dcm registry stub). ` +
      `It may predate externalization — recreate it with \`dcm project create\` from your repo root.`
    );
  }
  return getExternalProjectJsonPath(stub.baseDirectory);
}
```

Replace `resolveBaDir` with:

```javascript
export async function resolveBaDir(slug) {
  const stub = await readRegistryStub(slug);
  if (!stub) {
    throw new Error(
      `Project "${slug}" is not registered (no .dcm registry stub); ` +
      `cannot resolve its BA directory.`
    );
  }
  return join(stub.baseDirectory, '.dcm', 'ba');
}
```

Replace the body of `projectExists` with stub-only:

```javascript
export function projectExists(slug) {
  const projectPath = getProjectPath(slug);
  if (!existsSync(projectPath)) return false;
  return existsSync(getRegistryStubPath(slug));
}
```

- [ ] **Step 4: Run the full suite**

Run: `npm run test:all`
Expected: PASS. (`loadProject('not found')` path: `projectExists` is now stub-only so the `'not found'` branch fires before the resolver; the new `loadProject` test passes.)

- [ ] **Step 5: Commit**

```bash
git add src/io/fileSystem.js tests/project.test.mjs tests/baResolveDir.test.mjs
git commit -m "refactor(fs): remove legacy in-DCM resolution, require registry stub"
```

---

## Task 4: Interactive prompt — default to cwd, reframe, always show stored path

**Files:**
- Modify: `src/cli/menus/mainMenu.js:164-167` (prompt), `:224-230` (success message)

- [ ] **Step 1: Replace the prompt**

In `handleCreateProject`, replace:

```javascript
    const baseDirectory = await input({
      message: 'Project base directory (optional, repo root — used to auto-load dcm when run inside it)?',
      default: ''
    });
```

with:

```javascript
    const baseDirectory = await input({
      message: 'Where do you want the project saved? (.dcm/project.json is created here; dcm auto-loads when run inside this directory)',
      default: process.cwd()
    });
```

- [ ] **Step 2: Always print the stored-path lines**

Replace:

```javascript
    console.log(chalk.green(`Project "${project.name}" created successfully!`));
    console.log(chalk.cyan(`Slug: ${project.slug}`));
    if (baseDirectory.trim()) {
      console.log(chalk.cyan(`Config stored at: ${baseDirectory.trim()}/.dcm/project.json`));
      console.log(chalk.gray('Commit .dcm/project.json to share the model with your team.'));
    }
    console.log();
```

with:

```javascript
    console.log(chalk.green(`Project "${project.name}" created successfully!`));
    console.log(chalk.cyan(`Slug: ${project.slug}`));
    console.log(chalk.cyan(`Config stored at: ${baseDirectory.trim()}/.dcm/project.json`));
    console.log(chalk.gray('Commit .dcm/project.json to share the model with your team.'));
    console.log();
```

- [ ] **Step 3: Verify nothing else broke**

Run: `npm run test:all`
Expected: PASS (no interactive-menu test asserts the old prompt string; confirm none does — if a test asserts the literal old message, update it to the new message).

- [ ] **Step 4: Commit**

```bash
git add src/cli/menus/mainMenu.js
git commit -m "feat(cli): default project save dir to cwd in interactive flow"
```

---

## Task 5: Command path — default `--base-dir` to cwd

**Files:**
- Modify: `src/cli/commands/projectCmds.js:13-39`
- Modify: `index.mjs:120`
- Test: `tests/project.test.mjs`

- [ ] **Step 1: Write the failing test**

Add a new describe block to `tests/project.test.mjs` (top-level imports already include what is needed except the command handler — add `import { cmdProjectCreate } from '../src/cli/commands/projectCmds';` near the other command imports):

```javascript
  describe('cmdProjectCreate (command path)', () => {
    test('defaults base dir to cwd when --base-dir omitted', async () => {
      const repo = await mkdtemp(join(tmpdir(), 'dcm-cwd-'));
      const realCwd = process.cwd();
      process.chdir(repo);
      try {
        await cmdProjectCreate({
          name: 'Cwd Project',
          configPath: tempConfigDir,
          json: true
        });
        expect(existsSync(getExternalProjectJsonPath(repo))).toBe(true);
        expect(existsSync(getRegistryStubPath('cwd-project'))).toBe(true);
      } finally {
        process.chdir(realCwd);
        await rm(repo, { recursive: true, force: true });
      }
    });
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- -t "defaults base dir to cwd when --base-dir omitted"`
Expected: FAIL — handler passes `baseDirectory: ''`, so `createProject` now throws "A save directory is required".

- [ ] **Step 3: Implement in `src/cli/commands/projectCmds.js`**

Replace the body of `cmdProjectCreate` (lines 13-39) with:

```javascript
export async function cmdProjectCreate(options) {
  try {
    if (!options.name) {
      throw new Error('--name is required');
    }
    if (!options.configPath) {
      throw new Error('--config-path is required');
    }

    const baseDir = (options.baseDir || process.cwd()).trim();
    const project = await createProject(options.name, options.configPath, options.baseUrl || '', {
      baseDirectory: baseDir
    });
    logSuccess(project.slug);

    if (options.json) {
      output(project, true);
    } else {
      console.log(chalk.green(`Project "${project.name}" created successfully!`));
      console.log(chalk.cyan(`Slug: ${project.slug}`));
      console.log(chalk.cyan(`Config stored at: ${baseDir}/.dcm/project.json`));
    }
  } catch (error) {
    handleError(error);
  }
}
```

- [ ] **Step 4: Update the option help in `index.mjs:120`**

Replace:

```javascript
  .option('-b, --base-dir <path>', 'Project base directory (repo root; enables auto-load when dcm runs inside it)')
```

with:

```javascript
  .option('-b, --base-dir <path>', 'Directory to save the project in (.dcm/ created here; defaults to the current directory)')
```

- [ ] **Step 5: Run the new test and the full suite**

Run: `npm run test -- -t "defaults base dir to cwd when --base-dir omitted"`
Expected: PASS

Run: `npm run test:all`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/cli/commands/projectCmds.js index.mjs tests/project.test.mjs
git commit -m "feat(cli): default dcm project create --base-dir to cwd"
```

---

## Task 6: Final verification

**Files:** none (verification only)

- [ ] **Step 1: Lint**

Run: `npm run lint`
Expected: PASS (no errors). If failures, run `npm run lint:fix`, re-run `npm run lint`, and amend the relevant prior commit.

- [ ] **Step 2: Full suite**

Run: `npm run test:all`
Expected: PASS (all suites).

- [ ] **Step 3: Confirm no `getProjectJsonPath` references remain**

Run: `grep -rl "getProjectJsonPath" src tests index.mjs`
Expected: no output (function fully removed).

- [ ] **Step 4: Manual smoke (document result, do not commit)**

```bash
mkdir -p /tmp/dcm-smoke && cd /tmp/dcm-smoke
node /home/rgaunt/work/consulting/apps/drupal-content-modeller/index.mjs project create -n "Smoke" -c <a-dir-with-yml> -j
```
Expected: `/tmp/dcm-smoke/.dcm/project.json` exists; a registry stub exists under the DCM `projects/smoke/` dir. Clean up `/tmp/dcm-smoke` and the created project afterwards.

---

## Self-Review Notes

- **Spec coverage:** decisions 1–3 → Tasks 4/5 (cwd default both flows), Tasks 2/3 (full purge). Post-purge function shapes → Tasks 2/3. Error paths → Task 3 (resolver throw) + Task 2 (require baseDirectory). Prompt-shape departure → Task 4 (directory + cwd default). Test impact table → Tasks 1/3/5.
- **Placeholder scan:** none — all code shown inline; Task 1 Step 4 is a mechanical audit with a green-suite gate, not a placeholder.
- **Type/name consistency:** error string `'A save directory is required'` (Task 2) matches the Task 2 test; `'not registered'` (Task 3 fileSystem) matches the baResolveDir reject test; `getExternalProjectJsonPath` / `getRegistryStubPath` already exported and imported in `tests/project.test.mjs`; `cmdProjectCreate` import added in Task 5 Step 1.
