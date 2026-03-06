import {
  getEntityAdminPath,
  getFieldAdminPath,
  formatCardinality,
  getFieldOtherInfo,
  getEntityTypeLabel,
  generateAnchor,
  generateBundleReport,
  generateSingleBundleReport,
  generateEntityTypeReport,
  generateProjectReport,
  generateBundleReportData,
  generateEntityTypeReportData,
  generateProjectReportData,
  generateBundlePermissionsTable,
  generateBundlePermissionsData
} from '../src/generators/reportGenerator.js';

describe('Report Generator', () => {
  describe('getEntityAdminPath', () => {
    test('returns correct path for node', () => {
      expect(getEntityAdminPath('node', 'page')).toBe('/admin/structure/types/manage/page/fields');
    });

    test('returns correct path for paragraph', () => {
      expect(getEntityAdminPath('paragraph', 'accordion')).toBe('/admin/structure/paragraphs_type/accordion');
    });

    test('returns correct path for taxonomy_term', () => {
      expect(getEntityAdminPath('taxonomy_term', 'tags')).toBe('/admin/structure/taxonomy/manage/tags');
    });

    test('returns correct path for block_content', () => {
      expect(getEntityAdminPath('block_content', 'banner')).toBe('/admin/structure/block-content/manage/banner');
    });

    test('returns correct path for media', () => {
      expect(getEntityAdminPath('media', 'image')).toBe('/admin/structure/media/manage/image');
    });

    test('returns empty string for unknown entity type', () => {
      expect(getEntityAdminPath('unknown', 'test')).toBe('');
    });
  });

  describe('getFieldAdminPath', () => {
    test('returns correct path', () => {
      expect(getFieldAdminPath('node', 'page', 'field_title'))
        .toBe('/admin/structure/types/manage/page/fields/node.page.field_title');
    });
  });

  describe('formatCardinality', () => {
    test('returns "Unlimited" for -1', () => {
      expect(formatCardinality(-1)).toBe('Unlimited');
    });

    test('returns "Single" for 1', () => {
      expect(formatCardinality(1)).toBe('Single');
    });

    test('returns number as string for other values', () => {
      expect(formatCardinality(5)).toBe('5');
    });
  });

  describe('getFieldOtherInfo', () => {
    test('returns target bundles with entity type for entity_reference', () => {
      const field = {
        type: 'entity_reference',
        settings: {
          handler: 'default:node',
          handler_settings: {
            target_bundles: { page: 'page', article: 'article' }
          }
        }
      };
      expect(getFieldOtherInfo(field)).toBe('References: page(node), article(node)');
    });

    test('returns target bundles with taxonomy entity type', () => {
      const field = {
        type: 'entity_reference',
        settings: {
          handler: 'default:taxonomy_term',
          handler_settings: {
            target_bundles: { tags: 'tags' }
          }
        }
      };
      expect(getFieldOtherInfo(field)).toBe('References: tags(taxonomy_term)');
    });

    test('defaults to node when handler is missing for entity_reference', () => {
      const field = {
        type: 'entity_reference',
        settings: {
          handler_settings: {
            target_bundles: { page: 'page' }
          }
        }
      };
      expect(getFieldOtherInfo(field)).toBe('References: page(node)');
    });

    test('returns paragraph entity type for entity_reference_revisions', () => {
      const field = {
        type: 'entity_reference_revisions',
        settings: {
          handler_settings: {
            target_bundles: { hero: 'hero', card: 'card' }
          }
        }
      };
      expect(getFieldOtherInfo(field)).toBe('References: hero(paragraph), card(paragraph)');
    });

    test('returns "Date only" for datetime field with date type', () => {
      const field = {
        type: 'datetime',
        settings: { datetime_type: 'date' }
      };
      expect(getFieldOtherInfo(field)).toBe('Date only');
    });

    test('returns "Date and time" for datetime field with datetime type', () => {
      const field = {
        type: 'datetime',
        settings: { datetime_type: 'datetime' }
      };
      expect(getFieldOtherInfo(field)).toBe('Date and time');
    });

    test('returns "Date only" for daterange field with date type', () => {
      const field = {
        type: 'daterange',
        settings: { datetime_type: 'date' }
      };
      expect(getFieldOtherInfo(field)).toBe('Date only');
    });

    test('returns "Date and time" for daterange field with datetime type', () => {
      const field = {
        type: 'daterange',
        settings: { datetime_type: 'datetime' }
      };
      expect(getFieldOtherInfo(field)).toBe('Date and time');
    });

    test('returns options with key|value pairs for list_string, one per line', () => {
      const field = {
        type: 'list_string',
        settings: {
          allowed_values: [
            { value: 'draft', label: 'Draft' },
            { value: 'published', label: 'Published' },
            { value: 'archived', label: 'Archived' }
          ]
        }
      };
      expect(getFieldOtherInfo(field)).toBe('draft::Draft<br>published::Published<br>archived::Archived');
    });

    test('returns dash for list_string with empty allowed_values', () => {
      const field = {
        type: 'list_string',
        settings: {
          allowed_values: []
        }
      };
      expect(getFieldOtherInfo(field)).toBe('-');
    });

    test('returns max length for string', () => {
      const field = {
        type: 'string',
        settings: { max_length: 100 }
      };
      expect(getFieldOtherInfo(field)).toBe('Max: 100');
    });

    test('returns dash for field with no special info', () => {
      const field = { type: 'boolean' };
      expect(getFieldOtherInfo(field)).toBe('-');
    });
  });

  describe('getEntityTypeLabel', () => {
    test('returns correct label for node', () => {
      expect(getEntityTypeLabel('node')).toBe('Content Types');
    });

    test('returns correct label for media', () => {
      expect(getEntityTypeLabel('media')).toBe('Media Types');
    });

    test('returns correct label for paragraph', () => {
      expect(getEntityTypeLabel('paragraph')).toBe('Paragraph Types');
    });

    test('returns correct label for taxonomy_term', () => {
      expect(getEntityTypeLabel('taxonomy_term')).toBe('Vocabularies');
    });

    test('returns correct label for block_content', () => {
      expect(getEntityTypeLabel('block_content')).toBe('Block Types');
    });

    test('returns entity type for unknown', () => {
      expect(getEntityTypeLabel('unknown')).toBe('unknown');
    });
  });

  describe('generateAnchor', () => {
    test('creates valid anchor from label', () => {
      expect(generateAnchor('My Page', 'node')).toBe('my-page-node');
    });

    test('handles special characters', () => {
      expect(generateAnchor('Test (Special)', 'paragraph')).toBe('test-special-paragraph');
    });

    test('removes leading/trailing hyphens', () => {
      expect(generateAnchor('  Spaces  ', 'node')).toBe('spaces-node');
    });
  });

  describe('generateBundleReport', () => {
    const bundle = {
      id: 'page',
      label: 'Page',
      description: 'A basic page',
      fields: {
        field_title: {
          name: 'field_title',
          label: 'Title',
          type: 'string',
          required: true,
          cardinality: 1
        },
        field_body: {
          name: 'field_body',
          label: 'Body',
          type: 'text_long',
          required: false,
          cardinality: 1
        }
      }
    };

    test('includes bundle label and entity type', () => {
      const result = generateBundleReport(bundle, 'node');
      expect(result).toContain('### Page (node)');
    });

    test('includes admin link', () => {
      const result = generateBundleReport(bundle, 'node');
      expect(result).toContain('/admin/structure/types/manage/page/fields');
    });

    test('includes description', () => {
      const result = generateBundleReport(bundle, 'node');
      expect(result).toContain('A basic page');
    });

    test('includes fields table', () => {
      const result = generateBundleReport(bundle, 'node');
      expect(result).toContain('| Title |');
      expect(result).toContain('| Body |');
      expect(result).toContain('`field_title`');
    });

    test('uses base URL when provided', () => {
      const result = generateBundleReport(bundle, 'node', 'https://example.com');
      expect(result).toContain('https://example.com/admin/structure/types/manage/page/fields');
    });

    test('shows "No custom fields" for empty bundle', () => {
      const emptyBundle = { id: 'empty', label: 'Empty', fields: {} };
      const result = generateBundleReport(emptyBundle, 'node');
      expect(result).toContain('_No custom fields_');
    });

    test('includes base fields section for node', () => {
      const result = generateBundleReport(bundle, 'node');
      expect(result).toContain('#### Base Fields');
      expect(result).toContain('| Title |');
      expect(result).toContain('`title`');
      expect(result).toContain('| Published |');
      expect(result).toContain('`status`');
    });

    test('includes base fields section for taxonomy_term', () => {
      const taxBundle = { id: 'tags', label: 'Tags', fields: {} };
      const result = generateBundleReport(taxBundle, 'taxonomy_term');
      expect(result).toContain('#### Base Fields');
      expect(result).toContain('| Name |');
      expect(result).toContain('`name`');
      expect(result).toContain('| Description |');
    });

    test('uses base field override label when available', () => {
      const options = {
        baseFieldOverrides: {
          title: { label: 'Custom Title Label', fieldName: 'title' }
        }
      };
      const result = generateBundleReport(bundle, 'node', '', options);
      expect(result).toContain('| Custom Title Label |');
    });
  });

  describe('generateSingleBundleReport', () => {
    const project = {
      name: 'Test Project',
      entities: {
        node: {
          page: {
            id: 'page',
            label: 'Page',
            description: 'A basic page',
            fields: {
              field_body: {
                name: 'field_body',
                label: 'Body',
                type: 'text_long',
                required: false,
                cardinality: 1
              }
            }
          },
          article: { id: 'article', label: 'Article', fields: {} }
        }
      }
    };

    test('includes project name and entity type', () => {
      const result = generateSingleBundleReport(project, 'node', 'page');
      expect(result).toContain('# Page (node)');
      expect(result).toContain('**Project:** Test Project');
      expect(result).toContain('**Entity Type:** Content Types');
    });

    test('includes bundle content', () => {
      const result = generateSingleBundleReport(project, 'node', 'page');
      expect(result).toContain('A basic page');
      expect(result).toContain('| Body |');
      expect(result).toContain('`field_body`');
    });

    test('includes base fields section', () => {
      const result = generateSingleBundleReport(project, 'node', 'page');
      expect(result).toContain('#### Base Fields');
      expect(result).toContain('| Title |');
      expect(result).toContain('`title`');
    });

    test('returns null for non-existent bundle', () => {
      const result = generateSingleBundleReport(project, 'node', 'nonexistent');
      expect(result).toBeNull();
    });

    test('returns null for non-existent entity type', () => {
      const result = generateSingleBundleReport(project, 'media', 'page');
      expect(result).toBeNull();
    });

    test('uses base URL when provided', () => {
      const result = generateSingleBundleReport(project, 'node', 'page', 'https://example.com');
      expect(result).toContain('https://example.com/admin/structure/types/manage/page/fields');
    });
  });

  describe('generateEntityTypeReport', () => {
    const project = {
      name: 'Test Project',
      entities: {
        node: {
          page: { id: 'page', label: 'Page', fields: {} },
          article: { id: 'article', label: 'Article', fields: {} }
        }
      }
    };

    test('includes entity type label', () => {
      const result = generateEntityTypeReport(project, 'node');
      expect(result).toContain('# Content Types Report');
    });

    test('includes project name', () => {
      const result = generateEntityTypeReport(project, 'node');
      expect(result).toContain('Test Project');
    });

    test('includes all bundles', () => {
      const result = generateEntityTypeReport(project, 'node');
      expect(result).toContain('### Page (node)');
      expect(result).toContain('### Article (node)');
    });

    test('shows message for empty entity type', () => {
      const result = generateEntityTypeReport(project, 'media');
      expect(result).toContain('_No media types found._');
    });
  });

  describe('generateProjectReport', () => {
    const project = {
      name: 'Test Project',
      baseUrl: 'https://example.com',
      entities: {
        node: {
          page: { id: 'page', label: 'Page', fields: {} }
        },
        media: {
          image: { id: 'image', label: 'Image', fields: {} }
        },
        paragraph: {},
        taxonomy_term: {},
        block_content: {}
      }
    };

    test('includes project name', () => {
      const result = generateProjectReport(project);
      expect(result).toContain('# Project: Test Project');
    });

    test('includes project URL', () => {
      const result = generateProjectReport(project);
      expect(result).toContain('https://example.com');
    });

    test('includes table of contents', () => {
      const result = generateProjectReport(project);
      expect(result).toContain('## Table of Contents');
      expect(result).toContain('- [Page](#page-node)');
      expect(result).toContain('- [Image](#image-media)');
    });

    test('includes entity type sections', () => {
      const result = generateProjectReport(project);
      expect(result).toContain('## Content Types');
      expect(result).toContain('## Media Types');
    });

    test('uses custom base URL when provided', () => {
      const result = generateProjectReport(project, 'https://custom.com');
      expect(result).toContain('https://custom.com');
    });

    test('shows "Not set" when no URL', () => {
      const noUrlProject = { ...project, baseUrl: undefined };
      const result = generateProjectReport(noUrlProject);
      expect(result).toContain('_Not set_');
    });
  });

  describe('generateBundleReportData', () => {
    const bundle = {
      id: 'page',
      label: 'Page',
      description: 'A basic page',
      fields: {
        field_title: {
          name: 'field_title',
          label: 'Title',
          type: 'string',
          required: true,
          cardinality: 1,
          settings: { max_length: 255 }
        },
        field_body: {
          name: 'field_body',
          label: 'Body',
          type: 'text_long',
          required: false,
          cardinality: 1
        }
      }
    };

    test('returns correct object shape', () => {
      const result = generateBundleReportData(bundle, 'node');
      expect(result).toHaveProperty('entityType', 'node');
      expect(result).toHaveProperty('bundle', 'page');
      expect(result).toHaveProperty('label', 'Page');
      expect(result).toHaveProperty('description', 'A basic page');
      expect(result).toHaveProperty('adminLinks');
      expect(result).toHaveProperty('baseFields');
      expect(result).toHaveProperty('fields');
    });

    test('maps fields correctly', () => {
      const result = generateBundleReportData(bundle, 'node');
      const titleField = result.fields.find(f => f.name === 'field_title');
      expect(titleField).toEqual({
        name: 'field_title',
        label: 'Title',
        type: 'string',
        description: '',
        cardinality: 1,
        required: true,
        other: 'Max: 255',
        settings: { max_length: 255 }
      });
    });

    test('sorts fields alphabetically by label', () => {
      const result = generateBundleReportData(bundle, 'node');
      const labels = result.fields.map(f => f.label);
      expect(labels).toEqual(['Body', 'Title']);
    });

    test('includes admin links without baseUrl', () => {
      const result = generateBundleReportData(bundle, 'node');
      expect(result.adminLinks.length).toBeGreaterThan(0);
      expect(result.adminLinks[0]).toHaveProperty('name');
      expect(result.adminLinks[0]).toHaveProperty('url');
      expect(result.adminLinks[0].url).toMatch(/^\/admin\//);
    });

    test('includes admin links with baseUrl', () => {
      const result = generateBundleReportData(bundle, 'node', 'https://example.com');
      expect(result.adminLinks[0].url).toMatch(/^https:\/\/example\.com\/admin\//);
    });

    test('returns cardinality from field', () => {
      const unlimitedBundle = {
        id: 'test',
        label: 'Test',
        fields: {
          field_images: {
            name: 'field_images',
            label: 'Images',
            type: 'image',
            cardinality: -1
          }
        }
      };
      const result = generateBundleReportData(unlimitedBundle, 'node');
      expect(result.fields[0].cardinality).toBe(-1);
    });

    test('sets other to null for fields with no extra info', () => {
      const result = generateBundleReportData(bundle, 'node');
      const bodyField = result.fields.find(f => f.name === 'field_body');
      expect(bodyField.other).toBeNull();
      expect(bodyField.settings).toEqual({});
    });

    test('sets other to string for fields with extra info', () => {
      const refBundle = {
        id: 'test',
        label: 'Test',
        fields: {
          field_ref: {
            name: 'field_ref',
            label: 'Reference',
            type: 'entity_reference',
            settings: {
              handler: 'default:node',
              handler_settings: { target_bundles: { page: 'page' } }
            }
          }
        }
      };
      const result = generateBundleReportData(refBundle, 'node');
      expect(result.fields[0].other).toBe('References: page(node)');
      expect(result.fields[0].settings).toEqual({
        handler: 'default:node',
        handler_settings: { target_bundles: { page: 'page' } }
      });
    });

    test('includes base fields for node', () => {
      const result = generateBundleReportData(bundle, 'node');
      expect(result.baseFields.length).toBeGreaterThan(0);
      const titleBase = result.baseFields.find(f => f.name === 'title');
      expect(titleBase).toEqual({
        name: 'title',
        label: 'Title',
        type: 'string',
        widget: 'string_textfield'
      });
    });

    test('applies base field overrides', () => {
      const options = {
        baseFieldOverrides: {
          title: { label: 'Custom Title' }
        }
      };
      const result = generateBundleReportData(bundle, 'node', '', options);
      const titleBase = result.baseFields.find(f => f.name === 'title');
      expect(titleBase.label).toBe('Custom Title');
    });

    test('returns empty fields array for bundle with no fields', () => {
      const emptyBundle = { id: 'empty', label: 'Empty', fields: {} };
      const result = generateBundleReportData(emptyBundle, 'node');
      expect(result.fields).toEqual([]);
    });

    test('uses bundle id as label when label is missing', () => {
      const noLabelBundle = { id: 'no_label', fields: {} };
      const result = generateBundleReportData(noLabelBundle, 'node');
      expect(result.label).toBe('no_label');
    });
  });

  describe('generateEntityTypeReportData', () => {
    const project = {
      name: 'Test Project',
      entities: {
        node: {
          page: { id: 'page', label: 'Page', fields: {} },
          article: { id: 'article', label: 'Article', fields: {} }
        }
      }
    };

    test('returns correct entity type and label', () => {
      const result = generateEntityTypeReportData(project, 'node');
      expect(result.entityType).toBe('node');
      expect(result.label).toBe('Content Types');
    });

    test('sorts bundles alphabetically by label', () => {
      const result = generateEntityTypeReportData(project, 'node');
      const labels = result.bundles.map(b => b.label);
      expect(labels).toEqual(['Article', 'Page']);
    });

    test('returns empty bundles array for empty entity type', () => {
      const result = generateEntityTypeReportData(project, 'media');
      expect(result.bundles).toEqual([]);
      expect(result.label).toBe('Media Types');
    });
  });

  describe('generateProjectReportData', () => {
    const project = {
      name: 'Test Project',
      baseUrl: 'https://example.com',
      entities: {
        node: {
          page: { id: 'page', label: 'Page', fields: {} }
        },
        media: {
          image: { id: 'image', label: 'Image', fields: {} }
        },
        paragraph: {},
        taxonomy_term: {},
        block_content: {}
      }
    };

    test('includes project name', () => {
      const result = generateProjectReportData(project);
      expect(result.project).toBe('Test Project');
    });

    test('uses project baseUrl when no override', () => {
      const result = generateProjectReportData(project);
      expect(result.baseUrl).toBe('https://example.com');
    });

    test('uses override baseUrl when provided', () => {
      const result = generateProjectReportData(project, 'https://custom.com');
      expect(result.baseUrl).toBe('https://custom.com');
    });

    test('sets baseUrl to null when none available', () => {
      const noUrlProject = { ...project, baseUrl: undefined };
      const result = generateProjectReportData(noUrlProject);
      expect(result.baseUrl).toBeNull();
    });

    test('includes only entity types with bundles', () => {
      const result = generateProjectReportData(project);
      const types = result.entityTypes.map(et => et.entityType);
      expect(types).toEqual(['node', 'media']);
    });

    test('orders entity types per ENTITY_ORDER', () => {
      const fullProject = {
        name: 'Full',
        entities: {
          node: { page: { id: 'page', label: 'Page', fields: {} } },
          media: { image: { id: 'image', label: 'Image', fields: {} } },
          paragraph: { hero: { id: 'hero', label: 'Hero', fields: {} } },
          taxonomy_term: { tags: { id: 'tags', label: 'Tags', fields: {} } },
          block_content: { banner: { id: 'banner', label: 'Banner', fields: {} } }
        }
      };
      const result = generateProjectReportData(fullProject);
      const types = result.entityTypes.map(et => et.entityType);
      expect(types).toEqual(['node', 'media', 'paragraph', 'taxonomy_term', 'block_content']);
    });

    test('threads roles through to bundle data', () => {
      const roles = [
        { id: 'editor', label: 'Editor', isAdmin: false, permissions: ['create page content'] }
      ];
      const result = generateProjectReportData(project, '', { roles });
      const nodeType = result.entityTypes.find(et => et.entityType === 'node');
      const pageBundle = nodeType.bundles.find(b => b.bundle === 'page');
      expect(pageBundle.permissions).toBeDefined();
      expect(pageBundle.permissions.length).toBe(1);
      expect(pageBundle.permissions[0].role).toBe('editor');
    });
  });

  // ============================================
  // Permissions Tests
  // ============================================

  describe('generateBundlePermissionsTable', () => {
    const mockRoles = [
      {
        id: 'anonymous',
        label: 'Anonymous',
        isAdmin: false,
        permissions: []
      },
      {
        id: 'authenticated',
        label: 'Authenticated',
        isAdmin: false,
        permissions: ['create page content']
      },
      {
        id: 'editor',
        label: 'Editor',
        isAdmin: false,
        permissions: [
          'create page content',
          'edit own page content',
          'edit any page content',
          'delete own page content'
        ]
      },
      {
        id: 'administrator',
        label: 'Administrator',
        isAdmin: true,
        permissions: []
      }
    ];

    test('generates correct column headers for node', () => {
      const result = generateBundlePermissionsTable(mockRoles, 'node', 'page');
      expect(result).toContain('| Role | Create new content | Edit own content | Edit any content | Delete own content | Delete any content | View revisions | Revert revisions | Delete revisions |');
    });

    test('generates correct column headers for taxonomy_term', () => {
      const taxRoles = [{ id: 'editor', label: 'Editor', isAdmin: false, permissions: [] }];
      const result = generateBundlePermissionsTable(taxRoles, 'taxonomy_term', 'tags');
      expect(result).toContain('| Role | Create terms | Edit terms | Delete terms | View term revisions | Revert term revisions | Delete term revisions |');
    });

    test('admin role shows Yes for all permissions', () => {
      const result = generateBundlePermissionsTable(mockRoles, 'node', 'page');
      const adminRow = result.split('\n').find(line => line.includes('Administrator'));
      const cells = adminRow.split('|').map(c => c.trim()).filter(Boolean);
      // All cells after "Administrator" should be "Yes"
      const permCells = cells.slice(1);
      expect(permCells.every(c => c === 'Yes')).toBe(true);
    });

    test('anonymous with no permissions shows all No', () => {
      const result = generateBundlePermissionsTable(mockRoles, 'node', 'page');
      const anonRow = result.split('\n').find(line => line.includes('Anonymous'));
      const cells = anonRow.split('|').map(c => c.trim()).filter(Boolean);
      const permCells = cells.slice(1);
      expect(permCells.every(c => c === 'No')).toBe(true);
    });

    test('editor shows correct Yes/No mapping', () => {
      const result = generateBundlePermissionsTable(mockRoles, 'node', 'page');
      const editorRow = result.split('\n').find(line => line.includes('Editor'));
      const cells = editorRow.split('|').map(c => c.trim()).filter(Boolean);
      // Editor has: create, edit_own, edit_any, delete_own — Yes for first 4, No for rest
      expect(cells[1]).toBe('Yes'); // Create
      expect(cells[2]).toBe('Yes'); // Edit own
      expect(cells[3]).toBe('Yes'); // Edit any
      expect(cells[4]).toBe('Yes'); // Delete own
      expect(cells[5]).toBe('No');  // Delete any
      expect(cells[6]).toBe('No');  // View revisions
    });

    test('returns empty string for paragraph entity type', () => {
      const result = generateBundlePermissionsTable(mockRoles, 'paragraph', 'hero');
      expect(result).toBe('');
    });

    test('returns empty string when roles is empty', () => {
      const result = generateBundlePermissionsTable([], 'node', 'page');
      expect(result).toBe('');
    });

    test('returns empty string when roles is null', () => {
      const result = generateBundlePermissionsTable(null, 'node', 'page');
      expect(result).toBe('');
    });

    test('includes Permissions heading', () => {
      const result = generateBundlePermissionsTable(mockRoles, 'node', 'page');
      expect(result).toContain('#### Permissions');
    });
  });

  describe('generateBundlePermissionsData', () => {
    const mockRoles = [
      {
        id: 'anonymous',
        label: 'Anonymous',
        isAdmin: false,
        permissions: []
      },
      {
        id: 'editor',
        label: 'Editor',
        isAdmin: false,
        permissions: [
          'create page content',
          'edit own page content',
          'edit any page content'
        ]
      },
      {
        id: 'administrator',
        label: 'Administrator',
        isAdmin: true,
        permissions: []
      }
    ];

    test('returns correct structure for each role', () => {
      const result = generateBundlePermissionsData(mockRoles, 'node', 'page');
      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        role: 'anonymous',
        label: 'Anonymous',
        isAdmin: false,
        permissions: []
      });
    });

    test('admin role gets all permissions', () => {
      const result = generateBundlePermissionsData(mockRoles, 'node', 'page');
      const admin = result.find(r => r.role === 'administrator');
      expect(admin.isAdmin).toBe(true);
      expect(admin.permissions).toHaveLength(8); // node has 8 permissions
      expect(admin.permissions).toContain('create page content');
      expect(admin.permissions).toContain('delete page revisions');
    });

    test('non-admin gets only matching permissions', () => {
      const result = generateBundlePermissionsData(mockRoles, 'node', 'page');
      const editor = result.find(r => r.role === 'editor');
      expect(editor.permissions).toHaveLength(3);
      expect(editor.permissions).toContain('create page content');
      expect(editor.permissions).toContain('edit own page content');
      expect(editor.permissions).toContain('edit any page content');
    });

    test('returns empty array for paragraph entity type', () => {
      const result = generateBundlePermissionsData(mockRoles, 'paragraph', 'hero');
      expect(result).toEqual([]);
    });

    test('returns empty array when roles is empty', () => {
      const result = generateBundlePermissionsData([], 'node', 'page');
      expect(result).toEqual([]);
    });

    test('returns empty array when roles is null', () => {
      const result = generateBundlePermissionsData(null, 'node', 'page');
      expect(result).toEqual([]);
    });

    test('handles media entity type', () => {
      const roles = [{ id: 'editor', label: 'Editor', isAdmin: false, permissions: ['create image media'] }];
      const result = generateBundlePermissionsData(roles, 'media', 'image');
      expect(result[0].permissions).toEqual(['create image media']);
    });

    test('handles block_content entity type', () => {
      const roles = [{ id: 'editor', label: 'Editor', isAdmin: false, permissions: ['create banner block content'] }];
      const result = generateBundlePermissionsData(roles, 'block_content', 'banner');
      expect(result[0].permissions).toEqual(['create banner block content']);
    });
  });

  describe('generateBundleReport with permissions', () => {
    const bundle = {
      id: 'page',
      label: 'Page',
      description: 'A basic page',
      fields: {
        field_body: {
          name: 'field_body',
          label: 'Body',
          type: 'text_long',
          required: false,
          cardinality: 1
        }
      }
    };

    const roles = [
      { id: 'editor', label: 'Editor', isAdmin: false, permissions: ['create page content'] },
      { id: 'administrator', label: 'Administrator', isAdmin: true, permissions: [] }
    ];

    test('includes permissions section when roles provided', () => {
      const result = generateBundleReport(bundle, 'node', '', { roles });
      expect(result).toContain('#### Permissions');
      expect(result).toContain('| Editor |');
      expect(result).toContain('| Administrator |');
    });

    test('omits permissions section when no roles', () => {
      const result = generateBundleReport(bundle, 'node');
      expect(result).not.toContain('#### Permissions');
    });

    test('omits permissions section for paragraph type', () => {
      const paraBundle = { id: 'hero', label: 'Hero', fields: { field_body: bundle.fields.field_body } };
      const result = generateBundleReport(paraBundle, 'paragraph', '', { roles });
      expect(result).not.toContain('#### Permissions');
    });

    test('includes permissions even when bundle has no custom fields', () => {
      const emptyBundle = { id: 'page', label: 'Page', fields: {} };
      const result = generateBundleReport(emptyBundle, 'node', '', { roles });
      expect(result).toContain('_No custom fields_');
      expect(result).toContain('#### Permissions');
    });
  });

  describe('generateBundleReportData with permissions', () => {
    const bundle = { id: 'page', label: 'Page', fields: {} };
    const roles = [
      { id: 'editor', label: 'Editor', isAdmin: false, permissions: ['create page content'] }
    ];

    test('includes permissions property when roles provided', () => {
      const result = generateBundleReportData(bundle, 'node', '', { roles });
      expect(result.permissions).toBeDefined();
      expect(result.permissions).toHaveLength(1);
      expect(result.permissions[0].role).toBe('editor');
    });

    test('returns empty permissions array when no roles', () => {
      const result = generateBundleReportData(bundle, 'node');
      expect(result.permissions).toEqual([]);
    });

    test('returns empty permissions array for paragraph type', () => {
      const paraBundle = { id: 'hero', label: 'Hero', fields: {} };
      const result = generateBundleReportData(paraBundle, 'paragraph', '', { roles });
      expect(result.permissions).toEqual([]);
    });
  });

  describe('generateEntityTypeReport with permissions', () => {
    const project = {
      name: 'Test Project',
      entities: {
        node: {
          page: { id: 'page', label: 'Page', fields: {} }
        }
      }
    };
    const roles = [
      { id: 'editor', label: 'Editor', isAdmin: false, permissions: ['create page content'] }
    ];

    test('threads roles through to bundle reports', () => {
      const result = generateEntityTypeReport(project, 'node', '', { roles });
      expect(result).toContain('#### Permissions');
      expect(result).toContain('| Editor |');
    });

    test('no permissions section without roles', () => {
      const result = generateEntityTypeReport(project, 'node');
      expect(result).not.toContain('#### Permissions');
    });
  });

  describe('generateEntityTypeReportData with permissions', () => {
    const project = {
      name: 'Test Project',
      entities: {
        node: {
          page: { id: 'page', label: 'Page', fields: {} }
        }
      }
    };
    const roles = [
      { id: 'editor', label: 'Editor', isAdmin: false, permissions: ['create page content'] }
    ];

    test('threads roles through to bundle data', () => {
      const result = generateEntityTypeReportData(project, 'node', '', { roles });
      expect(result.bundles[0].permissions).toHaveLength(1);
      expect(result.bundles[0].permissions[0].role).toBe('editor');
    });
  });

  describe('generateProjectReport with permissions', () => {
    const project = {
      name: 'Test Project',
      baseUrl: 'https://example.com',
      entities: {
        node: {
          page: { id: 'page', label: 'Page', fields: {} }
        },
        media: {},
        paragraph: {},
        taxonomy_term: {},
        block_content: {}
      }
    };
    const roles = [
      { id: 'editor', label: 'Editor', isAdmin: false, permissions: ['create page content'] }
    ];

    test('threads roles through to bundle reports', () => {
      const result = generateProjectReport(project, '', { roles });
      expect(result).toContain('#### Permissions');
      expect(result).toContain('| Editor |');
    });

    test('no permissions section without roles', () => {
      const result = generateProjectReport(project);
      expect(result).not.toContain('#### Permissions');
    });
  });
});
