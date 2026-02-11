/**
 * Config Reader - I/O layer for reading Drupal config files
 * Combines file I/O with parsing functions.
 */

import { join } from 'path';
import { listFiles, readTextFile, directoryExists } from './fileSystem.js';
import {
  parseYaml,
  parseBundleConfig,
  parseFieldStorage,
  parseFieldInstance,
  filterBundleFiles,
  filterFieldStorageFiles,
  filterFieldInstanceFiles
} from '../parsers/configParser.js';

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
 * Parse all configuration from a config directory
 * @param {string} configPath - Path to config directory
 * @returns {Promise<object>} - Complete parsed config data
 */
export async function parseConfigDirectory(configPath) {
  if (!directoryExists(configPath)) {
    throw new Error(`Configuration directory does not exist: ${configPath}`);
  }

  const entityTypes = ['node', 'media', 'paragraph', 'taxonomy_term'];
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
