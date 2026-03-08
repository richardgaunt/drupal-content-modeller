/**
 * Theme Suggestions - PURE functions
 * Generate Drupal theme suggestion patterns for entities and fields.
 */

/**
 * Generate theme suggestions for a bundle (entity-level template suggestions).
 * Follows Drupal core's hook_theme_suggestions_HOOK() patterns.
 *
 * @param {string} entityType - Entity type (node, media, paragraph, taxonomy_term, block_content)
 * @param {string} bundle - Bundle machine name
 * @param {string} [viewMode] - View mode machine name (optional)
 * @returns {string[]} - Array of theme suggestion strings in priority order (lowest to highest)
 */
export function getBundleThemeSuggestions(entityType, bundle, viewMode) {
  const sanitizedViewMode = viewMode ? viewMode.replace(/\./g, '_') : null;

  switch (entityType) {
    case 'node':
      return getNodeSuggestions(bundle, sanitizedViewMode);
    case 'paragraph':
      return getParagraphSuggestions(bundle, sanitizedViewMode);
    case 'block_content':
      return getBlockContentSuggestions(bundle, sanitizedViewMode);
    case 'taxonomy_term':
      return getTaxonomyTermSuggestions(bundle);
    case 'media':
      return getMediaSuggestions(bundle, sanitizedViewMode);
    default:
      return [];
  }
}

/**
 * Generate theme suggestions for a field.
 * Follows Drupal core's system_theme_suggestions_field() pattern.
 *
 * @param {string} entityType - Entity type
 * @param {string} bundle - Bundle machine name
 * @param {string} fieldName - Field machine name
 * @param {string} fieldType - Field type (e.g. 'string', 'entity_reference')
 * @returns {string[]} - Array of theme suggestion strings in priority order (lowest to highest)
 */
export function getFieldThemeSuggestions(entityType, bundle, fieldName, fieldType) {
  return [
    'field',
    `field__${fieldType}`,
    `field__${fieldName}`,
    `field__${entityType}__${bundle}`,
    `field__${entityType}__${fieldName}`,
    `field__${entityType}__${fieldName}__${bundle}`
  ];
}

function getNodeSuggestions(bundle, viewMode) {
  const suggestions = ['node'];
  if (viewMode) {
    suggestions.push(`node__${viewMode}`);
  }
  suggestions.push(`node__${bundle}`);
  if (viewMode) {
    suggestions.push(`node__${bundle}__${viewMode}`);
  }
  return suggestions;
}

function getParagraphSuggestions(bundle, viewMode) {
  const suggestions = ['paragraph'];
  if (viewMode) {
    suggestions.push(`paragraph__${viewMode}`);
  }
  suggestions.push(`paragraph__${bundle}`);
  if (viewMode) {
    suggestions.push(`paragraph__${bundle}__${viewMode}`);
  }
  return suggestions;
}

function getBlockContentSuggestions(bundle, viewMode) {
  const suggestions = ['block__block_content'];
  if (viewMode) {
    suggestions.push(`block__block_content__view__${viewMode}`);
  }
  suggestions.push(`block__block_content__type__${bundle}`);
  if (viewMode) {
    suggestions.push(`block__block_content__view_type__${bundle}__${viewMode}`);
  }
  return suggestions;
}

function getTaxonomyTermSuggestions(bundle) {
  return [
    'taxonomy_term',
    `taxonomy_term__${bundle}`
  ];
}

function getMediaSuggestions(bundle, viewMode) {
  // Media uses the same pattern as node
  const suggestions = ['media'];
  if (viewMode) {
    suggestions.push(`media__${viewMode}`);
  }
  suggestions.push(`media__${bundle}`);
  if (viewMode) {
    suggestions.push(`media__${bundle}__${viewMode}`);
  }
  return suggestions;
}
