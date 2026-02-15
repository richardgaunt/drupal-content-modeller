/**
 * Story Commands
 * CRUD operations for story/ticket management.
 */

import { join } from 'path';
import { mkdir, readdir, readFile, writeFile, unlink } from 'fs/promises';
import { generateFullStory, updateStoryTimestamp } from '../generators/storyGenerator.js';

/**
 * Get the stories directory for a project
 * @param {object} project - Project object
 * @returns {string} - Stories directory path
 */
export function getStoriesDir(project) {
  // Stories are stored in the project directory under 'stories'
  const projectDir = project.configDirectory.replace(/\/config\/sync\/?$/, '').replace(/\/config\/?$/, '');
  return join(projectDir, 'stories');
}

/**
 * Get the story file path
 * @param {object} project - Project object
 * @param {string} machineName - Bundle machine name
 * @returns {string} - Story JSON file path
 */
export function getStoryPath(project, machineName) {
  return join(getStoriesDir(project), `${machineName}.json`);
}

/**
 * Get the markdown export path
 * @param {object} project - Project object
 * @param {object} story - Story object
 * @returns {string} - Markdown file path
 */
export function getMarkdownPath(project, story) {
  const filename = `create-${story.bundle.machineName}-${story.entityType}.md`;
  return join(getStoriesDir(project), filename);
}

/**
 * Ensure stories directory exists
 * @param {object} project - Project object
 * @returns {Promise<void>}
 */
async function ensureStoriesDir(project) {
  const dir = getStoriesDir(project);
  await mkdir(dir, { recursive: true });
}

/**
 * Save a story to JSON file
 * @param {object} project - Project object
 * @param {object} story - Story object
 * @returns {Promise<string>} - Path to saved file
 */
export async function saveStory(project, story) {
  await ensureStoriesDir(project);

  const updatedStory = updateStoryTimestamp(story);
  const path = getStoryPath(project, story.bundle.machineName);

  await writeFile(path, JSON.stringify(updatedStory, null, 2), 'utf-8');
  return path;
}

/**
 * Load a story from JSON file
 * @param {object} project - Project object
 * @param {string} machineName - Bundle machine name
 * @returns {Promise<object|null>} - Story object or null if not found
 */
export async function loadStory(project, machineName) {
  const path = getStoryPath(project, machineName);

  try {
    const content = await readFile(path, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return null;
    }
    throw error;
  }
}

/**
 * List all stories in a project
 * @param {object} project - Project object
 * @returns {Promise<object[]>} - Array of story summaries
 */
export async function listStories(project) {
  const dir = getStoriesDir(project);

  try {
    const files = await readdir(dir);
    const jsonFiles = files.filter(f => f.endsWith('.json'));

    const stories = [];
    for (const file of jsonFiles) {
      try {
        const content = await readFile(join(dir, file), 'utf-8');
        const story = JSON.parse(content);
        stories.push({
          machineName: story.bundle.machineName,
          label: story.bundle.label,
          entityType: story.entityType,
          status: story.status,
          fieldCount: story.fields?.length || 0,
          updatedAt: story.updatedAt,
          createdAt: story.createdAt
        });
      } catch {
        // Skip invalid files
      }
    }

    // Sort by updated date, newest first
    stories.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

    return stories;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

/**
 * Delete a story
 * @param {object} project - Project object
 * @param {string} machineName - Bundle machine name
 * @returns {Promise<boolean>} - True if deleted
 */
export async function deleteStory(project, machineName) {
  const path = getStoryPath(project, machineName);

  try {
    await unlink(path);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') {
      return false;
    }
    throw error;
  }
}

/**
 * Export story to markdown
 * @param {object} project - Project object
 * @param {object} story - Story object
 * @returns {Promise<string>} - Path to exported markdown file
 */
export async function exportStoryToMarkdown(project, story) {
  await ensureStoriesDir(project);

  const markdown = generateFullStory(story);
  const path = getMarkdownPath(project, story);

  await writeFile(path, markdown, 'utf-8');

  // Update story with export record
  const updatedStory = {
    ...story,
    status: 'exported',
    exports: [
      ...(story.exports || []),
      {
        exportedAt: new Date().toISOString(),
        path: path.split('/').slice(-2).join('/') // Relative path
      }
    ]
  };

  await saveStory(project, updatedStory);

  return path;
}

/**
 * Check if a story exists
 * @param {object} project - Project object
 * @param {string} machineName - Bundle machine name
 * @returns {Promise<boolean>}
 */
export async function storyExists(project, machineName) {
  const story = await loadStory(project, machineName);
  return story !== null;
}

/**
 * Add a field to a story
 * @param {object} story - Story object
 * @param {object} field - Field object
 * @returns {object} - Updated story
 */
export function addFieldToStory(story, field) {
  return {
    ...story,
    fields: [...(story.fields || []), field],
    updatedAt: new Date().toISOString()
  };
}

/**
 * Update a field in a story
 * @param {object} story - Story object
 * @param {number} index - Field index
 * @param {object} field - Updated field object
 * @returns {object} - Updated story
 */
export function updateFieldInStory(story, index, field) {
  const fields = [...story.fields];
  fields[index] = field;
  return {
    ...story,
    fields,
    updatedAt: new Date().toISOString()
  };
}

/**
 * Remove a field from a story
 * @param {object} story - Story object
 * @param {number} index - Field index
 * @returns {object} - Updated story
 */
export function removeFieldFromStory(story, index) {
  const fields = story.fields.filter((_, i) => i !== index);
  return {
    ...story,
    fields,
    updatedAt: new Date().toISOString()
  };
}

/**
 * Reorder fields in a story
 * @param {object} story - Story object
 * @param {number} fromIndex - Current index
 * @param {number} toIndex - Target index
 * @returns {object} - Updated story
 */
export function reorderFieldInStory(story, fromIndex, toIndex) {
  const fields = [...story.fields];
  const [removed] = fields.splice(fromIndex, 1);
  fields.splice(toIndex, 0, removed);
  return {
    ...story,
    fields,
    updatedAt: new Date().toISOString()
  };
}

/**
 * Update story bundle info
 * @param {object} story - Story object
 * @param {object} bundleInfo - Bundle info updates
 * @returns {object} - Updated story
 */
export function updateStoryBundleInfo(story, bundleInfo) {
  return {
    ...story,
    bundle: { ...story.bundle, ...bundleInfo },
    updatedAt: new Date().toISOString()
  };
}

/**
 * Update story purpose
 * @param {object} story - Story object
 * @param {string} purpose - New purpose
 * @returns {object} - Updated story
 */
export function updateStoryPurpose(story, purpose) {
  return {
    ...story,
    purpose,
    updatedAt: new Date().toISOString()
  };
}

/**
 * Update story permissions
 * @param {object} story - Story object
 * @param {object} permissions - New permissions matrix
 * @param {object} roleLabels - Role labels
 * @returns {object} - Updated story
 */
export function updateStoryPermissions(story, permissions, roleLabels = {}) {
  return {
    ...story,
    permissions,
    roleLabels: { ...story.roleLabels, ...roleLabels },
    updatedAt: new Date().toISOString()
  };
}
