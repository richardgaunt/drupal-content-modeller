/**
 * Tests for the combined permissions + workflow report generator.
 */
import {
  generatePermissionReportData,
  formatPermissionReportMarkdown
} from '../src/generators/permissionReport.js';
import { mkdtempSync, readFileSync, existsSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { createPermissionReport } from '../src/commands/report.js';

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

describe('formatPermissionReportMarkdown — edge cases', () => {
  it('renders a note instead of a degenerate table when there are no roles', () => {
    const data = generatePermissionReportData(project, [], workflows, { scope: 'project' });
    const md = formatPermissionReportMarkdown(data);
    expect(md).toContain('_No roles defined._');
    // No malformed header/separator rows
    expect(md).not.toContain('| Role |  |');
    expect(md).not.toMatch(/^\|------\|$/m);
  });

  it('renders a note for an entity scope with zero bundles', () => {
    const emptyProject = {
      slug: 'demo',
      entities: { node: { article: { label: 'Article' } }, media: {} }
    };
    const data = generatePermissionReportData(emptyProject, roles, [], { scope: 'entity', entityType: 'media' });
    const md = formatPermissionReportMarkdown(data);
    expect(md).toContain('_No bundles defined for this entity type._');
  });
});

describe('scopedWorkflows resolves transition perms against supplied roles', () => {
  it('uses the real roles list (not an empty one)', () => {
    const data = generatePermissionReportData(project, roles, workflows, { scope: 'project' });
    const tp = data.workflows[0].transitionPermissions.find(t => t.transition === 'publish');
    expect(tp.roles.map(r => r.role)).toContain('editor');
  });

  it('yields empty transition roles when no roles are supplied', () => {
    const data = generatePermissionReportData(project, [], workflows, { scope: 'project' });
    const tp = data.workflows[0].transitionPermissions.find(t => t.transition === 'publish');
    expect(tp.roles).toEqual([]);
  });
});

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
