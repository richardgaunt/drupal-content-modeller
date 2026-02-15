/**
 * Story Generator Tests
 */

import {
  generateStoryTitle,
  generateUserStory,
  generateFieldsTable,
  generatePermissionsTable,
  generateFullStory,
  createEmptyStory,
  updateStoryTimestamp,
  getEntityTypeLabel,
  getEntityOverviewPage
} from '../src/generators/storyGenerator.js';

describe('Story Generator', () => {
  describe('getEntityTypeLabel', () => {
    test('returns correct label for node', () => {
      expect(getEntityTypeLabel('node')).toBe('content type');
    });

    test('returns correct label for media', () => {
      expect(getEntityTypeLabel('media')).toBe('media type');
    });

    test('returns correct label for paragraph', () => {
      expect(getEntityTypeLabel('paragraph')).toBe('paragraph type');
    });

    test('returns correct label for taxonomy_term', () => {
      expect(getEntityTypeLabel('taxonomy_term')).toBe('vocabulary');
    });

    test('returns entity type for unknown', () => {
      expect(getEntityTypeLabel('unknown')).toBe('unknown');
    });
  });

  describe('getEntityOverviewPage', () => {
    test('returns correct path for node', () => {
      expect(getEntityOverviewPage('node')).toBe('Admin > Structure > Content types');
    });

    test('returns correct path for media', () => {
      expect(getEntityOverviewPage('media')).toBe('Admin > Structure > Media types');
    });
  });

  describe('generateStoryTitle', () => {
    test('generates correct title for node', () => {
      expect(generateStoryTitle('Article', 'node')).toBe('Create Article content type');
    });

    test('generates correct title for media', () => {
      expect(generateStoryTitle('Image', 'media')).toBe('Create Image media type');
    });

    test('generates correct title for paragraph', () => {
      expect(generateStoryTitle('Hero', 'paragraph')).toBe('Create Hero paragraph type');
    });
  });

  describe('generateUserStory', () => {
    test('generates user story with purpose', () => {
      const result = generateUserStory('Article', 'node', 'publish blog posts');
      expect(result).toContain('As a Site Owner');
      expect(result).toContain('content type called `Article`');
      expect(result).toContain('So that I can publish blog posts');
    });

    test('generates user story without purpose', () => {
      const result = generateUserStory('Article', 'node', '');
      expect(result).toContain('[describe the purpose]');
    });
  });

  describe('generateFieldsTable', () => {
    test('returns message when no fields', () => {
      expect(generateFieldsTable([])).toBe('_No fields defined_\n');
      expect(generateFieldsTable(null)).toBe('_No fields defined_\n');
    });

    test('generates table with fields', () => {
      const fields = [
        {
          label: 'Title',
          name: 'field_n_title',
          type: 'string',
          description: 'The title',
          cardinality: 1,
          required: true,
          settings: { max_length: 255 }
        },
        {
          label: 'Body',
          name: 'field_n_body',
          type: 'text_long',
          description: '',
          cardinality: 1,
          required: false,
          settings: {}
        }
      ];

      const result = generateFieldsTable(fields);
      expect(result).toContain('| Field Name |');
      expect(result).toContain('| Title |');
      expect(result).toContain('| `field_n_title` |');
      expect(result).toContain('| string |');
      expect(result).toContain('| Yes |');
      expect(result).toContain('| Body |');
      expect(result).toContain('| No |');
    });

    test('handles unlimited cardinality', () => {
      const fields = [
        {
          label: 'Images',
          name: 'field_n_images',
          type: 'image',
          cardinality: -1,
          required: false
        }
      ];

      const result = generateFieldsTable(fields);
      expect(result).toContain('| Unlimited |');
    });
  });

  describe('generatePermissionsTable', () => {
    test('returns message when no permissions', () => {
      expect(generatePermissionsTable({})).toBe('_No permissions defined_\n');
      expect(generatePermissionsTable(null)).toBe('_No permissions defined_\n');
    });

    test('generates table with permissions', () => {
      const permissions = {
        editor: { create: true, edit_own: true, edit_any: false, delete_own: true, delete_any: false },
        admin: { create: true, edit_own: true, edit_any: true, delete_own: true, delete_any: true }
      };

      const roleLabels = {
        editor: 'Content Editor',
        admin: 'Administrator'
      };

      const result = generatePermissionsTable(permissions, roleLabels);
      expect(result).toContain('| Permission |');
      expect(result).toContain('**Content Editor**');
      expect(result).toContain('**Administrator**');
      expect(result).toContain('| **Create new content** |');
      expect(result).toContain('| Yes |');
      expect(result).toContain('| No |');
    });
  });

  describe('createEmptyStory', () => {
    test('creates story with correct structure', () => {
      const story = createEmptyStory('node', 'Article', 'article');

      expect(story.version).toBe(1);
      expect(story.status).toBe('draft');
      expect(story.entityType).toBe('node');
      expect(story.bundle.label).toBe('Article');
      expect(story.bundle.machineName).toBe('article');
      expect(story.bundle.description).toBe('');
      expect(story.purpose).toBe('');
      expect(story.fields).toEqual([]);
      expect(story.permissions).toEqual({});
      expect(story.exports).toEqual([]);
      expect(story.createdAt).toBeDefined();
      expect(story.updatedAt).toBeDefined();
    });
  });

  describe('updateStoryTimestamp', () => {
    test('updates the timestamp', () => {
      const original = createEmptyStory('node', 'Test', 'test');
      const originalTimestamp = original.updatedAt;

      // Wait a tiny bit to ensure different timestamp
      const updated = updateStoryTimestamp(original);

      expect(updated.updatedAt).toBeDefined();
      expect(updated.bundle).toEqual(original.bundle);
    });
  });

  describe('generateFullStory', () => {
    test('generates complete story markdown', () => {
      const story = {
        entityType: 'node',
        bundle: {
          label: 'Article',
          machineName: 'article',
          description: 'An article content type'
        },
        purpose: 'publish news and blog posts',
        fields: [
          {
            label: 'Subtitle',
            name: 'field_n_subtitle',
            type: 'string',
            description: 'A subtitle',
            cardinality: 1,
            required: false,
            settings: { max_length: 255 }
          }
        ],
        permissions: {
          editor: { create: true, edit_own: true, edit_any: false }
        },
        roleLabels: {
          editor: 'Editor'
        }
      };

      const result = generateFullStory(story);

      expect(result).toContain('# Create Article content type');
      expect(result).toContain('## User Story');
      expect(result).toContain('publish news and blog posts');
      expect(result).toContain('## Acceptance Criteria');
      expect(result).toContain('**AC 1 -');
      expect(result).toContain('**AC 2 -');
      expect(result).toContain('**AC 3 -');
      expect(result).toContain('| Subtitle |');
      expect(result).toContain('**Editor**');
    });

    test('handles story without permissions', () => {
      const story = {
        entityType: 'paragraph',
        bundle: {
          label: 'Hero',
          machineName: 'hero',
          description: ''
        },
        purpose: 'create hero banners',
        fields: [],
        permissions: {}
      };

      const result = generateFullStory(story);

      expect(result).toContain('# Create Hero paragraph type');
      expect(result).not.toContain('**AC 3 -');
    });
  });
});
