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

/**
 * Generate a Drupal machine name from a label.
 * Core utility used by bundle, role, and field group name generators.
 * @param {string} label - Human-readable label
 * @returns {string} - Machine name (lowercase, underscores)
 */
export function generateMachineName(label) {
  if (!label || typeof label !== 'string') {
    return '';
  }

  return label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');
}

/**
 * Validate a Drupal machine name format.
 * Must be lowercase letters, numbers, and underscores, starting with a letter.
 * @param {string} machineName - Machine name to validate
 * @returns {boolean} - True if valid
 */
export function validateMachineName(machineName) {
  if (!machineName || typeof machineName !== 'string') {
    return false;
  }

  return /^[a-z][a-z0-9_]*[a-z0-9]$|^[a-z]$/.test(machineName);
}

/**
 * Format cardinality for display
 * @param {number} cardinality - Field cardinality value
 * @returns {string} - "Single", "Unlimited", or the number
 */
export function formatCardinality(cardinality) {
  if (cardinality === 1) {
    return 'Single';
  }
  if (cardinality === -1) {
    return 'Unlimited';
  }
  return String(cardinality);
}
