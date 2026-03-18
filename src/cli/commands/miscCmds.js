/**
 * Miscellaneous Commands
 * Report, Import, Admin Links, Drush, Skill Install, and Log commands.
 */

import chalk from 'chalk';
import { readFileSync, existsSync, mkdirSync, copyFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { homedir } from 'os';
import { loadProject } from '../../commands/project.js';
import { loadFormDisplay } from '../../commands/formDisplay.js';
import {
  auditImport,
  importContentModel,
  validateReportData,
  resolveImportDependencies,
  filterReportData,
  listReportBundles
} from '../../commands/import.js';
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
import { parseFilterFormats } from '../../io/configReader.js';
import {
  output,
  handleError,
  logSuccess,
  isValidEntityType,
  VALID_ENTITY_TYPES,
  autoSyncProject
} from '../cliUtils.js';

/**
 * Load form displays for all bundles in an entity type
 */
async function loadFormDisplaysForEntityType(project, entityType) {
  const bundles = project.entities[entityType] || {};
  const formDisplays = {};
  for (const bundleId of Object.keys(bundles)) {
    const fd = await loadFormDisplay(project, entityType, bundleId);
    if (fd) {
      formDisplays[bundleId] = fd;
    }
  }
  return formDisplays;
}

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
    const formDisplays = await loadFormDisplaysForEntityType(project, options.entityType);
    const reportOptions = { roles, formDisplays };

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
    const formDisplays = {};
    for (const entityType of Object.keys(project.entities || {})) {
      formDisplays[entityType] = await loadFormDisplaysForEntityType(project, entityType);
    }
    const reportOptions = { roles, formDisplays };

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

    // Filter by --bundle if provided
    if (options.bundle) {
      const bundleSpecs = Array.isArray(options.bundle) ? options.bundle : [options.bundle];
      const selectedBundles = bundleSpecs.map(spec => {
        const [entityType, bundle] = spec.split(':');
        if (!entityType || !bundle) {
          throw new Error(`Invalid --bundle format "${spec}". Use entityType:bundle (e.g. node:article)`);
        }
        return { entityType, bundle };
      });

      // Validate selected bundles exist in report
      const allBundles = listReportBundles(reportData);
      const allKeys = new Set(allBundles.map(b => `${b.entityType}:${b.bundle}`));
      for (const sel of selectedBundles) {
        if (!allKeys.has(`${sel.entityType}:${sel.bundle}`)) {
          throw new Error(`Bundle "${sel.entityType}:${sel.bundle}" not found in report`);
        }
      }

      // Resolve dependencies and include them all in CLI mode
      const deps = resolveImportDependencies(reportData, selectedBundles);
      const allIncluded = [...selectedBundles, ...deps.dependencies];

      if (deps.dependencies.length > 0 && !options.json) {
        console.log(chalk.cyan('\nIncluding dependencies:'));
        for (const dep of deps.dependencies) {
          console.log(chalk.cyan(`  • ${dep.label} (${dep.entityType})`));
        }
      }

      reportData = filterReportData(reportData, allIncluded, project.entities);
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

    // Show skipped bundles
    if (audit.skipped.length > 0) {
      console.log(chalk.yellow('\nSkipping existing bundles:'));
      for (const s of audit.skipped) {
        console.log(chalk.yellow(`  • ${s.message}`));
      }
    }

    // Import
    const result = await importContentModel(project, reportData, audit);

    if (options.json) {
      output({ success: true, ...result, reused: audit.reused, skipped: audit.skipped }, true);
    } else {
      console.log(chalk.green(`\nImport complete!`));
      const bundles = result.created.filter(c => c.kind === 'bundle');
      const fields = result.created.filter(c => c.kind === 'field');
      const formDisplays = result.created.filter(c => c.kind === 'formDisplay');
      console.log(chalk.cyan(`  Bundles created:        ${bundles.length}`));
      console.log(chalk.cyan(`  Fields created:         ${fields.length}`));
      console.log(chalk.cyan(`  Form displays created:  ${formDisplays.length}`));
      if (audit.skipped.length > 0) {
        console.log(chalk.cyan(`  Bundles skipped:        ${audit.skipped.length}`));
      }
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
 * List text formats/filters in a project
 */
export async function cmdFilterList(options) {
  try {
    if (!options.project) {
      throw new Error('--project is required');
    }

    const project = await loadProject(options.project);
    const formats = await parseFilterFormats(project.configDirectory);

    if (options.json) {
      output(formats, true);
      return;
    }

    if (formats.length === 0) {
      console.log(chalk.yellow('No text formats found.'));
      return;
    }

    console.log();
    console.log(chalk.cyan(`Text Formats (${formats.length}):`));
    console.log();

    for (const fmt of formats) {
      const status = fmt.status ? chalk.green('enabled') : chalk.gray('disabled');
      console.log(`  ${chalk.bold(fmt.name)} (${fmt.id}) [${status}]`);
      console.log(`    HTML mode: ${fmt.htmlMode}`);

      if (fmt.allowedHtml) {
        // Extract just the tag names for a concise summary
        const tags = fmt.allowedHtml.match(/<([a-z][a-z0-9-]*)/gi) || [];
        const tagNames = tags.map(t => t.slice(1));
        console.log(`    Allowed tags: ${tagNames.join(', ')}`);
      }

      if (fmt.mediaEmbed) {
        const types = fmt.mediaEmbed.allowedMediaTypes.length > 0
          ? fmt.mediaEmbed.allowedMediaTypes.join(', ')
          : 'all';
        console.log(`    Media embed: ${chalk.cyan('yes')} (view mode: ${fmt.mediaEmbed.defaultViewMode}, types: ${types})`);
      }

      if (fmt.linkit) {
        console.log(`    Linkit: ${chalk.cyan('yes')}`);
      }

      const filterNames = fmt.filters.map(f => f.id).join(', ');
      console.log(`    Active filters: ${filterNames}`);
      console.log();
    }
  } catch (error) {
    handleError(error);
  }
}

/**
 * Install all dcm Claude Code skills to ~/.claude/skills/
 */
export async function cmdSkillInstall(options) {
  try {
    const __dirname = dirname(fileURLToPath(import.meta.url));
    const skillsRoot = join(__dirname, '..', '..', '..', '.claude', 'skills');

    if (!existsSync(skillsRoot)) {
      throw new Error('Skills directory not found in package. The package may be corrupted.');
    }

    const skillDirs = readdirSync(skillsRoot, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);

    if (skillDirs.length === 0) {
      throw new Error('No skills found in package.');
    }

    const installed = [];
    const skipped = [];

    for (const skillName of skillDirs) {
      const source = join(skillsRoot, skillName, 'SKILL.md');
      const targetDir = join(homedir(), '.claude', 'skills', skillName);
      const target = join(targetDir, 'SKILL.md');

      if (!existsSync(source)) {
        continue;
      }

      if (existsSync(target) && !options.force) {
        skipped.push({ name: skillName, path: target });
        continue;
      }

      mkdirSync(targetDir, { recursive: true });
      copyFileSync(source, target);
      installed.push({ name: skillName, path: target });
    }

    if (options.json) {
      output({ success: true, installed, skipped }, true);
    } else {
      if (installed.length > 0) {
        for (const skill of installed) {
          console.log(chalk.green(`Installed skill: ${skill.name}`));
          console.log(chalk.cyan(`  → ${skill.path}`));
        }
      }
      if (skipped.length > 0) {
        for (const skill of skipped) {
          console.log(chalk.yellow(`Skipped (already installed): ${skill.name}`));
        }
        console.log(chalk.yellow('Use --force to overwrite existing skills.'));
      }
      if (installed.length === 0 && skipped.length === 0) {
        console.log(chalk.yellow('No skills to install.'));
      }
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
