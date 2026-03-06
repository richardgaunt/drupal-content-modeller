/**
 * Import Commands Tests
 */

import {
  validateReportData,
  translateFieldSettings,
  auditImport
} from '../src/commands/import.js';

describe('Import Commands', () => {
  describe('validateReportData', () => {
    test('rejects null data', () => {
      expect(validateReportData(null)).toBe('Report data must be an object');
    });

    test('rejects non-object data', () => {
      expect(validateReportData('string')).toBe('Report data must be an object');
    });

    test('rejects missing entityTypes', () => {
      expect(validateReportData({})).toBe('Report data must contain an "entityTypes" array');
    });

    test('rejects non-array entityTypes', () => {
      expect(validateReportData({ entityTypes: 'not-array' })).toBe(
        'Report data must contain an "entityTypes" array'
      );
    });

    test('rejects entry missing entityType', () => {
      const data = { entityTypes: [{ bundles: [] }] };
      expect(validateReportData(data)).toBe('entityTypes[0] is missing "entityType"');
    });

    test('rejects entry missing bundles', () => {
      const data = { entityTypes: [{ entityType: 'node' }] };
      expect(validateReportData(data)).toBe('entityTypes[0] is missing "bundles" array');
    });

    test('accepts valid report data', () => {
      const data = {
        entityTypes: [
          { entityType: 'node', bundles: [] },
          { entityType: 'paragraph', bundles: [{ bundle: 'card', fields: [] }] }
        ]
      };
      expect(validateReportData(data)).toBe(true);
    });

    test('accepts empty entityTypes array', () => {
      expect(validateReportData({ entityTypes: [] })).toBe(true);
    });
  });

  describe('translateFieldSettings', () => {
    test('returns empty object for null settings', () => {
      expect(translateFieldSettings('string', null)).toEqual({});
    });

    test('returns empty object for undefined settings', () => {
      expect(translateFieldSettings('string', undefined)).toEqual({});
    });

    test('returns empty object for unknown field type', () => {
      expect(translateFieldSettings('unknown_type', { foo: 'bar' })).toEqual({});
    });

    test('translates string max_length', () => {
      expect(translateFieldSettings('string', { max_length: 100 })).toEqual({
        maxLength: 100
      });
    });

    test('translates list_string allowed_values', () => {
      const values = [
        { value: 'a', label: 'Alpha' },
        { value: 'b', label: 'Beta' }
      ];
      expect(translateFieldSettings('list_string', { allowed_values: values })).toEqual({
        allowedValues: values
      });
    });

    test('translates list_integer allowed_values', () => {
      const values = [{ value: 1, label: 'One' }];
      expect(translateFieldSettings('list_integer', { allowed_values: values })).toEqual({
        allowedValues: values
      });
    });

    test('translates datetime datetime_type', () => {
      expect(translateFieldSettings('datetime', { datetime_type: 'datetime' })).toEqual({
        datetimeType: 'datetime'
      });
    });

    test('translates daterange datetime_type', () => {
      expect(translateFieldSettings('daterange', { datetime_type: 'date' })).toEqual({
        datetimeType: 'date'
      });
    });

    test('translates entity_reference with target_type and target_bundles', () => {
      const settings = {
        target_type: 'taxonomy_term',
        handler_settings: {
          target_bundles: { tags: 'tags', categories: 'categories' }
        }
      };
      expect(translateFieldSettings('entity_reference', settings)).toEqual({
        targetType: 'taxonomy_term',
        targetBundles: ['tags', 'categories']
      });
    });

    test('translates entity_reference with no bundles', () => {
      const settings = { target_type: 'node' };
      expect(translateFieldSettings('entity_reference', settings)).toEqual({
        targetType: 'node'
      });
    });

    test('translates entity_reference_revisions target_bundles', () => {
      const settings = {
        handler_settings: {
          target_bundles: { card: 'card', hero: 'hero' }
        }
      };
      expect(translateFieldSettings('entity_reference_revisions', settings)).toEqual({
        targetBundles: ['card', 'hero']
      });
    });

    test('translates entity_reference_revisions with no handler_settings', () => {
      expect(translateFieldSettings('entity_reference_revisions', {})).toEqual({});
    });

    test('translates link with external type', () => {
      expect(translateFieldSettings('link', { link_type: 17, title: 1 })).toEqual({
        allowExternal: true,
        titleOption: 'optional'
      });
    });

    test('translates link with non-external type', () => {
      expect(translateFieldSettings('link', { link_type: 1, title: 0 })).toEqual({
        allowExternal: false,
        titleOption: 'disabled'
      });
    });

    test('translates link with required title', () => {
      expect(translateFieldSettings('link', { link_type: 17, title: 2 })).toEqual({
        allowExternal: true,
        titleOption: 'required'
      });
    });

    test('translates image settings', () => {
      const settings = {
        file_extensions: 'png jpg',
        alt_field_required: true,
        file_directory: 'images/custom',
        max_filesize: '2MB'
      };
      expect(translateFieldSettings('image', settings)).toEqual({
        fileExtensions: 'png jpg',
        altRequired: true,
        fileDirectory: 'images/custom',
        maxFileSize: '2MB'
      });
    });

    test('translates image with partial settings', () => {
      expect(translateFieldSettings('image', { file_extensions: 'svg' })).toEqual({
        fileExtensions: 'svg'
      });
    });

    test('translates file settings', () => {
      const settings = {
        file_extensions: 'pdf doc',
        file_directory: 'docs',
        max_filesize: '10MB'
      };
      expect(translateFieldSettings('file', settings)).toEqual({
        fileExtensions: 'pdf doc',
        fileDirectory: 'docs',
        maxFileSize: '10MB'
      });
    });

    test('returns empty for boolean', () => {
      expect(translateFieldSettings('boolean', { some: 'val' })).toEqual({});
    });

    test('returns empty for integer', () => {
      expect(translateFieldSettings('integer', { some: 'val' })).toEqual({});
    });

    test('returns empty for text_long', () => {
      expect(translateFieldSettings('text_long', { some: 'val' })).toEqual({});
    });

    test('returns empty for string_long', () => {
      expect(translateFieldSettings('string_long', { some: 'val' })).toEqual({});
    });

    test('returns empty for email', () => {
      expect(translateFieldSettings('email', { some: 'val' })).toEqual({});
    });
  });

  describe('auditImport', () => {
    const emptyProject = { entities: {} };

    test('clean import — all new bundles and fields', () => {
      const reportData = {
        entityTypes: [
          {
            entityType: 'node',
            bundles: [
              {
                bundle: 'article',
                label: 'Article',
                fields: [
                  { name: 'field_n_title', type: 'string', label: 'Title' },
                  { name: 'field_n_body', type: 'text_long', label: 'Body' }
                ]
              }
            ]
          }
        ]
      };

      const result = auditImport(emptyProject, reportData);

      expect(result.hasBlockers).toBe(false);
      expect(result.blocked).toHaveLength(0);
      expect(result.reused).toHaveLength(0);
      expect(result.toCreate).toHaveLength(3); // 1 bundle + 2 fields
      expect(result.toCreate[0].kind).toBe('bundle');
      expect(result.toCreate[0].bundle).toBe('article');
      expect(result.toCreate[1].kind).toBe('field');
      expect(result.toCreate[1].fieldName).toBe('field_n_title');
      expect(result.toCreate[2].kind).toBe('field');
      expect(result.toCreate[2].fieldName).toBe('field_n_body');
    });

    test('bundle collision blocks entire bundle', () => {
      const project = {
        entities: {
          node: {
            article: { label: 'Article', fields: {} }
          }
        }
      };

      const reportData = {
        entityTypes: [
          {
            entityType: 'node',
            bundles: [
              {
                bundle: 'article',
                label: 'Article',
                fields: [
                  { name: 'field_n_body', type: 'text_long', label: 'Body' }
                ]
              }
            ]
          }
        ]
      };

      const result = auditImport(project, reportData);

      expect(result.hasBlockers).toBe(true);
      expect(result.blocked).toHaveLength(1);
      expect(result.blocked[0].type).toBe('bundle_exists');
      expect(result.blocked[0].bundle).toBe('article');
      // Fields of blocked bundle are not processed
      expect(result.toCreate).toHaveLength(0);
    });

    test('field storage type match — reuse', () => {
      const project = {
        entities: {
          node: {
            page: {
              label: 'Page',
              fields: {
                field_n_summary: { type: 'string', label: 'Summary' }
              }
            }
          }
        }
      };

      const reportData = {
        entityTypes: [
          {
            entityType: 'node',
            bundles: [
              {
                bundle: 'article',
                label: 'Article',
                fields: [
                  { name: 'field_n_summary', type: 'string', label: 'Summary' }
                ]
              }
            ]
          }
        ]
      };

      const result = auditImport(project, reportData);

      expect(result.hasBlockers).toBe(false);
      expect(result.reused).toHaveLength(1);
      expect(result.reused[0].fieldName).toBe('field_n_summary');
      expect(result.reused[0].fieldType).toBe('string');
      expect(result.toCreate).toHaveLength(1); // just the bundle
      expect(result.toCreate[0].kind).toBe('bundle');
    });

    test('field storage type mismatch — blocker', () => {
      const project = {
        entities: {
          node: {
            page: {
              label: 'Page',
              fields: {
                field_n_summary: { type: 'string', label: 'Summary' }
              }
            }
          }
        }
      };

      const reportData = {
        entityTypes: [
          {
            entityType: 'node',
            bundles: [
              {
                bundle: 'article',
                label: 'Article',
                fields: [
                  { name: 'field_n_summary', type: 'text_long', label: 'Summary' }
                ]
              }
            ]
          }
        ]
      };

      const result = auditImport(project, reportData);

      expect(result.hasBlockers).toBe(true);
      expect(result.blocked).toHaveLength(1);
      expect(result.blocked[0].type).toBe('field_type_mismatch');
      expect(result.blocked[0].existingType).toBe('string');
      expect(result.blocked[0].requestedType).toBe('text_long');
    });

    test('mixed scenario — some bundles ok, some blocked', () => {
      const project = {
        entities: {
          node: {
            page: {
              label: 'Page',
              fields: {
                field_n_tag: { type: 'entity_reference', label: 'Tag' }
              }
            }
          }
        }
      };

      const reportData = {
        entityTypes: [
          {
            entityType: 'node',
            bundles: [
              {
                bundle: 'page',
                label: 'Page',
                fields: []
              },
              {
                bundle: 'article',
                label: 'Article',
                fields: [
                  { name: 'field_n_tag', type: 'entity_reference', label: 'Tag' },
                  { name: 'field_n_body', type: 'text_long', label: 'Body' }
                ]
              }
            ]
          }
        ]
      };

      const result = auditImport(project, reportData);

      expect(result.hasBlockers).toBe(true);
      expect(result.blocked).toHaveLength(1);
      expect(result.blocked[0].type).toBe('bundle_exists');
      expect(result.blocked[0].bundle).toBe('page');

      // article bundle and its new field are in toCreate
      expect(result.toCreate).toHaveLength(2); // bundle + new field
      expect(result.toCreate[0].kind).toBe('bundle');
      expect(result.toCreate[0].bundle).toBe('article');
      expect(result.toCreate[1].kind).toBe('field');
      expect(result.toCreate[1].fieldName).toBe('field_n_body');

      // reused field
      expect(result.reused).toHaveLength(1);
      expect(result.reused[0].fieldName).toBe('field_n_tag');
    });

    test('handles bundles with no fields', () => {
      const reportData = {
        entityTypes: [
          {
            entityType: 'paragraph',
            bundles: [
              { bundle: 'spacer', label: 'Spacer', fields: [] }
            ]
          }
        ]
      };

      const result = auditImport(emptyProject, reportData);

      expect(result.hasBlockers).toBe(false);
      expect(result.toCreate).toHaveLength(1);
      expect(result.toCreate[0].kind).toBe('bundle');
    });

    test('handles bundles with missing fields array', () => {
      const reportData = {
        entityTypes: [
          {
            entityType: 'paragraph',
            bundles: [
              { bundle: 'spacer', label: 'Spacer' }
            ]
          }
        ]
      };

      const result = auditImport(emptyProject, reportData);

      expect(result.hasBlockers).toBe(false);
      expect(result.toCreate).toHaveLength(1);
    });

    test('preserves field details in toCreate entries', () => {
      const reportData = {
        entityTypes: [
          {
            entityType: 'node',
            bundles: [
              {
                bundle: 'article',
                label: 'Article',
                fields: [
                  {
                    name: 'field_n_tags',
                    type: 'entity_reference',
                    label: 'Tags',
                    description: 'Select tags',
                    required: true,
                    cardinality: -1,
                    settings: { target_type: 'taxonomy_term' }
                  }
                ]
              }
            ]
          }
        ]
      };

      const result = auditImport(emptyProject, reportData);
      const fieldItem = result.toCreate.find(i => i.kind === 'field');

      expect(fieldItem.label).toBe('Tags');
      expect(fieldItem.description).toBe('Select tags');
      expect(fieldItem.required).toBe(true);
      expect(fieldItem.cardinality).toBe(-1);
      expect(fieldItem.settings).toEqual({ target_type: 'taxonomy_term' });
    });

    test('multiple entity types', () => {
      const reportData = {
        entityTypes: [
          {
            entityType: 'node',
            bundles: [
              { bundle: 'article', label: 'Article', fields: [] }
            ]
          },
          {
            entityType: 'paragraph',
            bundles: [
              { bundle: 'card', label: 'Card', fields: [] }
            ]
          }
        ]
      };

      const result = auditImport(emptyProject, reportData);

      expect(result.toCreate).toHaveLength(2);
      expect(result.toCreate[0].entityType).toBe('node');
      expect(result.toCreate[1].entityType).toBe('paragraph');
    });
  });
});
