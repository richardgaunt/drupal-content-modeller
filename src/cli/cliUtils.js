/**
 * Shared CLI utilities
 * Common functions used across CLI command and menu modules.
 */

import chalk from 'chalk';
import { appendLog } from '../io/commandLog.js';
import { syncProject } from '../commands/sync.js';
import {
  checkDrushAvailable,
  syncWithDrupal,
  getSyncStatus
} from '../commands/drush.js';

/**
 * Valid entity types
 */
export const VALID_ENTITY_TYPES = ['node', 'media', 'paragraph', 'taxonomy_term', 'block_content'];

/**
 * Valid media source types
 */
export const VALID_SOURCE_TYPES = ['image', 'file', 'remote_video'];

/**
 * Valid field types
 */
export const VALID_FIELD_TYPES = [
  'string', 'string_long', 'text_long', 'boolean', 'integer',
  'list_string', 'list_integer', 'datetime', 'daterange',
  'link', 'image', 'file', 'entity_reference', 'entity_reference_revisions', 'webform', 'email'
];

/**
 * Validate entity type
 */
export function isValidEntityType(entityType) {
  return VALID_ENTITY_TYPES.includes(entityType);
}

/**
 * Validate field type
 */
export function isValidFieldType(fieldType) {
  return VALID_FIELD_TYPES.includes(fieldType);
}

/**
 * Output data as JSON or formatted text
 */
export function output(data, json = false) {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.log(data);
  }
}

/**
 * Handle errors consistently
 */
export function handleError(error) {
  console.error(chalk.red(`Error: ${error.message}`));
  process.exit(1);
}

/**
 * Get the CLI command string from process.argv
 */
function getCliString() {
  return 'dcm ' + process.argv.slice(2).join(' ');
}

/**
 * Log a successful command execution
 */
export function logSuccess(slug) {
  try {
    appendLog(slug, { cli: getCliString(), success: true });
  } catch {
    // Silent fail
  }
}

/**
 * Log a failed command execution
 */
export function logFailure(slug, errorMessage) {
  try {
    appendLog(slug, { cli: getCliString(), success: false, error: errorMessage });
  } catch {
    // Silent fail
  }
}

/**
 * Sync project configuration (updates project.json with config directory contents)
 * @param {object} project - Project object
 * @returns {Promise<void>}
 */
export async function autoSyncProject(project) {
  try {
    await syncProject(project);
  } catch {
    // Silent fail for auto-sync - don't interrupt the main operation
  }
}

/**
 * Run drush sync if --sync flag is passed, then sync project
 * @param {object} project - Project object
 * @param {object} options - Command options
 * @returns {Promise<void>}
 */
export async function runSyncIfRequested(project, options) {
  if (!options.sync) {
    // Still sync project.json even without --sync flag
    await autoSyncProject(project);
    return;
  }

  const status = getSyncStatus(project);
  if (!status.configured) {
    console.log(chalk.yellow('\nSync skipped: ' + status.message));
    await autoSyncProject(project);
    return;
  }

  const drushCheck = await checkDrushAvailable(project);
  if (!drushCheck.available) {
    console.log(chalk.yellow('\nSync skipped: ' + drushCheck.message));
    await autoSyncProject(project);
    return;
  }

  console.log(chalk.cyan('\nSyncing with Drupal...'));
  const result = await syncWithDrupal(project, {
    onProgress: (msg) => console.log(chalk.gray('  ' + msg))
  });

  if (result.success) {
    console.log(chalk.green('Sync complete!'));
  } else {
    console.log(chalk.red('Sync failed: ' + result.message));
  }

  // Sync project.json after drush sync
  await autoSyncProject(project);
}
