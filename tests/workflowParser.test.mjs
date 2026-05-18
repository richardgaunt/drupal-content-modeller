/**
 * Tests for the workflow parser (PURE functions).
 * permissionReport.js is the first real consumer of parseWorkflow's output
 * shape, so this locks down transitions[].from/to, entityTypes, states and
 * defaultModerationState.
 */
import {
  filterWorkflowFiles,
  extractWorkflowIdFromFilename,
  getWorkflowFilename,
  parseWorkflow,
  addBundleToWorkflow,
  removeBundleFromWorkflow
} from '../src/parsers/workflowParser.js';

describe('workflowParser — filename helpers', () => {
  it('filters only workflow config files', () => {
    const files = [
      'workflows.workflow.editorial.yml',
      'workflows.workflow.basic.yml',
      'node.type.article.yml',
      'workflows.workflow.editorial.txt'
    ];
    expect(filterWorkflowFiles(files)).toEqual([
      'workflows.workflow.editorial.yml',
      'workflows.workflow.basic.yml'
    ]);
  });

  it('extracts the workflow id from a filename', () => {
    expect(extractWorkflowIdFromFilename('workflows.workflow.editorial.yml')).toBe('editorial');
    expect(extractWorkflowIdFromFilename('node.type.article.yml')).toBeNull();
  });

  it('builds a filename from a workflow id', () => {
    expect(getWorkflowFilename('editorial')).toBe('workflows.workflow.editorial.yml');
  });
});

describe('workflowParser — parseWorkflow', () => {
  const config = {
    id: 'editorial',
    label: 'Editorial',
    type: 'content_moderation',
    status: true,
    type_settings: {
      default_moderation_state: 'draft',
      states: {
        published: { label: 'Published', published: true, default_revision: true, weight: 2 },
        draft: { label: 'Draft', published: false, default_revision: false, weight: 0 }
      },
      transitions: {
        publish: { label: 'Publish', from: ['draft'], to: 'published', weight: 1 },
        create_new_draft: { label: 'Create New Draft', from: ['draft', 'published'], to: 'draft', weight: 0 }
      },
      entity_types: {
        node: ['page', 'article']
      }
    }
  };

  it('parses states sorted by weight', () => {
    const wf = parseWorkflow(config);
    expect(wf.states.map(s => s.id)).toEqual(['draft', 'published']);
    expect(wf.states[1].published).toBe(true);
  });

  it('parses transitions with from/to sorted by weight', () => {
    const wf = parseWorkflow(config);
    expect(wf.transitions.map(t => t.id)).toEqual(['create_new_draft', 'publish']);
    const publish = wf.transitions.find(t => t.id === 'publish');
    expect(publish.from).toEqual(['draft']);
    expect(publish.to).toBe('published');
  });

  it('parses and sorts entity_types bundles', () => {
    const wf = parseWorkflow(config);
    expect(wf.entityTypes.node).toEqual(['article', 'page']);
  });

  it('exposes id, label, type and defaultModerationState', () => {
    const wf = parseWorkflow(config);
    expect(wf.id).toBe('editorial');
    expect(wf.label).toBe('Editorial');
    expect(wf.type).toBe('content_moderation');
    expect(wf.defaultModerationState).toBe('draft');
    expect(wf.status).toBe(true);
  });

  it('returns null for falsy config', () => {
    expect(parseWorkflow(null)).toBeNull();
    expect(parseWorkflow(undefined)).toBeNull();
  });

  it('defaults gracefully when type_settings is missing', () => {
    const wf = parseWorkflow({ id: 'bare' });
    expect(wf.states).toEqual([]);
    expect(wf.transitions).toEqual([]);
    expect(wf.entityTypes).toEqual({});
    expect(wf.defaultModerationState).toBe('');
    expect(wf.status).toBe(true);
  });

  it('treats explicit status:false as disabled', () => {
    expect(parseWorkflow({ id: 'x', status: false }).status).toBe(false);
  });
});

describe('workflowParser — addBundleToWorkflow', () => {
  const base = {
    id: 'editorial',
    type_settings: { entity_types: { node: ['page'] } },
    dependencies: { config: ['node.type.page'] }
  };

  it('adds a bundle and its config dependency without mutating input', () => {
    const updated = addBundleToWorkflow(base, 'node', 'article', 'node.type.article');
    expect(updated.type_settings.entity_types.node).toEqual(['article', 'page']);
    expect(updated.dependencies.config).toEqual(['node.type.article', 'node.type.page']);
    // original untouched
    expect(base.type_settings.entity_types.node).toEqual(['page']);
  });

  it('is idempotent for an existing bundle', () => {
    const updated = addBundleToWorkflow(base, 'node', 'page', 'node.type.page');
    expect(updated.type_settings.entity_types.node).toEqual(['page']);
    expect(updated.dependencies.config).toEqual(['node.type.page']);
  });

  it('creates the entity_types/dependencies structure when absent', () => {
    const updated = addBundleToWorkflow({ id: 'w' }, 'media', 'image', 'media.type.image');
    expect(updated.type_settings.entity_types.media).toEqual(['image']);
    expect(updated.dependencies.config).toEqual(['media.type.image']);
  });
});

describe('workflowParser — removeBundleFromWorkflow', () => {
  it('removes the bundle and its dependency, dropping the empty entity type', () => {
    const config = {
      type_settings: { entity_types: { node: ['article'] } },
      dependencies: { config: ['node.type.article', 'node.type.page'] }
    };
    const updated = removeBundleFromWorkflow(config, 'node', 'article', 'node.type.article');
    expect(updated.type_settings.entity_types.node).toBeUndefined();
    expect(updated.dependencies.config).toEqual(['node.type.page']);
  });

  it('keeps other bundles of the same entity type', () => {
    const config = {
      type_settings: { entity_types: { node: ['article', 'page'] } },
      dependencies: { config: ['node.type.article', 'node.type.page'] }
    };
    const updated = removeBundleFromWorkflow(config, 'node', 'article', 'node.type.article');
    expect(updated.type_settings.entity_types.node).toEqual(['page']);
  });

  it('is a no-op when the bundle is absent', () => {
    const config = { type_settings: { entity_types: { node: ['page'] } }, dependencies: {} };
    const updated = removeBundleFromWorkflow(config, 'node', 'article', 'node.type.article');
    expect(updated.type_settings.entity_types.node).toEqual(['page']);
  });
});
