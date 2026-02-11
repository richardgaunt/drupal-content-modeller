/**
 * Create commands
 * Commands for creating new bundles and fields.
 */

import { join } from 'path';
import { writeYamlFile } from '../io/fileSystem.js';
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

  return true;
}

/**
 * Create a new bundle
 * @param {object} project - Project object
 * @param {string} entityType - Entity type (node, media, paragraph, taxonomy_term)
 * @param {object} options - Bundle options
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
