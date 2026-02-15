/**
 * Drush Commands
 * Functions for executing drush commands to sync configuration with Drupal.
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Check if drush is available for a project
 * @param {object} project - Project object
 * @returns {Promise<{available: boolean, message: string}>}
 */
export async function checkDrushAvailable(project) {
  if (!project.drupalRoot) {
    return {
      available: false,
      message: 'Drupal root directory not configured. Edit project settings to set it.'
    };
  }

  const drushCmd = project.drushCommand || 'drush';

  try {
    await execAsync(`${drushCmd} status --root="${project.drupalRoot}"`, {
      cwd: project.drupalRoot,
      timeout: 30000
    });
    return { available: true, message: 'Drush is available' };
  } catch (error) {
    return {
      available: false,
      message: `Drush not available: ${error.message}`
    };
  }
}

/**
 * Run drush config import
 * @param {object} project - Project object
 * @returns {Promise<{success: boolean, message: string, output: string}>}
 */
export async function drushConfigImport(project) {
  if (!project.drupalRoot) {
    return {
      success: false,
      message: 'Drupal root directory not configured',
      output: ''
    };
  }

  const drushCmd = project.drushCommand || 'drush';

  try {
    const { stdout, stderr } = await execAsync(`${drushCmd} cim -y`, {
      cwd: project.drupalRoot,
      timeout: 120000 // 2 minutes
    });
    return {
      success: true,
      message: 'Configuration imported successfully',
      output: stdout || stderr
    };
  } catch (error) {
    return {
      success: false,
      message: `Config import failed: ${error.message}`,
      output: error.stdout || error.stderr || ''
    };
  }
}

/**
 * Run drush config export
 * @param {object} project - Project object
 * @returns {Promise<{success: boolean, message: string, output: string}>}
 */
export async function drushConfigExport(project) {
  if (!project.drupalRoot) {
    return {
      success: false,
      message: 'Drupal root directory not configured',
      output: ''
    };
  }

  const drushCmd = project.drushCommand || 'drush';

  try {
    const { stdout, stderr } = await execAsync(`${drushCmd} cex -y`, {
      cwd: project.drupalRoot,
      timeout: 120000 // 2 minutes
    });
    return {
      success: true,
      message: 'Configuration exported successfully',
      output: stdout || stderr
    };
  } catch (error) {
    return {
      success: false,
      message: `Config export failed: ${error.message}`,
      output: error.stdout || error.stderr || ''
    };
  }
}

/**
 * Sync configuration with Drupal (import then export)
 * This ensures UUIDs and third-party settings are captured.
 * @param {object} project - Project object
 * @param {object} options - Options
 * @param {function} options.onProgress - Progress callback (message: string)
 * @returns {Promise<{success: boolean, message: string, details: object}>}
 */
export async function syncWithDrupal(project, options = {}) {
  const { onProgress = () => {} } = options;

  if (!project.drupalRoot) {
    return {
      success: false,
      message: 'Drupal root directory not configured. Edit project settings to set it.',
      details: {}
    };
  }

  // Step 1: Import configuration
  onProgress('Running drush cim (config import)...');
  const importResult = await drushConfigImport(project);

  if (!importResult.success) {
    return {
      success: false,
      message: `Import failed: ${importResult.message}`,
      details: { import: importResult }
    };
  }

  // Step 2: Export configuration
  onProgress('Running drush cex (config export)...');
  const exportResult = await drushConfigExport(project);

  if (!exportResult.success) {
    return {
      success: false,
      message: `Export failed: ${exportResult.message}`,
      details: { import: importResult, export: exportResult }
    };
  }

  return {
    success: true,
    message: 'Configuration synced successfully',
    details: { import: importResult, export: exportResult }
  };
}

/**
 * Get sync configuration status for a project
 * @param {object} project - Project object
 * @returns {object} - Status object
 */
export function getSyncStatus(project) {
  const configured = Boolean(project.drupalRoot);
  const drushCmd = project.drushCommand || 'drush';

  return {
    configured,
    drupalRoot: project.drupalRoot || 'Not set',
    drushCommand: drushCmd,
    message: configured
      ? `Ready to sync using "${drushCmd}" in ${project.drupalRoot}`
      : 'Drupal root not configured. Edit project settings to enable sync.'
  };
}
