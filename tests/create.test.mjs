/**
 * Create Commands Tests
 */

import {
  getReusableFields,
  bundleExists,
  validateBundleMachineName,
  validateFieldMachineName
} from '../src/commands/create.js';

describe('Create Commands', () => {
  describe('bundleExists', () => {
    test('returns false when project has no entities', () => {
      const project = {};
      expect(bundleExists(project, 'node', 'article')).toBe(false);
    });

    test('returns false when entity type does not exist', () => {
      const project = { entities: { media: {} } };
      expect(bundleExists(project, 'node', 'article')).toBe(false);
    });

    test('returns false when bundle does not exist', () => {
      const project = {
        entities: {
          node: { page: { label: 'Page' } }
        }
      };
      expect(bundleExists(project, 'node', 'article')).toBe(false);
    });

    test('returns true when bundle exists', () => {
      const project = {
        entities: {
          node: { article: { label: 'Article' } }
        }
      };
      expect(bundleExists(project, 'node', 'article')).toBe(true);
    });
  });

  describe('validateFieldMachineName', () => {
    test('rejects empty field name', () => {
      expect(validateFieldMachineName('')).toBe('Field name is required');
      expect(validateFieldMachineName(null)).toBe('Field name is required');
      expect(validateFieldMachineName(undefined)).toBe('Field name is required');
    });

    test('rejects field name not starting with field_', () => {
      const result = validateFieldMachineName('my_field');
      expect(result).toContain('must start with "field_"');
    });

    test('rejects field name with uppercase letters', () => {
      const result = validateFieldMachineName('field_MyField');
      expect(result).toContain('lowercase');
    });

    test('rejects field name with invalid characters', () => {
      const result = validateFieldMachineName('field_my-field');
      expect(result).toContain('lowercase');
    });

    test('accepts valid field name', () => {
      expect(validateFieldMachineName('field_n_title')).toBe(true);
      expect(validateFieldMachineName('field_body')).toBe(true);
      expect(validateFieldMachineName('field_n_my_long_field_name_123')).toBe(true);
    });
  });

  describe('validateBundleMachineName', () => {
    test('rejects empty machine name', () => {
      const project = { entities: {} };
      expect(validateBundleMachineName(project, 'node', '')).toBe('Machine name is required');
      expect(validateBundleMachineName(project, 'node', null)).toBe('Machine name is required');
    });

    test('rejects invalid machine name format', () => {
      const project = { entities: {} };
      const result = validateBundleMachineName(project, 'node', 'My Article');
      expect(result).toContain('lowercase');
    });

    test('rejects existing bundle name', () => {
      const project = {
        entities: {
          node: { article: { label: 'Article' } }
        }
      };
      const result = validateBundleMachineName(project, 'node', 'article');
      expect(result).toContain('already exists');
    });

    test('accepts valid unique machine name', () => {
      const project = {
        entities: {
          node: { page: { label: 'Page' } }
        }
      };
      expect(validateBundleMachineName(project, 'node', 'article')).toBe(true);
    });

    test('accepts machine name for different entity type', () => {
      const project = {
        entities: {
          node: { article: { label: 'Article' } }
        }
      };
      expect(validateBundleMachineName(project, 'media', 'article')).toBe(true);
    });
  });

  describe('getReusableFields', () => {
    test('returns empty array when project has no entities', () => {
      const project = {};
      expect(getReusableFields(project, 'node', 'string')).toEqual([]);
    });

    test('returns empty array when entity type does not exist', () => {
      const project = { entities: { media: {} } };
      expect(getReusableFields(project, 'node', 'string')).toEqual([]);
    });

    test('returns fields of matching type', () => {
      const project = {
        entities: {
          node: {
            article: {
              fields: {
                field_n_title: { label: 'Title', type: 'string', cardinality: 1 },
                field_n_body: { label: 'Body', type: 'text_long', cardinality: 1 }
              }
            }
          }
        }
      };

      const result = getReusableFields(project, 'node', 'string');
      expect(result).toHaveLength(1);
      expect(result[0].fieldName).toBe('field_n_title');
      expect(result[0].type).toBe('string');
    });

    test('collects fields from multiple bundles', () => {
      const project = {
        entities: {
          node: {
            article: {
              fields: {
                field_n_subtitle: { label: 'Subtitle', type: 'string', cardinality: 1 }
              }
            },
            page: {
              fields: {
                field_n_subtitle: { label: 'Subtitle', type: 'string', cardinality: 1 },
                field_n_heading: { label: 'Heading', type: 'string', cardinality: 1 }
              }
            }
          }
        }
      };

      const result = getReusableFields(project, 'node', 'string');
      expect(result).toHaveLength(2);

      const subtitleField = result.find(f => f.fieldName === 'field_n_subtitle');
      expect(subtitleField.usedInBundles).toContain('article');
      expect(subtitleField.usedInBundles).toContain('page');
    });

    test('excludes fields used in all specified bundles', () => {
      const project = {
        entities: {
          node: {
            article: {
              fields: {
                field_n_shared: { label: 'Shared', type: 'string', cardinality: 1 }
              }
            },
            page: {
              fields: {
                field_n_shared: { label: 'Shared', type: 'string', cardinality: 1 },
                field_n_unique: { label: 'Unique', type: 'string', cardinality: 1 }
              }
            }
          }
        }
      };

      // Exclude both bundles - shared field should be excluded
      const result = getReusableFields(project, 'node', 'string', ['article', 'page']);
      expect(result).toHaveLength(1);
      expect(result[0].fieldName).toBe('field_n_unique');
    });

    test('sorts fields by label', () => {
      const project = {
        entities: {
          node: {
            article: {
              fields: {
                field_n_z: { label: 'Zebra', type: 'string' },
                field_n_a: { label: 'Apple', type: 'string' },
                field_n_m: { label: 'Mango', type: 'string' }
              }
            }
          }
        }
      };

      const result = getReusableFields(project, 'node', 'string');
      expect(result[0].label).toBe('Apple');
      expect(result[1].label).toBe('Mango');
      expect(result[2].label).toBe('Zebra');
    });
  });
});
