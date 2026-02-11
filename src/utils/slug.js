/**
 * Slug utilities - PURE functions
 */

/**
 * Convert a human-readable project name to a valid directory name
 * @param {string} name - The human-readable project name
 * @returns {string} - The converted directory name (slug)
 */
export function generateSlug(name) {
  if (!name || typeof name !== 'string') {
    return '';
  }

  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
}

/**
 * Validate that a project name is not empty
 * @param {string} name - The project name to validate
 * @returns {boolean} - True if valid
 */
export function isValidProjectName(name) {
  if (!name || typeof name !== 'string') {
    return false;
  }
  return name.trim().length > 0;
}
