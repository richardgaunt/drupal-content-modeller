/**
 * Spreadsheet Menu Handlers
 * Handles spreadsheet import and export menu actions.
 */

import { select, input } from '@inquirer/prompts';
import chalk from 'chalk';
import { join } from 'path';
import { existsSync } from 'fs';

import {
  importSpreadsheet,
  exportSpreadsheet,
  executeDeletions,
  executeCreations
} from '../../commands/spreadsheet.js';
import { loadProject } from '../../commands/project.js';
import { syncProject } from '../../commands/sync.js';
import { getReportsDir } from '../../io/fileSystem.js';

/**
 * Handle export to spreadsheet
 * @param {object} project - The current project
 * @returns {Promise<void>}
 */
export async function handleExportSpreadsheet(project) {
  try {
    if (!project.entities) {
      console.log(chalk.yellow('Project has not been synced. Run sync first.'));
      return;
    }

    const defaultPath = join(getReportsDir(project.slug), `${project.slug}-content-model.xlsx`);

    const outputPath = await input({
      message: 'Output file path:',
      default: defaultPath
    });

    await exportSpreadsheet(project, outputPath.trim());
    console.log(chalk.green(`\nSpreadsheet exported to: ${outputPath.trim()}`));
  } catch (error) {
    if (error.name === 'ExitPromptError') return;
    console.log(chalk.red(`Error: ${error.message}`));
  }
}

/**
 * Handle import from spreadsheet (full sync)
 * @param {object} project - The current project
 * @returns {Promise<object>} - Updated project
 */
export async function handleImportSpreadsheet(project) {
  try {
    if (!project.entities) {
      console.log(chalk.yellow('Project has not been synced. Run sync first.'));
      return project;
    }

    const defaultPath = join(getReportsDir(project.slug), `${project.slug}-content-model.xlsx`);

    const filePath = await input({
      message: 'Path to .xlsx spreadsheet:',
      default: defaultPath,
      validate: (val) => {
        if (!val || !val.trim()) return 'File path is required';
        if (!existsSync(val.trim())) return 'File does not exist';
        if (!val.trim().endsWith('.xlsx')) return 'File must be an .xlsx file';
        return true;
      }
    });

    console.log(chalk.cyan('\nParsing spreadsheet...'));

    const { parseErrors, diff, data } = await importSpreadsheet(project, filePath.trim());

    if (parseErrors && parseErrors.length > 0) {
      console.log(chalk.yellow('\nParse warnings:'));
      for (const err of parseErrors) {
        console.log(chalk.yellow(`  • ${err}`));
      }
    }

    if (!diff) {
      console.log(chalk.red('Failed to parse spreadsheet.'));
      return project;
    }

    if (diff.errors.length > 0) {
      console.log(chalk.red('\nBlocking errors — cannot proceed:'));
      for (const err of diff.errors) {
        console.log(chalk.red(`  • ${err.message}`));
      }
      return project;
    }

    // Show summary
    const bundlesToCreate = diff.toCreate.filter(i => i.kind === 'bundle').length;
    const fieldsToCreate = diff.toCreate.filter(i => i.kind === 'field').length;
    const bundlesToDelete = diff.toDelete.filter(i => i.kind === 'bundle').length;
    const fieldsToDelete = diff.toDelete.filter(i => i.kind === 'field').length;

    console.log(chalk.cyan('\nSync summary:'));
    if (bundlesToCreate > 0) {
      console.log(chalk.green(`  Bundles to create: ${bundlesToCreate}`));
      for (const item of diff.toCreate.filter(i => i.kind === 'bundle')) {
        console.log(chalk.green(`    + ${item.label} (${item.entityType}:${item.bundle})`));
      }
    }
    if (fieldsToCreate > 0) {
      console.log(chalk.green(`  Fields to create:  ${fieldsToCreate}`));
      for (const item of diff.toCreate.filter(i => i.kind === 'field')) {
        console.log(chalk.green(`    + ${item.fieldName} on ${item.bundle} (${item.fieldType})`));
      }
    }
    if (bundlesToDelete > 0) {
      console.log(chalk.red(`  Bundles to delete: ${bundlesToDelete}`));
      for (const item of diff.toDelete.filter(i => i.kind === 'bundle')) {
        console.log(chalk.red(`    - ${item.label} (${item.entityType}:${item.bundle})`));
      }
    }
    if (fieldsToDelete > 0) {
      console.log(chalk.red(`  Fields to delete:  ${fieldsToDelete}`));
      for (const item of diff.toDelete.filter(i => i.kind === 'field')) {
        console.log(chalk.red(`    - ${item.fieldName} on ${item.bundle}`));
      }
    }

    if (bundlesToCreate === 0 && fieldsToCreate === 0 &&
        bundlesToDelete === 0 && fieldsToDelete === 0) {
      console.log(chalk.green('\nAlready in sync — no changes needed.'));
      return project;
    }

    const proceed = await select({
      message: 'Proceed with sync?',
      choices: [
        { value: 'yes', name: 'Yes, apply changes' },
        { value: 'no', name: 'No, cancel' }
      ]
    });

    if (proceed !== 'yes') {
      console.log(chalk.yellow('Import cancelled.'));
      return project;
    }

    // Execute deletions
    let deletionResult = { deleted: [], errors: [] };
    if (diff.toDelete.length > 0) {
      console.log(chalk.cyan('\nDeleting removed items...'));
      deletionResult = await executeDeletions(project, diff.toDelete);
    }

    // Re-sync after deletions
    if (deletionResult.deleted.length > 0) {
      await syncProject(project);
      project = await loadProject(project.slug);
    }

    // Execute creations
    let creationResult = { created: [], errors: [] };
    if (diff.toCreate.length > 0) {
      console.log(chalk.cyan('Creating new items...'));
      creationResult = await executeCreations(project, data, diff.toCreate);
    }

    // Show results
    console.log(chalk.green('\nSync complete!'));
    if (deletionResult.deleted.length > 0) {
      const dBundles = deletionResult.deleted.filter(d => d.kind === 'bundle').length;
      const dFields = deletionResult.deleted.filter(d => d.kind === 'field').length;
      if (dBundles > 0) console.log(chalk.cyan(`  Bundles deleted: ${dBundles}`));
      if (dFields > 0) console.log(chalk.cyan(`  Fields deleted:  ${dFields}`));
    }
    if (creationResult.created.length > 0) {
      const cBundles = creationResult.created.filter(c => c.kind === 'bundle').length;
      const cFields = creationResult.created.filter(c => c.kind === 'field').length;
      if (cBundles > 0) console.log(chalk.cyan(`  Bundles created: ${cBundles}`));
      if (cFields > 0) console.log(chalk.cyan(`  Fields created:  ${cFields}`));
    }

    const allErrors = [...deletionResult.errors, ...creationResult.errors];
    if (allErrors.length > 0) {
      console.log(chalk.red(`\n  Errors: ${allErrors.length}`));
      for (const err of allErrors) {
        console.log(chalk.red(`    • ${err.message}`));
      }
    }

    // Reload project
    project = await loadProject(project.slug);
    return project;
  } catch (error) {
    if (error.name === 'ExitPromptError') return project;
    console.log(chalk.red(`Error: ${error.message}`));
    return project;
  }
}
