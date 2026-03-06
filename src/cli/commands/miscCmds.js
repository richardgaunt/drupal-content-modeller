/**
 * Miscellaneous Commands
 * Report, Import, Admin Links, Drush, Skill Install, and Log commands.
 */

import chalk from 'chalk';
import { readFileSync, existsSync, mkdirSync, copyFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'os';
import { loadProject } from '../../commands/project.js';
import { auditImport, importContentModel, validateReportData } from '../../commands/import.js';
import { createEntityReport, createProjectReport } from '../../commands/report.js';
import {
  getBundleAdminUrls,
  generateEntityTypeReportData,
  generateProjectReportData
} from '../../generators/reportGenerator.js';
import { getReportsDir } from '../../io/fileSystem.js';
import { listRoles } from '../../commands/role.js';
import {
  checkDrushAvailable,
  syncWithDrupal,
  getSyncStatus
} from '../../commands/drush.js';
import { readLog } from '../../io/commandLog.js';
import {
  output,
  handleError,
  logSuccess,
  isValidEntityType,
  VALID_ENTITY_TYPES,
  autoSyncProject
} from '../cliUtils.js';

/**
 * Generate entity type report
 */
export async function cmdReportEntity(options) {
  try {
    if (!options.project) {
      throw new Error('--project is required');
    }
    if (!options.entityType) {
      throw new Error('--entity-type is required');
    }
    if (!isValidEntityType(options.entityType)) {
      throw new Error(`Invalid entity type. Must be one of: ${VALID_ENTITY_TYPES.join(', ')}`);
    }

    const project = await loadProject(options.project);
    await autoSyncProject(project);

    if (!project.entities) {
      throw new Error('Project has not been synced. Run "dcm project sync" first.');
    }

    const baseUrl = options.baseUrl || project.baseUrl || '';
    const roles = await listRoles(project);
    const reportOptions = { roles };

    if (options.json) {
      const data = generateEntityTypeReportData(project, options.entityType, baseUrl, reportOptions);
      output(data, true);
    } else {
      const outputPath = options.output || join(getReportsDir(project.slug), `${project.slug}-${options.entityType}-report.md`);
      await createEntityReport(project, options.entityType, outputPath, baseUrl, reportOptions);
      console.log(chalk.green(`Report saved to: ${outputPath}`));
    }
  } catch (error) {
    handleError(error);
  }
}

/**
 * Generate project report
 */
export async function cmdReportProject(options) {
  try {
    if (!options.project) {
      throw new Error('--project is required');
    }

    const project = await loadProject(options.project);
    await autoSyncProject(project);

    if (!project.entities) {
      throw new Error('Project has not been synced. Run "dcm project sync" first.');
    }

    const baseUrl = options.baseUrl || project.baseUrl || '';
    const roles = await listRoles(project);
    const reportOptions = { roles };

    if (options.json) {
      const data = generateProjectReportData(project, baseUrl, reportOptions);
      output(data, true);
    } else {
      const outputPath = options.output || join(getReportsDir(project.slug), `${project.slug}-content-model.md`);
      await createProjectReport(project, outputPath, baseUrl, reportOptions);
      console.log(chalk.green(`Report saved to: ${outputPath}`));
    }
  } catch (error) {
    handleError(error);
  }
}

/**
 * Import content model from JSON report
 */
export async function cmdImportModel(options) {
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

    // Read and parse JSON file
    let reportData;
    try {
      const raw = readFileSync(options.file, 'utf8');
      reportData = JSON.parse(raw);
    } catch (error) {
      throw new Error(`Failed to read JSON file: ${error.message}`);
    }

    const validation = validateReportData(reportData);
    if (validation !== true) {
      throw new Error(`Invalid report data: ${validation}`);
    }

    // Audit
    const audit = auditImport(project, reportData);

    if (audit.hasBlockers) {
      if (options.json) {
        output({ success: false, audit }, true);
      } else {
        console.log(chalk.red('\nImport blocked — resolve the following issues:\n'));
        for (const b of audit.blocked) {
          console.log(chalk.red(`  • ${b.message}`));
        }
        console.log(chalk.yellow('\nEdit the JSON file to fix collisions, then re-run.\n'));
      }
      process.exit(1);
    }

    // Import
    const result = await importContentModel(project, reportData, audit);

    if (options.json) {
      output({ success: true, ...result, reused: audit.reused }, true);
    } else {
      console.log(chalk.green(`\nImport complete!`));
      const bundles = result.created.filter(c => c.kind === 'bundle');
      const fields = result.created.filter(c => c.kind === 'field');
      console.log(chalk.cyan(`  Bundles created: ${bundles.length}`));
      console.log(chalk.cyan(`  Fields created:  ${fields.length}`));
      if (audit.reused.length > 0) {
        console.log(chalk.cyan(`  Fields reusing existing storage: ${audit.reused.length}`));
      }
      if (result.errors.length > 0) {
        console.log(chalk.red(`\n  Errors: ${result.errors.length}`));
        for (const err of result.errors) {
          console.log(chalk.red(`    • ${err.message}`));
        }
      }
    }
  } catch (error) {
    handleError(error);
  }
}

/**
 * Show admin links for a bundle
 */
export async function cmdAdminLinks(options) {
  try {
    if (!options.project) {
      throw new Error('--project is required');
    }
    if (!options.entityType) {
      throw new Error('--entity-type is required');
    }
    if (!isValidEntityType(options.entityType)) {
      throw new Error(`Invalid entity type. Must be one of: ${VALID_ENTITY_TYPES.join(', ')}`);
    }
    if (!options.bundle) {
      throw new Error('--bundle is required');
    }

    const project = await loadProject(options.project);
    await autoSyncProject(project);

    if (!project.entities || !project.entities[options.entityType]) {
      throw new Error('Project has not been synced. Run "dcm project sync" first.');
    }

    const bundles = project.entities[options.entityType];
    const bundle = bundles[options.bundle];

    if (!bundle) {
      throw new Error(`Bundle "${options.bundle}" not found in ${options.entityType}`);
    }

    const adminUrls = getBundleAdminUrls(options.entityType, options.bundle);
    const baseUrl = project.baseUrl || '';

    const links = adminUrls.map(url => ({
      name: url.name,
      path: url.path,
      url: baseUrl ? `${baseUrl}${url.path}` : url.path
    }));

    if (options.json) {
      output({ bundle: options.bundle, entityType: options.entityType, links }, true);
    } else {
      console.log();
      console.log(chalk.cyan(`Admin links for ${options.entityType} > ${bundle.label || options.bundle}`));
      console.log();

      const maxNameLen = Math.max(...links.map(l => l.name.length));
      for (const link of links) {
        console.log(`  ${link.name.padEnd(maxNameLen + 2)}${chalk.blue(link.url)}`);
      }
      console.log();
    }
  } catch (error) {
    handleError(error);
  }
}

/**
 * Sync configuration with Drupal (drush cim && drush cex)
 */
export async function cmdDrushSync(options) {
  try {
    if (!options.project) {
      throw new Error('--project is required');
    }

    const project = await loadProject(options.project);

    const status = getSyncStatus(project);
    if (!status.configured) {
      throw new Error(status.message);
    }

    const drushCheck = await checkDrushAvailable(project);
    if (!drushCheck.available) {
      throw new Error(drushCheck.message);
    }

    console.log(chalk.cyan('Syncing with Drupal...'));
    const result = await syncWithDrupal(project, {
      onProgress: (msg) => console.log(chalk.gray('  ' + msg))
    });

    logSuccess(options.project);

    // Sync project.json after drush sync
    await autoSyncProject(project);

    if (options.json) {
      output(result, true);
    } else {
      if (result.success) {
        console.log(chalk.green('Sync complete!'));
      } else {
        console.log(chalk.red('Sync failed: ' + result.message));
      }

      // Show drush output
      if (result.details.import?.output) {
        console.log();
        console.log(chalk.cyan('Import output:'));
        console.log(result.details.import.output.trim());
      }
      if (result.details.export?.output) {
        console.log();
        console.log(chalk.cyan('Export output:'));
        console.log(result.details.export.output.trim());
      }

      if (!result.success) {
        process.exit(1);
      }
    }
  } catch (error) {
    handleError(error);
  }
}

/**
 * Check drush sync configuration status
 */
export async function cmdDrushStatus(options) {
  try {
    if (!options.project) {
      throw new Error('--project is required');
    }

    const project = await loadProject(options.project);
    const status = getSyncStatus(project);

    if (options.json) {
      output(status, true);
    } else {
      console.log(chalk.bold('Drush Sync Status:'));
      console.log(`  Configured: ${status.configured ? chalk.green('Yes') : chalk.yellow('No')}`);
      console.log(`  Drupal Root: ${status.drupalRoot}`);
      console.log(`  Drush Command: ${status.drushCommand}`);
      console.log();
      console.log(status.configured ? chalk.green(status.message) : chalk.yellow(status.message));

      if (status.configured) {
        console.log(chalk.cyan('\nChecking drush availability...'));
        const drushCheck = await checkDrushAvailable(project);
        if (drushCheck.available) {
          console.log(chalk.green('Drush is available and working.'));
        } else {
          console.log(chalk.yellow('Drush check failed: ' + drushCheck.message));
        }
      }
    }
  } catch (error) {
    handleError(error);
  }
}

/**
 * Install the dcm Claude Code skill to ~/.claude/skills/
 */
export async function cmdSkillInstall(options) {
  try {
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const source = join(__dirname, '..', '..', '..', '.claude', 'skills', 'dcm', 'SKILL.md');
    const targetDir = join(homedir(), '.claude', 'skills', 'dcm');
    const target = join(targetDir, 'SKILL.md');

    if (!existsSync(source)) {
      throw new Error('Source SKILL.md not found in package. The package may be corrupted.');
    }

    if (existsSync(target) && !options.force) {
      if (options.json) {
        output({ success: false, error: 'Skill already installed. Use --force to overwrite.' }, true);
      } else {
        console.error(chalk.red('Error: Skill already installed at ' + target));
        console.error(chalk.yellow('Use --force to overwrite.'));
      }
      process.exit(1);
    }

    mkdirSync(targetDir, { recursive: true });
    copyFileSync(source, target);

    if (options.json) {
      output({ success: true, path: target }, true);
    } else {
      console.log(chalk.green('dcm skill installed successfully!'));
      console.log(chalk.cyan(`Installed to: ${target}`));
    }
  } catch (error) {
    handleError(error);
  }
}

/**
 * View command log for a project
 */
export async function cmdLog(options) {
  try {
    if (!options.project) {
      throw new Error('--project is required');
    }

    // Verify project exists
    await loadProject(options.project);

    const limit = options.limit ? parseInt(options.limit, 10) : 20;
    const entries = readLog(options.project, { limit });

    if (options.json) {
      output(entries, true);
    } else {
      if (entries.length === 0) {
        console.log(chalk.yellow('No log entries found.'));
        return;
      }

      console.log();
      console.log(chalk.cyan(`Command log for "${options.project}" (${entries.length} entries):`));
      console.log();

      for (const entry of entries) {
        const time = new Date(entry.timestamp).toLocaleString();
        const status = entry.success ? chalk.green('OK') : chalk.red('FAIL');
        console.log(`  ${chalk.gray(time)}  ${status}  ${entry.cli}`);
        if (entry.error) {
          console.log(`    ${chalk.red(entry.error)}`);
        }
      }
      console.log();
    }
  } catch (error) {
    handleError(error);
  }
}
