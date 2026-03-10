/**
 * Import Commands Tests
 */

import {
  validateReportData,
  translateFieldSettings,
  auditImport,
  buildFormDisplayFromReport,
  resolveImportDependencies,
  filterReportData,
  listReportBundles
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
      expect(result.skipped).toHaveLength(0);
      expect(result.reused).toHaveLength(0);
      expect(result.toCreate).toHaveLength(3); // 1 bundle + 2 fields
      expect(result.toCreate[0].kind).toBe('bundle');
      expect(result.toCreate[0].bundle).toBe('article');
      expect(result.toCreate[1].kind).toBe('field');
      expect(result.toCreate[1].fieldName).toBe('field_n_title');
      expect(result.toCreate[2].kind).toBe('field');
      expect(result.toCreate[2].fieldName).toBe('field_n_body');
    });

    test('bundle collision skips bundle without blocking', () => {
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

      expect(result.hasBlockers).toBe(false);
      expect(result.blocked).toHaveLength(0);
      expect(result.skipped).toHaveLength(1);
      expect(result.skipped[0].type).toBe('bundle_exists');
      expect(result.skipped[0].bundle).toBe('article');
      // Fields of skipped bundle are not processed
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

    test('mixed scenario — some bundles ok, some skipped', () => {
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

      expect(result.hasBlockers).toBe(false);
      expect(result.skipped).toHaveLength(1);
      expect(result.skipped[0].type).toBe('bundle_exists');
      expect(result.skipped[0].bundle).toBe('page');

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

  describe('buildFormDisplayFromReport', () => {
    const baseFormDisplay = {
      entityType: 'node',
      bundle: 'article',
      mode: 'default',
      groups: [],
      fields: [
        { name: 'title', type: 'string_textfield', weight: 0, region: 'content', settings: { size: 60, placeholder: '' }, thirdPartySettings: {} },
        { name: 'field_n_body', type: 'text_textarea', weight: 1, region: 'content', settings: { rows: 5, placeholder: '' }, thirdPartySettings: {} },
        { name: 'field_n_image', type: 'image_image', weight: 2, region: 'content', settings: {}, thirdPartySettings: {} },
        { name: 'created', type: 'datetime_timestamp', weight: 3, region: 'content', settings: {}, thirdPartySettings: {} },
        { name: 'uid', type: 'entity_reference_autocomplete', weight: 4, region: 'content', settings: { match_operator: 'CONTAINS', match_limit: 10, size: 60, placeholder: '' }, thirdPartySettings: {} },
        { name: 'path', type: 'path', weight: 5, region: 'content', settings: {}, thirdPartySettings: {} }
      ],
      hidden: ['promote', 'status', 'sticky']
    };

    test('applies groups from report', () => {
      const reportFormDisplay = {
        groups: [
          { name: 'group_main', label: 'Main Content', parentName: '', weight: 0, formatType: 'fieldset', formatSettings: { description: '' }, children: ['title', 'field_n_body'] }
        ],
        fields: [
          { name: 'title', widget: 'string_textfield', weight: 0, group: 'group_main', widgetSettings: null },
          { name: 'field_n_body', widget: 'text_textarea', weight: 1, group: 'group_main', widgetSettings: null },
          { name: 'field_n_image', widget: 'image_image', weight: 2, group: null, widgetSettings: null }
        ],
        hidden: ['promote', 'status', 'sticky']
      };

      const result = buildFormDisplayFromReport(baseFormDisplay, reportFormDisplay);

      expect(result.groups).toHaveLength(1);
      expect(result.groups[0].name).toBe('group_main');
      expect(result.groups[0].label).toBe('Main Content');
      expect(result.groups[0].children).toEqual(['title', 'field_n_body']);
      expect(result.groups[0].formatType).toBe('fieldset');
      expect(result.groups[0].formatSettings).toEqual({ description: '' });
    });

    test('applies field weights from report', () => {
      const reportFormDisplay = {
        groups: [],
        fields: [
          { name: 'field_n_body', widget: 'text_textarea', weight: 10, group: null, widgetSettings: null },
          { name: 'title', widget: 'string_textfield', weight: 5, group: null, widgetSettings: null }
        ],
        hidden: []
      };

      const result = buildFormDisplayFromReport(baseFormDisplay, reportFormDisplay);

      const bodyField = result.fields.find(f => f.name === 'field_n_body');
      const titleField = result.fields.find(f => f.name === 'title');
      expect(bodyField.weight).toBe(10);
      expect(titleField.weight).toBe(5);
    });

    test('applies widget type from report', () => {
      const reportFormDisplay = {
        groups: [],
        fields: [
          { name: 'field_n_body', widget: 'text_textarea_with_summary', weight: 1, group: null, widgetSettings: null }
        ],
        hidden: []
      };

      const result = buildFormDisplayFromReport(baseFormDisplay, reportFormDisplay);

      const bodyField = result.fields.find(f => f.name === 'field_n_body');
      expect(bodyField.type).toBe('text_textarea_with_summary');
    });

    test('applies widgetSettings from report', () => {
      const reportFormDisplay = {
        groups: [],
        fields: [
          { name: 'field_n_body', widget: 'text_textarea', weight: 1, group: null, widgetSettings: { rows: 10, placeholder: 'Enter body' } }
        ],
        hidden: []
      };

      const result = buildFormDisplayFromReport(baseFormDisplay, reportFormDisplay);

      const bodyField = result.fields.find(f => f.name === 'field_n_body');
      expect(bodyField.settings).toEqual({ rows: 10, placeholder: 'Enter body' });
    });

    test('keeps base field settings when widgetSettings is null', () => {
      const reportFormDisplay = {
        groups: [],
        fields: [
          { name: 'title', widget: 'string_textfield', weight: 0, group: null, widgetSettings: null }
        ],
        hidden: []
      };

      const result = buildFormDisplayFromReport(baseFormDisplay, reportFormDisplay);

      const titleField = result.fields.find(f => f.name === 'title');
      expect(titleField.settings).toEqual({ size: 60, placeholder: '' });
    });

    test('preserves base fields not in report', () => {
      const reportFormDisplay = {
        groups: [],
        fields: [
          { name: 'title', widget: 'string_textfield', weight: 0, group: null, widgetSettings: null }
        ],
        hidden: []
      };

      const result = buildFormDisplayFromReport(baseFormDisplay, reportFormDisplay);

      // uid, path, created, field_n_body, field_n_image should still be present
      const fieldNames = result.fields.map(f => f.name);
      expect(fieldNames).toContain('uid');
      expect(fieldNames).toContain('path');
      expect(fieldNames).toContain('created');
    });

    test('applies hidden fields from report', () => {
      const reportFormDisplay = {
        groups: [],
        fields: [
          { name: 'title', widget: 'string_textfield', weight: 0, group: null, widgetSettings: null }
        ],
        hidden: ['created', 'status']
      };

      const result = buildFormDisplayFromReport(baseFormDisplay, reportFormDisplay);

      expect(result.hidden).toEqual(['created', 'status']);
    });

    test('handles nested groups', () => {
      const reportFormDisplay = {
        groups: [
          { name: 'group_tabs', label: 'Tabs', parentName: '', weight: 0, formatType: 'tabs', formatSettings: {}, children: ['group_content'] },
          { name: 'group_content', label: 'Content', parentName: 'group_tabs', weight: 0, formatType: 'tab', formatSettings: {}, children: ['title', 'field_n_body'] }
        ],
        fields: [
          { name: 'title', widget: 'string_textfield', weight: 0, group: 'group_content', widgetSettings: null },
          { name: 'field_n_body', widget: 'text_textarea', weight: 1, group: 'group_content', widgetSettings: null }
        ],
        hidden: []
      };

      const result = buildFormDisplayFromReport(baseFormDisplay, reportFormDisplay);

      expect(result.groups).toHaveLength(2);
      expect(result.groups[0].children).toEqual(['group_content']);
      expect(result.groups[1].parentName).toBe('group_tabs');
      expect(result.groups[1].children).toEqual(['title', 'field_n_body']);
    });

    test('handles report field not in base (creates new entry)', () => {
      const reportFormDisplay = {
        groups: [],
        fields: [
          { name: 'field_n_extra', widget: 'options_select', weight: 5, group: null, widgetSettings: null }
        ],
        hidden: []
      };

      const result = buildFormDisplayFromReport(baseFormDisplay, reportFormDisplay);

      const extraField = result.fields.find(f => f.name === 'field_n_extra');
      expect(extraField).toBeDefined();
      expect(extraField.type).toBe('options_select');
      expect(extraField.weight).toBe(5);
      expect(extraField.region).toBe('content');
    });

    test('handles empty report form display', () => {
      const reportFormDisplay = {
        groups: [],
        fields: [],
        hidden: []
      };

      const result = buildFormDisplayFromReport(baseFormDisplay, reportFormDisplay);

      // All base fields should be preserved
      expect(result.fields).toHaveLength(baseFormDisplay.fields.length);
      expect(result.groups).toEqual([]);
      expect(result.hidden).toEqual([]);
    });

    test('preserves entityType, bundle, and mode from base', () => {
      const reportFormDisplay = {
        groups: [],
        fields: [],
        hidden: []
      };

      const result = buildFormDisplayFromReport(baseFormDisplay, reportFormDisplay);

      expect(result.entityType).toBe('node');
      expect(result.bundle).toBe('article');
      expect(result.mode).toBe('default');
    });
  });

  describe('listReportBundles', () => {
    test('returns flat list of all bundles', () => {
      const reportData = {
        entityTypes: [
          {
            entityType: 'node',
            bundles: [
              { bundle: 'article', label: 'Article' },
              { bundle: 'page', label: 'Page' }
            ]
          },
          {
            entityType: 'paragraph',
            bundles: [
              { bundle: 'card', label: 'Card' }
            ]
          }
        ]
      };

      const result = listReportBundles(reportData);
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({ entityType: 'node', bundle: 'article', label: 'Article' });
      expect(result[2]).toEqual({ entityType: 'paragraph', bundle: 'card', label: 'Card' });
    });

    test('uses bundle id as label fallback', () => {
      const reportData = {
        entityTypes: [
          { entityType: 'node', bundles: [{ bundle: 'article' }] }
        ]
      };

      const result = listReportBundles(reportData);
      expect(result[0].label).toBe('article');
    });

    test('returns empty array for empty report', () => {
      expect(listReportBundles({ entityTypes: [] })).toEqual([]);
    });
  });

  describe('resolveImportDependencies', () => {
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
                  settings: {
                    handler: 'default:taxonomy_term',
                    handler_settings: {
                      target_bundles: { tags: 'tags' }
                    }
                  }
                },
                {
                  name: 'field_n_sections',
                  type: 'entity_reference_revisions',
                  settings: {
                    handler: 'default:paragraph',
                    handler_settings: {
                      target_bundles: { card: 'card', hero: 'hero' }
                    }
                  }
                }
              ]
            },
            {
              bundle: 'page',
              label: 'Page',
              fields: []
            }
          ]
        },
        {
          entityType: 'taxonomy_term',
          bundles: [
            { bundle: 'tags', label: 'Tags', fields: [] }
          ]
        },
        {
          entityType: 'paragraph',
          bundles: [
            { bundle: 'card', label: 'Card', fields: [] },
            { bundle: 'hero', label: 'Hero', fields: [] }
          ]
        }
      ]
    };

    test('finds direct entity_reference dependencies', () => {
      const selected = [{ entityType: 'node', bundle: 'article' }];
      const result = resolveImportDependencies(reportData, selected);

      const depKeys = result.dependencies.map(d => `${d.entityType}:${d.bundle}`);
      expect(depKeys).toContain('taxonomy_term:tags');
    });

    test('finds entity_reference_revisions dependencies', () => {
      const selected = [{ entityType: 'node', bundle: 'article' }];
      const result = resolveImportDependencies(reportData, selected);

      const depKeys = result.dependencies.map(d => `${d.entityType}:${d.bundle}`);
      expect(depKeys).toContain('paragraph:card');
      expect(depKeys).toContain('paragraph:hero');
    });

    test('does not include already-selected bundles as dependencies', () => {
      const selected = [
        { entityType: 'node', bundle: 'article' },
        { entityType: 'taxonomy_term', bundle: 'tags' }
      ];
      const result = resolveImportDependencies(reportData, selected);

      const depKeys = result.dependencies.map(d => `${d.entityType}:${d.bundle}`);
      expect(depKeys).not.toContain('taxonomy_term:tags');
    });

    test('ignores references to bundles not in the report', () => {
      const reportWithExternal = {
        entityTypes: [
          {
            entityType: 'node',
            bundles: [
              {
                bundle: 'article',
                label: 'Article',
                fields: [
                  {
                    name: 'field_n_author',
                    type: 'entity_reference',
                    settings: {
                      handler: 'default:node',
                      handler_settings: {
                        target_bundles: { profile: 'profile' }
                      }
                    }
                  }
                ]
              }
            ]
          }
        ]
      };

      const selected = [{ entityType: 'node', bundle: 'article' }];
      const result = resolveImportDependencies(reportWithExternal, selected);
      expect(result.dependencies).toHaveLength(0);
    });

    test('resolves transitive dependencies', () => {
      const reportWithChain = {
        entityTypes: [
          {
            entityType: 'node',
            bundles: [
              {
                bundle: 'article',
                label: 'Article',
                fields: [
                  {
                    name: 'field_n_sections',
                    type: 'entity_reference_revisions',
                    settings: {
                      handler: 'default:paragraph',
                      handler_settings: {
                        target_bundles: { card: 'card' }
                      }
                    }
                  }
                ]
              }
            ]
          },
          {
            entityType: 'paragraph',
            bundles: [
              {
                bundle: 'card',
                label: 'Card',
                fields: [
                  {
                    name: 'field_p_media',
                    type: 'entity_reference',
                    settings: {
                      handler: 'default:media',
                      handler_settings: {
                        target_bundles: { image: 'image' }
                      }
                    }
                  }
                ]
              }
            ]
          },
          {
            entityType: 'media',
            bundles: [
              { bundle: 'image', label: 'Image', fields: [] }
            ]
          }
        ]
      };

      const selected = [{ entityType: 'node', bundle: 'article' }];
      const result = resolveImportDependencies(reportWithChain, selected);

      const depKeys = result.dependencies.map(d => `${d.entityType}:${d.bundle}`);
      expect(depKeys).toContain('paragraph:card');
      expect(depKeys).toContain('media:image');
    });

    test('returns no dependencies for bundle with no references', () => {
      const selected = [{ entityType: 'node', bundle: 'page' }];
      const result = resolveImportDependencies(reportData, selected);
      expect(result.dependencies).toHaveLength(0);
    });

    test('returns selected bundles unchanged', () => {
      const selected = [{ entityType: 'node', bundle: 'article' }];
      const result = resolveImportDependencies(reportData, selected);
      expect(result.selected).toBe(selected);
    });
  });

  describe('filterReportData', () => {
    const fullReport = {
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
                  settings: {
                    handler: 'default:taxonomy_term',
                    handler_settings: {
                      target_bundles: { tags: 'tags', categories: 'categories' }
                    }
                  }
                },
                {
                  name: 'field_n_body',
                  type: 'text_long',
                  label: 'Body'
                }
              ]
            },
            {
              bundle: 'page',
              label: 'Page',
              fields: []
            }
          ]
        },
        {
          entityType: 'taxonomy_term',
          bundles: [
            { bundle: 'tags', label: 'Tags', fields: [] },
            { bundle: 'categories', label: 'Categories', fields: [] }
          ]
        }
      ]
    };

    test('includes only specified bundles', () => {
      const included = [{ entityType: 'node', bundle: 'article' }];
      const result = filterReportData(fullReport, included, {});

      expect(result.entityTypes).toHaveLength(1);
      expect(result.entityTypes[0].bundles).toHaveLength(1);
      expect(result.entityTypes[0].bundles[0].bundle).toBe('article');
    });

    test('removes entity types with no included bundles', () => {
      const included = [{ entityType: 'node', bundle: 'article' }];
      const result = filterReportData(fullReport, included, {});

      const entityTypes = result.entityTypes.map(et => et.entityType);
      expect(entityTypes).not.toContain('taxonomy_term');
    });

    test('prunes target_bundles to only available bundles', () => {
      const included = [
        { entityType: 'node', bundle: 'article' },
        { entityType: 'taxonomy_term', bundle: 'tags' }
      ];
      const result = filterReportData(fullReport, included, {});

      const tagsField = result.entityTypes[0].bundles[0].fields.find(
        f => f.name === 'field_n_tags'
      );
      expect(Object.keys(tagsField.settings.handler_settings.target_bundles)).toEqual(['tags']);
    });

    test('keeps target_bundles that exist in the project', () => {
      const included = [{ entityType: 'node', bundle: 'article' }];
      const projectEntities = {
        taxonomy_term: { tags: { label: 'Tags' }, categories: { label: 'Categories' } }
      };
      const result = filterReportData(fullReport, included, projectEntities);

      const tagsField = result.entityTypes[0].bundles[0].fields.find(
        f => f.name === 'field_n_tags'
      );
      expect(Object.keys(tagsField.settings.handler_settings.target_bundles)).toEqual(['tags', 'categories']);
    });

    test('does not mutate original report data', () => {
      const included = [{ entityType: 'node', bundle: 'article' }];
      filterReportData(fullReport, included, {});

      // Original should still have both target_bundles
      const originalField = fullReport.entityTypes[0].bundles[0].fields[0];
      expect(Object.keys(originalField.settings.handler_settings.target_bundles)).toEqual(['tags', 'categories']);
    });

    test('preserves non-reference fields unchanged', () => {
      const included = [{ entityType: 'node', bundle: 'article' }];
      const result = filterReportData(fullReport, included, {});

      const bodyField = result.entityTypes[0].bundles[0].fields.find(
        f => f.name === 'field_n_body'
      );
      expect(bodyField.type).toBe('text_long');
    });

    test('prunes target_bundles_drag_drop when present', () => {
      const reportWithDragDrop = {
        entityTypes: [
          {
            entityType: 'node',
            bundles: [
              {
                bundle: 'article',
                label: 'Article',
                fields: [
                  {
                    name: 'field_n_sections',
                    type: 'entity_reference_revisions',
                    settings: {
                      handler: 'default:paragraph',
                      handler_settings: {
                        target_bundles: { card: 'card', hero: 'hero' },
                        target_bundles_drag_drop: {
                          card: { weight: 0, enabled: true },
                          hero: { weight: 1, enabled: true }
                        }
                      }
                    }
                  }
                ]
              }
            ]
          },
          {
            entityType: 'paragraph',
            bundles: [
              { bundle: 'card', label: 'Card', fields: [] },
              { bundle: 'hero', label: 'Hero', fields: [] }
            ]
          }
        ]
      };

      const included = [
        { entityType: 'node', bundle: 'article' },
        { entityType: 'paragraph', bundle: 'card' }
      ];
      const result = filterReportData(reportWithDragDrop, included, {});

      const field = result.entityTypes[0].bundles[0].fields[0];
      expect(Object.keys(field.settings.handler_settings.target_bundles)).toEqual(['card']);
      expect(Object.keys(field.settings.handler_settings.target_bundles_drag_drop)).toEqual(['card']);
    });

    test('handles empty included list', () => {
      const result = filterReportData(fullReport, [], {});
      expect(result.entityTypes).toHaveLength(0);
    });
  });
});
