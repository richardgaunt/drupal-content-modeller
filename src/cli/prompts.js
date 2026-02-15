/**
 * CLI Prompts and Validation
 * Pure functions for prompt configuration and input validation.
 */

import { access, readdir } from 'fs/promises';
import { projectExists } from '../io/fileSystem.js';
import { generateSlug } from '../utils/slug.js';

/**
 * Main menu choices
 */
export const MAIN_MENU_CHOICES = [
  { value: 'create', name: 'Create project' },
  { value: 'load', name: 'Load project' },
  { value: 'exit', name: 'Exit' }
];

/**
 * Project menu choices
 */
export const PROJECT_MENU_CHOICES = [
  { value: 'sync', name: 'Sync configuration' },
  { value: 'list-entities', name: 'List entity types' },
  { value: 'list-entity-fields', name: 'List fields of entity' },
  { value: 'list-bundle-fields', name: 'List fields of bundle' },
  { value: 'create-bundle', name: 'Create a bundle' },
  { value: 'create-field', name: 'Create a field' },
  { value: 'edit-field', name: 'Edit field instance' },
  { value: 'edit-project', name: 'Edit project' },
  { value: 'enable-modules', name: 'Enable required modules' },
  { value: 'admin-links', name: 'Admin links for bundle' },
  { value: 'report-entity', name: 'Generate report for entity type' },
  { value: 'report-project', name: 'Generate report for project' },
  { value: 'back', name: 'Back to main menu' }
];

/**
 * Get main menu choices
 * @returns {Array} Array of choice objects
 */
export function getMainMenuChoices() {
  return MAIN_MENU_CHOICES;
}

/**
 * Get project menu choices with project name in title
 * @param {string} projectName - Name of the current project
 * @returns {object} Object with message and choices
 */
export function getProjectMenuChoices(projectName) {
  return {
    message: `${projectName} - What would you like to do?`,
    choices: PROJECT_MENU_CHOICES
  };
}

/**
 * Validate project name
 * @param {string} name - Project name to validate
 * @returns {boolean|string} true if valid, error message if invalid
 */
export function validateProjectName(name) {
  if (!name || typeof name !== 'string') {
    return 'Project name is required';
  }

  if (name.trim().length === 0) {
    return 'Project name cannot be empty or whitespace only';
  }

  return true;
}

/**
 * Validate project name doesn't already exist
 * @param {string} name - Project name to validate
 * @returns {boolean|string} true if valid, error message if invalid
 */
export function validateProjectNameUnique(name) {
  const basicValidation = validateProjectName(name);
  if (basicValidation !== true) {
    return basicValidation;
  }

  const slug = generateSlug(name);
  const exists = projectExists(slug);

  if (exists) {
    return `A project with slug "${slug}" already exists`;
  }

  return true;
}

/**
 * Validate configuration directory exists and contains yml files
 * @param {string} dirPath - Path to configuration directory
 * @returns {Promise<boolean|string>} true if valid, error message if invalid
 */
export async function validateConfigDirectory(dirPath) {
  if (!dirPath || typeof dirPath !== 'string') {
    return 'Configuration directory path is required';
  }

  const trimmedPath = dirPath.trim();
  if (trimmedPath.length === 0) {
    return 'Configuration directory path cannot be empty';
  }

  // Check directory exists
  try {
    await access(trimmedPath);
  } catch {
    return `Directory does not exist: ${trimmedPath}`;
  }

  // Check for yml files
  try {
    const files = await readdir(trimmedPath);
    const ymlFiles = files.filter(f => f.endsWith('.yml') || f.endsWith('.yaml'));

    if (ymlFiles.length === 0) {
      return 'Directory does not contain any .yml files';
    }
  } catch {
    return `Cannot read directory: ${trimmedPath}`;
  }

  return true;
}

/**
 * Validate base URL format
 * @param {string} url - URL to validate
 * @returns {boolean|string} true if valid (or empty), error message if invalid
 */
export function validateBaseUrl(url) {
  // Allow empty value - base URL is optional
  if (!url || url.trim() === '') {
    return true;
  }

  try {
    new URL(url.trim());
    return true;
  } catch {
    return 'Please enter a valid URL (e.g., https://example.com)';
  }
}
