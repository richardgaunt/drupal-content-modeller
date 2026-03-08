/**
 * View Mode Generator
 * Generates YAML configuration for Drupal entity view modes.
 */

import yaml from 'js-yaml';
import { getEntityModule } from '../constants/entityTypes.js';

/**
 * Generate entity view mode YAML
 * @param {object} options - View mode options
 * @param {string} options.entityType - Entity type (node, media, paragraph, etc.)
 * @param {string} options.viewModeName - View mode machine name
 * @param {string} options.label - Human-readable label
 * @param {string} [options.description] - Description
 * @returns {string} - YAML string
 */
export function generateViewMode({ entityType, viewModeName, label, description = '' }) {
  const module = getEntityModule(entityType);
  if (!module) {
    throw new Error(`Unknown entity type: ${entityType}`);
  }

  const config = {
    langcode: 'en',
    status: true,
    dependencies: {
      module: [module]
    },
    id: `${entityType}.${viewModeName}`,
    label,
    description,
    targetEntityType: entityType,
    cache: true
  };

  return yaml.dump(config, { quotingType: "'", forceQuotes: false });
}
