/**
 * Project utilities - PURE functions
 */

/**
 * Create a new project object with default structure
 * @param {string} name - Human-readable project name
 * @param {string} slug - Directory-safe slug
 * @param {string} configDirectory - Path to Drupal config directory
 * @param {string} baseUrl - Base URL of the Drupal site (optional)
 * @returns {object} - Project object
 */
export function createProjectObject(name, slug, configDirectory, baseUrl = '') {
  return {
    name,
    slug,
    configDirectory,
    baseUrl,
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
