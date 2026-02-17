/**
 * Create commands
 * Commands for creating new bundles and fields.
 */

import { join } from 'path';
import yaml from 'js-yaml';
import { writeYamlFile, readTextFile } from '../io/fileSystem.js';
import {
  generateBundle,
  getBundleFilename,
  getSourceFieldName,
  generateMediaSourceFieldStorage,
  generateMediaSourceFieldInstance,
  validateMachineName
} from '../generators/bundleGenerator.js';
import {
  generateFieldStorage,
  generateFieldInstance,
  getStorageFilename,
  getInstanceFilename,
  fieldStorageExists,
  getExistingFieldType
} from '../generators/fieldGenerator.js';
import { saveProject } from './project.js';
import { parseConfigDirectory } from '../io/configReader.js';

/**
 * Get reusable fields for a given entity type and field type
 * Returns fields that exist in the project but are not used by the specified bundles
 * @param {object} project - Project object
 * @param {string} entityType - Entity type
 * @param {string} fieldType - Field type to filter by
 * @param {string[]} excludeBundles - Bundles to exclude (fields already used in these bundles won't be shown)
 * @returns {object[]} - Array of {fieldName, label, type, cardinality, usedInBundles}
 */
export function getReusableFields(project, entityType, fieldType, excludeBundles = []) {
  if (!project.entities || !project.entities[entityType]) {
    return [];
  }

  const entityBundles = project.entities[entityType];
  const fieldMap = new Map();

  // Collect all fields of the given type across all bundles
  for (const [bundleId, bundle] of Object.entries(entityBundles)) {
    if (!bundle.fields) continue;

    for (const [fieldName, fieldData] of Object.entries(bundle.fields)) {
      if (fieldData.type !== fieldType) continue;

      if (!fieldMap.has(fieldName)) {
        fieldMap.set(fieldName, {
          fieldName,
          label: fieldData.label,
          type: fieldData.type,
          cardinality: fieldData.cardinality || 1,
          settings: fieldData.settings || {},
          usedInBundles: []
        });
      }

      fieldMap.get(fieldName).usedInBundles.push(bundleId);
    }
  }

  // Filter out fields that are already used in all selected bundles
  const reusableFields = [];
  for (const field of fieldMap.values()) {
    // Check if field is used in all the selected bundles
    // If excludeBundles is empty, include all fields
    const usedInAllSelected = excludeBundles.length > 0 &&
      excludeBundles.every(b => field.usedInBundles.includes(b));
    if (!usedInAllSelected) {
      reusableFields.push(field);
    }
  }

  // Sort by label
  reusableFields.sort((a, b) => (a.label || '').localeCompare(b.label || ''));

  return reusableFields;
}

/**
 * Check if bundle already exists in project
 * @param {object} project - Project object
 * @param {string} entityType - Entity type
 * @param {string} machineName - Bundle machine name
 * @returns {boolean} - True if exists
 */
export function bundleExists(project, entityType, machineName) {
  if (!project.entities || !project.entities[entityType]) {
    return false;
  }

  return Object.prototype.hasOwnProperty.call(project.entities[entityType], machineName);
}

/**
 * Validate bundle machine name for creation
 * @param {object} project - Project object
 * @param {string} entityType - Entity type
 * @param {string} machineName - Bundle machine name
 * @returns {boolean|string} - True if valid, error message if invalid
 */
export function validateBundleMachineName(project, entityType, machineName) {
  if (!machineName) {
    return 'Machine name is required';
  }

  if (!validateMachineName(machineName)) {
    return 'Machine name must contain only lowercase letters, numbers, and underscores';
  }

  if (bundleExists(project, entityType, machineName)) {
    return `Bundle "${machineName}" already exists for ${entityType}`;
  }

  return true;
}

/**
 * Drupal field machine name maximum length
 */
export const FIELD_NAME_MAX_LENGTH = 32;

/**
 * Validate field machine name for creation
 * @param {string} fieldName - Field machine name
 * @returns {boolean|string} - True if valid, error message if invalid
 */
export function validateFieldMachineName(fieldName) {
  if (!fieldName) {
    return 'Field name is required';
  }

  // Field names must start with field_ and contain only lowercase letters, numbers, underscores
  if (!/^field_[a-z][a-z0-9_]*$/.test(fieldName)) {
    return 'Field name must start with "field_" and contain only lowercase letters, numbers, and underscores';
  }

  // Drupal has a 32 character limit on field machine names
  if (fieldName.length > FIELD_NAME_MAX_LENGTH) {
    return `Field name must be ${FIELD_NAME_MAX_LENGTH} characters or less (currently ${fieldName.length})`;
  }

  return true;
}

/**
 * Create a new bundle
 * @param {object} project - Project object
 * @param {string} entityType - Entity type (node, media, paragraph, taxonomy_term)
 * @param {object} options - Bundle options
 * @param {string} options.label - Human-readable label
 * @param {string} options.machineName - Machine name
 * @param {string} [options.description] - Description
 * @param {string} [options.sourceType] - For media: source type
 * @returns {Promise<object>} - Result with created files
 */
export async function createBundle(project, entityType, options) {
  if (!project || !project.configDirectory) {
    throw new Error('Invalid project: missing configDirectory');
  }

  const validation = validateBundleMachineName(project, entityType, options.machineName);
  if (validation !== true) {
    throw new Error(validation);
  }

  const createdFiles = [];
  const configDir = project.configDirectory;

  // Generate and save bundle YAML
  const bundleFilename = getBundleFilename(entityType, options.machineName);
  const bundlePath = join(configDir, bundleFilename);

  const bundleOptions = { ...options };

  // For media types, add source field configuration
  if (entityType === 'media' && options.sourceType) {
    const sourceField = getSourceFieldName(options.machineName, options.sourceType);
    bundleOptions.sourceField = sourceField;

    // Generate and save source field storage
    const storageYaml = generateMediaSourceFieldStorage({
      fieldName: sourceField,
      sourceType: options.sourceType
    });
    const storageFilename = `field.storage.media.${sourceField}.yml`;
    const storagePath = join(configDir, storageFilename);
    await writeYamlFile(storagePath, storageYaml);
    createdFiles.push(storageFilename);

    // Generate and save source field instance
    const sourceLabels = {
      image: 'Image',
      file: 'File',
      remote_video: 'Video URL'
    };
    const instanceYaml = generateMediaSourceFieldInstance({
      fieldName: sourceField,
      bundleName: options.machineName,
      sourceType: options.sourceType,
      label: sourceLabels[options.sourceType] || 'Source'
    });
    const instanceFilename = `field.field.media.${options.machineName}.${sourceField}.yml`;
    const instancePath = join(configDir, instanceFilename);
    await writeYamlFile(instancePath, instanceYaml);
    createdFiles.push(instanceFilename);
  }

  const bundleYaml = generateBundle(entityType, bundleOptions);
  await writeYamlFile(bundlePath, bundleYaml);
  createdFiles.push(bundleFilename);

  // Re-sync project entities
  const entities = await parseConfigDirectory(configDir);
  project.entities = entities;
  project.lastSync = new Date().toISOString();
  await saveProject(project);

  return {
    entityType,
    machineName: options.machineName,
    label: options.label,
    createdFiles
  };
}

/**
 * Create a new field
 * @param {object} project - Project object
 * @param {string} entityType - Entity type
 * @param {string[]} bundles - Target bundle(s)
 * @param {object} options - Field options
 * @returns {Promise<object>} - Result with created files
 */
export async function createField(project, entityType, bundles, options) {
  if (!project || !project.configDirectory) {
    throw new Error('Invalid project: missing configDirectory');
  }

  if (!bundles || bundles.length === 0) {
    throw new Error('At least one bundle is required');
  }

  const validation = validateFieldMachineName(options.fieldName);
  if (validation !== true) {
    throw new Error(validation);
  }

  const createdFiles = [];
  const configDir = project.configDirectory;

  // Check if storage already exists
  const storageExistsAlready = fieldStorageExists(project, entityType, options.fieldName);

  if (storageExistsAlready) {
    // Validate field type matches
    const existingType = getExistingFieldType(project, entityType, options.fieldName);
    if (existingType && existingType !== options.fieldType) {
      throw new Error(
        `Field storage for "${options.fieldName}" already exists with type "${existingType}", ` +
        `cannot create with type "${options.fieldType}"`
      );
    }
  } else {
    // Create field storage
    const storageYaml = generateFieldStorage({
      entityType,
      fieldName: options.fieldName,
      fieldType: options.fieldType,
      cardinality: options.cardinality || 1,
      settings: options.settings || {}
    });
    const storageFilename = getStorageFilename(entityType, options.fieldName);
    const storagePath = join(configDir, storageFilename);
    await writeYamlFile(storagePath, storageYaml);
    createdFiles.push(storageFilename);
  }

  // Create field instances for each bundle
  for (const bundle of bundles) {
    const instanceYaml = generateFieldInstance({
      entityType,
      bundle,
      fieldName: options.fieldName,
      fieldType: options.fieldType,
      label: options.label,
      description: options.description || '',
      required: options.required || false,
      settings: options.settings || {}
    });
    const instanceFilename = getInstanceFilename(entityType, bundle, options.fieldName);
    const instancePath = join(configDir, instanceFilename);
    await writeYamlFile(instancePath, instanceYaml);
    createdFiles.push(instanceFilename);
  }

  // Re-sync project entities
  const entities = await parseConfigDirectory(configDir);
  project.entities = entities;
  project.lastSync = new Date().toISOString();
  await saveProject(project);

  return {
    entityType,
    bundles,
    fieldName: options.fieldName,
    fieldType: options.fieldType,
    label: options.label,
    createdFiles,
    storageCreated: !storageExistsAlready
  };
}

/**
 * Update an existing field instance
 * @param {object} project - Project object
 * @param {string} entityType - Entity type
 * @param {string} bundle - Bundle name
 * @param {string} fieldName - Field machine name
 * @param {object} updates - Fields to update
 * @param {string} [updates.label] - New label
 * @param {string} [updates.description] - New description
 * @param {boolean} [updates.required] - New required value
 * @param {string[]} [updates.targetBundles] - New target bundles (for entity reference fields)
 * @returns {Promise<object>} - Result with updated file
 */
export async function updateField(project, entityType, bundle, fieldName, updates) {
  if (!project || !project.configDirectory) {
    throw new Error('Invalid project: missing configDirectory');
  }

  const configDir = project.configDirectory;
  const instanceFilename = getInstanceFilename(entityType, bundle, fieldName);
  const instancePath = join(configDir, instanceFilename);

  // Read existing field instance
  let content;
  try {
    content = await readTextFile(instancePath);
  } catch {
    throw new Error(`Field instance file not found: ${instanceFilename}`);
  }

  // Parse YAML
  const config = yaml.load(content);

  // Update fields
  if (updates.label !== undefined) {
    config.label = updates.label;
  }

  if (updates.description !== undefined) {
    config.description = updates.description;
  }

  if (updates.required !== undefined) {
    config.required = updates.required;
  }

  // Update target bundles for entity reference fields
  if (updates.targetBundles !== undefined) {
    const fieldType = config.field_type;
    if (fieldType === 'entity_reference' || fieldType === 'entity_reference_revisions') {
      // Build target bundles object
      const bundleSettings = {};
      for (const targetBundle of updates.targetBundles) {
        bundleSettings[targetBundle] = targetBundle;
      }

      if (!config.settings) {
        config.settings = {};
      }
      if (!config.settings.handler_settings) {
        config.settings.handler_settings = {};
      }
      config.settings.handler_settings.target_bundles = bundleSettings;

      // For entity_reference_revisions, also update drag_drop settings
      if (fieldType === 'entity_reference_revisions') {
        const dragDropSettings = {};
        updates.targetBundles.forEach((targetBundle, index) => {
          dragDropSettings[targetBundle] = {
            weight: index,
            enabled: true
          };
        });
        config.settings.handler_settings.target_bundles_drag_drop = dragDropSettings;
      }
    }
  }

  // Write updated YAML
  const updatedYaml = yaml.dump(config, { quotingType: "'", forceQuotes: false });
  await writeYamlFile(instancePath, updatedYaml);

  // Re-sync project entities
  const entities = await parseConfigDirectory(configDir);
  project.entities = entities;
  project.lastSync = new Date().toISOString();
  await saveProject(project);

  return {
    entityType,
    bundle,
    fieldName,
    updatedFile: instanceFilename
  };
}
