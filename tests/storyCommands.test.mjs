/**
 * Story Commands Tests
 * Tests for pure functions in story.js
 */

import {
  addFieldToStory,
  updateFieldInStory,
  removeFieldFromStory,
  reorderFieldInStory,
  updateStoryBundleInfo,
  updateStoryPurpose,
  updateStoryPermissions,
  getStoriesDir,
  getStoryPath,
  getMarkdownPath
} from '../src/commands/story.js';

describe('Story Commands', () => {
  const baseStory = {
    entityType: 'node',
    bundle: { label: 'Article', machineName: 'article', description: '' },
    purpose: 'publish articles',
    fields: [
      { label: 'Title', name: 'field_n_title', type: 'string' },
      { label: 'Body', name: 'field_n_body', type: 'text_long' }
    ],
    permissions: {},
    roleLabels: {}
  };

  describe('addFieldToStory', () => {
    test('adds field to empty fields array', () => {
      const story = { ...baseStory, fields: [] };
      const field = { label: 'New', name: 'field_n_new', type: 'string' };

      const result = addFieldToStory(story, field);

      expect(result.fields).toHaveLength(1);
      expect(result.fields[0]).toEqual(field);
      expect(result.updatedAt).toBeDefined();
    });

    test('appends field to existing fields', () => {
      const field = { label: 'New', name: 'field_n_new', type: 'string' };

      const result = addFieldToStory(baseStory, field);

      expect(result.fields).toHaveLength(3);
      expect(result.fields[2]).toEqual(field);
    });

    test('does not mutate original story', () => {
      const original = { ...baseStory, fields: [...baseStory.fields] };
      const field = { label: 'New', name: 'field_n_new', type: 'string' };

      addFieldToStory(original, field);

      expect(original.fields).toHaveLength(2);
    });

    test('handles undefined fields array', () => {
      const story = { ...baseStory, fields: undefined };
      const field = { label: 'New', name: 'field_n_new', type: 'string' };

      const result = addFieldToStory(story, field);

      expect(result.fields).toHaveLength(1);
    });
  });

  describe('updateFieldInStory', () => {
    test('updates field at specified index', () => {
      const updatedField = { label: 'Updated Title', name: 'field_n_title', type: 'string' };

      const result = updateFieldInStory(baseStory, 0, updatedField);

      expect(result.fields[0].label).toBe('Updated Title');
      expect(result.fields[1]).toEqual(baseStory.fields[1]);
    });

    test('does not mutate original story', () => {
      const original = { ...baseStory, fields: [...baseStory.fields] };
      const updatedField = { label: 'Updated', name: 'field_n_title', type: 'string' };

      updateFieldInStory(original, 0, updatedField);

      expect(original.fields[0].label).toBe('Title');
    });
  });

  describe('removeFieldFromStory', () => {
    test('removes field at specified index', () => {
      const result = removeFieldFromStory(baseStory, 0);

      expect(result.fields).toHaveLength(1);
      expect(result.fields[0].name).toBe('field_n_body');
    });

    test('removes last field', () => {
      const result = removeFieldFromStory(baseStory, 1);

      expect(result.fields).toHaveLength(1);
      expect(result.fields[0].name).toBe('field_n_title');
    });

    test('does not mutate original story', () => {
      const original = { ...baseStory, fields: [...baseStory.fields] };

      removeFieldFromStory(original, 0);

      expect(original.fields).toHaveLength(2);
    });
  });

  describe('reorderFieldInStory', () => {
    test('moves field from first to last position', () => {
      const story = {
        ...baseStory,
        fields: [
          { name: 'field_a' },
          { name: 'field_b' },
          { name: 'field_c' }
        ]
      };

      const result = reorderFieldInStory(story, 0, 2);

      expect(result.fields[0].name).toBe('field_b');
      expect(result.fields[1].name).toBe('field_c');
      expect(result.fields[2].name).toBe('field_a');
    });

    test('moves field from last to first position', () => {
      const story = {
        ...baseStory,
        fields: [
          { name: 'field_a' },
          { name: 'field_b' },
          { name: 'field_c' }
        ]
      };

      const result = reorderFieldInStory(story, 2, 0);

      expect(result.fields[0].name).toBe('field_c');
      expect(result.fields[1].name).toBe('field_a');
      expect(result.fields[2].name).toBe('field_b');
    });

    test('does not mutate original story', () => {
      const original = {
        ...baseStory,
        fields: [{ name: 'field_a' }, { name: 'field_b' }]
      };

      reorderFieldInStory(original, 0, 1);

      expect(original.fields[0].name).toBe('field_a');
    });
  });

  describe('updateStoryBundleInfo', () => {
    test('updates bundle label', () => {
      const result = updateStoryBundleInfo(baseStory, { label: 'News Article' });

      expect(result.bundle.label).toBe('News Article');
      expect(result.bundle.machineName).toBe('article');
    });

    test('updates multiple bundle properties', () => {
      const result = updateStoryBundleInfo(baseStory, {
        label: 'News',
        description: 'News articles'
      });

      expect(result.bundle.label).toBe('News');
      expect(result.bundle.description).toBe('News articles');
      expect(result.bundle.machineName).toBe('article');
    });

    test('does not mutate original story', () => {
      const original = { ...baseStory, bundle: { ...baseStory.bundle } };

      updateStoryBundleInfo(original, { label: 'Changed' });

      expect(original.bundle.label).toBe('Article');
    });
  });

  describe('updateStoryPurpose', () => {
    test('updates purpose', () => {
      const result = updateStoryPurpose(baseStory, 'share company news');

      expect(result.purpose).toBe('share company news');
    });

    test('does not mutate original story', () => {
      const original = { ...baseStory };

      updateStoryPurpose(original, 'changed');

      expect(original.purpose).toBe('publish articles');
    });
  });

  describe('updateStoryPermissions', () => {
    test('updates permissions', () => {
      const permissions = {
        editor: { create: true, edit_own: true }
      };

      const result = updateStoryPermissions(baseStory, permissions);

      expect(result.permissions).toEqual(permissions);
    });

    test('updates role labels', () => {
      const permissions = { editor: { create: true } };
      const roleLabels = { editor: 'Content Editor' };

      const result = updateStoryPermissions(baseStory, permissions, roleLabels);

      expect(result.roleLabels.editor).toBe('Content Editor');
    });

    test('merges role labels with existing', () => {
      const story = { ...baseStory, roleLabels: { admin: 'Admin' } };
      const permissions = { editor: { create: true } };
      const roleLabels = { editor: 'Editor' };

      const result = updateStoryPermissions(story, permissions, roleLabels);

      expect(result.roleLabels.admin).toBe('Admin');
      expect(result.roleLabels.editor).toBe('Editor');
    });
  });

  describe('getStoriesDir', () => {
    test('returns stories directory path', () => {
      const project = { configDirectory: '/path/to/drupal/config/sync' };
      const result = getStoriesDir(project);

      expect(result).toBe('/path/to/drupal/stories');
    });

    test('handles config directory without sync suffix', () => {
      const project = { configDirectory: '/path/to/drupal/config' };
      const result = getStoriesDir(project);

      expect(result).toBe('/path/to/drupal/stories');
    });
  });

  describe('getStoryPath', () => {
    test('returns story JSON path', () => {
      const project = { configDirectory: '/path/to/drupal/config/sync' };
      const result = getStoryPath(project, 'article');

      expect(result).toBe('/path/to/drupal/stories/article.json');
    });
  });

  describe('getMarkdownPath', () => {
    test('returns markdown export path', () => {
      const project = { configDirectory: '/path/to/drupal/config/sync' };
      const story = {
        entityType: 'node',
        bundle: { machineName: 'article' }
      };

      const result = getMarkdownPath(project, story);

      expect(result).toBe('/path/to/drupal/stories/create-article-node.md');
    });
  });
});
