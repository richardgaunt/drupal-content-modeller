/**
 * Sync Configuration command
 * Analyzes the config directory and updates the project's entity/field index.
 */

import { parseConfigDirectory } from '../io/configReader';
import { saveProject } from './project';

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
