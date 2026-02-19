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
  generateProjectReport
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

    test('returns number as string for other values', () => {
      expect(formatCardinality(1)).toBe('1');
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
});
