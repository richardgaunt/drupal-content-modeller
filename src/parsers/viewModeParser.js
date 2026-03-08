/**
 * View Mode Parser - PURE functions
 * Parse entity view mode YAML configuration.
 * No file I/O - receives parsed YAML objects as input.
 */

/**
 * View mode filename prefix
 */
export const VIEW_MODE_PREFIX = 'core.entity_view_mode.';

/**
 * Check if a filename is an entity view mode config file
 * @param {string} filename - Filename to check
 * @returns {boolean}
 */
export function isViewModeFile(filename) {
  return filename.startsWith(VIEW_MODE_PREFIX) && filename.endsWith('.yml');
}

/**
 * Filter a list of filenames to only view mode files
 * @param {string[]} files - Array of filenames
 * @returns {string[]} - Filtered array
 */
export function filterViewModeFiles(files) {
  return files.filter(isViewModeFile);
}

/**
 * Filter view mode files for a specific entity type
 * @param {string[]} files - Array of filenames
 * @param {string} entityType - Entity type to filter by
 * @returns {string[]} - Filtered array
 */
export function filterViewModeFilesByEntityType(files, entityType) {
  const prefix = `${VIEW_MODE_PREFIX}${entityType}.`;
  return files.filter(f => f.startsWith(prefix) && f.endsWith('.yml'));
}

/**
 * Extract entity type and view mode name from a view mode filename
 * @param {string} filename - e.g. 'core.entity_view_mode.node.civictheme_promo_card.yml'
 * @returns {{ entityType: string, viewModeName: string } | null}
 */
export function extractViewModeFromFilename(filename) {
  if (!isViewModeFile(filename)) return null;

  // Remove prefix and .yml suffix
  const inner = filename.slice(VIEW_MODE_PREFIX.length, -4);
  const dotIndex = inner.indexOf('.');
  if (dotIndex === -1) return null;

  return {
    entityType: inner.slice(0, dotIndex),
    viewModeName: inner.slice(dotIndex + 1)
  };
}

/**
 * Get the filename for a view mode
 * @param {string} entityType - Entity type
 * @param {string} viewModeName - View mode machine name
 * @returns {string} - Filename
 */
export function getViewModeFilename(entityType, viewModeName) {
  return `${VIEW_MODE_PREFIX}${entityType}.${viewModeName}.yml`;
}

/**
 * Parse a view mode configuration object
 * @param {object} config - Parsed YAML object
 * @returns {object} - Normalized view mode data
 */
export function parseViewMode(config) {
  if (!config) return null;

  return {
    id: config.id || '',
    label: config.label || '',
    description: config.description || '',
    targetEntityType: config.targetEntityType || '',
    cache: config.cache !== undefined ? config.cache : true,
    dependencies: config.dependencies || {}
  };
}
