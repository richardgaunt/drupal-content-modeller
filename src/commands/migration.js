/**
 * Migration report commands - orchestration layer
 */

import { parseMigrationConfigs, parseSingleMigrationConfig } from '../io/configReader.js';
import { writeTextFile } from '../io/fileSystem.js';
import {
  generateMigrationReport,
  generateSingleMigrationReport,
  generateMigrationReportData,
  generateSingleMigrationReportData
} from '../generators/migrationReport.js';

/**
 * Read migration groups from a project's config directory
 * @param {object} project - Project object
 * @returns {Promise<object[]>} - Array of parsed migration groups
 */
async function readMigrationGroups(project) {
  const { groups } = await parseMigrationConfigs(project.configDirectory);
  return groups;
}

/**
 * Create migration report (all migrations)
 * @param {object} project - Project object
 * @param {string} outputPath - Path to write the report
 * @returns {Promise<string>} - Output path
 */
export async function createMigrationReport(project, outputPath) {
  const { groups, migrations } = await parseMigrationConfigs(project.configDirectory);
  const content = generateMigrationReport(migrations, groups, project);
  await writeTextFile(outputPath, content);
  return outputPath;
}

/**
 * Create single migration report
 * @param {object} project - Project object
 * @param {string} migrationId - Migration ID
 * @param {string} outputPath - Path to write the report
 * @returns {Promise<string|null>} - Output path or null if not found
 */
export async function createSingleMigrationReport(project, migrationId, outputPath) {
  const migration = await parseSingleMigrationConfig(project.configDirectory, migrationId);
  if (!migration) return null;

  const groups = await readMigrationGroups(project);
  const content = generateSingleMigrationReport(migration, groups, project);
  await writeTextFile(outputPath, content);
  return outputPath;
}

/**
 * Get migration report data (for JSON output)
 * @param {object} project - Project object
 * @returns {Promise<object>} - Structured report data
 */
export async function getMigrationReportData(project) {
  const { groups, migrations } = await parseMigrationConfigs(project.configDirectory);
  return generateMigrationReportData(migrations, groups, project);
}

/**
 * Get single migration report data (for JSON output)
 * @param {object} project - Project object
 * @param {string} migrationId - Migration ID
 * @returns {Promise<object|null>} - Structured report data or null
 */
export async function getSingleMigrationReportData(project, migrationId) {
  const migration = await parseSingleMigrationConfig(project.configDirectory, migrationId);
  if (!migration) return null;

  const groups = await readMigrationGroups(project);
  return generateSingleMigrationReportData(migration, groups, project);
}

/**
 * List all migration IDs in a project
 * @param {object} project - Project object
 * @returns {Promise<object[]>} - Array of { id, label, group }
 */
export async function listMigrations(project) {
  const { groups, migrations } = await parseMigrationConfigs(project.configDirectory);

  return migrations.map(m => {
    const group = groups.find(g => g.id === m.migrationGroup);
    return {
      id: m.id,
      label: m.label,
      group: group ? group.label : m.migrationGroup || ''
    };
  }).sort((a, b) => a.id.localeCompare(b.id));
}
