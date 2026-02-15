/**
 * Sync Configuration command
 * Analyzes the config directory and updates the project's entity/field index.
 */

import { parseConfigDirectory, checkRecommendedModules, enableModules } from '../io/configReader.js';
import { saveProject } from './project.js';
import { RECOMMENDED_MODULES } from '../parsers/configParser.js';

/**
 * Sync a project's configuration
 * Reads the config directory and updates project.entities
 * @param {object} project - Project object to sync
 * @returns {Promise<object>} - Summary with bundlesFound and fieldsFound
 */
export async function syncProject(project) {
  if (!project || !project.configDirectory) {
    throw new Error('Invalid project: missing configDirectory');
  }

  // Parse all configuration from the config directory
  const entities = await parseConfigDirectory(project.configDirectory);

  // Count bundles and fields
  let bundlesFound = 0;
  let fieldsFound = 0;

  for (const entityType of Object.keys(entities)) {
    const bundles = entities[entityType];
    for (const bundleId of Object.keys(bundles)) {
      bundlesFound++;
      const bundle = bundles[bundleId];
      if (bundle.fields) {
        fieldsFound += Object.keys(bundle.fields).length;
      }
    }
  }

  // Update project with synced entities
  project.entities = entities;
  project.lastSync = new Date().toISOString();

  // Save the updated project
  await saveProject(project);

  return {
    bundlesFound,
    fieldsFound
  };
}

/**
 * Check recommended modules in a project
 * @param {object} project - Project object
 * @returns {Promise<object>} - Object with enabledModules and missingModules arrays
 */
export async function checkProjectModules(project) {
  if (!project || !project.configDirectory) {
    throw new Error('Invalid project: missing configDirectory');
  }

  return checkRecommendedModules(project.configDirectory);
}

/**
 * Enable modules in a project's config
 * @param {object} project - Project object
 * @param {string[]} modulesToEnable - Module names to enable
 * @returns {Promise<void>}
 */
export async function enableProjectModules(project, modulesToEnable) {
  if (!project || !project.configDirectory) {
    throw new Error('Invalid project: missing configDirectory');
  }

  await enableModules(project.configDirectory, modulesToEnable);
}

/**
 * Check if all recommended modules are enabled
 * @param {object} project - Project object
 * @returns {Promise<boolean>} - True if all recommended modules are enabled
 */
export async function allRecommendedModulesEnabled(project) {
  const { missingModules } = await checkProjectModules(project);
  return missingModules.length === 0;
}

/**
 * Get list of recommended modules
 * @returns {string[]} - Array of recommended module names
 */
export function getRecommendedModules() {
  return RECOMMENDED_MODULES;
}

/**
 * Get sync summary for display
 * @param {object} project - Project object
 * @returns {object} - Summary of entities and fields
 */
export function getSyncSummary(project) {
  if (!project.entities) {
    return {
      node: 0,
      media: 0,
      paragraph: 0,
      taxonomy_term: 0,
      totalBundles: 0,
      totalFields: 0
    };
  }

  const summary = {
    node: 0,
    media: 0,
    paragraph: 0,
    taxonomy_term: 0,
    totalBundles: 0,
    totalFields: 0
  };

  for (const entityType of Object.keys(project.entities)) {
    const bundles = project.entities[entityType];
    const bundleCount = Object.keys(bundles).length;
    summary[entityType] = bundleCount;
    summary.totalBundles += bundleCount;

    for (const bundleId of Object.keys(bundles)) {
      const bundle = bundles[bundleId];
      if (bundle.fields) {
        summary.totalFields += Object.keys(bundle.fields).length;
      }
    }
  }

  return summary;
}
