/**
 * Field Generator
 * Generates YAML configuration for Drupal fields.
 */

import yaml from 'js-yaml';
import { generateMachineName } from './bundleGenerator.js';

/**
 * Field type to module mapping
 */
export const FIELD_MODULES = {
  string: 'core',
  string_long: 'core',
  text_long: 'text',
  boolean: 'core',
  integer: 'core',
  list_string: 'options',
  list_integer: 'options',
  datetime: 'datetime',
  daterange: 'datetime_range',
  link: 'link',
  image: 'image',
  file: 'file',
  entity_reference: 'core',
  entity_reference_revisions: 'entity_reference_revisions'
};

/**
 * Entity type prefixes for field names
 */
export const ENTITY_PREFIXES = {
  node: 'field_n_',
  media: 'field_m_',
  paragraph: 'field_p_',
  taxonomy_term: 'field_t_',
  block_content: 'field_b_'
};

/**
 * Supported field types for UI selection
 */
export const FIELD_TYPES = [
  { value: 'string', name: 'Text (plain)' },
  { value: 'string_long', name: 'Text (plain, long)' },
  { value: 'text_long', name: 'Text (formatted, long)' },
  { value: 'boolean', name: 'Boolean' },
  { value: 'integer', name: 'Number (integer)' },
  { value: 'list_string', name: 'List (text)' },
  { value: 'datetime', name: 'Date' },
  { value: 'daterange', name: 'Date range' },
  { value: 'link', name: 'Link' },
  { value: 'image', name: 'Image' },
  { value: 'file', name: 'File' },
  { value: 'entity_reference', name: 'Entity Reference' },
  { value: 'entity_reference_revisions', name: 'Paragraphs (Entity Reference Revisions)' }
];

/**
 * Get module for field type
 * @param {string} fieldType - Field type
 * @returns {string} - Module name
 */
export function getModuleForFieldType(fieldType) {
  return FIELD_MODULES[fieldType] || 'core';
}

/**
 * Generate field name from label with entity prefix
 * @param {string} entityType - Entity type
 * @param {string} label - Field label
 * @returns {string} - Field machine name
 */
export function generateFieldName(entityType, label) {
  const prefix = ENTITY_PREFIXES[entityType] || 'field_';
  const suffix = generateMachineName(label);
  return `${prefix}${suffix}`;
}

/**
 * Get storage filename
 * @param {string} entityType - Entity type
 * @param {string} fieldName - Field machine name
 * @returns {string} - Filename
 */
export function getStorageFilename(entityType, fieldName) {
  return `field.storage.${entityType}.${fieldName}.yml`;
}

/**
 * Get instance filename
 * @param {string} entityType - Entity type
 * @param {string} bundle - Bundle machine name
 * @param {string} fieldName - Field machine name
 * @returns {string} - Filename
 */
export function getInstanceFilename(entityType, bundle, fieldName) {
  return `field.field.${entityType}.${bundle}.${fieldName}.yml`;
}

/**
 * Get string field settings
 * @param {object} options - Field options
 * @returns {object} - Settings object
 */
export function getStringSettings(options = {}) {
  return {
    max_length: options.maxLength || 255
  };
}

/**
 * Get list string field settings
 * @param {object} options - Field options
 * @returns {object} - Settings object
 */
export function getListStringSettings(options = {}) {
  const allowedValues = options.allowedValues || [];
  return {
    allowed_values: allowedValues.map(item => ({
      value: item.value || item.key,
      label: item.label
    })),
    allowed_values_function: ''
  };
}

/**
 * Get datetime field settings (storage)
 * @param {object} options - Field options
 * @returns {object} - Settings object
 */
export function getDatetimeSettings(options = {}) {
  return {
    datetime_type: options.datetimeType || 'date'
  };
}

/**
 * Get entity reference field settings (storage)
 * @param {object} options - Field options
 * @returns {object} - Settings object
 */
export function getEntityReferenceSettings(options = {}) {
  return {
    target_type: options.targetType || 'node'
  };
}

/**
 * Get entity reference revisions field settings (storage)
 * Always targets paragraphs
 * @returns {object} - Settings object
 */
export function getEntityReferenceRevisionsStorageSettings() {
  return {
    target_type: 'paragraph'
  };
}

/**
 * Get entity reference handler settings (instance)
 * @param {object} options - Field options
 * @returns {object} - Handler settings object
 */
export function getEntityReferenceHandlerSettings(options = {}) {
  const targetBundles = options.targetBundles || [];
  const bundleSettings = {};

  for (const bundle of targetBundles) {
    bundleSettings[bundle] = bundle;
  }

  return {
    handler: 'default',
    handler_settings: {
      target_bundles: bundleSettings,
      sort: {
        field: '_none'
      },
      auto_create: false
    }
  };
}

/**
 * Get entity reference revisions handler settings (instance)
 * Used for paragraph references with drag-drop ordering
 * @param {object} options - Field options
 * @returns {object} - Handler settings object
 */
export function getEntityReferenceRevisionsHandlerSettings(options = {}) {
  const targetBundles = options.targetBundles || [];
  const bundleSettings = {};
  const dragDropSettings = {};

  targetBundles.forEach((bundle, index) => {
    bundleSettings[bundle] = bundle;
    dragDropSettings[bundle] = {
      weight: index,
      enabled: true
    };
  });

  return {
    handler: 'default:paragraph',
    handler_settings: {
      target_bundles: bundleSettings,
      negate: 0,
      target_bundles_drag_drop: dragDropSettings
    }
  };
}

/**
 * Get link field settings
 * @param {object} options - Field options
 * @returns {object} - Settings object
 */
export function getLinkSettings(options = {}) {
  // link_type: 16 = external only, 17 = both internal and external
  const linkType = options.allowExternal !== false ? 17 : 1;
  // title: 0 = disabled, 1 = optional, 2 = required
  const titleMap = { disabled: 0, optional: 1, required: 2 };
  const title = titleMap[options.titleOption] !== undefined ? titleMap[options.titleOption] : 1;

  return {
    link_type: linkType,
    title: title
  };
}

/**
 * Get image field settings
 * @param {object} options - Field options
 * @returns {object} - Settings object
 */
export function getImageSettings(options = {}) {
  return {
    file_extensions: options.fileExtensions || 'png gif jpg jpeg svg',
    alt_field: true,
    alt_field_required: options.altRequired !== false,
    title_field: false,
    title_field_required: false,
    max_resolution: options.maxResolution || '',
    min_resolution: '',
    default_image: {
      uuid: null,
      alt: '',
      title: '',
      width: null,
      height: null
    },
    file_directory: options.fileDirectory || 'images/[date:custom:Y]-[date:custom:m]',
    max_filesize: options.maxFileSize || ''
  };
}

/**
 * Get file field settings
 * @param {object} options - Field options
 * @returns {object} - Settings object
 */
export function getFileSettings(options = {}) {
  return {
    file_extensions: options.fileExtensions || 'txt pdf doc docx xls xlsx',
    file_directory: options.fileDirectory || 'documents/[date:custom:Y]-[date:custom:m]',
    max_filesize: options.maxFileSize || '',
    description_field: false
  };
}

/**
 * Get storage settings for field type
 * @param {string} fieldType - Field type
 * @param {object} options - Field options
 * @returns {object} - Settings object
 */
export function getStorageSettings(fieldType, options = {}) {
  switch (fieldType) {
    case 'string':
      return getStringSettings(options);
    case 'list_string':
      return getListStringSettings(options);
    case 'datetime':
    case 'daterange':
      return getDatetimeSettings(options);
    case 'entity_reference':
      return getEntityReferenceSettings(options);
    case 'entity_reference_revisions':
      return getEntityReferenceRevisionsStorageSettings();
    default:
      return {};
  }
}

/**
 * Get instance settings for field type
 * @param {string} fieldType - Field type
 * @param {object} options - Field options
 * @returns {object} - Settings object
 */
export function getInstanceSettings(fieldType, options = {}) {
  switch (fieldType) {
    case 'link':
      return getLinkSettings(options);
    case 'image':
      return getImageSettings(options);
    case 'file':
      return getFileSettings(options);
    case 'entity_reference':
      return getEntityReferenceHandlerSettings(options);
    case 'entity_reference_revisions':
      return getEntityReferenceRevisionsHandlerSettings(options);
    default:
      return {};
  }
}

/**
 * Generate field storage YAML
 * @param {object} options - Field options
 * @returns {string} - YAML string
 */
export function generateFieldStorage(options) {
  const {
    entityType,
    fieldName,
    fieldType,
    cardinality = 1,
    settings = {}
  } = options;

  const module = getModuleForFieldType(fieldType);
  const storageSettings = getStorageSettings(fieldType, settings);

  // For entity_reference_revisions, include both modules
  const moduleDeps = fieldType === 'entity_reference_revisions'
    ? ['entity_reference_revisions', 'paragraphs']
    : [module];

  const config = {
    langcode: 'en',
    status: true,
    dependencies: {
      module: moduleDeps
    },
    id: `${entityType}.${fieldName}`,
    field_name: fieldName,
    entity_type: entityType,
    type: fieldType,
    settings: storageSettings,
    module: module,
    locked: false,
    cardinality: cardinality,
    translatable: true,
    indexes: [],
    persist_with_no_fields: false,
    custom_storage: false
  };

  return yaml.dump(config, { quotingType: "'", forceQuotes: false });
}

/**
 * Generate field instance YAML
 * @param {object} options - Field options
 * @returns {string} - YAML string
 */
export function generateFieldInstance(options) {
  const {
    entityType,
    bundle,
    fieldName,
    fieldType,
    label,
    description = '',
    required = false,
    settings = {}
  } = options;

  const module = getModuleForFieldType(fieldType);
  const instanceSettings = getInstanceSettings(fieldType, settings);

  // Build dependencies
  const configDeps = [
    `field.storage.${entityType}.${fieldName}`
  ];

  // Add bundle dependency based on entity type
  switch (entityType) {
    case 'node':
      configDeps.push(`node.type.${bundle}`);
      break;
    case 'media':
      configDeps.push(`media.type.${bundle}`);
      break;
    case 'paragraph':
      configDeps.push(`paragraphs.paragraphs_type.${bundle}`);
      break;
    case 'taxonomy_term':
      configDeps.push(`taxonomy.vocabulary.${bundle}`);
      break;
    case 'block_content':
      configDeps.push(`block_content.type.${bundle}`);
      break;
  }

  // For entity_reference_revisions, add paragraph type dependencies
  if (fieldType === 'entity_reference_revisions' && settings.targetBundles) {
    for (const targetBundle of settings.targetBundles) {
      configDeps.push(`paragraphs.paragraphs_type.${targetBundle}`);
    }
  }

  const config = {
    langcode: 'en',
    status: true,
    dependencies: {
      config: configDeps,
      module: [module]
    },
    id: `${entityType}.${bundle}.${fieldName}`,
    field_name: fieldName,
    entity_type: entityType,
    bundle: bundle,
    label: label,
    description: description,
    required: required,
    translatable: true,
    default_value: [],
    default_value_callback: '',
    settings: instanceSettings,
    field_type: fieldType
  };

  return yaml.dump(config, { quotingType: "'", forceQuotes: false });
}

/**
 * Check if field storage exists
 * @param {object} project - Project object
 * @param {string} entityType - Entity type
 * @param {string} fieldName - Field name
 * @returns {boolean} - True if storage exists
 */
export function fieldStorageExists(project, entityType, fieldName) {
  if (!project.entities || !project.entities[entityType]) {
    return false;
  }

  // Check all bundles for this field
  const bundles = project.entities[entityType];
  for (const bundle of Object.values(bundles)) {
    if (bundle.fields && bundle.fields[fieldName]) {
      return true;
    }
  }

  return false;
}

/**
 * Get existing field type for a storage
 * @param {object} project - Project object
 * @param {string} entityType - Entity type
 * @param {string} fieldName - Field name
 * @returns {string|null} - Field type or null if not found
 */
export function getExistingFieldType(project, entityType, fieldName) {
  if (!project.entities || !project.entities[entityType]) {
    return null;
  }

  const bundles = project.entities[entityType];
  for (const bundle of Object.values(bundles)) {
    if (bundle.fields && bundle.fields[fieldName]) {
      return bundle.fields[fieldName].type;
    }
  }

  return null;
}
