/**
 * Spreadsheet Commands
 * CLI command handlers for spreadsheet import and export.
 */

import chalk from 'chalk';
import { join } from 'path';
import { loadProject } from '../../commands/project.js';
import { syncProject } from '../../commands/sync.js';
import {
  importSpreadsheet,
  exportSpreadsheet,
  executeDeletions,
  executeCreations,
  applyFormDisplays
} from '../../commands/spreadsheet.js';
import { getReportsDir } from '../../io/fileSystem.js';
import {
  output,
  handleError,
  autoSyncProject
} from '../cliUtils.js';

/**
 * Export project to spreadsheet
 */
export async function cmdExportSpreadsheet(options) {
  try {
    if (!options.project) {
      throw new Error('--project is required');
    }

    const project = await loadProject(options.project);
    await autoSyncProject(project);

    if (!project.entities) {
      throw new Error('Project has not been synced. Run "dcm project sync" first.');
    }

    const outputPath = options.output ||
      join(getReportsDir(project.slug), `${project.slug}-content-model.xlsx`);

    await exportSpreadsheet(project, outputPath);

    if (options.json) {
      output({ success: true, path: outputPath }, true);
    } else {
      console.log(chalk.green(`Spreadsheet exported to: ${outputPath}`));
    }
  } catch (error) {
    handleError(error);
  }
}

/**
 * Import content model from spreadsheet (full sync)
 */
export async function cmdImportSpreadsheet(options) {
  try {
    if (!options.project) {
      throw new Error('--project is required');
    }
    if (!options.file) {
      throw new Error('--file is required');
    }

    const project = await loadProject(options.project);
    await autoSyncProject(project);

    if (!project.entities) {
      throw new Error('Project has not been synced. Run "dcm project sync" first.');
    }

    const { parseErrors, diff, data, formDisplayData } = await importSpreadsheet(project, options.file);

    if (parseErrors && parseErrors.length > 0) {
      console.log(chalk.yellow('\nParse warnings:'));
      for (const err of parseErrors) {
        console.log(chalk.yellow(`  • ${err}`));
      }
    }

    if (!diff) {
      if (options.json) {
        output({ success: false, errors: parseErrors }, true);
      } else {
        console.log(chalk.red('Failed to parse spreadsheet.'));
      }
      process.exit(1);
    }

    if (diff.errors.length > 0) {
      console.log(chalk.red('\nBlocking errors:'));
      for (const err of diff.errors) {
        console.log(chalk.red(`  • ${err.message}`));
      }
      process.exit(1);
    }

    // Show summary
    const bundlesToCreate = diff.toCreate.filter(i => i.kind === 'bundle').length;
    const fieldsToCreate = diff.toCreate.filter(i => i.kind === 'field').length;
    const bundlesToDelete = diff.toDelete.filter(i => i.kind === 'bundle').length;
    const fieldsToDelete = diff.toDelete.filter(i => i.kind === 'field').length;

    if (!options.json) {
      console.log(chalk.cyan('\nSync summary:'));
      console.log(chalk.green(`  Bundles to create: ${bundlesToCreate}`));
      console.log(chalk.green(`  Fields to create:  ${fieldsToCreate}`));
      if (bundlesToDelete > 0) {
        console.log(chalk.red(`  Bundles to delete: ${bundlesToDelete}`));
      }
      if (fieldsToDelete > 0) {
        console.log(chalk.red(`  Fields to delete:  ${fieldsToDelete}`));
      }
    }

    if (bundlesToCreate === 0 && fieldsToCreate === 0 &&
        bundlesToDelete === 0 && fieldsToDelete === 0) {
      if (options.json) {
        output({ success: true, message: 'Already in sync' }, true);
      } else {
        console.log(chalk.green('\nAlready in sync — no changes needed.'));
      }
      return;
    }

    // Execute deletions first
    let deletionResult = { deleted: [], errors: [] };
    if (diff.toDelete.length > 0) {
      deletionResult = await executeDeletions(project, diff.toDelete);
    }

    // Re-sync project after deletions so create sees updated state
    if (deletionResult.deleted.length > 0) {
      await syncProject(project);
      // Reload project with updated entities
      const updatedProject = await loadProject(options.project);
      Object.assign(project, updatedProject);
    }

    // Execute creations
    let creationResult = { created: [], errors: [] };
    if (diff.toCreate.length > 0) {
      creationResult = await executeCreations(project, data, diff.toCreate);
    }

    // Apply form display changes
    let formDisplayResult = { saved: [], errors: [] };
    if (formDisplayData) {
      formDisplayResult = await applyFormDisplays(project, formDisplayData);
    }

    if (options.json) {
      output({
        success: true,
        created: creationResult.created,
        deleted: deletionResult.deleted,
        formDisplays: formDisplayResult.saved,
        errors: [...deletionResult.errors, ...creationResult.errors, ...formDisplayResult.errors]
      }, true);
    } else {
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
      if (formDisplayResult.saved.length > 0) {
        console.log(chalk.cyan(`  Form displays updated: ${formDisplayResult.saved.length}`));
      }

      const allErrors = [...deletionResult.errors, ...creationResult.errors, ...formDisplayResult.errors];
      if (allErrors.length > 0) {
        console.log(chalk.red(`\n  Errors: ${allErrors.length}`));
        for (const err of allErrors) {
          console.log(chalk.red(`    • ${err.message}`));
        }
      }
    }
  } catch (error) {
    handleError(error);
  }
}
