/**
 * Project utilities - PURE functions
 */

import { resolve } from 'path';

/**
 * Validate that a project has a config directory.
 * Throws if the project is invalid.
 * @param {object} project - Project object
 * @throws {Error} If project is null or missing configDirectory
 */
export function validateProject(project) {
  if (!project || !project.configDirectory) {
    throw new Error('Invalid project: missing configDirectory');
  }
}

/**
 * Create a new project object with default structure
 * @param {string} name - Human-readable project name
 * @param {string} slug - Directory-safe slug
 * @param {string} configDirectory - Path to Drupal config directory
 * @param {string} baseUrl - Base URL of the Drupal site (optional)
 * @param {object} options - Additional options
 * @param {string} options.drupalRoot - Root directory of Drupal installation
 * @param {string} options.drushCommand - Command to run drush (default: 'drush')
 * @param {string} options.baseDirectory - Project/repo root (used to auto-load when running dcm inside the project)
 * @returns {object} - Project object
 */
export function createProjectObject(name, slug, configDirectory, baseUrl = '', options = {}) {
  const {
    drupalRoot = '',
    drushCommand = 'drush',
    theme = null,
    editableBaseTheme = false,
    baseDirectory = ''
  } = options;

  return {
    name,
    slug,
    configDirectory,
    baseDirectory,
    baseUrl,
    drupalRoot,
    drushCommand,
    theme,
    editableBaseTheme,
    lastSync: null,
    entities: {
      node: {},
      media: {},
      paragraph: {},
      taxonomy_term: {}
    }
  };
}

/**
 * Check whether a given cwd falls inside a project's base or config directory.
 * Uses baseDirectory when set; falls back to configDirectory for projects that
 * predate the baseDirectory field.
 * @param {object} project - Full project object (not a summary)
 * @param {string} cwd - Absolute working directory to test
 * @returns {boolean}
 */
export function projectMatchesCwd(project, cwd) {
  if (!project || !cwd) return false;
  const resolvedCwd = resolve(cwd);
  const root = project.baseDirectory?.trim() || project.configDirectory?.trim();
  if (!root) return false;
  const resolvedRoot = resolve(root);
  return resolvedCwd === resolvedRoot || resolvedCwd.startsWith(resolvedRoot + '/');
}

/**
 * Extract summary info from a project object
 * @param {object} project - Full project object
 * @returns {object} - Summary with name, slug, lastSync
 */
export function getProjectSummary(project) {
  return {
    name: project.name,
    slug: project.slug,
    lastSync: project.lastSync
  };
}
