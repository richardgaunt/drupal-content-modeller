/**
 * Spreadsheet Parser and Generator Tests
 */

import {
  parseAllowedValues,
  parseSpreadsheet,
  resolveFieldSettings,
  findSharedFields,
  parseFormDisplaySheet
} from '../src/parsers/spreadsheetParser.js';

import {
  generateSpreadsheetData,
  serializeFormatSettings,
  parseFormatSettings
} from '../src/generators/spreadsheetGenerator.js';

import {
  buildSyncDiff,
  fieldStorageUsedElsewhere,
  removeFieldFromYaml,
  cleanupRolePermissions,
  cleanupBundleDependencies
} from '../src/commands/spreadsheet.js';

import { mkdtempSync, writeFileSync, readFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('Spreadsheet Parser', () => {
  describe('parseAllowedValues', () => {
    test('returns empty array for empty string', () => {
      expect(parseAllowedValues('')).toEqual([]);
    });

    test('returns empty array for null', () => {
      expect(parseAllowedValues(null)).toEqual([]);
    });

    test('parses simple pipe-delimited values', () => {
      expect(parseAllowedValues('red|Red, blue|Blue')).toEqual([
        { value: 'red', label: 'Red' },
        { value: 'blue', label: 'Blue' }
      ]);
    });

    test('handles values without labels', () => {
      expect(parseAllowedValues('red, blue')).toEqual([
        { value: 'red', label: 'red' },
        { value: 'blue', label: 'blue' }
      ]);
    });

    test('handles mixed formats', () => {
      expect(parseAllowedValues('red|Red, blue')).toEqual([
        { value: 'red', label: 'Red' },
        { value: 'blue', label: 'blue' }
      ]);
    });

    test('trims whitespace', () => {
      expect(parseAllowedValues('  red | Red ,  blue | Blue  ')).toEqual([
        { value: 'red', label: 'Red' },
        { value: 'blue', label: 'Blue' }
      ]);
    });

    test('skips empty entries', () => {
      expect(parseAllowedValues('red|Red,, blue|Blue,')).toEqual([
        { value: 'red', label: 'Red' },
        { value: 'blue', label: 'Blue' }
      ]);
    });
  });

  describe('resolveFieldSettings', () => {
    test('resolves string settings', () => {
      const settingsSheets = {
        stringSettings: new Map([
          ['field_n_title', [{ 'Field Name': 'field_n_title', 'Max Length': '100' }]]
        ])
      };
      expect(resolveFieldSettings('string', 'field_n_title', settingsSheets)).toEqual({
        max_length: 100
      });
    });

    test('resolves list_string allowed values', () => {
      const settingsSheets = {
        listSettings: new Map([
          ['field_n_color', [{ 'Field Name': 'field_n_color', 'Allowed Values': 'red|Red, blue|Blue' }]]
        ])
      };
      expect(resolveFieldSettings('list_string', 'field_n_color', settingsSheets)).toEqual({
        allowed_values: [
          { value: 'red', label: 'Red' },
          { value: 'blue', label: 'Blue' }
        ]
      });
    });

    test('resolves datetime settings', () => {
      const settingsSheets = {
        datetimeSettings: new Map([
          ['field_n_date', [{ 'Field Name': 'field_n_date', 'DateTime Type': 'date' }]]
        ])
      };
      expect(resolveFieldSettings('datetime', 'field_n_date', settingsSheets)).toEqual({
        datetime_type: 'date'
      });
    });

    test('resolves entity_reference settings with targets', () => {
      const settingsSheets = {
        entityRefSettings: new Map([
          ['field_n_ref', [{ 'Field Name': 'field_n_ref', 'Target Type': 'node' }]]
        ]),
        entityRefTargets: new Map([
          ['field_n_ref', [
            { 'Field Name': 'field_n_ref', 'Target Bundle': 'article' },
            { 'Field Name': 'field_n_ref', 'Target Bundle': 'page' }
          ]]
        ])
      };
      const result = resolveFieldSettings('entity_reference', 'field_n_ref', settingsSheets);
      expect(result).toEqual({
        target_type: 'node',
        handler: 'default:node',
        handler_settings: {
          target_bundles: { article: 'article', page: 'page' }
        }
      });
    });

    test('resolves entity_reference_revisions targets', () => {
      const settingsSheets = {
        entityRefTargets: new Map([
          ['field_n_paras', [
            { 'Field Name': 'field_n_paras', 'Target Bundle': 'hero' },
            { 'Field Name': 'field_n_paras', 'Target Bundle': 'content' }
          ]]
        ])
      };
      const result = resolveFieldSettings('entity_reference_revisions', 'field_n_paras', settingsSheets);
      expect(result).toEqual({
        handler: 'default:paragraph',
        handler_settings: {
          target_bundles: { hero: 'hero', content: 'content' }
        }
      });
    });

    test('resolves link settings', () => {
      const settingsSheets = {
        linkSettings: new Map([
          ['field_n_link', [{ 'Field Name': 'field_n_link', 'Link Type': 'both', 'Title Option': 'required' }]]
        ])
      };
      expect(resolveFieldSettings('link', 'field_n_link', settingsSheets)).toEqual({
        link_type: 17,
        title: 2
      });
    });

    test('resolves image settings', () => {
      const settingsSheets = {
        imageSettings: new Map([
          ['field_n_img', [{
            'Field Name': 'field_n_img',
            'File Extensions': 'png jpg',
            'Alt Required': 'Yes',
            'File Directory': 'images',
            'Max File Size': '2MB',
            'Max Resolution': '1920x1080'
          }]]
        ])
      };
      expect(resolveFieldSettings('image', 'field_n_img', settingsSheets)).toEqual({
        file_extensions: 'png jpg',
        alt_field_required: true,
        file_directory: 'images',
        max_filesize: '2MB',
        max_resolution: '1920x1080'
      });
    });

    test('resolves file settings', () => {
      const settingsSheets = {
        fileSettings: new Map([
          ['field_n_doc', [{
            'Field Name': 'field_n_doc',
            'File Extensions': 'pdf doc',
            'File Directory': 'documents',
            'Max File Size': '10MB'
          }]]
        ])
      };
      expect(resolveFieldSettings('file', 'field_n_doc', settingsSheets)).toEqual({
        file_extensions: 'pdf doc',
        file_directory: 'documents',
        max_filesize: '10MB'
      });
    });

    test('returns empty object for unknown field type', () => {
      expect(resolveFieldSettings('unknown', 'field_n_foo', {})).toEqual({});
    });

    test('returns empty object when no settings found', () => {
      const settingsSheets = { stringSettings: new Map() };
      expect(resolveFieldSettings('string', 'field_n_missing', settingsSheets)).toEqual({});
    });
  });

  describe('parseSpreadsheet', () => {
    test('returns error when Bundles sheet is missing', () => {
      const result = parseSpreadsheet({});
      expect(result.data).toBeNull();
      expect(result.errors).toContain('Bundles sheet is empty or missing');
    });

    test('parses basic bundles and fields', () => {
      const sheets = {
        'Bundles': [
          { 'Entity Type': 'node', 'Machine Name': 'article', 'Label': 'Article', 'Description': '' }
        ],
        'Fields': [
          {
            'Entity Type': 'node', 'Bundle': 'article',
            'Field Name': 'field_n_body', 'Label': 'Body',
            'Field Type': 'text_long', 'Required': 'Yes',
            'Cardinality': '1', 'Description': 'Main body'
          }
        ]
      };

      const result = parseSpreadsheet(sheets);
      expect(result.errors).toHaveLength(0);
      expect(result.data.entityTypes).toHaveLength(1);
      expect(result.data.entityTypes[0].entityType).toBe('node');
      expect(result.data.entityTypes[0].bundles).toHaveLength(1);

      const bundle = result.data.entityTypes[0].bundles[0];
      expect(bundle.bundle).toBe('article');
      expect(bundle.label).toBe('Article');
      expect(bundle.fields).toHaveLength(1);
      expect(bundle.fields[0]).toEqual({
        name: 'field_n_body',
        type: 'text_long',
        label: 'Body',
        description: 'Main body',
        required: true,
        cardinality: 1,
        settings: undefined
      });
    });

    test('validates entity types', () => {
      const sheets = {
        'Bundles': [
          { 'Entity Type': 'invalid_type', 'Machine Name': 'test', 'Label': 'Test' }
        ],
        'Fields': []
      };

      const result = parseSpreadsheet(sheets);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('invalid Entity Type');
    });

    test('validates field types', () => {
      const sheets = {
        'Bundles': [
          { 'Entity Type': 'node', 'Machine Name': 'article', 'Label': 'Article' }
        ],
        'Fields': [
          {
            'Entity Type': 'node', 'Bundle': 'article',
            'Field Name': 'field_n_test', 'Label': 'Test',
            'Field Type': 'invalid_field', 'Required': 'No',
            'Cardinality': '1'
          }
        ]
      };

      const result = parseSpreadsheet(sheets);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('invalid Field Type');
    });

    test('reports error for field referencing missing bundle', () => {
      const sheets = {
        'Bundles': [
          { 'Entity Type': 'node', 'Machine Name': 'article', 'Label': 'Article' }
        ],
        'Fields': [
          {
            'Entity Type': 'node', 'Bundle': 'nonexistent',
            'Field Name': 'field_n_test', 'Label': 'Test',
            'Field Type': 'string', 'Required': 'No',
            'Cardinality': '1'
          }
        ]
      };

      const result = parseSpreadsheet(sheets);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('not found in Bundles sheet');
    });

    test('joins field settings from sub-sheets', () => {
      const sheets = {
        'Bundles': [
          { 'Entity Type': 'node', 'Machine Name': 'article', 'Label': 'Article' }
        ],
        'Fields': [
          {
            'Entity Type': 'node', 'Bundle': 'article',
            'Field Name': 'field_n_title', 'Label': 'Title',
            'Field Type': 'string', 'Required': 'Yes',
            'Cardinality': '1'
          }
        ],
        'String Settings': [
          { 'Field Name': 'field_n_title', 'Max Length': '100' }
        ]
      };

      const result = parseSpreadsheet(sheets);
      expect(result.errors).toHaveLength(0);
      const field = result.data.entityTypes[0].bundles[0].fields[0];
      expect(field.settings).toEqual({ max_length: 100 });
    });

    test('handles multiple entity types and bundles', () => {
      const sheets = {
        'Bundles': [
          { 'Entity Type': 'node', 'Machine Name': 'article', 'Label': 'Article' },
          { 'Entity Type': 'node', 'Machine Name': 'page', 'Label': 'Page' },
          { 'Entity Type': 'paragraph', 'Machine Name': 'hero', 'Label': 'Hero' }
        ],
        'Fields': [
          {
            'Entity Type': 'node', 'Bundle': 'article',
            'Field Name': 'field_n_body', 'Label': 'Body',
            'Field Type': 'text_long', 'Required': 'No', 'Cardinality': '1'
          },
          {
            'Entity Type': 'paragraph', 'Bundle': 'hero',
            'Field Name': 'field_p_title', 'Label': 'Title',
            'Field Type': 'string', 'Required': 'Yes', 'Cardinality': '1'
          }
        ]
      };

      const result = parseSpreadsheet(sheets);
      expect(result.errors).toHaveLength(0);
      expect(result.data.entityTypes).toHaveLength(2);

      const nodeType = result.data.entityTypes.find(e => e.entityType === 'node');
      expect(nodeType.bundles).toHaveLength(2);

      const paraType = result.data.entityTypes.find(e => e.entityType === 'paragraph');
      expect(paraType.bundles).toHaveLength(1);
    });

    test('handles cardinality values', () => {
      const sheets = {
        'Bundles': [
          { 'Entity Type': 'node', 'Machine Name': 'article', 'Label': 'Article' }
        ],
        'Fields': [
          {
            'Entity Type': 'node', 'Bundle': 'article',
            'Field Name': 'field_n_tags', 'Label': 'Tags',
            'Field Type': 'entity_reference', 'Required': 'No', 'Cardinality': '-1'
          },
          {
            'Entity Type': 'node', 'Bundle': 'article',
            'Field Name': 'field_n_body', 'Label': 'Body',
            'Field Type': 'text_long', 'Required': 'No', 'Cardinality': ''
          }
        ],
        'Entity Reference Settings': [
          { 'Field Name': 'field_n_tags', 'Target Type': 'taxonomy_term' }
        ],
        'Entity Reference Targets': [
          { 'Field Name': 'field_n_tags', 'Target Bundle': 'tags' }
        ]
      };

      const result = parseSpreadsheet(sheets);
      expect(result.errors).toHaveLength(0);
      const fields = result.data.entityTypes[0].bundles[0].fields;
      expect(fields[0].cardinality).toBe(-1);
      expect(fields[1].cardinality).toBe(1); // Default
    });

    test('rejects list_string field with no List Settings entry', () => {
      const sheets = {
        'Bundles': [
          { 'Entity Type': 'node', 'Machine Name': 'article', 'Label': 'Article' }
        ],
        'Fields': [
          {
            'Entity Type': 'node', 'Bundle': 'article',
            'Field Name': 'field_n_color', 'Label': 'Color',
            'Field Type': 'list_string', 'Required': 'No', 'Cardinality': '1'
          }
        ]
      };

      const result = parseSpreadsheet(sheets);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('list_string');
      expect(result.errors[0]).toContain('field_n_color');
      expect(result.errors[0]).toContain('List Settings');
      // Field should be skipped
      expect(result.data.entityTypes[0].bundles[0].fields).toHaveLength(0);
    });

    test('rejects list_integer field with no List Settings entry', () => {
      const sheets = {
        'Bundles': [
          { 'Entity Type': 'node', 'Machine Name': 'article', 'Label': 'Article' }
        ],
        'Fields': [
          {
            'Entity Type': 'node', 'Bundle': 'article',
            'Field Name': 'field_n_count', 'Label': 'Count',
            'Field Type': 'list_integer', 'Required': 'No', 'Cardinality': '1'
          }
        ]
      };

      const result = parseSpreadsheet(sheets);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('list_integer');
      expect(result.errors[0]).toContain('List Settings');
      expect(result.data.entityTypes[0].bundles[0].fields).toHaveLength(0);
    });

    test('rejects datetime field with no DateTime Settings entry', () => {
      const sheets = {
        'Bundles': [
          { 'Entity Type': 'node', 'Machine Name': 'article', 'Label': 'Article' }
        ],
        'Fields': [
          {
            'Entity Type': 'node', 'Bundle': 'article',
            'Field Name': 'field_n_date', 'Label': 'Date',
            'Field Type': 'datetime', 'Required': 'No', 'Cardinality': '1'
          }
        ]
      };

      const result = parseSpreadsheet(sheets);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('datetime');
      expect(result.errors[0]).toContain('DateTime Settings');
      expect(result.data.entityTypes[0].bundles[0].fields).toHaveLength(0);
    });

    test('rejects entity_reference field with no settings', () => {
      const sheets = {
        'Bundles': [
          { 'Entity Type': 'node', 'Machine Name': 'article', 'Label': 'Article' }
        ],
        'Fields': [
          {
            'Entity Type': 'node', 'Bundle': 'article',
            'Field Name': 'field_n_ref', 'Label': 'Reference',
            'Field Type': 'entity_reference', 'Required': 'No', 'Cardinality': '1'
          }
        ]
      };

      const result = parseSpreadsheet(sheets);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0]).toContain('Entity Reference Settings');
      expect(result.errors[1]).toContain('Entity Reference Targets');
      expect(result.data.entityTypes[0].bundles[0].fields).toHaveLength(0);
    });

    test('rejects entity_reference with target type but no target bundles', () => {
      const sheets = {
        'Bundles': [
          { 'Entity Type': 'node', 'Machine Name': 'article', 'Label': 'Article' }
        ],
        'Fields': [
          {
            'Entity Type': 'node', 'Bundle': 'article',
            'Field Name': 'field_n_ref', 'Label': 'Reference',
            'Field Type': 'entity_reference', 'Required': 'No', 'Cardinality': '1'
          }
        ],
        'Entity Reference Settings': [
          { 'Field Name': 'field_n_ref', 'Target Type': 'node' }
        ]
      };

      const result = parseSpreadsheet(sheets);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('Entity Reference Targets');
      expect(result.data.entityTypes[0].bundles[0].fields).toHaveLength(0);
    });

    test('rejects entity_reference_revisions field with no target bundles', () => {
      const sheets = {
        'Bundles': [
          { 'Entity Type': 'node', 'Machine Name': 'article', 'Label': 'Article' }
        ],
        'Fields': [
          {
            'Entity Type': 'node', 'Bundle': 'article',
            'Field Name': 'field_n_paras', 'Label': 'Paragraphs',
            'Field Type': 'entity_reference_revisions', 'Required': 'No', 'Cardinality': '-1'
          }
        ]
      };

      const result = parseSpreadsheet(sheets);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('entity_reference_revisions');
      expect(result.errors[0]).toContain('Entity Reference Targets');
      expect(result.data.entityTypes[0].bundles[0].fields).toHaveLength(0);
    });

    test('does not reject when all required settings are present', () => {
      const sheets = {
        'Bundles': [
          { 'Entity Type': 'node', 'Machine Name': 'article', 'Label': 'Article' }
        ],
        'Fields': [
          {
            'Entity Type': 'node', 'Bundle': 'article',
            'Field Name': 'field_n_color', 'Label': 'Color',
            'Field Type': 'list_string', 'Required': 'No', 'Cardinality': '1'
          },
          {
            'Entity Type': 'node', 'Bundle': 'article',
            'Field Name': 'field_n_date', 'Label': 'Date',
            'Field Type': 'datetime', 'Required': 'No', 'Cardinality': '1'
          },
          {
            'Entity Type': 'node', 'Bundle': 'article',
            'Field Name': 'field_n_ref', 'Label': 'Ref',
            'Field Type': 'entity_reference', 'Required': 'No', 'Cardinality': '1'
          }
        ],
        'List Settings': [
          { 'Field Name': 'field_n_color', 'Allowed Values': 'red|Red, blue|Blue' }
        ],
        'DateTime Settings': [
          { 'Field Name': 'field_n_date', 'DateTime Type': 'date' }
        ],
        'Entity Reference Settings': [
          { 'Field Name': 'field_n_ref', 'Target Type': 'node' }
        ],
        'Entity Reference Targets': [
          { 'Field Name': 'field_n_ref', 'Target Bundle': 'page' }
        ]
      };

      const result = parseSpreadsheet(sheets);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('findSharedFields', () => {
    test('identifies shared fields across bundles', () => {
      const reportData = {
        entityTypes: [{
          entityType: 'node',
          bundles: [
            { bundle: 'article', fields: [{ name: 'field_n_body' }, { name: 'field_n_title' }] },
            { bundle: 'page', fields: [{ name: 'field_n_body' }, { name: 'field_n_summary' }] }
          ]
        }]
      };

      const shared = findSharedFields(reportData);
      expect(shared.has('field_n_body')).toBe(true);
      expect(shared.has('field_n_title')).toBe(false);
      expect(shared.has('field_n_summary')).toBe(false);
    });

    test('returns empty set when no shared fields', () => {
      const reportData = {
        entityTypes: [{
          entityType: 'node',
          bundles: [
            { bundle: 'article', fields: [{ name: 'field_n_body' }] }
          ]
        }]
      };

      expect(findSharedFields(reportData).size).toBe(0);
    });
  });
});

describe('Spreadsheet Generator', () => {
  describe('generateSpreadsheetData', () => {
    test('generates data from project entities', () => {
      const project = {
        entities: {
          node: {
            article: {
              id: 'article',
              label: 'Article',
              description: 'News article',
              fields: {
                field_n_body: {
                  name: 'field_n_body',
                  label: 'Body',
                  type: 'text_long',
                  required: true,
                  cardinality: 1,
                  settings: {}
                },
                field_n_color: {
                  name: 'field_n_color',
                  label: 'Color',
                  type: 'list_string',
                  required: false,
                  cardinality: 1,
                  settings: {
                    allowed_values: [
                      { value: 'red', label: 'Red' },
                      { value: 'blue', label: 'Blue' }
                    ]
                  }
                }
              }
            }
          },
          media: {},
          paragraph: {},
          taxonomy_term: {},
          block_content: {}
        }
      };

      const data = generateSpreadsheetData(project);

      expect(data.bundles).toHaveLength(1);
      expect(data.bundles[0]['Entity Type']).toBe('node');
      expect(data.bundles[0]['Machine Name']).toBe('article');

      expect(data.fields).toHaveLength(2);
      expect(data.fields[0]['Field Name']).toBe('field_n_body');
      expect(data.fields[1]['Field Type']).toBe('list_string');

      expect(data.listSettings).toHaveLength(1);
      expect(data.listSettings[0]['Allowed Values']).toBe('red|Red, blue|Blue');
    });

    test('marks shared fields', () => {
      const project = {
        entities: {
          node: {
            article: {
              id: 'article',
              label: 'Article',
              fields: {
                field_n_body: { name: 'field_n_body', label: 'Body', type: 'text_long', required: false, cardinality: 1, settings: {} }
              }
            },
            page: {
              id: 'page',
              label: 'Page',
              fields: {
                field_n_body: { name: 'field_n_body', label: 'Body', type: 'text_long', required: false, cardinality: 1, settings: {} }
              }
            }
          },
          media: {},
          paragraph: {},
          taxonomy_term: {},
          block_content: {}
        }
      };

      const data = generateSpreadsheetData(project);
      expect(data.fields[0]._shared).toBe(true);
      expect(data.fields[1]._shared).toBe(true);
    });

    test('generates entity reference settings and targets', () => {
      const project = {
        entities: {
          node: {
            article: {
              id: 'article',
              label: 'Article',
              fields: {
                field_n_tags: {
                  name: 'field_n_tags',
                  label: 'Tags',
                  type: 'entity_reference',
                  required: false,
                  cardinality: -1,
                  settings: {
                    target_type: 'taxonomy_term',
                    handler: 'default:taxonomy_term',
                    handler_settings: {
                      target_bundles: { tags: 'tags', categories: 'categories' }
                    }
                  }
                }
              }
            }
          },
          media: {},
          paragraph: {},
          taxonomy_term: {},
          block_content: {}
        }
      };

      const data = generateSpreadsheetData(project);
      expect(data.entityRefSettings).toHaveLength(1);
      expect(data.entityRefSettings[0]['Target Type']).toBe('taxonomy_term');
      expect(data.entityRefTargets).toHaveLength(2);
      expect(data.entityRefTargets[0]['Target Bundle']).toBe('tags');
    });

    test('handles empty project', () => {
      const data = generateSpreadsheetData({ entities: {} });
      expect(data.bundles).toHaveLength(0);
      expect(data.fields).toHaveLength(0);
    });
  });
});

describe('Spreadsheet Sync', () => {
  describe('buildSyncDiff', () => {
    test('identifies bundles to create', () => {
      const project = {
        entities: { node: {}, media: {}, paragraph: {}, taxonomy_term: {}, block_content: {} }
      };
      const reportData = {
        entityTypes: [{
          entityType: 'node',
          bundles: [{ bundle: 'article', label: 'Article', fields: [] }]
        }]
      };

      const diff = buildSyncDiff(project, reportData);
      expect(diff.toCreate).toHaveLength(1);
      expect(diff.toCreate[0].kind).toBe('bundle');
      expect(diff.toCreate[0].bundle).toBe('article');
      expect(diff.toDelete).toHaveLength(0);
    });

    test('deletes bundles missing from spreadsheet', () => {
      const project = {
        entities: {
          node: {
            article: { id: 'article', label: 'Article', fields: {} }
          },
          media: {},
          paragraph: {},
          taxonomy_term: {},
          block_content: {}
        }
      };
      const reportData = { entityTypes: [] };

      const diff = buildSyncDiff(project, reportData);
      expect(diff.toDelete).toHaveLength(1);
      expect(diff.toDelete[0].kind).toBe('bundle');
      expect(diff.toDelete[0].bundle).toBe('article');
      expect(diff.toKeep).toHaveLength(0);
    });

    test('identifies fields to create on existing bundle', () => {
      const project = {
        entities: {
          node: {
            article: { id: 'article', label: 'Article', fields: {} }
          },
          media: {},
          paragraph: {},
          taxonomy_term: {},
          block_content: {}
        }
      };
      const reportData = {
        entityTypes: [{
          entityType: 'node',
          bundles: [{
            bundle: 'article',
            label: 'Article',
            fields: [{ name: 'field_n_body', type: 'text_long', label: 'Body' }]
          }]
        }]
      };

      const diff = buildSyncDiff(project, reportData);
      expect(diff.toCreate).toHaveLength(1);
      expect(diff.toCreate[0].kind).toBe('field');
      expect(diff.toCreate[0].fieldName).toBe('field_n_body');
      expect(diff.toKeep).toHaveLength(1);
      expect(diff.toKeep[0].bundle).toBe('article');
    });

    test('identifies fields to delete', () => {
      const project = {
        entities: {
          node: {
            article: {
              id: 'article',
              label: 'Article',
              fields: {
                field_n_body: { type: 'text_long', label: 'Body' },
                field_n_summary: { type: 'string_long', label: 'Summary' }
              }
            }
          },
          media: {},
          paragraph: {},
          taxonomy_term: {},
          block_content: {}
        }
      };
      const reportData = {
        entityTypes: [{
          entityType: 'node',
          bundles: [{
            bundle: 'article',
            label: 'Article',
            fields: [{ name: 'field_n_body', type: 'text_long', label: 'Body' }]
          }]
        }]
      };

      const diff = buildSyncDiff(project, reportData);
      expect(diff.toDelete).toHaveLength(1);
      expect(diff.toDelete[0].kind).toBe('field');
      expect(diff.toDelete[0].fieldName).toBe('field_n_summary');
    });

    test('no changes when in sync', () => {
      const project = {
        entities: {
          node: {
            article: {
              id: 'article',
              label: 'Article',
              fields: {
                field_n_body: { type: 'text_long', label: 'Body' }
              }
            }
          },
          media: {},
          paragraph: {},
          taxonomy_term: {},
          block_content: {}
        }
      };
      const reportData = {
        entityTypes: [{
          entityType: 'node',
          bundles: [{
            bundle: 'article',
            label: 'Article',
            fields: [{ name: 'field_n_body', type: 'text_long', label: 'Body' }]
          }]
        }]
      };

      const diff = buildSyncDiff(project, reportData);
      expect(diff.toCreate).toHaveLength(0);
      expect(diff.toDelete).toHaveLength(0);
      expect(diff.toKeep).toHaveLength(1);
    });
  });

  describe('removeFieldFromYaml', () => {
    test('removes field from dependencies.config', () => {
      const yaml = [
        'dependencies:',
        '  config:',
        '    - field.field.node.article.field_n_body',
        '    - field.field.node.article.field_n_summary',
        '    - node.type.article',
        ''
      ].join('\n');

      const result = removeFieldFromYaml(yaml, 'node', 'article', 'field_n_body');
      expect(result).not.toContain('field_n_body');
      expect(result).toContain('field.field.node.article.field_n_summary');
      expect(result).toContain('node.type.article');
    });

    test('removes field from content section', () => {
      const yaml = [
        'content:',
        '  field_n_body:',
        '    type: text_textarea',
        '    weight: 0',
        '    region: content',
        '    settings:',
        '      rows: 5',
        '    third_party_settings: {}',
        '  field_n_summary:',
        '    type: string_textfield',
        '    weight: 1',
        ''
      ].join('\n');

      const result = removeFieldFromYaml(yaml, 'node', 'article', 'field_n_body');
      expect(result).not.toContain('field_n_body');
      expect(result).toContain('field_n_summary');
      expect(result).toContain('string_textfield');
    });

    test('removes field from hidden section', () => {
      const yaml = [
        'hidden:',
        '  field_n_body: true',
        '  promote: true',
        ''
      ].join('\n');

      const result = removeFieldFromYaml(yaml, 'node', 'article', 'field_n_body');
      expect(result).not.toContain('field_n_body');
      expect(result).toContain('promote: true');
    });

    test('removes field from field_group children', () => {
      const yaml = [
        'third_party_settings:',
        '  field_group:',
        '    group_main:',
        '      children:',
        '        - field_n_body',
        '        - field_n_summary',
        '        - field_n_tags',
        '      label: Main',
        ''
      ].join('\n');

      const result = removeFieldFromYaml(yaml, 'node', 'article', 'field_n_body');
      expect(result).not.toContain('field_n_body');
      expect(result).toContain('- field_n_summary');
      expect(result).toContain('- field_n_tags');
    });

    test('cleans up all locations at once', () => {
      const yaml = [
        'dependencies:',
        '  config:',
        '    - field.field.node.article.field_n_body',
        '    - node.type.article',
        'content:',
        '  field_n_body:',
        '    type: text_textarea',
        '    weight: 0',
        '  field_n_tags:',
        '    type: entity_reference_autocomplete',
        '    weight: 1',
        'third_party_settings:',
        '  field_group:',
        '    group_main:',
        '      children:',
        '        - field_n_body',
        '        - field_n_tags',
        ''
      ].join('\n');

      const result = removeFieldFromYaml(yaml, 'node', 'article', 'field_n_body');
      expect(result).not.toContain('field_n_body');
      expect(result).toContain('node.type.article');
      expect(result).toContain('field_n_tags');
    });

    test('returns unchanged content when field not present', () => {
      const yaml = [
        'dependencies:',
        '  config:',
        '    - node.type.article',
        'content:',
        '  field_n_summary:',
        '    type: string_textfield',
        ''
      ].join('\n');

      const result = removeFieldFromYaml(yaml, 'node', 'article', 'field_n_body');
      expect(result).toBe(yaml);
    });

    test('handles real-world form display YAML', () => {
      const yaml = [
        'langcode: en',
        'status: true',
        'dependencies:',
        '  config:',
        '    - field.field.node.civictheme_event.field_c_n_date_range',
        '    - field.field.node.civictheme_event.field_c_n_summary',
        '    - node.type.civictheme_event',
        '  module:',
        '    - datetime_range',
        '    - text',
        'id: node.civictheme_event.default',
        'targetEntityType: node',
        'bundle: civictheme_event',
        'mode: default',
        'content:',
        '  field_c_n_date_range:',
        '    type: daterange_default',
        '    weight: 2',
        '    region: content',
        '    settings: {}',
        '    third_party_settings: {}',
        '  field_c_n_summary:',
        '    type: text_textarea',
        '    weight: 3',
        '    region: content',
        '    settings:',
        '      rows: 5',
        '    third_party_settings: {}',
        'hidden:',
        '  promote: true',
        'third_party_settings:',
        '  field_group:',
        '    group_content:',
        '      children:',
        '        - field_c_n_date_range',
        '        - field_c_n_summary',
        '      label: Content',
        ''
      ].join('\n');

      const result = removeFieldFromYaml(yaml, 'node', 'civictheme_event', 'field_c_n_date_range');
      expect(result).not.toContain('field_c_n_date_range');
      expect(result).toContain('field_c_n_summary');
      expect(result).toContain('text_textarea');
      expect(result).toContain('node.type.civictheme_event');
      expect(result).toContain('promote: true');
    });
  });

  describe('fieldStorageUsedElsewhere', () => {
    test('returns true when another bundle uses the field', () => {
      const project = {
        entities: {
          node: {
            article: { fields: { field_n_body: { type: 'text_long' } } },
            page: { fields: { field_n_body: { type: 'text_long' } } }
          }
        }
      };
      const deletingBundles = new Set(['node:article']);
      expect(fieldStorageUsedElsewhere(project, 'node', 'field_n_body', deletingBundles)).toBe(true);
    });

    test('returns false when no other bundle uses the field', () => {
      const project = {
        entities: {
          node: {
            article: { fields: { field_n_body: { type: 'text_long' } } }
          }
        }
      };
      const deletingBundles = new Set(['node:article']);
      expect(fieldStorageUsedElsewhere(project, 'node', 'field_n_body', deletingBundles)).toBe(false);
    });
  });

  describe('cleanupRolePermissions', () => {

    let tmpDir;

    beforeEach(() => {
      tmpDir = mkdtempSync(join(tmpdir(), 'dcm-role-test-'));
    });

    afterEach(() => {
      rmSync(tmpDir, { recursive: true, force: true });
    });

    test('removes node bundle permissions from role files', async () => {
      const roleContent = [
        'langcode: en',
        'status: true',
        'dependencies: {  }',
        'id: editor',
        'label: Editor',
        'weight: 3',
        'is_admin: false',
        'permissions:',
        "  - 'create article content'",
        "  - 'edit own article content'",
        "  - 'edit any article content'",
        "  - 'delete own article content'",
        "  - 'create page content'",
        "  - 'administer nodes'",
        ''
      ].join('\n');

      writeFileSync(join(tmpDir, 'user.role.editor.yml'), roleContent, 'utf8');

      const modified = await cleanupRolePermissions(tmpDir, 'node', 'article');
      expect(modified).toHaveLength(1);
      expect(modified[0]).toBe('user.role.editor.yml');

      const result = readFileSync(join(tmpDir, 'user.role.editor.yml'), 'utf8');
      expect(result).not.toContain('article');
      expect(result).toContain("'create page content'");
      expect(result).toContain("'administer nodes'");
    });

    test('removes taxonomy bundle permissions from role files', async () => {
      const roleContent = [
        'permissions:',
        "  - 'create terms in tags'",
        "  - 'edit terms in tags'",
        "  - 'delete terms in tags'",
        "  - 'create terms in categories'",
        ''
      ].join('\n');

      writeFileSync(join(tmpDir, 'user.role.editor.yml'), roleContent, 'utf8');

      await cleanupRolePermissions(tmpDir, 'taxonomy_term', 'tags');

      const result = readFileSync(join(tmpDir, 'user.role.editor.yml'), 'utf8');
      expect(result).not.toContain('tags');
      expect(result).toContain("'create terms in categories'");
    });

    test('does not modify role files without matching permissions', async () => {
      const roleContent = [
        'permissions:',
        "  - 'administer nodes'",
        "  - 'create page content'",
        ''
      ].join('\n');

      writeFileSync(join(tmpDir, 'user.role.editor.yml'), roleContent, 'utf8');

      const modified = await cleanupRolePermissions(tmpDir, 'node', 'article');
      expect(modified).toHaveLength(0);
    });

    test('handles entity types without permissions (paragraph)', async () => {
      const roleContent = [
        'permissions:',
        "  - 'administer nodes'",
        ''
      ].join('\n');

      writeFileSync(join(tmpDir, 'user.role.editor.yml'), roleContent, 'utf8');

      const modified = await cleanupRolePermissions(tmpDir, 'paragraph', 'hero');
      expect(modified).toHaveLength(0);
    });
  });

  describe('cleanupBundleDependencies', () => {

    let tmpDir;

    beforeEach(() => {
      tmpDir = mkdtempSync(join(tmpdir(), 'dcm-entref-test-'));
    });

    afterEach(() => {
      rmSync(tmpDir, { recursive: true, force: true });
    });

    test('removes deleted bundle from target_bundles and dependencies', () => {
      const fieldContent = [
        'langcode: en',
        'status: true',
        'dependencies:',
        '  config:',
        '    - field.storage.paragraph.field_c_p_reference',
        '    - node.type.civictheme_event',
        '    - node.type.civictheme_page',
        '    - paragraphs.paragraphs_type.civictheme_promo_card_ref',
        'id: paragraph.civictheme_promo_card_ref.field_c_p_reference',
        'field_name: field_c_p_reference',
        'entity_type: paragraph',
        'bundle: civictheme_promo_card_ref',
        'settings:',
        "  handler: 'default:node'",
        '  handler_settings:',
        '    target_bundles:',
        '      civictheme_event: civictheme_event',
        '      civictheme_page: civictheme_page',
        '    auto_create: false',
        '    auto_create_bundle: civictheme_event',
        'field_type: entity_reference',
        ''
      ].join('\n');

      writeFileSync(
        join(tmpDir, 'field.field.paragraph.civictheme_promo_card_ref.field_c_p_reference.yml'),
        fieldContent, 'utf8'
      );

      const modified = cleanupBundleDependencies(tmpDir, 'node', 'civictheme_event');
      expect(modified).toHaveLength(1);

      const result = readFileSync(
        join(tmpDir, 'field.field.paragraph.civictheme_promo_card_ref.field_c_p_reference.yml'), 'utf8'
      );
      expect(result).not.toContain('civictheme_event');
      expect(result).toContain('node.type.civictheme_page');
      expect(result).toContain('civictheme_page: civictheme_page');
      expect(result).toContain("auto_create_bundle: ''");
    });

    test('removes single-target bundle leaving empty target_bundles', () => {
      const fieldContent = [
        'dependencies:',
        '  config:',
        '    - field.storage.paragraph.field_c_p_reference',
        '    - node.type.civictheme_event',
        '    - paragraphs.paragraphs_type.civictheme_event_card_ref',
        'settings:',
        "  handler: 'default:node'",
        '  handler_settings:',
        '    target_bundles:',
        '      civictheme_event: civictheme_event',
        '    auto_create: false',
        '    auto_create_bundle: civictheme_event',
        ''
      ].join('\n');

      writeFileSync(
        join(tmpDir, 'field.field.paragraph.civictheme_event_card_ref.field_c_p_reference.yml'),
        fieldContent, 'utf8'
      );

      cleanupBundleDependencies(tmpDir, 'node', 'civictheme_event');

      const result = readFileSync(
        join(tmpDir, 'field.field.paragraph.civictheme_event_card_ref.field_c_p_reference.yml'), 'utf8'
      );
      // Bundle config dependency removed
      expect(result).not.toContain('node.type.civictheme_event');
      // Target bundle entry removed
      expect(result).not.toContain('civictheme_event: civictheme_event');
      // auto_create_bundle cleaned
      expect(result).toContain("auto_create_bundle: ''");
      // Paragraph type dependency still present
      expect(result).toContain('paragraphs.paragraphs_type.civictheme_event_card_ref');
    });

    test('does not modify files without matching references', () => {
      const fieldContent = [
        'dependencies:',
        '  config:',
        '    - field.storage.node.field_n_tags',
        '    - taxonomy.vocabulary.tags',
        'settings:',
        "  handler: 'default:taxonomy_term'",
        '  handler_settings:',
        '    target_bundles:',
        '      tags: tags',
        ''
      ].join('\n');

      writeFileSync(
        join(tmpDir, 'field.field.node.article.field_n_tags.yml'),
        fieldContent, 'utf8'
      );

      const modified = cleanupBundleDependencies(tmpDir, 'node', 'civictheme_event');
      expect(modified).toHaveLength(0);
    });

    test('removes bundle dependency from views, workflows, and role configs', () => {
      // View config referencing the bundle
      const viewContent = [
        'langcode: en',
        'status: true',
        'dependencies:',
        '  config:',
        '    - node.type.civictheme_event',
        '    - node.type.civictheme_page',
        '  module:',
        '    - node',
        'id: civictheme_automated_list_examples',
        ''
      ].join('\n');

      // Workflow config referencing the bundle
      const workflowContent = [
        'langcode: en',
        'status: true',
        'dependencies:',
        '  config:',
        '    - node.type.civictheme_event',
        '    - node.type.civictheme_page',
        '  module:',
        '    - content_moderation',
        'id: civictheme_editorial',
        ''
      ].join('\n');

      // Role config referencing the bundle
      const roleContent = [
        'langcode: en',
        'status: true',
        'dependencies:',
        '  config:',
        '    - node.type.civictheme_event',
        '    - node.type.civictheme_page',
        'id: civictheme_content_author',
        'permissions:',
        "  - 'create civictheme_event content'",
        ''
      ].join('\n');

      writeFileSync(join(tmpDir, 'views.view.civictheme_automated_list_examples.yml'), viewContent, 'utf8');
      writeFileSync(join(tmpDir, 'workflows.workflow.civictheme_editorial.yml'), workflowContent, 'utf8');
      writeFileSync(join(tmpDir, 'user.role.civictheme_content_author.yml'), roleContent, 'utf8');

      const modified = cleanupBundleDependencies(tmpDir, 'node', 'civictheme_event');
      expect(modified).toHaveLength(3);

      // View: dependency removed, other deps preserved
      const viewResult = readFileSync(join(tmpDir, 'views.view.civictheme_automated_list_examples.yml'), 'utf8');
      expect(viewResult).not.toContain('node.type.civictheme_event');
      expect(viewResult).toContain('node.type.civictheme_page');

      // Workflow: dependency removed
      const wfResult = readFileSync(join(tmpDir, 'workflows.workflow.civictheme_editorial.yml'), 'utf8');
      expect(wfResult).not.toContain('node.type.civictheme_event');
      expect(wfResult).toContain('node.type.civictheme_page');

      // Role: dependency removed (permissions handled separately by cleanupRolePermissions)
      const roleResult = readFileSync(join(tmpDir, 'user.role.civictheme_content_author.yml'), 'utf8');
      expect(roleResult).not.toContain('node.type.civictheme_event');
      expect(roleResult).toContain('node.type.civictheme_page');
    });

    test('skips files belonging to the bundle being deleted', () => {
      // This file belongs to the bundle being deleted — should not be modified
      const bundleConfig = [
        'langcode: en',
        'dependencies:',
        '  config:',
        '    - node.type.civictheme_event',
        'id: civictheme_event',
        ''
      ].join('\n');

      writeFileSync(join(tmpDir, 'node.type.civictheme_event.yml'), bundleConfig, 'utf8');
      writeFileSync(join(tmpDir, 'field.field.node.civictheme_event.field_n_body.yml'), bundleConfig, 'utf8');
      writeFileSync(join(tmpDir, 'core.entity_form_display.node.civictheme_event.default.yml'), bundleConfig, 'utf8');

      const modified = cleanupBundleDependencies(tmpDir, 'node', 'civictheme_event');
      expect(modified).toHaveLength(0);
    });
  });
});

describe('Roundtrip: generate → parse', () => {
  test('generates and parses back to equivalent structure', () => {
    const project = {
      entities: {
        node: {
          article: {
            id: 'article',
            label: 'Article',
            description: 'A news article',
            fields: {
              field_n_body: {
                name: 'field_n_body',
                label: 'Body',
                type: 'text_long',
                required: true,
                cardinality: 1,
                settings: {}
              },
              field_n_tags: {
                name: 'field_n_tags',
                label: 'Tags',
                type: 'entity_reference',
                required: false,
                cardinality: -1,
                settings: {
                  target_type: 'taxonomy_term',
                  handler: 'default:taxonomy_term',
                  handler_settings: {
                    target_bundles: { tags: 'tags' }
                  }
                }
              },
              field_n_color: {
                name: 'field_n_color',
                label: 'Color',
                type: 'list_string',
                required: false,
                cardinality: 1,
                settings: {
                  allowed_values: [
                    { value: 'red', label: 'Red' },
                    { value: 'blue', label: 'Blue' }
                  ]
                }
              }
            }
          }
        },
        media: {},
        paragraph: {},
        taxonomy_term: {},
        block_content: {}
      }
    };

    // Generate spreadsheet data
    const data = generateSpreadsheetData(project);

    // Convert generated data to sheet format (simulating what readSpreadsheet returns)
    const sheets = {
      'Bundles': data.bundles,
      'Fields': data.fields.map(f => ({
        'Entity Type': f['Entity Type'],
        'Bundle': f['Bundle'],
        'Field Name': f['Field Name'],
        'Label': f['Label'],
        'Field Type': f['Field Type'],
        'Required': f['Required'],
        'Cardinality': String(f['Cardinality']),
        'Description': f['Description']
      })),
      'String Settings': data.stringSettings,
      'List Settings': data.listSettings,
      'DateTime Settings': data.datetimeSettings,
      'Entity Reference Settings': data.entityRefSettings,
      'Entity Reference Targets': data.entityRefTargets,
      'Link Settings': data.linkSettings,
      'Image Settings': data.imageSettings,
      'File Settings': data.fileSettings
    };

    // Parse back
    const result = parseSpreadsheet(sheets);
    expect(result.errors).toHaveLength(0);
    expect(result.data.entityTypes).toHaveLength(1);

    const et = result.data.entityTypes[0];
    expect(et.entityType).toBe('node');
    expect(et.bundles).toHaveLength(1);

    const bundle = et.bundles[0];
    expect(bundle.bundle).toBe('article');
    expect(bundle.label).toBe('Article');
    expect(bundle.fields).toHaveLength(3);

    // Check body field
    const body = bundle.fields.find(f => f.name === 'field_n_body');
    expect(body.type).toBe('text_long');
    expect(body.required).toBe(true);

    // Check tags field with entity reference settings
    const tags = bundle.fields.find(f => f.name === 'field_n_tags');
    expect(tags.type).toBe('entity_reference');
    expect(tags.cardinality).toBe(-1);
    expect(tags.settings.target_type).toBe('taxonomy_term');
    expect(tags.settings.handler_settings.target_bundles).toEqual({ tags: 'tags' });

    // Check color field with list settings
    const color = bundle.fields.find(f => f.name === 'field_n_color');
    expect(color.type).toBe('list_string');
    expect(color.settings.allowed_values).toEqual([
      { value: 'red', label: 'Red' },
      { value: 'blue', label: 'Blue' }
    ]);
  });
});

describe('Phase 2: Format Settings Serialization', () => {
  describe('serializeFormatSettings', () => {
    test('serializes object to semicolon-delimited string', () => {
      const result = serializeFormatSettings({ direction: 'horizontal', open: false });
      expect(result).toBe('direction=horizontal; open=false');
    });

    test('skips empty string values', () => {
      const result = serializeFormatSettings({ classes: '', direction: 'horizontal', id: '' });
      expect(result).toBe('direction=horizontal');
    });

    test('returns empty string for null/undefined', () => {
      expect(serializeFormatSettings(null)).toBe('');
      expect(serializeFormatSettings(undefined)).toBe('');
    });

    test('returns empty string for empty object', () => {
      expect(serializeFormatSettings({})).toBe('');
    });

    test('handles boolean and number values', () => {
      const result = serializeFormatSettings({ required_fields: true, weight: 5 });
      expect(result).toBe('required_fields=true; weight=5');
    });
  });

  describe('parseFormatSettings', () => {
    test('parses semicolon-delimited string to object', () => {
      const result = parseFormatSettings('direction=horizontal; open=false');
      expect(result).toEqual({ direction: 'horizontal', open: false });
    });

    test('parses boolean values', () => {
      const result = parseFormatSettings('required_fields=true; show_empty_fields=false');
      expect(result).toEqual({ required_fields: true, show_empty_fields: false });
    });

    test('parses integer values', () => {
      const result = parseFormatSettings('weight=5');
      expect(result).toEqual({ weight: 5 });
    });

    test('returns empty object for empty string', () => {
      expect(parseFormatSettings('')).toEqual({});
      expect(parseFormatSettings(null)).toEqual({});
    });

    test('roundtrips correctly', () => {
      const original = { direction: 'horizontal', required_fields: true };
      const serialized = serializeFormatSettings(original);
      const parsed = parseFormatSettings(serialized);
      expect(parsed).toEqual(original);
    });
  });
});

describe('Phase 2: Form Display Sheet', () => {
  describe('generateSpreadsheetData with form displays', () => {
    test('generates form display items from pre-loaded data', () => {
      const project = {
        entities: {
          node: {
            article: {
              id: 'article',
              label: 'Article',
              fields: { field_n_body: { type: 'text_long', label: 'Body' } }
            }
          },
          media: {}, paragraph: {}, taxonomy_term: {}, block_content: {}
        }
      };

      const options = {
        formDisplays: {
          'node:article': {
            entityType: 'node',
            bundle: 'article',
            groups: [
              {
                name: 'group_content',
                label: 'Content',
                parentName: '',
                weight: 0,
                formatType: 'tabs',
                formatSettings: { direction: 'horizontal' },
                children: ['group_main']
              },
              {
                name: 'group_main',
                label: 'Main',
                parentName: 'group_content',
                weight: 1,
                formatType: 'tab',
                formatSettings: { formatter: 'closed' },
                children: ['field_n_body']
              }
            ],
            fields: [
              { name: 'field_n_body', type: 'text_textarea', weight: 2, settings: {} }
            ],
            hidden: ['promote']
          }
        }
      };

      const data = generateSpreadsheetData(project, options);
      expect(data.formDisplayItems).toHaveLength(4); // 2 groups + 1 field + 1 hidden

      const groups = data.formDisplayItems.filter(i => i['Item Type'] === 'group');
      expect(groups).toHaveLength(2);
      expect(groups[0]['Item Name']).toBe('group_content');
      expect(groups[0]['Widget/Format Type']).toBe('tabs');
      expect(groups[0]['Format Settings']).toBe('direction=horizontal');

      const fields = data.formDisplayItems.filter(i => i['Item Type'] === 'field');
      expect(fields).toHaveLength(1);
      expect(fields[0]['Item Name']).toBe('field_n_body');
      expect(fields[0]['Widget/Format Type']).toBe('text_textarea');
      expect(fields[0]['Parent Group']).toBe('group_main');

      const hidden = data.formDisplayItems.filter(i => i['Item Type'] === 'hidden');
      expect(hidden).toHaveLength(1);
      expect(hidden[0]['Item Name']).toBe('promote');
    });

    test('generates empty form display items when no form displays provided', () => {
      const project = {
        entities: {
          node: {
            article: { id: 'article', label: 'Article', fields: {} }
          },
          media: {}, paragraph: {}, taxonomy_term: {}, block_content: {}
        }
      };

      const data = generateSpreadsheetData(project);
      expect(data.formDisplayItems).toHaveLength(0);
    });
  });

  describe('parseFormDisplaySheet', () => {
    test('parses groups, fields, and hidden items', () => {
      const sheets = {
        'Form Display': [
          {
            'Entity Type': 'node', 'Bundle': 'article',
            'Item Name': 'group_content', 'Item Type': 'group',
            'Label': 'Content', 'Parent Group': '',
            'Weight': '0', 'Widget/Format Type': 'tabs',
            'Format Settings': 'direction=horizontal'
          },
          {
            'Entity Type': 'node', 'Bundle': 'article',
            'Item Name': 'group_main', 'Item Type': 'group',
            'Label': 'Main', 'Parent Group': 'group_content',
            'Weight': '1', 'Widget/Format Type': 'tab',
            'Format Settings': 'formatter=closed'
          },
          {
            'Entity Type': 'node', 'Bundle': 'article',
            'Item Name': 'field_n_body', 'Item Type': 'field',
            'Label': '', 'Parent Group': 'group_main',
            'Weight': '2', 'Widget/Format Type': 'text_textarea',
            'Format Settings': ''
          },
          {
            'Entity Type': 'node', 'Bundle': 'article',
            'Item Name': 'promote', 'Item Type': 'hidden',
            'Label': '', 'Parent Group': '',
            'Weight': '0', 'Widget/Format Type': '',
            'Format Settings': ''
          }
        ]
      };

      const { formDisplays, errors } = parseFormDisplaySheet(sheets);
      expect(errors).toHaveLength(0);

      const fd = formDisplays['node:article'];
      expect(fd).toBeDefined();
      expect(fd.entityType).toBe('node');
      expect(fd.bundle).toBe('article');

      // Groups
      expect(fd.groups).toHaveLength(2);
      expect(fd.groups[0].name).toBe('group_content');
      expect(fd.groups[0].formatType).toBe('tabs');
      expect(fd.groups[0].formatSettings).toEqual({ direction: 'horizontal' });
      expect(fd.groups[0].children).toContain('group_main');

      expect(fd.groups[1].name).toBe('group_main');
      expect(fd.groups[1].parentName).toBe('group_content');
      expect(fd.groups[1].children).toContain('field_n_body');

      // Fields
      expect(fd.fields).toHaveLength(1);
      expect(fd.fields[0].name).toBe('field_n_body');
      expect(fd.fields[0].type).toBe('text_textarea');
      expect(fd.fields[0].weight).toBe(2);

      // Hidden
      expect(fd.hidden).toEqual(['promote']);
    });

    test('returns errors for invalid rows', () => {
      const sheets = {
        'Form Display': [
          {
            'Entity Type': '', 'Bundle': 'article',
            'Item Name': 'field_n_body', 'Item Type': 'field'
          },
          {
            'Entity Type': 'node', 'Bundle': 'article',
            'Item Name': 'field_n_body', 'Item Type': 'invalid'
          }
        ]
      };

      const { errors } = parseFormDisplaySheet(sheets);
      expect(errors).toHaveLength(2);
      expect(errors[0]).toContain('missing Entity Type');
      expect(errors[1]).toContain('invalid Item Type');
    });

    test('handles empty Form Display sheet', () => {
      const { formDisplays, errors } = parseFormDisplaySheet({});
      expect(errors).toHaveLength(0);
      expect(Object.keys(formDisplays)).toHaveLength(0);
    });

    test('handles multiple bundles in same sheet', () => {
      const sheets = {
        'Form Display': [
          {
            'Entity Type': 'node', 'Bundle': 'article',
            'Item Name': 'field_n_body', 'Item Type': 'field',
            'Weight': '0', 'Widget/Format Type': 'text_textarea'
          },
          {
            'Entity Type': 'node', 'Bundle': 'page',
            'Item Name': 'field_n_title', 'Item Type': 'field',
            'Weight': '0', 'Widget/Format Type': 'string_textfield'
          }
        ]
      };

      const { formDisplays, errors } = parseFormDisplaySheet(sheets);
      expect(errors).toHaveLength(0);
      expect(Object.keys(formDisplays)).toHaveLength(2);
      expect(formDisplays['node:article']).toBeDefined();
      expect(formDisplays['node:page']).toBeDefined();
    });
  });
});

describe('Phase 2: Components & Props/Slots Sheets', () => {
  describe('generateSpreadsheetData with components', () => {
    test('generates component items from pre-loaded data', () => {
      const project = {
        entities: { node: {}, media: {}, paragraph: {}, taxonomy_term: {}, block_content: {} }
      };

      const options = {
        components: {
          'card': {
            name: 'Card',
            machine_name: 'card',
            description: 'A card component',
            status: 'stable',
            replaces: null,
            props: {
              type: 'object',
              properties: {
                title: { type: 'string', title: 'Title', description: 'Card title' },
                variant: {
                  type: 'string',
                  title: 'Variant',
                  enum: ['default', 'large', 'small'],
                  default: 'default'
                }
              },
              required: ['title']
            },
            slots: {
              content: { title: 'Content', description: 'Main content area' }
            }
          }
        }
      };

      const data = generateSpreadsheetData(project, options);

      // Components sheet
      expect(data.componentItems).toHaveLength(1);
      expect(data.componentItems[0]['Machine Name']).toBe('card');
      expect(data.componentItems[0]['Name']).toBe('Card');
      expect(data.componentItems[0]['Status']).toBe('stable');

      // Props & Slots sheet
      expect(data.componentPropsSlots).toHaveLength(3); // 2 props + 1 slot

      const props = data.componentPropsSlots.filter(i => i['Type'] === 'prop');
      expect(props).toHaveLength(2);

      const titleProp = props.find(p => p['Machine Name'] === 'title');
      expect(titleProp['Data Type']).toBe('string');
      expect(titleProp['Required']).toBe('Yes');

      const variantProp = props.find(p => p['Machine Name'] === 'variant');
      expect(variantProp['Default']).toBe('default');
      expect(variantProp['Enum Values']).toBe('default, large, small');

      const slots = data.componentPropsSlots.filter(i => i['Type'] === 'slot');
      expect(slots).toHaveLength(1);
      expect(slots[0]['Machine Name']).toBe('content');
      expect(slots[0]['Title']).toBe('Content');
    });

    test('generates empty component data when no components provided', () => {
      const project = {
        entities: { node: {}, media: {}, paragraph: {}, taxonomy_term: {}, block_content: {} }
      };

      const data = generateSpreadsheetData(project);
      expect(data.componentItems).toHaveLength(0);
      expect(data.componentPropsSlots).toHaveLength(0);
    });

    test('handles component without props or slots', () => {
      const project = {
        entities: { node: {}, media: {}, paragraph: {}, taxonomy_term: {}, block_content: {} }
      };

      const options = {
        components: {
          'separator': {
            name: 'Separator',
            machine_name: 'separator',
            description: 'A horizontal line',
            status: 'stable'
          }
        }
      };

      const data = generateSpreadsheetData(project, options);
      expect(data.componentItems).toHaveLength(1);
      expect(data.componentPropsSlots).toHaveLength(0);
    });
  });
});

describe('Phase 2: Form Display Roundtrip', () => {
  test('form display data survives generate → parse roundtrip', () => {
    const project = {
      entities: {
        node: {
          article: {
            id: 'article',
            label: 'Article',
            fields: { field_n_body: { type: 'text_long', label: 'Body' } }
          }
        },
        media: {}, paragraph: {}, taxonomy_term: {}, block_content: {}
      }
    };

    const options = {
      formDisplays: {
        'node:article': {
          entityType: 'node',
          bundle: 'article',
          groups: [
            {
              name: 'group_tabs',
              label: 'Tabs',
              parentName: '',
              weight: 0,
              formatType: 'tabs',
              formatSettings: { direction: 'horizontal' },
              children: ['group_main', 'group_sidebar']
            },
            {
              name: 'group_main',
              label: 'Main',
              parentName: 'group_tabs',
              weight: 1,
              formatType: 'tab',
              formatSettings: { formatter: 'closed' },
              children: ['field_n_body']
            },
            {
              name: 'group_sidebar',
              label: 'Sidebar',
              parentName: 'group_tabs',
              weight: 2,
              formatType: 'tab',
              formatSettings: { formatter: 'closed' },
              children: []
            }
          ],
          fields: [
            { name: 'field_n_body', type: 'text_textarea', weight: 3, settings: {} }
          ],
          hidden: ['promote', 'sticky']
        }
      }
    };

    // Generate
    const data = generateSpreadsheetData(project, options);

    // Parse back
    const sheets = { 'Form Display': data.formDisplayItems };
    const { formDisplays, errors } = parseFormDisplaySheet(sheets);

    expect(errors).toHaveLength(0);

    const fd = formDisplays['node:article'];
    expect(fd).toBeDefined();

    // Groups roundtrip
    expect(fd.groups).toHaveLength(3);
    const tabsGroup = fd.groups.find(g => g.name === 'group_tabs');
    expect(tabsGroup.formatType).toBe('tabs');
    expect(tabsGroup.formatSettings.direction).toBe('horizontal');
    expect(tabsGroup.children).toContain('group_main');
    expect(tabsGroup.children).toContain('group_sidebar');

    const mainGroup = fd.groups.find(g => g.name === 'group_main');
    expect(mainGroup.parentName).toBe('group_tabs');
    expect(mainGroup.children).toContain('field_n_body');

    // Fields roundtrip
    expect(fd.fields).toHaveLength(1);
    expect(fd.fields[0].name).toBe('field_n_body');
    expect(fd.fields[0].type).toBe('text_textarea');

    // Hidden roundtrip
    expect(fd.hidden).toEqual(['promote', 'sticky']);
  });
});
