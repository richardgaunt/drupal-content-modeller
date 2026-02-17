/**
 * Config Reader - I/O layer for reading Drupal config files
 * Combines file I/O with parsing functions.
 */

import { join } from 'path';
import { existsSync } from 'fs';
import { listFiles, readTextFile, directoryExists, writeYamlFile } from './fileSystem.js';
import {
  parseYaml,
  parseBundleConfig,
  parseFieldStorage,
  parseFieldInstance,
  filterBundleFiles,
  filterFieldStorageFiles,
  filterFieldInstanceFiles,
  filterBaseFieldOverrideFiles,
  parseBaseFieldOverride,
  parseEnabledModules,
  getMissingRecommendedModules,
  generateUpdatedExtensionConfig
} from '../parsers/configParser.js';
import {
  parseFormDisplay,
  getFormDisplayFilename
} from '../parsers/formDisplayParser.js';
import {
  parseRole,
  getRoleFilename,
  isRoleFile,
  extractRoleIdFromFilename
} from '../parsers/roleParser.js';

/**
 * Parse bundle configs from a config directory
 * @param {string} configPath - Path to config directory
 * @param {string} entityType - Entity type (node, media, paragraph, taxonomy_term)
 * @returns {Promise<object[]>} - Array of bundle info objects
 */
export async function parseBundleConfigs(configPath, entityType) {
  if (!directoryExists(configPath)) {
    throw new Error(`Configuration directory does not exist: ${configPath}`);
  }

  const files = await listFiles(configPath);
  const bundleFiles = filterBundleFiles(files, entityType);
  const bundles = [];

  for (const filename of bundleFiles) {
    try {
      const content = await readTextFile(join(configPath, filename));
      const config = parseYaml(content);

      if (config) {
        const bundle = parseBundleConfig(config, entityType);
        if (bundle.id) {
          bundles.push(bundle);
        }
      }
    } catch (error) {
      // Log warning and continue
      console.warn(`Warning: Could not parse ${filename}: ${error.message}`);
    }
  }

  return bundles;
}

/**
 * Parse field storage configs from a config directory
 * @param {string} configPath - Path to config directory
 * @param {string} entityType - Entity type
 * @returns {Promise<object[]>} - Array of field storage info objects
 */
export async function parseFieldStorages(configPath, entityType) {
  if (!directoryExists(configPath)) {
    throw new Error(`Configuration directory does not exist: ${configPath}`);
  }

  const files = await listFiles(configPath);
  const storageFiles = filterFieldStorageFiles(files, entityType);
  const storages = [];

  for (const filename of storageFiles) {
    try {
      const content = await readTextFile(join(configPath, filename));
      const config = parseYaml(content);

      if (config) {
        const storage = parseFieldStorage(config);
        if (storage.name) {
          storages.push(storage);
        }
      }
    } catch (error) {
      console.warn(`Warning: Could not parse ${filename}: ${error.message}`);
    }
  }

  return storages;
}

/**
 * Parse field instance configs from a config directory for a specific bundle
 * @param {string} configPath - Path to config directory
 * @param {string} entityType - Entity type
 * @param {string} bundle - Bundle name
 * @returns {Promise<object[]>} - Array of field instance info objects
 */
export async function parseFieldInstances(configPath, entityType, bundle) {
  if (!directoryExists(configPath)) {
    throw new Error(`Configuration directory does not exist: ${configPath}`);
  }

  const files = await listFiles(configPath);
  const instanceFiles = filterFieldInstanceFiles(files, entityType, bundle);
  const instances = [];

  for (const filename of instanceFiles) {
    try {
      const content = await readTextFile(join(configPath, filename));
      const config = parseYaml(content);

      if (config) {
        const instance = parseFieldInstance(config);
        if (instance.name) {
          instances.push(instance);
        }
      }
    } catch (error) {
      console.warn(`Warning: Could not parse ${filename}: ${error.message}`);
    }
  }

  return instances;
}

/**
 * Parse base field override configs from a config directory for a specific bundle
 * @param {string} configPath - Path to config directory
 * @param {string} entityType - Entity type
 * @param {string} bundle - Bundle name
 * @returns {Promise<object>} - Object keyed by field name with override data
 */
export async function parseBaseFieldOverrides(configPath, entityType, bundle) {
  if (!directoryExists(configPath)) {
    return {};
  }

  const files = await listFiles(configPath);
  const overrideFiles = filterBaseFieldOverrideFiles(files, entityType, bundle);
  const overrides = {};

  for (const filename of overrideFiles) {
    try {
      const content = await readTextFile(join(configPath, filename));
      const config = parseYaml(content);

      if (config) {
        const override = parseBaseFieldOverride(config);
        if (override.fieldName) {
          overrides[override.fieldName] = override;
        }
      }
    } catch (error) {
      console.warn(`Warning: Could not parse ${filename}: ${error.message}`);
    }
  }

  return overrides;
}

/**
 * Get the path to core.extension.yml in a config directory
 * @param {string} configPath - Path to config directory
 * @returns {string} - Path to core.extension.yml
 */
export function getCoreExtensionPath(configPath) {
  return join(configPath, 'core.extension.yml');
}

/**
 * Check if core.extension.yml exists in a config directory
 * @param {string} configPath - Path to config directory
 * @returns {boolean} - True if file exists
 */
export function coreExtensionExists(configPath) {
  return existsSync(getCoreExtensionPath(configPath));
}

/**
 * Read and parse core.extension.yml
 * @param {string} configPath - Path to config directory
 * @returns {Promise<object|null>} - Parsed config or null if not found
 */
export async function readCoreExtension(configPath) {
  const extensionPath = getCoreExtensionPath(configPath);
  if (!existsSync(extensionPath)) {
    return null;
  }

  const content = await readTextFile(extensionPath);
  return parseYaml(content);
}

/**
 * Get list of enabled modules from a config directory
 * @param {string} configPath - Path to config directory
 * @returns {Promise<string[]>} - Array of enabled module names
 */
export async function getEnabledModules(configPath) {
  const config = await readCoreExtension(configPath);
  return parseEnabledModules(config);
}

/**
 * Check which recommended modules are missing in a config directory
 * @param {string} configPath - Path to config directory
 * @returns {Promise<object>} - Object with enabledModules and missingModules arrays
 */
export async function checkRecommendedModules(configPath) {
  const enabledModules = await getEnabledModules(configPath);
  const missingModules = getMissingRecommendedModules(enabledModules);

  return {
    enabledModules,
    missingModules
  };
}

/**
 * Enable modules in core.extension.yml
 * @param {string} configPath - Path to config directory
 * @param {string[]} modulesToEnable - Module names to enable
 * @returns {Promise<void>}
 */
export async function enableModules(configPath, modulesToEnable) {
  const extensionPath = getCoreExtensionPath(configPath);
  let config = await readCoreExtension(configPath);

  if (!config) {
    config = { module: {}, theme: {}, profile: '' };
  }

  const updatedYaml = generateUpdatedExtensionConfig(config, modulesToEnable);
  await writeYamlFile(extensionPath, updatedYaml);
}

/**
 * Parse all configuration from a config directory
 * @param {string} configPath - Path to config directory
 * @returns {Promise<object>} - Complete parsed config data
 */
export async function parseConfigDirectory(configPath) {
  if (!directoryExists(configPath)) {
    throw new Error(`Configuration directory does not exist: ${configPath}`);
  }

  const entityTypes = ['node', 'media', 'paragraph', 'taxonomy_term', 'block_content'];
  const result = {};

  for (const entityType of entityTypes) {
    const bundles = await parseBundleConfigs(configPath, entityType);
    const fieldStorages = await parseFieldStorages(configPath, entityType);

    // Create a map of field storages for quick lookup
    const storageMap = {};
    for (const storage of fieldStorages) {
      storageMap[storage.name] = storage;
    }

    // Build entity type data with bundles and fields
    result[entityType] = {};

    for (const bundle of bundles) {
      const fieldInstances = await parseFieldInstances(configPath, entityType, bundle.id);

      // Merge field instance with storage data
      const fields = {};
      for (const instance of fieldInstances) {
        const storage = storageMap[instance.name] || {};
        fields[instance.name] = {
          name: instance.name,
          label: instance.label,
          type: instance.type || storage.type || '',
          required: instance.required,
          cardinality: storage.cardinality || 1,
          description: instance.description,
          settings: {
            ...storage.settings,
            ...instance.settings
          }
        };
      }

      result[entityType][bundle.id] = {
        id: bundle.id,
        label: bundle.label,
        description: bundle.description,
        fields
      };
    }
  }

  return result;
}

/**
 * Get the path to form display file
 * @param {string} configPath - Path to config directory
 * @param {string} entityType - Entity type
 * @param {string} bundle - Bundle name
 * @returns {string} - Path to form display file
 */
export function getFormDisplayPath(configPath, entityType, bundle) {
  return join(configPath, getFormDisplayFilename(entityType, bundle));
}

/**
 * Check if form display exists for a bundle
 * @param {string} configPath - Path to config directory
 * @param {string} entityType - Entity type
 * @param {string} bundle - Bundle name
 * @returns {boolean} - True if exists
 */
export function formDisplayExists(configPath, entityType, bundle) {
  return existsSync(getFormDisplayPath(configPath, entityType, bundle));
}

/**
 * Read and parse form display for a bundle
 * @param {string} configPath - Path to config directory
 * @param {string} entityType - Entity type
 * @param {string} bundle - Bundle name
 * @returns {Promise<object|null>} - Parsed form display or null
 */
export async function readFormDisplay(configPath, entityType, bundle) {
  const filePath = getFormDisplayPath(configPath, entityType, bundle);

  if (!existsSync(filePath)) {
    return null;
  }

  try {
    const content = await readTextFile(filePath);
    const config = parseYaml(content);
    return parseFormDisplay(config);
  } catch (error) {
    console.warn(`Warning: Could not parse form display: ${error.message}`);
    return null;
  }
}

/**
 * Get the path to a field instance config file
 * @param {string} configPath - Path to config directory
 * @param {string} entityType - Entity type
 * @param {string} bundle - Bundle name
 * @param {string} fieldName - Field name
 * @returns {string} - Path to field instance file
 */
export function getFieldInstancePath(configPath, entityType, bundle, fieldName) {
  return join(configPath, `field.field.${entityType}.${bundle}.${fieldName}.yml`);
}

/**
 * Check if field instance config exists
 * @param {string} configPath - Path to config directory
 * @param {string} entityType - Entity type
 * @param {string} bundle - Bundle name
 * @param {string} fieldName - Field name
 * @returns {boolean} - True if exists
 */
export function fieldInstanceExists(configPath, entityType, bundle, fieldName) {
  return existsSync(getFieldInstancePath(configPath, entityType, bundle, fieldName));
}

/**
 * Read and parse a single field instance config
 * @param {string} configPath - Path to config directory
 * @param {string} entityType - Entity type
 * @param {string} bundle - Bundle name
 * @param {string} fieldName - Field name
 * @returns {Promise<object|null>} - Parsed field instance or null
 */
export async function readFieldInstance(configPath, entityType, bundle, fieldName) {
  const filePath = getFieldInstancePath(configPath, entityType, bundle, fieldName);

  if (!existsSync(filePath)) {
    return null;
  }

  try {
    const content = await readTextFile(filePath);
    const config = parseYaml(content);
    return parseFieldInstance(config);
  } catch (error) {
    console.warn(`Warning: Could not parse field instance: ${error.message}`);
    return null;
  }
}

/**
 * Get form display path for a specific mode
 * @param {string} configPath - Path to config directory
 * @param {string} entityType - Entity type
 * @param {string} bundle - Bundle name
 * @param {string} mode - Form mode (default: 'default')
 * @returns {string} - Path to form display file
 */
export function getFormDisplayPathWithMode(configPath, entityType, bundle, mode = 'default') {
  return join(configPath, `core.entity_form_display.${entityType}.${bundle}.${mode}.yml`);
}

/**
 * Check if form display exists for a specific mode
 * @param {string} configPath - Path to config directory
 * @param {string} entityType - Entity type
 * @param {string} bundle - Bundle name
 * @param {string} mode - Form mode
 * @returns {boolean} - True if exists
 */
export function formDisplayExistsWithMode(configPath, entityType, bundle, mode) {
  return existsSync(getFormDisplayPathWithMode(configPath, entityType, bundle, mode));
}

/**
 * List all form display modes for a bundle
 * @param {string} configPath - Path to config directory
 * @param {string} entityType - Entity type
 * @param {string} bundle - Bundle name
 * @returns {Promise<string[]>} - Array of form mode names
 */
export async function listFormDisplayModes(configPath, entityType, bundle) {
  const files = await listFiles(configPath);
  const prefix = `core.entity_form_display.${entityType}.${bundle}.`;
  const suffix = '.yml';

  const modes = files
    .filter(f => f.startsWith(prefix) && f.endsWith(suffix))
    .map(f => f.slice(prefix.length, -suffix.length));

  return modes;
}

// ============================================
// Role Functions
// ============================================

/**
 * Get the file path for a role
 * @param {string} configPath - Path to config directory
 * @param {string} roleId - Role machine name
 * @returns {string} - Full file path
 */
export function getRolePath(configPath, roleId) {
  return join(configPath, getRoleFilename(roleId));
}

/**
 * Check if a role exists
 * @param {string} configPath - Path to config directory
 * @param {string} roleId - Role machine name
 * @returns {boolean}
 */
export function roleExists(configPath, roleId) {
  return existsSync(getRolePath(configPath, roleId));
}

/**
 * Read and parse a role file
 * @param {string} configPath - Path to config directory
 * @param {string} roleId - Role machine name
 * @returns {Promise<object|null>} - Parsed role or null
 */
export async function readRole(configPath, roleId) {
  const filePath = getRolePath(configPath, roleId);

  if (!existsSync(filePath)) {
    return null;
  }

  try {
    const content = await readTextFile(filePath);
    const config = parseYaml(content);
    return parseRole(config);
  } catch (error) {
    console.warn(`Warning: Could not parse role ${roleId}: ${error.message}`);
    return null;
  }
}

/**
 * List all roles in config directory
 * @param {string} configPath - Path to config directory
 * @returns {Promise<string[]>} - Array of role IDs
 */
export async function listRoleFiles(configPath) {
  if (!directoryExists(configPath)) {
    return [];
  }

  const files = await listFiles(configPath);
  return files
    .filter(f => isRoleFile(f))
    .map(f => extractRoleIdFromFilename(f))
    .filter(Boolean);
}

/**
 * Read all roles from config directory
 * @param {string} configPath - Path to config directory
 * @returns {Promise<object[]>} - Array of parsed roles
 */
export async function readAllRoles(configPath) {
  const roleIds = await listRoleFiles(configPath);
  const roles = [];

  for (const roleId of roleIds) {
    const role = await readRole(configPath, roleId);
    if (role) {
      roles.push(role);
    }
  }

  return roles.sort((a, b) => a.weight - b.weight);
}

/**
 * Write role to config file
 * @param {string} configPath - Path to config directory
 * @param {string} roleId - Role machine name
 * @param {string} yamlContent - YAML content
 * @returns {Promise<void>}
 */
export async function writeRole(configPath, roleId, yamlContent) {
  const filePath = getRolePath(configPath, roleId);
  await writeYamlFile(filePath, yamlContent);
}

/**
 * Delete role file
 * @param {string} configPath - Path to config directory
 * @param {string} roleId - Role machine name
 * @returns {Promise<boolean>} - True if deleted
 */
export async function deleteRoleFile(configPath, roleId) {
  const filePath = getRolePath(configPath, roleId);

  if (!existsSync(filePath)) {
    return false;
  }

  const { unlink } = await import('fs/promises');
  await unlink(filePath);
  return true;
}
