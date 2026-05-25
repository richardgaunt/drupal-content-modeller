import {
  isSearchServerFile,
  isSearchIndexFile,
  filterSearchServerFiles,
  filterSearchIndexFiles,
  filterViewFiles,
  getViewSearchIndexId,
  isSearchBoundView,
  parseSearchServer,
  parseSearchIndex,
  parseSearchView,
  suggestSearchType,
  buildIndexableTree
} from '../src/parsers/searchParser.js';

describe('Search Parser - File matchers', () => {
  test('isSearchServerFile', () => {
    expect(isSearchServerFile('search_api.server.db.yml')).toBe(true);
    expect(isSearchServerFile('search_api.index.content.yml')).toBe(false);
    expect(isSearchServerFile('node.type.page.yml')).toBe(false);
  });

  test('isSearchIndexFile', () => {
    expect(isSearchIndexFile('search_api.index.content.yml')).toBe(true);
    expect(isSearchIndexFile('search_api.server.db.yml')).toBe(false);
  });

  test('filterSearchServerFiles / filterSearchIndexFiles', () => {
    const files = [
      'search_api.server.db.yml',
      'search_api.index.content.yml',
      'node.type.page.yml',
      'views.view.search.yml'
    ];
    expect(filterSearchServerFiles(files)).toEqual(['search_api.server.db.yml']);
    expect(filterSearchIndexFiles(files)).toEqual(['search_api.index.content.yml']);
    expect(filterViewFiles(files)).toEqual(['views.view.search.yml']);
  });
});

describe('Search Parser - getViewSearchIndexId / isSearchBoundView', () => {
  test('extracts index id from base_table', () => {
    expect(getViewSearchIndexId({ base_table: 'search_api_index_content' })).toBe('content');
  });

  test('returns null for non-search base_table', () => {
    expect(getViewSearchIndexId({ base_table: 'node_field_data' })).toBeNull();
  });

  test('isSearchBoundView matches base_table or base_field', () => {
    expect(isSearchBoundView({ base_table: 'search_api_index_content' })).toBe(true);
    expect(isSearchBoundView({ base_field: 'search_api_id' })).toBe(true);
    expect(isSearchBoundView({ base_table: 'node_field_data' })).toBe(false);
    expect(isSearchBoundView(null)).toBe(false);
  });
});

describe('Search Parser - parseSearchServer', () => {
  test('parses server fields', () => {
    const config = {
      id: 'db',
      name: 'Database Server',
      status: true,
      backend: 'search_api_db',
      backend_config: { min_chars: 3 }
    };
    expect(parseSearchServer(config)).toEqual({
      id: 'db',
      label: 'Database Server',
      status: true,
      backend: 'search_api_db',
      backendConfig: { min_chars: 3 }
    });
  });

  test('defaults status to true and handles missing fields', () => {
    const result = parseSearchServer({ id: 'db' });
    expect(result.status).toBe(true);
    expect(result.backend).toBe('');
    expect(result.backendConfig).toEqual({});
  });

  test('returns null for null', () => {
    expect(parseSearchServer(null)).toBeNull();
  });
});

describe('Search Parser - parseSearchIndex', () => {
  const config = {
    id: 'content',
    name: 'Content Index',
    status: true,
    server: 'db',
    field_settings: {
      title: { label: 'Title', datasource_id: 'entity:node', property_path: 'title', type: 'text', boost: 5 },
      body: { label: 'Body', datasource_id: 'entity:node', property_path: 'field_body:processed', type: 'text' }
    },
    datasource_settings: {
      'entity:node': {
        bundles: { default: false, selected: ['article', 'page'] },
        languages: { default: true, selected: ['und', 'zxx'] }
      }
    },
    processor_settings: {
      add_url: {},
      html_filter: { all_fields: false }
    },
    tracker_settings: {
      default: { indexing_order: 'fifo' }
    }
  };

  test('parses fields, datasources, processors, tracker', () => {
    const result = parseSearchIndex(config);
    expect(result.id).toBe('content');
    expect(result.label).toBe('Content Index');
    expect(result.server).toBe('db');
    expect(result.fieldCount).toBe(2);
    expect(result.fields.find(f => f.name === 'title').propertyPath).toBe('title');
    expect(result.fields.find(f => f.name === 'title').boost).toBe(5);
    expect(result.fields.find(f => f.name === 'body').propertyPath).toBe('field_body:processed');
    expect(result.tracker).toBe('default');
    expect(result.processors.map(p => p.id).sort()).toEqual(['add_url', 'html_filter']);
  });

  test('extracts bundles and languages from datasources', () => {
    const result = parseSearchIndex(config);
    expect(result.bundles).toEqual(['article', 'page']);
    expect(result.languages).toEqual(['und', 'zxx']);
    const ds = result.datasources[0];
    expect(ds.entityType).toBe('node');
    expect(ds.bundlesAreExclusions).toBe(false);
    expect(ds.languagesAreExclusions).toBe(true);
  });

  test('returns null for null', () => {
    expect(parseSearchIndex(null)).toBeNull();
  });
});

describe('Search Parser - parseSearchView', () => {
  const config = {
    id: 'search',
    label: 'Site Search',
    base_table: 'search_api_index_content',
    display: {
      default: {
        id: 'default',
        display_title: 'Default',
        display_plugin: 'default',
        display_options: {
          row: {
            type: 'search_api',
            options: { view_modes: { 'entity:node': { article: 'teaser', page: 'full' } } }
          },
          filters: {
            search_api_fulltext: {
              id: 'search_api_fulltext',
              field: 'search_api_fulltext',
              exposed: true,
              expose: { identifier: 'keys', label: 'Keywords' }
            },
            status: { id: 'status', field: 'status', value: '1', exposed: false },
            // Non-exposed filter that still carries an expose.identifier — Drupal
            // populates this even when the filter is not exposed. Must be ignored.
            langcode: {
              id: 'langcode',
              field: 'langcode',
              exposed: false,
              expose: { identifier: 'langcode', label: 'Language' }
            }
          }
        }
      },
      page_1: {
        id: 'page_1',
        display_title: 'Page',
        display_plugin: 'page',
        display_options: { path: 'search' }
      }
    }
  };

  test('parses index id, displays, exposed filters, row view modes', () => {
    const result = parseSearchView(config);
    expect(result.id).toBe('search');
    expect(result.indexId).toBe('content');
    expect(result.displays).toHaveLength(2);

    const def = result.displays.find(d => d.displayId === 'default');
    expect(def.exposedFilters).toHaveLength(1);
    expect(def.exposedFilters[0].identifier).toBe('keys');
    // A non-exposed filter carrying expose.identifier must NOT count as exposed.
    expect(def.exposedFilters.map(f => f.identifier)).not.toContain('langcode');
    expect(def.rowViewModes).toEqual([
      { datasourceId: 'entity:node', bundle: 'article', viewMode: 'teaser' },
      { datasourceId: 'entity:node', bundle: 'page', viewMode: 'full' }
    ]);

    const page = result.displays.find(d => d.displayId === 'page_1');
    expect(page.path).toBe('search');
    expect(page.displayPlugin).toBe('page');
  });

  test('returns null for non-search views', () => {
    expect(parseSearchView({ id: 'x', base_table: 'node_field_data' })).toBeNull();
  });
});

describe('Search Parser - suggestSearchType', () => {
  test('maps Drupal field types to search types', () => {
    expect(suggestSearchType('text_long')).toBe('text');
    expect(suggestSearchType('text_with_summary')).toBe('text');
    expect(suggestSearchType('string')).toBe('string');
    expect(suggestSearchType('string_long')).toBe('string');
    expect(suggestSearchType('list_string')).toBe('string');
    expect(suggestSearchType('integer')).toBe('integer');
    expect(suggestSearchType('list_integer')).toBe('integer');
    expect(suggestSearchType('boolean')).toBe('boolean');
    expect(suggestSearchType('datetime')).toBe('date');
    expect(suggestSearchType('daterange')).toBe('date');
    expect(suggestSearchType('entity_reference')).toBe('integer');
    expect(suggestSearchType('entity_reference_revisions')).toBe('integer');
    expect(suggestSearchType('unknown_type')).toBe('string');
  });
});

describe('Search Parser - buildIndexableTree', () => {
  // A node bundle referencing a paragraph, which has a processed text field
  // and a nested reference back through another paragraph.
  const entities = {
    node: {
      page: {
        id: 'page',
        label: 'Page',
        fields: {
          field_n_title: { name: 'field_n_title', label: 'Title', type: 'string', settings: {} },
          field_n_body: { name: 'field_n_body', label: 'Body', type: 'text_long', settings: {} },
          field_n_components: {
            name: 'field_n_components',
            label: 'Components',
            type: 'entity_reference_revisions',
            settings: { handler_settings: { target_bundles: { panel: 'panel' } } }
          },
          field_n_topic: {
            name: 'field_n_topic',
            label: 'Topic',
            type: 'entity_reference',
            settings: {
              target_type: 'taxonomy_term',
              handler: 'default:taxonomy_term',
              handler_settings: { target_bundles: { tags: 'tags' } }
            }
          }
        }
      }
    },
    paragraph: {
      panel: {
        id: 'panel',
        label: 'Panel',
        fields: {
          field_p_heading: { name: 'field_p_heading', label: 'Heading', type: 'string', settings: {} },
          field_p_text: { name: 'field_p_text', label: 'Text', type: 'text_long', settings: {} }
        }
      }
    },
    taxonomy_term: {
      tags: {
        id: 'tags',
        label: 'Tags',
        fields: {
          field_t_weight: { name: 'field_t_weight', label: 'Weight', type: 'integer', settings: {} }
        }
      }
    }
  };

  test('emits direct fields with suggested search types', () => {
    const tree = buildIndexableTree(entities, 'node', 'page', 0);
    const byPath = Object.fromEntries(tree.map(t => [t.propertyPath, t]));
    expect(byPath.field_n_title.searchType).toBe('string');
    expect(byPath.field_n_body.searchType).toBe('text');
    expect(byPath.field_n_components.searchType).toBe('integer');
  });

  test('offers :processed for formatted-text fields', () => {
    const tree = buildIndexableTree(entities, 'node', 'page', 0);
    const processed = tree.find(t => t.propertyPath === 'field_n_body:processed');
    expect(processed).toBeDefined();
    expect(processed.searchType).toBe('text');
    expect(processed.label).toContain('processed');
  });

  test('does not traverse references at depth 0', () => {
    const tree = buildIndexableTree(entities, 'node', 'page', 0);
    expect(tree.find(t => t.propertyPath.includes(':entity:'))).toBeUndefined();
  });

  test('traverses an :entity: hop through a reference field at depth 1', () => {
    const tree = buildIndexableTree(entities, 'node', 'page', 1);
    const paths = tree.map(t => t.propertyPath);
    expect(paths).toContain('field_n_components:entity:field_p_heading');
    expect(paths).toContain('field_n_components:entity:field_p_text');
    expect(paths).toContain('field_n_components:entity:field_p_text:processed');
    expect(paths).toContain('field_n_topic:entity:field_t_weight');
  });

  test('builds a human-readable nested label', () => {
    const tree = buildIndexableTree(entities, 'node', 'page', 1);
    const nested = tree.find(t => t.propertyPath === 'field_n_components:entity:field_p_heading');
    expect(nested.label).toBe('Components › Heading');
  });

  test('respects depth limit and does not over-traverse', () => {
    const tree = buildIndexableTree(entities, 'node', 'page', 2);
    // panel has no reference fields, so depth 2 yields the same :entity: leaves as depth 1.
    const deep = tree.filter(t => (t.propertyPath.match(/:entity:/g) || []).length >= 2);
    expect(deep).toHaveLength(0);
  });

  test('returns empty for unknown bundle', () => {
    expect(buildIndexableTree(entities, 'node', 'missing', 2)).toEqual([]);
  });
});

describe('Search Parser - buildIndexableTree reference cycles', () => {
  // node:a references node:b, and node:b references back to node:a.
  // Without a cycle guard this would recurse forever.
  const cyclicEntities = {
    node: {
      a: {
        id: 'a',
        label: 'A',
        fields: {
          field_n_to_b: {
            name: 'field_n_to_b',
            label: 'To B',
            type: 'entity_reference',
            settings: {
              target_type: 'node',
              handler: 'default:node',
              handler_settings: { target_bundles: { b: 'b' } }
            }
          }
        }
      },
      b: {
        id: 'b',
        label: 'B',
        fields: {
          field_n_to_a: {
            name: 'field_n_to_a',
            label: 'To A',
            type: 'entity_reference',
            settings: {
              target_type: 'node',
              handler: 'default:node',
              handler_settings: { target_bundles: { a: 'a' } }
            }
          }
        }
      }
    }
  };

  test('terminates on a reference cycle and bounds recursion via the cycle guard', () => {
    // A high depth would loop indefinitely without the visited-path guard.
    const tree = buildIndexableTree(cyclicEntities, 'node', 'a', 50);
    const paths = tree.map(t => t.propertyPath);

    // The direct field and one hop into B are emitted.
    expect(paths).toContain('field_n_to_b');
    expect(paths).toContain('field_n_to_b:entity:field_n_to_a');

    // The cycle guard stops re-entering A: no path closes the loop back to A's field.
    expect(paths).not.toContain('field_n_to_b:entity:field_n_to_a:entity:field_n_to_b');

    // Result is finite and small — the guard prevented runaway recursion.
    expect(tree.length).toBeLessThanOrEqual(2);
  });
});
