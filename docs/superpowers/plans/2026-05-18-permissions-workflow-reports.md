# Permissions & Workflow Reports + Suggestion Skill — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a combined permissions + content-moderation-workflow report (project/entity/bundle scope, JSON + Markdown, command + interactive menu), backed by new global-permission constants, plus a Claude skill that suggests permissions for new bundles from the report JSON.

**Architecture:** Part A extends `src/constants/permissions.js` with a sibling "global permissions" model and a `_global` bucket in `groupPermissionsByBundle`, fixing the three downstream consumers that assume per-bundle grouping. Part B adds a self-contained pure generator `src/generators/permissionReport.js`, a thin command wrapper, and CLI/menu wiring following the existing `dcm report` pattern. Part C is a documentation-only Claude skill that shells out to the new command.

**Tech Stack:** Node ES modules (`.mjs`/`type:module`), Jest-style tests (`describe/it/expect`) in `tests/*.test.mjs`, Commander for CLI (`index.mjs`), `@inquirer/prompts` for menus, `chalk` for output.

**Spec:** `/home/rgaunt/obsidian/main/AI/drupal-content-modeller/todo/Create reports on permissions.md`

**Test commands:** `npm run test:all` (full suite / regression checkpoint); single file e.g. `npm run test -- tests/permissions.test.mjs`; lint `npm run lint`.

---

## File Structure

**Part A — constants & consumers (modify):**
- `src/constants/permissions.js` — add global structures + helpers; extend `parsePermissionKey`, `groupPermissionsByBundle`.
- `src/parsers/roleParser.js` — `getRoleOtherPermissions`, `getRoleSummary`: skip `_global` bucket.
- `src/generators/roleGenerator.js` — `calculateConfigDependencies` skip global; `calculateModuleDependencies` honour `parsed.module`.
- Tests: `tests/permissions.test.mjs`, `tests/roleParser.test.mjs`, `tests/roleGenerator.test.mjs` (extend, keep green).

**Part B — report (create + modify):**
- Create `src/generators/permissionReport.js` — `generatePermissionReportData()`, `formatPermissionReportMarkdown()`.
- Modify `src/commands/report.js` — add `createPermissionReport()`.
- Modify `src/cli/commands/miscCmds.js` — add `cmdReportPermissions()`.
- Modify `index.mjs` — register `report permissions` subcommand.
- Modify `src/cli/prompts.js` — add `report-permissions` menu choice.
- Modify `src/cli/menus/reportMenus.js` — add `handlePermissionReport()`.
- Modify `src/cli/menus/mainMenu.js` — import + `case 'report-permissions'`.
- Create `tests/permissionReport.test.mjs`.

**Part C — skill (create):**
- Create `.claude/skills/drupal-content-modeller--suggest-permissions/SKILL.md`.

---

# PART A — Global permission constants

### Task A1: Add global permission structures and helpers

**Files:**
- Modify: `src/constants/permissions.js`
- Test: `tests/permissions.test.mjs`

- [ ] **Step 1: Write the failing test**

Add to `tests/permissions.test.mjs` (new `import` names go in the existing import block from `../src/constants/permissions.js`):

```js
import {
  NODE_GLOBAL_PERMISSIONS,
  MEDIA_GLOBAL_PERMISSIONS,
  GLOBAL_PERMISSIONS_BY_ENTITY_TYPE,
  GLOBAL_BUCKET_KEY,
  getGlobalPermissionTemplates
} from '../src/constants/permissions.js';

describe('Global permission constants', () => {
  it('NODE_GLOBAL_PERMISSIONS has the four expected perms with module hints', () => {
    const byShort = Object.fromEntries(NODE_GLOBAL_PERMISSIONS.map(p => [p.short, p]));
    expect(byShort.view_published.key).toBe('access content');
    expect(byShort.view_published.module).toBe('node');
    expect(byShort.view_own_unpublished.key).toBe('view own unpublished content');
    expect(byShort.view_any_unpublished.key).toBe('view any unpublished content');
    expect(byShort.view_any_unpublished.module).toBe('content_moderation');
    expect(byShort.view_latest.key).toBe('view latest version');
    expect(byShort.view_latest.module).toBe('content_moderation');
  });

  it('MEDIA_GLOBAL_PERMISSIONS has the two expected perms', () => {
    const keys = MEDIA_GLOBAL_PERMISSIONS.map(p => p.key);
    expect(keys).toContain('view all media revisions');
    expect(keys).toContain('view own unpublished media');
  });

  it('getGlobalPermissionTemplates returns [] for entity types with no globals', () => {
    expect(getGlobalPermissionTemplates('taxonomy_term')).toEqual([]);
    expect(getGlobalPermissionTemplates('node')).toBe(NODE_GLOBAL_PERMISSIONS);
  });

  it('GLOBAL_BUCKET_KEY is the reserved bucket name', () => {
    expect(GLOBAL_BUCKET_KEY).toBe('_global');
    expect(GLOBAL_PERMISSIONS_BY_ENTITY_TYPE.node).toBe(NODE_GLOBAL_PERMISSIONS);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/permissions.test.mjs`
Expected: FAIL — `NODE_GLOBAL_PERMISSIONS` (etc.) is not exported / undefined.

- [ ] **Step 3: Write minimal implementation**

In `src/constants/permissions.js`, after `BLOCK_CONTENT_PERMISSIONS` (line ~57) and before `PERMISSIONS_BY_ENTITY_TYPE`, add:

```js
/**
 * Reserved bucket key for global (non-bundle) permissions in
 * groupPermissionsByBundle output.
 */
export const GLOBAL_BUCKET_KEY = '_global';

/**
 * Node global (non-bundle) permissions.
 * `module` records which Drupal module provides the permission.
 */
export const NODE_GLOBAL_PERMISSIONS = [
  { key: 'access content', label: 'View published content', short: 'view_published', module: 'node' },
  { key: 'view own unpublished content', label: 'View own unpublished content', short: 'view_own_unpublished', module: 'node' },
  { key: 'view any unpublished content', label: 'View any unpublished content', short: 'view_any_unpublished', module: 'content_moderation' },
  { key: 'view latest version', label: 'View latest version', short: 'view_latest', module: 'content_moderation' }
];

/**
 * Media global (non-bundle) permissions.
 */
export const MEDIA_GLOBAL_PERMISSIONS = [
  { key: 'view all media revisions', label: 'View all media revisions', short: 'view_all_revisions', module: 'media' },
  { key: 'view own unpublished media', label: 'View own unpublished media', short: 'view_own_unpublished', module: 'media' }
];

/**
 * Map entity types to their global permission templates.
 */
export const GLOBAL_PERMISSIONS_BY_ENTITY_TYPE = {
  node: NODE_GLOBAL_PERMISSIONS,
  media: MEDIA_GLOBAL_PERMISSIONS
};

/**
 * Get global permission templates for an entity type.
 * @param {string} entityType - Entity type
 * @returns {object[]} - Global permission templates (empty array if none)
 */
export function getGlobalPermissionTemplates(entityType) {
  return GLOBAL_PERMISSIONS_BY_ENTITY_TYPE[entityType] || [];
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- tests/permissions.test.mjs`
Expected: PASS (all existing permissions tests still pass too — these additions are non-breaking; `NODE_PERMISSIONS.length` is unchanged at 8).

- [ ] **Step 5: Commit**

```bash
git add src/constants/permissions.js tests/permissions.test.mjs
git commit -m "feat(permissions): add global (non-bundle) permission constants"
```

---

### Task A2: Recognise global perms in parsePermissionKey and groupPermissionsByBundle

**Files:**
- Modify: `src/constants/permissions.js:120-221` (`parsePermissionKey`, `groupPermissionsByBundle`)
- Test: `tests/permissions.test.mjs`

- [ ] **Step 1: Write the failing test**

Add to `tests/permissions.test.mjs`:

```js
import { GLOBAL_BUCKET_KEY as GBK } from '../src/constants/permissions.js';

describe('parsePermissionKey — global perms', () => {
  it('parses a global node perm with scope=global and bundle=null', () => {
    expect(parsePermissionKey('access content')).toEqual({
      entityType: 'node', bundle: null, scope: 'global',
      short: 'view_published', label: 'View published content', module: 'node'
    });
    expect(parsePermissionKey('view latest version')).toMatchObject({
      entityType: 'node', scope: 'global', short: 'view_latest', module: 'content_moderation'
    });
  });

  it('tags per-bundle results with scope=bundle', () => {
    expect(parsePermissionKey('create article content')).toMatchObject({
      entityType: 'node', bundle: 'article', scope: 'bundle', short: 'create'
    });
  });

  it('still returns null for a nonsense string', () => {
    expect(parsePermissionKey('unknown permission format')).toBeNull();
  });
});

describe('groupPermissionsByBundle — global bucket', () => {
  it('places global perms under entityType._global', () => {
    const grouped = groupPermissionsByBundle([
      'create article content',
      'access content',
      'view own unpublished media'
    ]);
    expect(Object.keys(grouped.node)).toContain('article');
    expect(grouped.node[GBK].map(p => p.key)).toEqual(['access content']);
    expect(grouped.media[GBK].map(p => p.key)).toEqual(['view own unpublished media']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/permissions.test.mjs`
Expected: FAIL — `parsePermissionKey('access content')` returns `null`; no `_global` bucket.

- [ ] **Step 3: Write minimal implementation**

Replace the body of `parsePermissionKey` (lines 120-140) with:

```js
export function parsePermissionKey(permission) {
  // Per-bundle templates
  for (const [entityType, templates] of Object.entries(PERMISSIONS_BY_ENTITY_TYPE)) {
    for (const template of templates) {
      const pattern = template.key.replace('{bundle}', '([a-z0-9_]+)');
      const regex = new RegExp(`^${pattern}$`);
      const match = permission.match(regex);

      if (match) {
        return {
          entityType,
          bundle: match[1],
          scope: 'bundle',
          short: template.short,
          label: template.label
        };
      }
    }
  }

  // Global (non-bundle) templates — exact key match
  for (const [entityType, templates] of Object.entries(GLOBAL_PERMISSIONS_BY_ENTITY_TYPE)) {
    for (const template of templates) {
      if (template.key === permission) {
        return {
          entityType,
          bundle: null,
          scope: 'global',
          short: template.short,
          label: template.label,
          module: template.module
        };
      }
    }
  }

  return null;
}
```

Replace the body of `groupPermissionsByBundle` (lines 200-221) with:

```js
export function groupPermissionsByBundle(permissions) {
  const grouped = {};

  for (const permission of permissions) {
    const parsed = parsePermissionKey(permission);
    if (parsed) {
      const bucket = parsed.scope === 'global' ? GLOBAL_BUCKET_KEY : parsed.bundle;
      if (!grouped[parsed.entityType]) {
        grouped[parsed.entityType] = {};
      }
      if (!grouped[parsed.entityType][bucket]) {
        grouped[parsed.entityType][bucket] = [];
      }
      grouped[parsed.entityType][bucket].push({
        key: permission,
        short: parsed.short,
        label: parsed.label
      });
    }
  }

  return grouped;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- tests/permissions.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/constants/permissions.js tests/permissions.test.mjs
git commit -m "feat(permissions): parse + group global perms into _global bucket"
```

---

### Task A3: Keep per-bundle consumers correct (roleParser regression fix)

`groupPermissionsByBundle` now emits a `_global` key alongside real bundle keys. `getRoleOtherPermissions` and `getRoleSummary` iterate those keys as bundles. Without a fix, global perms get silently reclassified and `bundlesWithPermissions` is inflated.

**Files:**
- Modify: `src/parsers/roleParser.js:140-157` (`getRoleOtherPermissions`), `src/parsers/roleParser.js:223-241` (`getRoleSummary`)
- Test: `tests/roleParser.test.mjs`

- [ ] **Step 1: Write the failing test**

Add to `tests/roleParser.test.mjs` (reuse its existing import of `getRoleOtherPermissions`, `getRoleSummary`; add `GLOBAL_BUCKET_KEY` import if needed):

```js
describe('roleParser — global perms do not corrupt bundle accounting', () => {
  const role = {
    id: 'editor', label: 'Editor', isAdmin: false,
    permissions: [
      'create article content',   // bundle
      'edit any article content', // bundle
      'access content',           // global
      'view latest version',      // global
      'administer nodes'          // other
    ],
    dependencies: {}
  };

  it('getRoleOtherPermissions keeps global perms in "other", not content', () => {
    const other = getRoleOtherPermissions(role);
    expect(other).toContain('access content');
    expect(other).toContain('view latest version');
    expect(other).toContain('administer nodes');
    expect(other).not.toContain('create article content');
  });

  it('getRoleSummary counts 1 bundle (article), not _global', () => {
    const summary = getRoleSummary(role);
    expect(summary.bundlesWithPermissions).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/roleParser.test.mjs`
Expected: FAIL — `getRoleSummary` counts `_global` so `bundlesWithPermissions` is 2; `getRoleOtherPermissions` drops the two global perms.

- [ ] **Step 3: Write minimal implementation**

In `src/parsers/roleParser.js`, add the import at the top (line 6 currently imports from permissions.js):

```js
import { groupPermissionsByBundle, filterBundlePermissions, GLOBAL_BUCKET_KEY } from '../constants/permissions.js';
```

In `getRoleOtherPermissions`, change the bundle loop (lines 148-154) to skip the global bucket:

```js
  for (const entityType of Object.keys(grouped)) {
    for (const bundle of Object.keys(grouped[entityType])) {
      if (bundle === GLOBAL_BUCKET_KEY) continue;
      for (const perm of grouped[entityType][bundle]) {
        contentPermissions.add(perm.key);
      }
    }
  }
```

In `getRoleSummary`, change the bundle count (lines 227-230):

```js
  let bundleCount = 0;
  for (const entityType of Object.keys(contentPerms)) {
    bundleCount += Object.keys(contentPerms[entityType])
      .filter(b => b !== GLOBAL_BUCKET_KEY).length;
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- tests/roleParser.test.mjs`
Expected: PASS (existing `getRoleContentPermissions`/`getRoleOtherPermissions`/`getRoleSummary` tests still pass — behaviour for roles without global perms is unchanged).

- [ ] **Step 5: Commit**

```bash
git add src/parsers/roleParser.js tests/roleParser.test.mjs
git commit -m "fix(roleParser): exclude _global bucket from bundle accounting"
```

---

### Task A4: Fix roleGenerator dependency calculation for global perms

`calculateConfigDependencies` now receives `parsed.bundle === null` for global perms and would call `getBundleConfigName(entityType, null)`, producing a bogus `node.type.null` config dependency. `calculateModuleDependencies` should also emit the global perm's `module` (so `view latest version` adds `content_moderation`).

**Files:**
- Modify: `src/generators/roleGenerator.js:16-31` (`calculateConfigDependencies`), `src/generators/roleGenerator.js:38-67` (`calculateModuleDependencies`)
- Test: `tests/roleGenerator.test.mjs`

- [ ] **Step 1: Write the failing test**

Add to `tests/roleGenerator.test.mjs` (reuse its existing imports of `calculateConfigDependencies`, `calculateModuleDependencies`):

```js
describe('roleGenerator — global perms', () => {
  const perms = ['create article content', 'access content', 'view latest version'];

  it('calculateConfigDependencies ignores global perms (no node.type.null)', () => {
    const deps = calculateConfigDependencies(perms, {});
    expect(deps).toEqual(['node.type.article']);
    expect(deps.some(d => d.includes('null'))).toBe(false);
  });

  it('calculateModuleDependencies adds content_moderation for view latest version', () => {
    const mods = calculateModuleDependencies(perms);
    expect(mods).toContain('node');
    expect(mods).toContain('content_moderation');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/roleGenerator.test.mjs`
Expected: FAIL — `calculateConfigDependencies` includes `node.type.null`; `calculateModuleDependencies` lacks `content_moderation`.

- [ ] **Step 3: Write minimal implementation**

In `src/generators/roleGenerator.js`, change the loop body in `calculateConfigDependencies` (lines 19-28):

```js
  for (const permission of permissions) {
    const parsed = parsePermissionKey(permission);
    if (parsed && parsed.scope !== 'global' && parsed.bundle) {
      try {
        configDeps.add(getBundleConfigName(parsed.entityType, parsed.bundle));
      } catch {
        // Unknown entity type, skip
      }
    }
  }
```

In `calculateModuleDependencies`, extend the parsed branch (lines 42-48):

```js
    const parsed = parsePermissionKey(permission);
    if (parsed) {
      const module = getEntityModule(parsed.entityType);
      if (module) {
        moduleDeps.add(module);
      }
      if (parsed.module) {
        moduleDeps.add(parsed.module);
      }
    }
```

(Leave the existing `use … transition` / `url alias` / `linkit` string checks below it unchanged.)

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- tests/roleGenerator.test.mjs`
Expected: PASS.

- [ ] **Step 5: Part A regression checkpoint**

Run: `npm run test:all`
Expected: PASS — entire suite green. If `tests/reportGenerator.test.mjs` or `tests/role.test.mjs` fixtures contain a global perm string and now newly surface a `_global` bucket, update those assertions to expect the new shape (the data is more correct; do not revert Part A). Note any such adjustment in the commit message.

- [ ] **Step 6: Commit**

```bash
git add src/generators/roleGenerator.js tests/roleGenerator.test.mjs
git commit -m "fix(roleGenerator): skip global perms for config deps, honour module hint"
```

---

# PART B — Combined permissions + workflow report

### Task B1: Pure report data generator — `generatePermissionReportData`

**Files:**
- Create: `src/generators/permissionReport.js`
- Test: `tests/permissionReport.test.mjs`

Inputs: a synced `project` (`project.entities[entityType][bundleId] = { label, ... }`), `roles` (array of parsed roles `{ id, label, isAdmin, permissions }` from `listRoles`), `workflows` (array of parsed workflows from `parseWorkflowConfigs`, shape from `parseWorkflow`: `{ id, label, type, defaultModerationState, states, transitions, entityTypes }`).

- [ ] **Step 1: Write the failing test**

Create `tests/permissionReport.test.mjs`:

```js
/**
 * Tests for the combined permissions + workflow report generator.
 */
import {
  generatePermissionReportData,
  formatPermissionReportMarkdown
} from '../src/generators/permissionReport.js';

const project = {
  slug: 'demo',
  entities: {
    node: {
      article: { label: 'Article' },
      page: { label: 'Page' }
    },
    media: {
      image: { label: 'Image' }
    }
  }
};

const roles = [
  { id: 'editor', label: 'Editor', isAdmin: false, permissions: [
    'create article content', 'edit any article content',
    'create page content',
    'access content', 'view any unpublished content',
    'use editorial transition publish'
  ] },
  { id: 'admin', label: 'Administrator', isAdmin: true, permissions: [] }
];

const workflows = [
  {
    id: 'editorial', label: 'Editorial', type: 'content_moderation',
    defaultModerationState: 'draft',
    states: [
      { id: 'draft', label: 'Draft', published: false },
      { id: 'published', label: 'Published', published: true }
    ],
    transitions: [
      { id: 'publish', label: 'Publish', from: ['draft'], to: 'published' }
    ],
    entityTypes: { node: ['article'] }
  }
];

describe('generatePermissionReportData', () => {
  it('project scope includes every entity type and bundle', () => {
    const data = generatePermissionReportData(project, roles, workflows, { scope: 'project' });
    expect(data.scope).toBe('project');
    expect(data.project).toBe('demo');
    const node = data.entityTypes.find(e => e.entityType === 'node');
    expect(node.bundles.map(b => b.id).sort()).toEqual(['article', 'page']);
  });

  it('bundle scope narrows to one bundle and its workflows', () => {
    const data = generatePermissionReportData(project, roles, workflows,
      { scope: 'bundle', entityType: 'node', bundle: 'article' });
    expect(data.entityTypes).toHaveLength(1);
    expect(data.entityTypes[0].bundles).toHaveLength(1);
    expect(data.entityTypes[0].bundles[0].id).toBe('article');
    expect(data.workflows).toHaveLength(1);
    expect(data.workflows[0].id).toBe('editorial');
  });

  it('entity scope drops workflows not bound to in-scope bundles', () => {
    const data = generatePermissionReportData(project, roles, workflows,
      { scope: 'entity', entityType: 'media' });
    expect(data.entityTypes.map(e => e.entityType)).toEqual(['media']);
    expect(data.workflows).toEqual([]);
  });

  it('builds a role capability matrix per bundle', () => {
    const data = generatePermissionReportData(project, roles, workflows,
      { scope: 'bundle', entityType: 'node', bundle: 'article' });
    const editor = data.entityTypes[0].bundles[0].roles.find(r => r.role === 'editor');
    expect(editor.capabilities.create).toBe(true);
    expect(editor.capabilities.edit_any).toBe(true);
    expect(editor.capabilities.delete_any).toBe(false);
    const admin = data.entityTypes[0].bundles[0].roles.find(r => r.role === 'admin');
    expect(admin.capabilities.create).toBe(true); // isAdmin implies all
  });

  it('reports global permissions per role', () => {
    const data = generatePermissionReportData(project, roles, workflows, { scope: 'project' });
    const node = data.entityTypes.find(e => e.entityType === 'node');
    const editorGlobals = node.globalPermissions.find(g => g.role === 'editor');
    const shorts = editorGlobals.perms.map(p => p.short).sort();
    expect(shorts).toEqual(['view_any_unpublished', 'view_published']);
  });

  it('maps workflow transition perms to roles', () => {
    const data = generatePermissionReportData(project, roles, workflows, { scope: 'project' });
    const wf = data.workflows[0];
    const tp = wf.transitionPermissions.find(t => t.transition === 'publish');
    expect(tp.roles.map(r => r.role)).toContain('editor');
  });

  it('summary records the dominant capability pattern per entity type', () => {
    const data = generatePermissionReportData(project, roles, workflows, { scope: 'project' });
    expect(data.summary.node).toBeDefined();
    expect(data.summary.node.byRole.editor).toContain('create');
    expect(Array.isArray(data.summary.node.precedentBundles)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/permissionReport.test.mjs`
Expected: FAIL — module `src/generators/permissionReport.js` does not exist.

- [ ] **Step 3: Write minimal implementation**

Create `src/generators/permissionReport.js`:

```js
/**
 * Permission + Workflow Report Generator — PURE functions.
 * Produces a role-centric permissions matrix plus a content-moderation
 * workflow section, scoped to project / entity type / bundle.
 */

import {
  getPermissionsForBundle,
  getPermissionTemplates,
  getGlobalPermissionTemplates
} from '../constants/permissions.js';
import { ENTITY_ORDER, getEntityTypeLabel, getBundleAdminUrls } from '../constants/entityTypes.js';

/**
 * Resolve which entity types / bundles are in scope.
 * @returns {Array<{entityType:string, bundles:string[]}>}
 */
function resolveScope(project, { scope, entityType, bundle }) {
  const entities = project.entities || {};
  const orderedTypes = ENTITY_ORDER.filter(t => entities[t] && Object.keys(entities[t]).length > 0);

  if (scope === 'bundle') {
    return [{ entityType, bundles: [bundle] }];
  }
  if (scope === 'entity') {
    return [{ entityType, bundles: Object.keys(entities[entityType] || {}).sort() }];
  }
  return orderedTypes.map(t => ({ entityType: t, bundles: Object.keys(entities[t]).sort() }));
}

/**
 * Build the capability map for one role against a bundle's permission set.
 */
function bundleCapabilities(role, entityType, bundleId) {
  const templates = getPermissionTemplates(entityType);
  const bundlePerms = getPermissionsForBundle(entityType, bundleId);
  const permSet = new Set(role.permissions || []);
  const capabilities = {};
  const permissionKeys = [];

  for (const tmpl of templates) {
    const full = bundlePerms.find(p => p.short === tmpl.short);
    const has = role.isAdmin || (full ? permSet.has(full.key) : false);
    capabilities[tmpl.short] = has;
    if (has && full) permissionKeys.push(full.key);
  }
  return { capabilities, permissionKeys };
}

/**
 * Global perms a role holds for an entity type.
 */
function roleGlobalPerms(role, entityType) {
  const templates = getGlobalPermissionTemplates(entityType);
  if (templates.length === 0) return [];
  const permSet = new Set(role.permissions || []);
  return templates
    .filter(t => role.isAdmin || permSet.has(t.key))
    .map(t => ({ key: t.key, short: t.short, label: t.label, module: t.module }));
}

/**
 * Extract `use <workflow> transition <transition>` perms per role.
 */
function transitionPermissionsForWorkflow(workflow, roles) {
  return workflow.transitions.map(tr => {
    const key = `use ${workflow.id} transition ${tr.id}`;
    const matched = roles
      .filter(r => r.isAdmin || (r.permissions || []).includes(key))
      .map(r => ({ role: r.id, label: r.label || r.id }));
    return { transition: tr.id, label: tr.label, permissionKey: key, roles: matched };
  });
}

/**
 * Filter workflows to those bound to any in-scope bundle.
 */
function scopedWorkflows(workflows, scoped) {
  const inScope = new Set();
  for (const { entityType, bundles } of scoped) {
    for (const b of bundles) inScope.add(`${entityType}:${b}`);
  }
  return (workflows || [])
    .map(wf => {
      const boundBundles = [];
      for (const [et, bs] of Object.entries(wf.entityTypes || {})) {
        for (const b of bs) {
          if (inScope.has(`${et}:${b}`)) boundBundles.push({ entityType: et, bundle: b });
        }
      }
      return { wf, boundBundles };
    })
    .filter(x => x.boundBundles.length > 0)
    .map(({ wf, boundBundles }) => ({
      id: wf.id,
      label: wf.label,
      type: wf.type,
      defaultModerationState: wf.defaultModerationState,
      states: wf.states,
      transitions: wf.transitions.map(t => ({ id: t.id, label: t.label, from: t.from, to: t.to })),
      boundBundles,
      transitionPermissions: transitionPermissionsForWorkflow(wf, [])
    }));
}

/**
 * Generate the structured permission + workflow report.
 * @param {object} project - Synced project
 * @param {object[]} roles - Parsed roles
 * @param {object[]} workflows - Parsed workflows
 * @param {object} opts - { scope:'project'|'entity'|'bundle', entityType, bundle, baseUrl }
 * @returns {object} - Report data
 */
export function generatePermissionReportData(project, roles, workflows, opts = {}) {
  const { scope = 'project', baseUrl = '' } = opts;
  const scoped = resolveScope(project, opts);
  const rolesList = roles || [];

  const entityTypes = scoped.map(({ entityType, bundles }) => {
    const builtBundles = bundles.map(bundleId => {
      const bundleMeta = (project.entities[entityType] || {})[bundleId] || {};
      const adminUrls = getBundleAdminUrls(entityType, bundleId);
      const permUrl = adminUrls.find(u => /permission/i.test(u.name) || /permission/i.test(u.path));
      return {
        id: bundleId,
        label: bundleMeta.label || bundleId,
        adminPermissionsUrl: permUrl
          ? (baseUrl ? `${baseUrl}${permUrl.path}` : permUrl.path)
          : null,
        roles: rolesList.map(role => {
          const { capabilities, permissionKeys } = bundleCapabilities(role, entityType, bundleId);
          return {
            role: role.id,
            label: role.label || role.id,
            isAdmin: role.isAdmin || false,
            capabilities,
            permissionKeys
          };
        })
      };
    });

    const globalPermissions = rolesList
      .map(role => ({ role: role.id, label: role.label || role.id, perms: roleGlobalPerms(role, entityType) }))
      .filter(g => g.perms.length > 0);

    return { entityType, label: getEntityTypeLabel(entityType), bundles: builtBundles, globalPermissions };
  });

  // Workflows: filter + attach transition perms (resolved against all roles).
  const wfBase = scopedWorkflows(workflows, scoped);
  const wfList = wfBase.map(wf => {
    const src = (workflows || []).find(w => w.id === wf.id);
    return { ...wf, transitionPermissions: transitionPermissionsForWorkflow(src, rolesList) };
  });

  return {
    scope,
    project: project.slug,
    generatedAt: new Date().toISOString(),
    entityTypes,
    workflows: wfList,
    summary: buildSummary(entityTypes)
  };
}

/**
 * Modal-pattern summary per entity type — the hook the suggestion skill reads.
 */
function buildSummary(entityTypes) {
  const summary = {};
  for (const et of entityTypes) {
    const byRole = {};
    const capCount = {};
    for (const bundle of et.bundles) {
      for (const r of bundle.roles) {
        if (r.isAdmin) continue;
        const caps = Object.entries(r.capabilities).filter(([, v]) => v).map(([k]) => k);
        if (caps.length === 0) continue;
        byRole[r.role] = Array.from(new Set([...(byRole[r.role] || []), ...caps]));
        for (const c of caps) capCount[c] = (capCount[c] || 0) + 1;
      }
    }
    const dominantCapabilities = Object.entries(capCount)
      .sort((a, b) => b[1] - a[1])
      .map(([c]) => c);
    summary[et.entityType] = {
      dominantCapabilities,
      byRole,
      precedentBundles: et.bundles.map(b => b.id)
    };
  }
  return summary;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- tests/permissionReport.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/generators/permissionReport.js tests/permissionReport.test.mjs
git commit -m "feat(report): add generatePermissionReportData (role-centric matrix)"
```

---

### Task B2: Markdown formatter — `formatPermissionReportMarkdown`

**Files:**
- Modify: `src/generators/permissionReport.js`
- Test: `tests/permissionReport.test.mjs`

- [ ] **Step 1: Write the failing test**

Append to `tests/permissionReport.test.mjs` (reuse the `project`, `roles`, `workflows` fixtures defined at the top of the file):

```js
describe('formatPermissionReportMarkdown', () => {
  it('renders a per-bundle matrix, global perms, workflow and summary sections', () => {
    const data = generatePermissionReportData(project, roles, workflows, { scope: 'project' });
    const md = formatPermissionReportMarkdown(data);
    expect(md).toContain('# Permissions & Workflow Report');
    expect(md).toContain('## Content Types'); // node entity label
    expect(md).toContain('### Article');
    expect(md).toContain('| Role |');         // matrix table header
    expect(md).toContain('Global Permissions');
    expect(md).toContain('## Workflows');
    expect(md).toContain('Editorial');
    expect(md).toContain('Publish');          // transition
    expect(md).toContain('## Suggestion Summary');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/permissionReport.test.mjs`
Expected: FAIL — `formatPermissionReportMarkdown` is not exported.

- [ ] **Step 3: Write minimal implementation**

Append to `src/generators/permissionReport.js`:

```js
/**
 * Render the report data as Markdown.
 * @param {object} data - Output of generatePermissionReportData
 * @returns {string} - Markdown document
 */
export function formatPermissionReportMarkdown(data) {
  const lines = [];
  lines.push(`# Permissions & Workflow Report`);
  lines.push('');
  lines.push(`- Project: \`${data.project}\``);
  lines.push(`- Scope: \`${data.scope}\``);
  lines.push(`- Generated: ${data.generatedAt}`);
  lines.push('');

  for (const et of data.entityTypes) {
    lines.push(`## ${et.label}`);
    lines.push('');

    for (const bundle of et.bundles) {
      lines.push(`### ${bundle.label} (\`${bundle.id}\`)`);
      if (bundle.adminPermissionsUrl) {
        lines.push(`Manage permissions: ${bundle.adminPermissionsUrl}`);
      }
      lines.push('');
      const caps = bundle.roles.length
        ? Object.keys(bundle.roles[0].capabilities)
        : [];
      lines.push(`| Role | ${caps.join(' | ')} |`);
      lines.push(`|------${caps.map(() => '|------').join('')}|`);
      for (const r of bundle.roles) {
        const cells = caps.map(c => (r.capabilities[c] ? 'Yes' : 'No'));
        lines.push(`| ${r.label} | ${cells.join(' | ')} |`);
      }
      lines.push('');
    }

    if (et.globalPermissions.length > 0) {
      lines.push(`#### Global Permissions`);
      lines.push('');
      lines.push(`| Role | Permission | Module |`);
      lines.push(`|------|------------|--------|`);
      for (const g of et.globalPermissions) {
        for (const p of g.perms) {
          lines.push(`| ${g.label} | ${p.label} (\`${p.key}\`) | ${p.module} |`);
        }
      }
      lines.push('');
    }
  }

  if (data.workflows.length > 0) {
    lines.push(`## Workflows`);
    lines.push('');
    for (const wf of data.workflows) {
      lines.push(`### ${wf.label} (\`${wf.id}\`)`);
      lines.push(`- Type: ${wf.type}`);
      lines.push(`- Default state: ${wf.defaultModerationState}`);
      lines.push(`- States: ${wf.states.map(s => s.label).join(', ')}`);
      lines.push(`- Bound bundles: ${wf.boundBundles.map(b => `${b.entityType}:${b.bundle}`).join(', ')}`);
      lines.push('');
      lines.push(`| Transition | From → To | Roles |`);
      lines.push(`|------------|-----------|-------|`);
      for (const tp of wf.transitionPermissions) {
        const tr = wf.transitions.find(t => t.id === tp.transition);
        const flow = tr ? `${tr.from.join(', ')} → ${tr.to}` : '';
        const rolesTxt = tp.roles.length ? tp.roles.map(r => r.label).join(', ') : '_none_';
        lines.push(`| ${tp.label} | ${flow} | ${rolesTxt} |`);
      }
      lines.push('');
    }
  }

  lines.push(`## Suggestion Summary`);
  lines.push('');
  for (const [et, s] of Object.entries(data.summary)) {
    lines.push(`### ${et}`);
    lines.push(`- Dominant capabilities: ${s.dominantCapabilities.join(', ') || '_none_'}`);
    for (const [role, caps] of Object.entries(s.byRole)) {
      lines.push(`- ${role}: ${caps.join(', ')}`);
    }
    lines.push(`- Precedent bundles: ${s.precedentBundles.join(', ') || '_none_'}`);
    lines.push('');
  }

  return lines.join('\n');
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- tests/permissionReport.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/generators/permissionReport.js tests/permissionReport.test.mjs
git commit -m "feat(report): add formatPermissionReportMarkdown"
```

---

### Task B3: Command wrapper — `createPermissionReport`

**Files:**
- Modify: `src/commands/report.js`
- Test: `tests/permissionReport.test.mjs`

- [ ] **Step 1: Write the failing test**

Append to `tests/permissionReport.test.mjs`:

```js
import { mkdtempSync, readFileSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { createPermissionReport } from '../src/commands/report.js';

describe('createPermissionReport', () => {
  it('writes both .md and .json next to the given base path', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'dcm-permrep-'));
    const base = join(dir, 'permissions-project');
    const res = await createPermissionReport(project, roles, workflows,
      { scope: 'project' }, base, 'both');
    expect(existsSync(`${base}.md`)).toBe(true);
    expect(existsSync(`${base}.json`)).toBe(true);
    expect(res.markdownPath).toBe(`${base}.md`);
    expect(res.jsonPath).toBe(`${base}.json`);
    const parsed = JSON.parse(readFileSync(`${base}.json`, 'utf8'));
    expect(parsed.project).toBe('demo');
  });

  it('format "json" writes only the .json file', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'dcm-permrep-'));
    const base = join(dir, 'permissions-project');
    const res = await createPermissionReport(project, roles, workflows,
      { scope: 'project' }, base, 'json');
    expect(existsSync(`${base}.json`)).toBe(true);
    expect(existsSync(`${base}.md`)).toBe(false);
    expect(res.markdownPath).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/permissionReport.test.mjs`
Expected: FAIL — `createPermissionReport` not exported from `src/commands/report.js`.

- [ ] **Step 3: Write minimal implementation**

In `src/commands/report.js`, extend the imports (line 5) and add the function:

```js
import { generateEntityTypeReport, generateProjectReport, generateSingleBundleReport } from '../generators/reportGenerator.js';
import { generatePermissionReportData, formatPermissionReportMarkdown } from '../generators/permissionReport.js';
import { writeTextFile } from '../io/fileSystem.js';
```

Append:

```js
/**
 * Create a combined permissions + workflow report.
 * @param {object} project - Synced project
 * @param {object[]} roles - Parsed roles
 * @param {object[]} workflows - Parsed workflows
 * @param {object} opts - { scope, entityType, bundle, baseUrl }
 * @param {string} basePath - Output path without extension
 * @param {'md'|'json'|'both'} format - Which artifacts to write
 * @returns {Promise<{data:object, markdownPath:string|null, jsonPath:string|null}>}
 */
export async function createPermissionReport(project, roles, workflows, opts, basePath, format = 'both') {
  const data = generatePermissionReportData(project, roles, workflows, opts);
  let markdownPath = null;
  let jsonPath = null;

  if (format === 'md' || format === 'both') {
    markdownPath = `${basePath}.md`;
    await writeTextFile(markdownPath, formatPermissionReportMarkdown(data));
  }
  if (format === 'json' || format === 'both') {
    jsonPath = `${basePath}.json`;
    await writeTextFile(jsonPath, JSON.stringify(data, null, 2));
  }

  return { data, markdownPath, jsonPath };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- tests/permissionReport.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/commands/report.js tests/permissionReport.test.mjs
git commit -m "feat(report): add createPermissionReport command wrapper"
```

---

### Task B4: CLI command — `cmdReportPermissions` + `index.mjs` registration

**Files:**
- Modify: `src/cli/commands/miscCmds.js` (add `cmdReportPermissions`)
- Modify: `index.mjs:301-354` (register subcommand)
- Test: `tests/cli.test.mjs` (CLI smoke test — follow existing patterns in that file)

- [ ] **Step 1: Write the failing test**

Add a test to `tests/cli.test.mjs` following its existing style for invoking the built CLI (inspect the file first for its `runCli`/exec helper and reuse it). The assertion:

```js
describe('report permissions command', () => {
  it('errors clearly when --project is missing', async () => {
    const { stderr, code } = await runCli(['report', 'permissions']);
    expect(code).not.toBe(0);
    expect(stderr + '').toMatch(/--project is required|required option/i);
  });

  it('appears in `report --help`', async () => {
    const { stdout } = await runCli(['report', '--help']);
    expect(stdout).toMatch(/permissions/);
  });
});
```

(If `tests/cli.test.mjs` uses a different helper name/signature, adapt the call but keep the two assertions.)

- [ ] **Step 2: Run test to verify it fails**

Run: `npm run test -- tests/cli.test.mjs`
Expected: FAIL — `permissions` subcommand not registered.

- [ ] **Step 3: Write minimal implementation**

In `src/cli/commands/miscCmds.js`, extend imports:

```js
import { createEntityReport, createProjectReport, createPermissionReport } from '../../commands/report.js';
import { parseFilterFormats, parseWorkflowConfigs, readRawWorkflowConfig, writeWorkflowConfig } from '../../io/configReader.js';
```

(`parseWorkflowConfigs` is already imported in this file — confirm and avoid a duplicate import; only add `createPermissionReport`.)

Add the command after `cmdReportProject` (line ~147):

```js
/**
 * Generate a combined permissions + workflow report.
 * Scope: bundle if --bundle, else entity if --entity-type, else project.
 */
export async function cmdReportPermissions(options) {
  try {
    if (!options.project) {
      throw new Error('--project is required');
    }

    const project = await loadProject(options.project);
    await autoSyncProject(project);

    if (!project.entities) {
      throw new Error('Project has not been synced. Run "dcm project sync" first.');
    }

    let scope = 'project';
    if (options.bundle) scope = 'bundle';
    else if (options.entityType) scope = 'entity';

    if (scope !== 'project' && !isValidEntityType(options.entityType)) {
      throw new Error(`Invalid entity type. Must be one of: ${VALID_ENTITY_TYPES.join(', ')}`);
    }
    if (scope === 'bundle') {
      const bundles = project.entities[options.entityType] || {};
      if (!bundles[options.bundle]) {
        throw new Error(`Bundle "${options.bundle}" not found in ${options.entityType}`);
      }
    }

    const baseUrl = options.baseUrl || project.baseUrl || '';
    const roles = await listRoles(project);
    const workflows = await parseWorkflowConfigs(project.configDirectory);
    const opts = { scope, entityType: options.entityType, bundle: options.bundle, baseUrl };

    // --out - : print to stdout (json by default, or md if --format md)
    if (options.out === '-') {
      const { generatePermissionReportData, formatPermissionReportMarkdown } =
        await import('../../generators/permissionReport.js');
      const data = generatePermissionReportData(project, roles, workflows, opts);
      if (options.format === 'md') {
        console.log(formatPermissionReportMarkdown(data));
      } else {
        output(data, true);
      }
      return;
    }

    const format = options.format || 'both';
    const scopeLabel = scope === 'bundle'
      ? `${options.entityType}-${options.bundle}`
      : scope === 'entity' ? options.entityType : 'project';
    const basePath = options.out
      ? options.out.replace(/\.(md|json)$/i, '')
      : join(getReportsDir(project.slug), `permissions-${scopeLabel}`);

    const res = await createPermissionReport(project, roles, workflows, opts, basePath, format);

    if (options.json) {
      output({ success: true, scope, markdownPath: res.markdownPath, jsonPath: res.jsonPath }, true);
    } else {
      if (res.markdownPath) console.log(chalk.green(`Markdown report: ${res.markdownPath}`));
      if (res.jsonPath) console.log(chalk.green(`JSON report: ${res.jsonPath}`));
    }
  } catch (error) {
    handleError(error);
  }
}
```

In `index.mjs`, add the import next to the other report commands (find the import of `cmdReportEntity`/`cmdReportProject` and add `cmdReportPermissions`), then register the subcommand after the `report project` block (line ~318):

```js
reportCmd
  .command('permissions')
  .description('Generate a combined permissions + workflow report')
  .requiredOption('-p, --project <slug>', 'Project slug')
  .option('-e, --entity-type <type>', 'Entity type (entity scope)')
  .option('-b, --bundle <bundle>', 'Bundle machine name (bundle scope; requires -e)')
  .option('--format <format>', 'Output format: md | json | both', 'both')
  .option('--out <path>', 'Output base path, or "-" for stdout')
  .option('-u, --base-url <url>', 'Base URL for admin links')
  .option('-j, --json', 'Output result metadata as JSON')
  .action(cmdReportPermissions);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm run test -- tests/cli.test.mjs`
Expected: PASS.

- [ ] **Step 5: Lint + commit**

Run: `npm run lint`
Expected: no errors (run `npm run lint:fix` if needed).

```bash
git add src/cli/commands/miscCmds.js index.mjs tests/cli.test.mjs
git commit -m "feat(cli): add `dcm report permissions` command"
```

---

### Task B5: Interactive menu entry — `handlePermissionReport`

**Files:**
- Modify: `src/cli/prompts.js:53-65` (add menu choice)
- Modify: `src/cli/menus/reportMenus.js` (add handler)
- Modify: `src/cli/menus/mainMenu.js:40-` (import) and `:394-402` (switch case)
- Test: manual (interactive menu) — covered by reusing tested generators; add no unit test for inquirer flow (consistent with existing report menu handlers, which are untested).

- [ ] **Step 1: Add the menu choice**

In `src/cli/prompts.js`, in `PROJECT_SUBMENU_CHOICES.reports` (lines 53-65), add after the `report-project` line:

```js
    { value: 'report-permissions', name: 'Generate permissions & workflow report' },
```

- [ ] **Step 2: Add the handler**

In `src/cli/menus/reportMenus.js`, extend imports:

```js
import { createEntityReport, createProjectReport, createBundleReport, createPermissionReport } from '../../commands/report.js';
import { parseWorkflowConfigs } from '../../io/configReader.js';
import { getEntityTypeLabel } from '../../generators/reportGenerator.js';
import { getEntityTypeSingularLabel, ENTITY_ORDER } from '../../constants/entityTypes.js';
```

Add the handler (after `handleProjectReport`, line ~293):

```js
/**
 * Handle combined permissions + workflow report generation.
 * @param {object} project - The current project
 * @returns {Promise<void>}
 */
export async function handlePermissionReport(project) {
  try {
    const summary = getBundleSummary(project);
    if (!summary.synced) {
      console.log(chalk.yellow('Project has not been synced. Run sync first.'));
      return;
    }

    const scope = await select({
      message: 'Report scope:',
      choices: [
        { value: 'project', name: 'Whole project' },
        { value: 'entity', name: 'One entity type' },
        { value: 'bundle', name: 'One bundle' }
      ]
    });

    let entityType;
    let bundle;
    if (scope !== 'project') {
      const entityTypes = ENTITY_ORDER.filter(
        t => project.entities[t] && Object.keys(project.entities[t]).length > 0
      );
      entityType = await select({
        message: 'Entity type:',
        choices: entityTypes.map(t => ({ value: t, name: getEntityTypeLabel(t) }))
      });
      if (scope === 'bundle') {
        const bundles = Object.keys(project.entities[entityType]);
        bundle = await select({
          message: 'Bundle:',
          choices: bundles.map(b => ({ value: b, name: b }))
        });
      }
    }

    const format = await select({
      message: 'Output format:',
      choices: [
        { value: 'both', name: 'Markdown + JSON' },
        { value: 'md', name: 'Markdown only' },
        { value: 'json', name: 'JSON only' }
      ]
    });

    const baseUrl = await promptForReportUrl(project);

    const scopeLabel = scope === 'bundle'
      ? `${entityType}-${bundle}`
      : scope === 'entity' ? entityType : 'project';
    const outputDir = await promptForOutputDirectory();
    const defaultBase = join(outputDir, `${project.slug}-permissions-${scopeLabel}`);
    const basePath = (await input({
      message: 'Output base path (no extension):',
      default: defaultBase
    })).trim();

    for (const ext of (format === 'both' ? ['md', 'json'] : [format])) {
      const candidate = `${basePath}.${ext}`;
      if (existsSync(candidate)) {
        const ok = await confirm({ message: `${candidate} exists. Overwrite?`, default: false });
        if (!ok) {
          console.log(chalk.yellow('Cancelled.'));
          return;
        }
      }
    }

    const roles = await listRoles(project);
    const workflows = await parseWorkflowConfigs(project.configDirectory);
    const res = await createPermissionReport(
      project, roles, workflows,
      { scope, entityType, bundle, baseUrl },
      basePath, format
    );
    if (res.markdownPath) console.log(chalk.green(`Markdown report: ${res.markdownPath}`));
    if (res.jsonPath) console.log(chalk.green(`JSON report: ${res.jsonPath}`));
  } catch (error) {
    if (error.name === 'ExitPromptError') {
      return;
    }
    console.log(chalk.red(`Error: ${error.message}`));
  }
}
```

Add `existsSync` to the `fs` import at the top of `reportMenus.js` (line 9 currently `import { readFileSync } from 'fs';`):

```js
import { readFileSync, existsSync } from 'fs';
```

- [ ] **Step 3: Wire into mainMenu**

In `src/cli/menus/mainMenu.js`, find the existing import of `handleBundleReport, handleEntityReport, handleProjectReport` from `./reportMenus.js` and add `handlePermissionReport` to that import list. Then in `handleAction` (after `case 'report-project':`, line ~402) add:

```js
    case 'report-permissions':
      await handlePermissionReport(project);
      break;
```

- [ ] **Step 4: Verify wiring**

Run: `npm run lint`
Expected: no errors.

Run: `npm run test:all`
Expected: PASS — full suite green (menu code is not unit-tested but must not break imports/lint).

- [ ] **Step 5: Manual smoke (document, do not block)**

Run `npm run start`, load a synced project with roles + an editorial workflow, choose Reports → "Generate permissions & workflow report", scope = project, format = both, accept default path. Confirm both files are written and the markdown has the matrix, global perms, workflow, and summary sections. Record the result in the commit body.

- [ ] **Step 6: Commit**

```bash
git add src/cli/prompts.js src/cli/menus/reportMenus.js src/cli/menus/mainMenu.js
git commit -m "feat(menu): add permissions & workflow report to Reports menu"
```

---

### Task B6: Help text parity

**Files:**
- Modify: the report help module referenced by `index.mjs` as `REPORT_HELP` / `REPORT_HELP_DATA` (find with: search `src/cli/help/` for `REPORT_HELP`).

- [ ] **Step 1: Locate the help source**

Search `src/cli/help/` for `REPORT_HELP`. It is the `addHelpText('after', REPORT_HELP)` / `_helpData = REPORT_HELP_DATA` used at `index.mjs:298-299`.

- [ ] **Step 2: Add the entry**

Add a `report permissions` line to `REPORT_HELP` and a matching entry to `REPORT_HELP_DATA`, following the exact format the other report subcommands use in that file (copy the `report project` entry's structure, change command/description to:
`dcm report permissions -p <slug> [-e <type>] [-b <bundle>] [--format md|json|both] [--out <path>]` — "Combined permissions + workflow report").

- [ ] **Step 3: Verify**

Run: `npm run test -- tests/help.test.mjs`
Expected: PASS (if `tests/help.test.mjs` asserts a command count or snapshot, update it to include the new command — the new command is intended).

- [ ] **Step 4: Commit**

```bash
git add src/cli/help/
git commit -m "docs(help): document `dcm report permissions`"
```

---

# PART C — Permission-suggestion skill

### Task C1: Author the suggestion skill

**Files:**
- Create: `.claude/skills/drupal-content-modeller--suggest-permissions/SKILL.md`

Skills live in `.claude/skills/` in this repo and are installed to `~/.claude/skills/` by `dcm skill-install` (see `cmdSkillInstall` in `miscCmds.js`). Follow the naming convention of the sibling skills under `.claude/skills/` (inspect one, e.g. `drupal-content-modeller--discover`, for the exact frontmatter format used in this repo).

- [ ] **Step 1: Inspect an existing sibling skill**

Read one existing `SKILL.md` under `.claude/skills/` to copy its frontmatter shape (name/description fields, any metadata) exactly.

- [ ] **Step 2: Write the skill**

Create `.claude/skills/drupal-content-modeller--suggest-permissions/SKILL.md` with frontmatter matching the sibling format and a body covering:

```markdown
---
name: drupal-content-modeller--suggest-permissions
description: Use when a developer needs role permissions for a NEW Drupal bundle (content type / media type / vocabulary / block type) and wants them derived from how permissions are already set on the site. Reads the dcm permissions report and proposes a permission set with cited precedent.
---

# Suggest Permissions for a New Bundle

## When to use
A developer has a filled ticket for a new bundle and needs to know which
roles get which permissions, consistent with existing bundles. Does NOT
re-litigate the content model — escalate ambiguous tickets back to the BA.

## Inputs
- Project slug
- Target entity type (node | media | taxonomy_term | block_content)
- New bundle machine name
- Optional intent hint (e.g. "editorial content type like article")

## Procedure
1. Generate the report JSON:
   `dcm report permissions -p <slug> --format json --out -`
   (add `-e <entityType>` to narrow scope when the project is large).
2. Read `summary.<entityType>`:
   - `dominantCapabilities` — the capability set most bundles grant.
   - `byRole` — capabilities each non-admin role typically holds.
   - `precedentBundles` — existing bundles to compare against.
3. Pick the closest precedent bundle(s) using the intent hint and the
   per-bundle `roles[].capabilities` matrix. Prefer an explicit match named
   in the ticket; otherwise use the modal pattern.
4. Account for:
   - Global perms (`entityTypes[].globalPermissions`) — e.g. whether editors
     get `view any unpublished content` / `view latest version`.
   - Workflow binding — if the entity type appears in `workflows[].boundBundles`,
     include the relevant `use <workflow> transition <X>` perms per the roles
     already mapped in `workflows[].transitionPermissions`.
5. Output, for each role, ready-to-run commands and cite the precedent:

   > Matches `article` (precedent): editors get create + edit_any + view_any_unpublished.

   ```
   dcm role set-permissions -p <slug> -r editor -e <entityType> -b <bundle> \
     --permissions create,edit_any
   dcm role add-permission -p <slug> -r editor --permissions "view any unpublished content"
   ```

## Boundaries
- Propose only; never modify role config. The developer runs the commands.
- If no precedent exists for the entity type, say so and propose the
  minimal safe set (create + edit_own for the authoring role only),
  flagged for Tech Lead review.

## Example
(Include one fully worked example: project with `article`/`page`, an
editorial workflow on `node`, target = new `node` bundle `news`. Show the
JSON fields consulted and the final proposed commands.)
```

Fill the example section with concrete JSON excerpts and commands (do not leave it as a parenthetical — write the worked example out).

- [ ] **Step 3: Validate the skill loads**

Run: `dcm skill-install --force` then confirm `~/.claude/skills/drupal-content-modeller--suggest-permissions/SKILL.md` exists. Read it back and verify the frontmatter parses (matches sibling format exactly).

- [ ] **Step 4: Commit**

```bash
git add .claude/skills/drupal-content-modeller--suggest-permissions/SKILL.md
git commit -m "feat(skill): add permission-suggestion skill"
```

---

## Final verification

- [ ] **Run full suite + lint**

Run: `npm run test:all`
Expected: PASS — entire suite green, including the original `permissions`, `roleParser`, `roleGenerator`, `reportGenerator` suites (Part A regression checkpoint) plus the new `permissionReport` and CLI tests.

Run: `npm run lint`
Expected: no errors.

- [ ] **End-to-end manual check**

Against a synced project with roles and an editorial content-moderation workflow:
1. `dcm report permissions -p <slug>` → confirm `permissions-project.md` + `.json` under the project reports dir.
2. `dcm report permissions -p <slug> -e node` → entity scope.
3. `dcm report permissions -p <slug> -e node -b article` → bundle scope, workflow section present.
4. `dcm report permissions -p <slug> --format json --out -` → valid JSON to stdout with `summary` populated.
5. Invoke the suggestion skill for a new bundle; confirm it cites a precedent and emits runnable `dcm role` commands.

---

## Self-Review Notes (author)

- **Spec coverage:** A (global constants — Tasks A1–A4); B (combined report, JSON+MD, project/entity/bundle, command + menu, default+override path, workflow incl. transition perms — Tasks B1–B6); C (AI-reasoned suggestion skill reading report JSON — Task C1). All spec sections mapped.
- **Regression risk** (spec's named risk area) is isolated to Tasks A3/A4 with an explicit `npm run test:all` checkpoint at A4 step 5 and again at Final verification.
- **Type consistency:** `generatePermissionReportData(project, roles, workflows, opts)` → object consumed unchanged by `formatPermissionReportMarkdown(data)` and `createPermissionReport(...basePath, format)`; `GLOBAL_BUCKET_KEY` is the single shared sentinel used by permissions.js, roleParser.js; `scope` ∈ {project,entity,bundle} and `format` ∈ {md,json,both} used consistently across B3/B4/B5.
- **No placeholders:** every code step contains complete code; the skill's example must be written out (called out explicitly in C1 step 2).
