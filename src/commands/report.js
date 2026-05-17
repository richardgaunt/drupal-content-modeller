/**
 * Report generation commands
 */

import { generateEntityTypeReport, generateProjectReport, generateSingleBundleReport } from '../generators/reportGenerator.js';
import { generatePermissionReportData, formatPermissionReportMarkdown } from '../generators/permissionReport.js';
import { writeTextFile } from '../io/fileSystem.js';

/**
 * Create a report for a single entity type
 * @param {object} project - Project object
 * @param {string} entityType - Entity type
 * @param {string} outputPath - Path to write the report
 * @param {string} baseUrl - Base URL for links
 * @returns {Promise<string>} - Output path
 */
export async function createEntityReport(project, entityType, outputPath, baseUrl = '', options = {}) {
  const content = generateEntityTypeReport(project, entityType, baseUrl, options);
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
export async function createProjectReport(project, outputPath, baseUrl = '', options = {}) {
  const content = generateProjectReport(project, baseUrl, options);
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

/**
 * Create a combined permissions + workflow report.
 * @param {object} project - Synced project
 * @param {object[]} roles - Parsed roles
 * @param {object[]} workflows - Parsed workflows
 * @param {object} opts - { scope, entityType, bundle, baseUrl }
 * @param {string} basePath - Output path without extension
 * @param {'md'|'json'|'both'} format - Which artifacts to write
 * @returns {Promise<{data:object, markdownPath:string|null, jsonPath:string|null}>}
 */
export async function createPermissionReport(project, roles, workflows, opts, basePath, format = 'both') {
  const data = generatePermissionReportData(project, roles, workflows, opts);
  let markdownPath = null;
  let jsonPath = null;

  if (format === 'md' || format === 'both') {
    markdownPath = `${basePath}.md`;
    await writeTextFile(markdownPath, formatPermissionReportMarkdown(data));
  }
  if (format === 'json' || format === 'both') {
    jsonPath = `${basePath}.json`;
    await writeTextFile(jsonPath, JSON.stringify(data, null, 2));
  }

  return { data, markdownPath, jsonPath };
}
