/**
 * Bundle Generator
 * Generates YAML configuration for Drupal entity bundles.
 */

import yaml from 'js-yaml';

/**
 * Media source types and their Drupal plugin IDs
 */
export const MEDIA_SOURCE_TYPES = {
  image: 'image',
  file: 'file',
  remote_video: 'oembed:video'
};

/**
 * Generate machine name from label
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
 * Validate machine name format
 * @param {string} machineName - Machine name to validate
 * @returns {boolean} - True if valid
 */
export function validateMachineName(machineName) {
  if (!machineName || typeof machineName !== 'string') {
    return false;
  }

  // Must be lowercase letters and underscores only, not starting/ending with underscore
  return /^[a-z][a-z0-9_]*[a-z0-9]$|^[a-z]$/.test(machineName);
}

/**
 * Get bundle filename for entity type
 * @param {string} entityType - Entity type (node, media, paragraph, taxonomy_term)
 * @param {string} machineName - Bundle machine name
 * @returns {string} - Filename
 */
export function getBundleFilename(entityType, machineName) {
  switch (entityType) {
    case 'node':
      return `node.type.${machineName}.yml`;
    case 'media':
      return `media.type.${machineName}.yml`;
    case 'paragraph':
      return `paragraphs.paragraphs_type.${machineName}.yml`;
    case 'taxonomy_term':
      return `taxonomy.vocabulary.${machineName}.yml`;
    default:
      throw new Error(`Unknown entity type: ${entityType}`);
  }
}

/**
 * Get source field name for media type
 * @param {string} machineName - Media type machine name
 * @param {string} sourceType - Source type (image, file, remote_video)
 * @returns {string} - Source field name
 */
export function getSourceFieldName(machineName, sourceType) {
  const suffix = {
    image: 'image',
    file: 'file',
    remote_video: 'video_url'
  };

  return `field_c_m_${machineName}_${suffix[sourceType] || 'source'}`;
}

/**
 * Generate node type YAML
 * @param {object} options - Bundle options
 * @param {string} options.label - Human-readable label
 * @param {string} options.machineName - Machine name
 * @param {string} [options.description] - Description
 * @returns {string} - YAML string
 */
export function generateNodeType({ label, machineName, description = '' }) {
  const config = {
    langcode: 'en',
    status: true,
    dependencies: {},
    name: label,
    type: machineName,
    description: description,
    help: null,
    new_revision: true,
    preview_mode: 1,
    display_submitted: false
  };

  return yaml.dump(config, { quotingType: "'", forceQuotes: false });
}

/**
 * Generate media type YAML
 * @param {object} options - Bundle options
 * @param {string} options.label - Human-readable label
 * @param {string} options.machineName - Machine name
 * @param {string} [options.description] - Description
 * @param {string} options.sourceType - Source type (image, file, remote_video)
 * @param {string} options.sourceField - Source field name
 * @returns {string} - YAML string
 */
export function generateMediaType({ label, machineName, description = '', sourceType, sourceField }) {
  const config = {
    langcode: 'en',
    status: true,
    dependencies: {},
    id: machineName,
    label: label,
    description: description,
    source: MEDIA_SOURCE_TYPES[sourceType] || sourceType,
    queue_thumbnail_downloads: false,
    new_revision: true,
    source_configuration: {
      source_field: sourceField
    },
    field_map: {
      name: 'name'
    }
  };

  return yaml.dump(config, { quotingType: "'", forceQuotes: false });
}

/**
 * Generate paragraph type YAML
 * @param {object} options - Bundle options
 * @param {string} options.label - Human-readable label
 * @param {string} options.machineName - Machine name
 * @param {string} [options.description] - Description
 * @returns {string} - YAML string
 */
export function generateParagraphType({ label, machineName, description = '' }) {
  const config = {
    langcode: 'en',
    status: true,
    dependencies: {},
    id: machineName,
    label: label,
    icon_uuid: null,
    icon_default: null,
    description: description,
    behavior_plugins: {}
  };

  return yaml.dump(config, { quotingType: "'", forceQuotes: false });
}

/**
 * Generate taxonomy vocabulary YAML
 * @param {object} options - Bundle options
 * @param {string} options.label - Human-readable label
 * @param {string} options.machineName - Machine name
 * @param {string} [options.description] - Description
 * @returns {string} - YAML string
 */
export function generateVocabulary({ label, machineName, description = '' }) {
  const config = {
    langcode: 'en',
    status: true,
    dependencies: {},
    name: label,
    vid: machineName,
    description: description,
    weight: 0,
    new_revision: false
  };

  return yaml.dump(config, { quotingType: "'", forceQuotes: false });
}

/**
 * Generate media source field storage YAML
 * @param {object} options - Field options
 * @param {string} options.fieldName - Field machine name
 * @param {string} options.sourceType - Source type (image, file, remote_video)
 * @returns {string} - YAML string
 */
export function generateMediaSourceFieldStorage({ fieldName, sourceType }) {
  const fieldTypes = {
    image: 'image',
    file: 'file',
    remote_video: 'string'
  };

  const config = {
    langcode: 'en',
    status: true,
    dependencies: {
      module: ['media']
    },
    id: `media.${fieldName}`,
    field_name: fieldName,
    entity_type: 'media',
    type: fieldTypes[sourceType] || 'string',
    settings: {},
    module: sourceType === 'remote_video' ? 'core' : sourceType,
    locked: false,
    cardinality: 1,
    translatable: true,
    indexes: [],
    persist_with_no_fields: false,
    custom_storage: false
  };

  return yaml.dump(config, { quotingType: "'", forceQuotes: false });
}

/**
 * Generate media source field instance YAML
 * @param {object} options - Field options
 * @param {string} options.fieldName - Field machine name
 * @param {string} options.bundleName - Bundle machine name
 * @param {string} options.sourceType - Source type (image, file, remote_video)
 * @param {string} options.label - Field label
 * @returns {string} - YAML string
 */
export function generateMediaSourceFieldInstance({ fieldName, bundleName, sourceType, label }) {
  const fieldTypes = {
    image: 'image',
    file: 'file',
    remote_video: 'string'
  };

  const config = {
    langcode: 'en',
    status: true,
    dependencies: {
      config: [`field.storage.media.${fieldName}`, `media.type.${bundleName}`],
      module: ['media']
    },
    id: `media.${bundleName}.${fieldName}`,
    field_name: fieldName,
    entity_type: 'media',
    bundle: bundleName,
    label: label,
    description: '',
    required: true,
    translatable: true,
    default_value: [],
    default_value_callback: '',
    settings: {},
    field_type: fieldTypes[sourceType] || 'string'
  };

  return yaml.dump(config, { quotingType: "'", forceQuotes: false });
}

/**
 * Generate bundle YAML based on entity type
 * @param {string} entityType - Entity type
 * @param {object} options - Bundle options
 * @returns {string} - YAML string
 */
export function generateBundle(entityType, options) {
  switch (entityType) {
    case 'node':
      return generateNodeType(options);
    case 'media':
      return generateMediaType(options);
    case 'paragraph':
      return generateParagraphType(options);
    case 'taxonomy_term':
      return generateVocabulary(options);
    default:
      throw new Error(`Unknown entity type: ${entityType}`);
  }
}
