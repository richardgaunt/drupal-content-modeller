/**
 * Report generation commands
 */

import { generateEntityTypeReport, generateProjectReport, generateSingleBundleReport } from '../generators/reportGenerator.js';
import { writeTextFile } from '../io/fileSystem.js';

/**
 * Create a report for a single entity type
 * @param {object} project - Project object
 * @param {string} entityType - Entity type
 * @param {string} outputPath - Path to write the report
 * @param {string} baseUrl - Base URL for links
 * @returns {Promise<string>} - Output path
 */
export async function createEntityReport(project, entityType, outputPath, baseUrl = '') {
  const content = generateEntityTypeReport(project, entityType, baseUrl);
  await writeTextFile(outputPath, content);
  return outputPath;
}

/**
 * Create a full project report
 * @param {object} project - Project object
 * @param {string} outputPath - Path to write the report
 * @param {string} baseUrl - Base URL for links
 * @returns {Promise<string>} - Output path
 */
export async function createProjectReport(project, outputPath, baseUrl = '') {
  const content = generateProjectReport(project, baseUrl);
  await writeTextFile(outputPath, content);
  return outputPath;
}

/**
 * Create a report for a single bundle
 * @param {object} project - Project object
 * @param {string} entityType - Entity type
 * @param {string} bundleId - Bundle machine name
 * @param {string} outputPath - Path to write the report
 * @param {string} baseUrl - Base URL for links
 * @param {object} options - Options (e.g., baseFieldOverrides)
 * @returns {Promise<string|null>} - Output path or null if bundle not found
 */
export async function createBundleReport(project, entityType, bundleId, outputPath, baseUrl = '', options = {}) {
  const content = generateSingleBundleReport(project, entityType, bundleId, baseUrl, options);
  if (!content) {
    return null;
  }
  await writeTextFile(outputPath, content);
  return outputPath;
}
