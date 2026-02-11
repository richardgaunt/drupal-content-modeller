import {
  formatLastSync,
  formatCardinality,
  formatRequired,
  groupBundlesByEntityType,
  getBundleSummary,
  formatEntityTypeTable,
  getFieldsForEntityType,
  getFieldsForBundle,
  formatEntityFieldsTable,
  formatBundleFieldsTable
} from '../src/commands/list.js';

describe('List Commands', () => {
  describe('formatLastSync', () => {
    test('returns "Never" for null', () => {
      expect(formatLastSync(null)).toBe('Never');
    });

    test('returns "Never" for undefined', () => {
      expect(formatLastSync(undefined)).toBe('Never');
    });

    test('formats date correctly', () => {
      const result = formatLastSync('2025-01-15T10:30:00.000Z');
      // Check it contains expected parts (locale-independent)
      expect(result).toMatch(/Jan/);
      expect(result).toMatch(/15/);
      expect(result).toMatch(/2025/);
    });
  });

  describe('formatCardinality', () => {
    test('returns "Single" for 1', () => {
      expect(formatCardinality(1)).toBe('Single');
    });

    test('returns "Unlimited" for -1', () => {
      expect(formatCardinality(-1)).toBe('Unlimited');
    });

    test('returns number as string for other values', () => {
      expect(formatCardinality(5)).toBe('5');
      expect(formatCardinality(10)).toBe('10');
    });
  });

  describe('formatRequired', () => {
    test('returns "Yes" for true', () => {
      expect(formatRequired(true)).toBe('Yes');
    });

    test('returns "No" for false', () => {
      expect(formatRequired(false)).toBe('No');
    });
  });

  describe('groupBundlesByEntityType', () => {
    test('returns empty object for null entities', () => {
      expect(groupBundlesByEntityType(null)).toEqual({});
    });

    test('returns empty object for undefined entities', () => {
      expect(groupBundlesByEntityType(undefined)).toEqual({});
    });

    test('groups correctly by entity type', () => {
      const entities = {
        node: {
          page: { label: 'Page', fields: {} },
          article: { label: 'Article', fields: {} }
        },
        media: {
          image: { label: 'Image', fields: {} }
        },
        paragraph: {},
        taxonomy_term: {}
      };

      const result = groupBundlesByEntityType(entities);

      expect(Object.keys(result)).toEqual(['node', 'media']);
      expect(result.node.label).toBe('Node Types');
      expect(result.node.bundles.length).toBe(2);
      expect(result.media.label).toBe('Media Types');
      expect(result.media.bundles.length).toBe(1);
    });

    test('sorts bundles alphabetically by label', () => {
      const entities = {
        node: {
          zebra: { label: 'Zebra', fields: {} },
          alpha: { label: 'Alpha', fields: {} },
          beta: { label: 'Beta', fields: {} }
        },
        media: {},
        paragraph: {},
        taxonomy_term: {}
      };

      const result = groupBundlesByEntityType(entities);

      expect(result.node.bundles[0].label).toBe('Alpha');
      expect(result.node.bundles[1].label).toBe('Beta');
      expect(result.node.bundles[2].label).toBe('Zebra');
    });

    test('counts fields correctly', () => {
      const entities = {
        node: {
          page: {
            label: 'Page',
            fields: {
              field_body: {},
              field_summary: {},
              field_image: {}
            }
          }
        },
        media: {},
        paragraph: {},
        taxonomy_term: {}
      };

      const result = groupBundlesByEntityType(entities);

      expect(result.node.bundles[0].fieldCount).toBe(3);
    });
  });

  describe('getBundleSummary', () => {
    test('returns warning for unsynced project (no lastSync)', () => {
      const project = { lastSync: null, entities: null };
      const result = getBundleSummary(project);

      expect(result.synced).toBe(false);
      expect(result.bundleCount).toBe(0);
      expect(result.entityTypeCount).toBe(0);
    });

    test('returns warning for unsynced project (no entities)', () => {
      const project = { lastSync: '2025-01-15', entities: null };
      const result = getBundleSummary(project);

      expect(result.synced).toBe(false);
    });

    test('returns correct totals', () => {
      const project = {
        lastSync: '2025-01-15T10:30:00.000Z',
        entities: {
          node: {
            page: { label: 'Page', fields: {} },
            article: { label: 'Article', fields: {} }
          },
          media: {
            image: { label: 'Image', fields: {} }
          },
          paragraph: {},
          taxonomy_term: {}
        }
      };

      const result = getBundleSummary(project);

      expect(result.synced).toBe(true);
      expect(result.bundleCount).toBe(3);
      expect(result.entityTypeCount).toBe(2);
      expect(result.lastSync).toBe('2025-01-15T10:30:00.000Z');
    });
  });

  describe('formatEntityTypeTable', () => {
    test('returns empty string for null group', () => {
      expect(formatEntityTypeTable('node', null)).toBe('');
    });

    test('returns empty string for empty bundles', () => {
      expect(formatEntityTypeTable('node', { bundles: [] })).toBe('');
    });

    test('returns formatted string with correct structure', () => {
      const group = {
        label: 'Node Types',
        bundles: [
          { id: 'page', label: 'Page', fieldCount: 5 },
          { id: 'article', label: 'Article', fieldCount: 3 }
        ]
      };

      const result = formatEntityTypeTable('node', group);

      expect(result).toContain('Node Types (2)');
      expect(result).toContain('Label');
      expect(result).toContain('Machine Name');
      expect(result).toContain('Fields');
      expect(result).toContain('Page');
      expect(result).toContain('page');
      expect(result).toContain('Article');
      expect(result).toContain('article');
    });

    test('sorts alphabetically', () => {
      const group = {
        label: 'Node Types',
        bundles: [
          { id: 'alpha', label: 'Alpha', fieldCount: 1 },
          { id: 'beta', label: 'Beta', fieldCount: 2 }
        ]
      };

      const result = formatEntityTypeTable('node', group);
      const alphaIndex = result.indexOf('Alpha');
      const betaIndex = result.indexOf('Beta');

      expect(alphaIndex).toBeLessThan(betaIndex);
    });
  });

  describe('getFieldsForEntityType', () => {
    test('returns empty array for null entities', () => {
      expect(getFieldsForEntityType(null, 'node')).toEqual([]);
    });

    test('returns empty array for missing entity type', () => {
      const entities = { node: {} };
      expect(getFieldsForEntityType(entities, 'media')).toEqual([]);
    });

    test('returns all fields across bundles', () => {
      const entities = {
        node: {
          page: {
            label: 'Page',
            fields: {
              field_body: { label: 'Body', type: 'text_long' },
              field_summary: { label: 'Summary', type: 'string' }
            }
          },
          article: {
            label: 'Article',
            fields: {
              field_body: { label: 'Body', type: 'text_long' },
              field_author: { label: 'Author', type: 'entity_reference' }
            }
          }
        }
      };

      const result = getFieldsForEntityType(entities, 'node');

      expect(result.length).toBe(3); // field_body, field_summary, field_author
    });

    test('deduplicates fields and lists bundle usage', () => {
      const entities = {
        node: {
          page: {
            fields: {
              field_body: { label: 'Body', type: 'text_long' }
            }
          },
          article: {
            fields: {
              field_body: { label: 'Body', type: 'text_long' }
            }
          }
        }
      };

      const result = getFieldsForEntityType(entities, 'node');

      expect(result.length).toBe(1);
      expect(result[0].bundles).toContain('page');
      expect(result[0].bundles).toContain('article');
    });

    test('sorts by label', () => {
      const entities = {
        node: {
          page: {
            fields: {
              field_zebra: { label: 'Zebra', type: 'string' },
              field_alpha: { label: 'Alpha', type: 'string' }
            }
          }
        }
      };

      const result = getFieldsForEntityType(entities, 'node');

      expect(result[0].label).toBe('Alpha');
      expect(result[1].label).toBe('Zebra');
    });

    test('returns empty for no fields', () => {
      const entities = {
        node: {
          page: { fields: {} }
        }
      };

      const result = getFieldsForEntityType(entities, 'node');

      expect(result).toEqual([]);
    });
  });

  describe('getFieldsForBundle', () => {
    test('returns empty array for null entities', () => {
      expect(getFieldsForBundle(null, 'node', 'page')).toEqual([]);
    });

    test('returns empty array for missing bundle', () => {
      const entities = { node: {} };
      expect(getFieldsForBundle(entities, 'node', 'page')).toEqual([]);
    });

    test('returns fields for specific bundle', () => {
      const entities = {
        node: {
          page: {
            fields: {
              field_body: { label: 'Body', type: 'text_long', required: false, cardinality: 1 },
              field_summary: { label: 'Summary', type: 'string', required: true, cardinality: 1 }
            }
          }
        }
      };

      const result = getFieldsForBundle(entities, 'node', 'page');

      expect(result.length).toBe(2);
    });

    test('includes required status', () => {
      const entities = {
        node: {
          page: {
            fields: {
              field_body: { label: 'Body', type: 'text_long', required: true }
            }
          }
        }
      };

      const result = getFieldsForBundle(entities, 'node', 'page');

      expect(result[0].required).toBe(true);
    });

    test('includes cardinality', () => {
      const entities = {
        node: {
          page: {
            fields: {
              field_body: { label: 'Body', type: 'text_long', cardinality: -1 }
            }
          }
        }
      };

      const result = getFieldsForBundle(entities, 'node', 'page');

      expect(result[0].cardinality).toBe(-1);
    });

    test('sorts by label', () => {
      const entities = {
        node: {
          page: {
            fields: {
              field_zebra: { label: 'Zebra', type: 'string' },
              field_alpha: { label: 'Alpha', type: 'string' }
            }
          }
        }
      };

      const result = getFieldsForBundle(entities, 'node', 'page');

      expect(result[0].label).toBe('Alpha');
      expect(result[1].label).toBe('Zebra');
    });

    test('returns empty for no fields', () => {
      const entities = {
        node: {
          page: { fields: {} }
        }
      };

      const result = getFieldsForBundle(entities, 'node', 'page');

      expect(result).toEqual([]);
    });

    test('returns empty for bundle with null fields', () => {
      const entities = {
        node: {
          page: { fields: null }
        }
      };

      const result = getFieldsForBundle(entities, 'node', 'page');

      expect(result).toEqual([]);
    });
  });

  describe('formatEntityFieldsTable', () => {
    test('returns "No fields found." for empty array', () => {
      expect(formatEntityFieldsTable([])).toBe('No fields found.');
    });

    test('returns "No fields found." for null', () => {
      expect(formatEntityFieldsTable(null)).toBe('No fields found.');
    });

    test('formats table correctly', () => {
      const fields = [
        { name: 'field_body', label: 'Body', type: 'text_long', bundles: ['page', 'article'] }
      ];

      const result = formatEntityFieldsTable(fields);

      expect(result).toContain('Label');
      expect(result).toContain('Machine Name');
      expect(result).toContain('Type');
      expect(result).toContain('Used In Bundles');
      expect(result).toContain('Body');
      expect(result).toContain('field_body');
      expect(result).toContain('text_long');
      expect(result).toContain('page, article');
    });
  });

  describe('formatBundleFieldsTable', () => {
    test('returns "No fields found." for empty array', () => {
      expect(formatBundleFieldsTable([])).toBe('No fields found.');
    });

    test('returns "No fields found." for null', () => {
      expect(formatBundleFieldsTable(null)).toBe('No fields found.');
    });

    test('formats table correctly', () => {
      const fields = [
        { name: 'field_body', label: 'Body', type: 'text_long', required: false, cardinality: 1 }
      ];

      const result = formatBundleFieldsTable(fields);

      expect(result).toContain('Label');
      expect(result).toContain('Machine Name');
      expect(result).toContain('Type');
      expect(result).toContain('Required');
      expect(result).toContain('Cardinality');
      expect(result).toContain('Body');
      expect(result).toContain('field_body');
      expect(result).toContain('text_long');
      expect(result).toContain('No');
      expect(result).toContain('Single');
    });

    test('formats unlimited cardinality', () => {
      const fields = [
        { name: 'field_body', label: 'Body', type: 'text_long', required: false, cardinality: -1 }
      ];

      const result = formatBundleFieldsTable(fields);

      expect(result).toContain('Unlimited');
    });

    test('formats required field', () => {
      const fields = [
        { name: 'field_body', label: 'Body', type: 'text_long', required: true, cardinality: 1 }
      ];

      const result = formatBundleFieldsTable(fields);

      expect(result).toContain('Yes');
    });
  });
});
