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
