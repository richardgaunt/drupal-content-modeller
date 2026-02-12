/**
 * Report generation commands
 */

import { generateEntityTypeReport, generateProjectReport } from '../generators/reportGenerator.js';
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
