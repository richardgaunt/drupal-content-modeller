/**
 * Config Parser - PURE functions
 * Parse YAML strings to extract Drupal configuration data.
 * No file I/O - receives YAML strings as input.
 */

import yaml from 'js-yaml';

/**
 * Recommended modules for content modelling
 * These modules provide essential functionality for creating and managing content types
 */
export const RECOMMENDED_MODULES = [
  'node',
  'media',
  'taxonomy',
  'block_content',
  'paragraphs',
  'content_moderation',
  'field_group'
];

/**
 * Entity type configuration patterns
 */
export const ENTITY_TYPE_PATTERNS = {
  node: {
    bundlePrefix: 'node.type.',
    bundleSuffix: '.yml',
    fieldStoragePrefix: 'field.storage.node.',
    fieldInstancePrefix: 'field.field.node.'
  },
  media: {
    bundlePrefix: 'media.type.',
    bundleSuffix: '.yml',
    fieldStoragePrefix: 'field.storage.media.',
    fieldInstancePrefix: 'field.field.media.'
  },
  paragraph: {
    bundlePrefix: 'paragraphs.paragraphs_type.',
    bundleSuffix: '.yml',
    fieldStoragePrefix: 'field.storage.paragraph.',
    fieldInstancePrefix: 'field.field.paragraph.'
  },
  taxonomy_term: {
    bundlePrefix: 'taxonomy.vocabulary.',
    bundleSuffix: '.yml',
    fieldStoragePrefix: 'field.storage.taxonomy_term.',
    fieldInstancePrefix: 'field.field.taxonomy_term.'
  },
  block_content: {
    bundlePrefix: 'block_content.type.',
    bundleSuffix: '.yml',
    fieldStoragePrefix: 'field.storage.block_content.',
    fieldInstancePrefix: 'field.field.block_content.'
  }
};

/**
 * Parse a YAML string safely
 * @param {string} yamlString - YAML content
 * @returns {object|null} - Parsed object or null if invalid
 */
export function parseYaml(yamlString) {
  try {
    const result = yaml.load(yamlString);
    return result || null;
  } catch {
    return null;
  }
}

/**
 * Extract bundle ID from filename
 * @param {string} filename - Config filename
 * @param {string} entityType - Entity type (node, media, paragraph, taxonomy_term)
 * @returns {string|null} - Bundle ID or null if not a bundle file
 */
export function extractBundleIdFromFilename(filename, entityType) {
  const pattern = ENTITY_TYPE_PATTERNS[entityType];
  if (!pattern) return null;

  if (filename.startsWith(pattern.bundlePrefix) && filename.endsWith(pattern.bundleSuffix)) {
    return filename.slice(pattern.bundlePrefix.length, -pattern.bundleSuffix.length);
  }
  return null;
}

/**
 * Extract field name from storage filename
 * @param {string} filename - Config filename
 * @param {string} entityType - Entity type
 * @returns {string|null} - Field name or null
 */
export function extractFieldNameFromStorageFilename(filename, entityType) {
  const pattern = ENTITY_TYPE_PATTERNS[entityType];
  if (!pattern) return null;

  if (filename.startsWith(pattern.fieldStoragePrefix) && filename.endsWith('.yml')) {
    return filename.slice(pattern.fieldStoragePrefix.length, -4);
  }
  return null;
}

/**
 * Check if a filename is a field instance for a specific bundle
 * @param {string} filename - Config filename
 * @param {string} entityType - Entity type
 * @param {string} bundle - Bundle name
 * @returns {boolean}
 */
export function isFieldInstanceFile(filename, entityType, bundle) {
  const pattern = ENTITY_TYPE_PATTERNS[entityType];
  if (!pattern) return false;

  const prefix = `${pattern.fieldInstancePrefix}${bundle}.`;
  return filename.startsWith(prefix) && filename.endsWith('.yml');
}

/**
 * Extract field name from instance filename
 * @param {string} filename - Config filename
 * @param {string} entityType - Entity type
 * @param {string} bundle - Bundle name
 * @returns {string|null} - Field name or null
 */
export function extractFieldNameFromInstanceFilename(filename, entityType, bundle) {
  const pattern = ENTITY_TYPE_PATTERNS[entityType];
  if (!pattern) return null;

  const prefix = `${pattern.fieldInstancePrefix}${bundle}.`;
  if (filename.startsWith(prefix) && filename.endsWith('.yml')) {
    return filename.slice(prefix.length, -4);
  }
  return null;
}

/**
 * Parse a node type bundle config
 * @param {object} config - Parsed YAML config
 * @returns {object} - Bundle info {id, label, description}
 */
export function parseNodeTypeBundle(config) {
  return {
    id: config.type || '',
    label: config.name || '',
    description: config.description || ''
  };
}

/**
 * Parse a media type bundle config
 * @param {object} config - Parsed YAML config
 * @returns {object} - Bundle info {id, label, description, source}
 */
export function parseMediaTypeBundle(config) {
  return {
    id: config.id || '',
    label: config.label || '',
    description: config.description || '',
    source: config.source || ''
  };
}

/**
 * Parse a paragraph type bundle config
 * @param {object} config - Parsed YAML config
 * @returns {object} - Bundle info {id, label, description}
 */
export function parseParagraphTypeBundle(config) {
  return {
    id: config.id || '',
    label: config.label || '',
    description: config.description || ''
  };
}

/**
 * Parse a taxonomy vocabulary bundle config
 * @param {object} config - Parsed YAML config
 * @returns {object} - Bundle info {id, label, description}
 */
export function parseTaxonomyVocabularyBundle(config) {
  return {
    id: config.vid || '',
    label: config.name || '',
    description: config.description || ''
  };
}

/**
 * Parse a block content type bundle config
 * @param {object} config - Parsed YAML config
 * @returns {object} - Bundle info {id, label, description}
 */
export function parseBlockContentTypeBundle(config) {
  return {
    id: config.id || '',
    label: config.label || '',
    description: config.description || ''
  };
}

/**
 * Parse a bundle config based on entity type
 * @param {object} config - Parsed YAML config
 * @param {string} entityType - Entity type
 * @returns {object} - Bundle info
 */
export function parseBundleConfig(config, entityType) {
  switch (entityType) {
    case 'node':
      return parseNodeTypeBundle(config);
    case 'media':
      return parseMediaTypeBundle(config);
    case 'paragraph':
      return parseParagraphTypeBundle(config);
    case 'taxonomy_term':
      return parseTaxonomyVocabularyBundle(config);
    case 'block_content':
      return parseBlockContentTypeBundle(config);
    default:
      return { id: '', label: '', description: '' };
  }
}

/**
 * Parse a field storage config
 * @param {object} config - Parsed YAML config
 * @returns {object} - Field storage info
 */
export function parseFieldStorage(config) {
  return {
    name: config.field_name || '',
    type: config.type || '',
    cardinality: config.cardinality || 1,
    settings: config.settings || {}
  };
}

/**
 * Parse a field instance config
 * @param {object} config - Parsed YAML config
 * @returns {object} - Field instance info
 */
export function parseFieldInstance(config) {
  return {
    name: config.field_name || '',
    label: config.label || '',
    type: config.field_type || '',
    required: config.required || false,
    description: config.description || '',
    settings: config.settings || {}
  };
}

/**
 * Filter filenames that match bundle pattern for an entity type
 * @param {string[]} filenames - Array of filenames
 * @param {string} entityType - Entity type
 * @returns {string[]} - Matching filenames
 */
export function filterBundleFiles(filenames, entityType) {
  const pattern = ENTITY_TYPE_PATTERNS[entityType];
  if (!pattern) return [];

  return filenames.filter(f =>
    f.startsWith(pattern.bundlePrefix) && f.endsWith(pattern.bundleSuffix)
  );
}

/**
 * Filter filenames that match field storage pattern for an entity type
 * @param {string[]} filenames - Array of filenames
 * @param {string} entityType - Entity type
 * @returns {string[]} - Matching filenames
 */
export function filterFieldStorageFiles(filenames, entityType) {
  const pattern = ENTITY_TYPE_PATTERNS[entityType];
  if (!pattern) return [];

  return filenames.filter(f =>
    f.startsWith(pattern.fieldStoragePrefix) && f.endsWith('.yml')
  );
}

/**
 * Filter filenames that match field instance pattern for a bundle
 * @param {string[]} filenames - Array of filenames
 * @param {string} entityType - Entity type
 * @param {string} bundle - Bundle name
 * @returns {string[]} - Matching filenames
 */
export function filterFieldInstanceFiles(filenames, entityType, bundle) {
  const pattern = ENTITY_TYPE_PATTERNS[entityType];
  if (!pattern) return [];

  const prefix = `${pattern.fieldInstancePrefix}${bundle}.`;
  return filenames.filter(f => f.startsWith(prefix) && f.endsWith('.yml'));
}

/**
 * Parse core.extension.yml to get list of enabled modules
 * @param {object} config - Parsed YAML config
 * @returns {string[]} - Array of enabled module names
 */
export function parseEnabledModules(config) {
  if (!config || !config.module) {
    return [];
  }
  return Object.keys(config.module);
}

/**
 * Check which recommended modules are missing
 * @param {string[]} enabledModules - List of enabled modules
 * @returns {string[]} - List of missing recommended modules
 */
export function getMissingRecommendedModules(enabledModules) {
  return RECOMMENDED_MODULES.filter(mod => !enabledModules.includes(mod));
}

/**
 * Generate updated core.extension.yml content with new modules enabled
 * @param {object} config - Parsed core.extension.yml config
 * @param {string[]} modulesToEnable - Module names to enable
 * @returns {string} - YAML string with updated modules
 */
export function generateUpdatedExtensionConfig(config, modulesToEnable) {
  if (!config) {
    config = { module: {}, theme: {}, profile: '' };
  }

  const updatedConfig = { ...config };
  if (!updatedConfig.module) {
    updatedConfig.module = {};
  }

  // Add each module with weight 0
  for (const moduleName of modulesToEnable) {
    if (!(moduleName in updatedConfig.module)) {
      updatedConfig.module[moduleName] = 0;
    }
  }

  // Sort modules alphabetically
  const sortedModules = {};
  for (const key of Object.keys(updatedConfig.module).sort()) {
    sortedModules[key] = updatedConfig.module[key];
  }
  updatedConfig.module = sortedModules;

  return yaml.dump(updatedConfig, {
    lineWidth: -1,
    noRefs: true,
    quotingType: "'",
    forceQuotes: false
  });
}
