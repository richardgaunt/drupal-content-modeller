/**
 * Report Menu Handlers
 * Handles report generation, import, admin links, and drush sync menu actions.
 */

import { select, input, checkbox, search, confirm } from '@inquirer/prompts';
import chalk from 'chalk';
import { join, dirname } from 'path';
import { readFileSync } from 'fs';

import { getBundleSummary } from '../../commands/list.js';
import { createEntityReport, createProjectReport, createBundleReport } from '../../commands/report.js';
import { getReportsDir, getTicketsDir } from '../../io/fileSystem.js';
import { createTickets } from '../../commands/ticket.js';
import { getEntityTypeLabel } from '../../generators/reportGenerator.js';
import { listRoles } from '../../commands/role.js';
import {
  auditImport,
  importContentModel,
  validateReportData,
  resolveImportDependencies,
  filterReportData,
  listReportBundles
} from '../../commands/import.js';
import { getEntityTypeSingularLabel, ENTITY_ORDER } from '../../constants/entityTypes.js';
import { writeFile, mkdir } from 'fs/promises';
import { syncWithDrupal, getSyncStatus, checkDrushAvailable, drushGetThemePreprocesses } from '../../commands/drush.js';
import { loadFormDisplay } from '../../commands/formDisplay.js';
import { promptForReportUrl } from './contentMenus.js';
import {
  createMigrationReport,
  createSingleMigrationReport,
  getMigrationReportData,
  listMigrations
} from '../../commands/migration.js';

/**
 * Prompt user to include live preprocess data if drush is available
 * @param {object} project - The current project
 * @returns {Promise<object|null>} - Preprocess data or null
 */
async function promptForPreprocessData(project) {
  const drushCheck = await checkDrushAvailable(project);
  if (!drushCheck.available) return null;

  const include = await confirm({
    message: 'Include live preprocess data from Drupal?',
    default: false
  });

  if (!include) return null;

  console.log(chalk.cyan('Querying Drupal theme registry...'));
  const result = await drushGetThemePreprocesses(project);
  if (!result.success) {
    console.log(chalk.yellow(`Could not fetch preprocesses: ${result.message}`));
    return null;
  }
  return result.data;
}

/**
 * Handle single bundle report generation
 * @param {object} project - The current project
 * @returns {Promise<void>}
 */
export async function handleBundleReport(project) {
  try {
    const summary = getBundleSummary(project);

    if (!summary.synced) {
      console.log(chalk.yellow('Project has not been synced. Run sync first.'));
      return;
    }

    // Select entity type
    const entityTypes = Object.keys(project.entities).filter(
      type => Object.keys(project.entities[type]).length > 0
    );

    if (entityTypes.length === 0) {
      console.log(chalk.yellow('No entities found.'));
      return;
    }

    const entityTypeChoices = entityTypes.map(type => ({
      value: type,
      name: `${getEntityTypeLabel(type)} (${Object.keys(project.entities[type]).length} bundles)`
    }));

    const entityType = await select({
      message: 'Select entity type:',
      choices: entityTypeChoices
    });

    // Select bundles (multi-select)
    const bundles = project.entities[entityType];
    const bundleChoices = Object.values(bundles)
      .sort((a, b) => (a.label || '').localeCompare(b.label || ''))
      .map(b => ({
        value: b.id,
        name: `${b.label || b.id} (${Object.keys(b.fields || {}).length} fields)`
      }));

    if (bundleChoices.length === 0) {
      console.log(chalk.yellow('No bundles found for this entity type.'));
      return;
    }

    const bundleIds = await checkbox({
      message: 'Select bundles to generate reports for:',
      choices: bundleChoices
    });

    if (bundleIds.length === 0) {
      console.log(chalk.yellow('No bundles selected.'));
      return;
    }

    // Ask about base URL
    const baseUrl = await promptForReportUrl(project);

    // Read roles for permissions
    const roles = await listRoles(project);

    // Optionally fetch live preprocess data
    const preprocessData = await promptForPreprocessData(project);

    // Generate reports for all selected bundles
    for (const bundleId of bundleIds) {
      const filename = `${project.slug}-${entityType}-${bundleId}-report.md`;
      const outputPath = join(getReportsDir(project.slug), filename);

      const formDisplay = await loadFormDisplay(project, entityType, bundleId);
      const opts = { roles, preprocessData, formDisplay };
      const result = await createBundleReport(
        project, entityType, bundleId, outputPath, baseUrl, opts
      );
      if (result) {
        console.log(chalk.green(`Report saved to: ${outputPath}`));
      } else {
        console.log(chalk.red(`Bundle "${bundleId}" not found.`));
      }
    }
  } catch (error) {
    if (error.name === 'ExitPromptError') {
      return;
    }
    console.log(chalk.red(`Error: ${error.message}`));
  }
}

/**
 * Handle entity type report generation
 * @param {object} project - The current project
 * @returns {Promise<void>}
 */
export async function handleEntityReport(project) {
  try {
    const summary = getBundleSummary(project);

    if (!summary.synced) {
      console.log(chalk.yellow('Project has not been synced. Run sync first.'));
      return;
    }

    // Select entity type
    const entityTypes = Object.keys(project.entities).filter(
      type => Object.keys(project.entities[type]).length > 0
    );

    if (entityTypes.length === 0) {
      console.log(chalk.yellow('No entities found.'));
      return;
    }

    const choices = entityTypes.map(type => ({
      value: type,
      name: `${getEntityTypeLabel(type)} (${Object.keys(project.entities[type]).length} bundles)`
    }));

    const entityType = await select({
      message: 'Select entity type:',
      choices
    });

    // Ask about base URL
    const baseUrl = await promptForReportUrl(project);

    // Read roles for permissions
    const roles = await listRoles(project);

    // Optionally fetch live preprocess data
    const preprocessData = await promptForPreprocessData(project);

    // Load form displays for the entity type
    const formDisplays = {};
    const bundles = project.entities[entityType] || {};
    for (const bundleId of Object.keys(bundles)) {
      const fd = await loadFormDisplay(project, entityType, bundleId);
      if (fd) {
        formDisplays[bundleId] = fd;
      }
    }

    // Generate filename in project reports directory
    const filename = `${project.slug}-${entityType}-report.md`;
    const outputPath = join(getReportsDir(project.slug), filename);

    await createEntityReport(project, entityType, outputPath, baseUrl, { roles, preprocessData, formDisplays });
    console.log(chalk.green(`Report saved to: ${outputPath}`));
  } catch (error) {
    if (error.name === 'ExitPromptError') {
      return;
    }
    console.log(chalk.red(`Error: ${error.message}`));
  }
}

/**
 * Handle full project report generation
 * @param {object} project - The current project
 * @returns {Promise<void>}
 */
export async function handleProjectReport(project) {
  try {
    const summary = getBundleSummary(project);

    if (!summary.synced) {
      console.log(chalk.yellow('Project has not been synced. Run sync first.'));
      return;
    }

    // Ask about base URL
    const baseUrl = await promptForReportUrl(project);

    // Read roles for permissions
    const roles = await listRoles(project);

    // Optionally fetch live preprocess data
    const preprocessData = await promptForPreprocessData(project);

    // Load form displays for all entity types
    const formDisplays = {};
    for (const entityType of Object.keys(project.entities || {})) {
      const bundles = project.entities[entityType] || {};
      formDisplays[entityType] = {};
      for (const bundleId of Object.keys(bundles)) {
        const fd = await loadFormDisplay(project, entityType, bundleId);
        if (fd) {
          formDisplays[entityType][bundleId] = fd;
        }
      }
    }

    // Generate filename in project reports directory
    const filename = `${project.slug}-content-model.md`;
    const outputPath = join(getReportsDir(project.slug), filename);

    await createProjectReport(project, outputPath, baseUrl, { roles, preprocessData, formDisplays });
    console.log(chalk.green(`Report saved to: ${outputPath}`));
  } catch (error) {
    if (error.name === 'ExitPromptError') {
      return;
    }
    console.log(chalk.red(`Error: ${error.message}`));
  }
}

/**
 * Handle QA ticket generation
 * @param {object} project - The current project
 * @returns {Promise<void>}
 */
export async function handleGenerateTickets(project) {
  try {
    const summary = getBundleSummary(project);

    if (!summary.synced) {
      console.log(chalk.yellow('Project has not been synced. Run sync first.'));
      return;
    }

    // Ask about base URL
    const baseUrl = await promptForReportUrl(project);

    const outputDir = getTicketsDir(project.slug);

    console.log(chalk.cyan('Generating QA tickets...'));
    const results = await createTickets(project, outputDir, baseUrl);

    console.log(chalk.green(`Generated ${results.length} tickets in: ${outputDir}`));
    for (const ticket of results) {
      console.log(chalk.cyan(`  ${ticket.filename}`));
    }
  } catch (error) {
    if (error.name === 'ExitPromptError') {
      return;
    }
    console.log(chalk.red(`Error: ${error.message}`));
  }
}

/**
 * Handle export content model to JSON
 * Exports the project's content model in the same format used by JSON import.
 * @param {object} project - The current project
 * @returns {Promise<void>}
 */
export async function handleExportJson(project) {
  try {
    if (!project.entities) {
      console.log(chalk.yellow('Project has not been synced. Run sync first.'));
      return;
    }

    const defaultPath = join(getReportsDir(project.slug), `${project.slug}-content-model.json`);

    const outputPath = await input({
      message: 'Output file path:',
      default: defaultPath
    });

    const entities = project.entities || {};
    const entityTypes = ENTITY_ORDER
      .filter(et => Object.keys(entities[et] || {}).length > 0)
      .map(et => ({
        entityType: et,
        bundles: Object.entries(entities[et]).map(([bundleId, bundleData]) => ({
          bundle: bundleId,
          label: bundleData.label || bundleId,
          description: bundleData.description || '',
          fields: Object.entries(bundleData.fields || {}).map(([fieldName, fieldData]) => ({
            name: fieldName,
            type: fieldData.type,
            label: fieldData.label || fieldName,
            description: fieldData.description || '',
            required: !!fieldData.required,
            cardinality: fieldData.cardinality || 1,
            settings: fieldData.settings || {}
          }))
        }))
      }));

    const data = { entityTypes };
    const trimmedPath = outputPath.trim();
    await mkdir(dirname(trimmedPath), { recursive: true });
    await writeFile(trimmedPath, JSON.stringify(data, null, 2), 'utf8');
    console.log(chalk.green(`\nJSON exported to: ${outputPath.trim()}`));
  } catch (error) {
    if (error.name === 'ExitPromptError') return;
    console.log(chalk.red(`Error: ${error.message}`));
  }
}

/**
 * Handle import content model from JSON
 * @param {object} project - The current project
 * @returns {Promise<void>}
 */
export async function handleImportModel(project) {
  try {
    const filePath = await input({
      message: 'Path to JSON report file:',
      validate: (val) => {
        if (!val || !val.trim()) return 'File path is required';
        try {
          const content = readFileSync(val.trim(), 'utf8');
          JSON.parse(content);
          return true;
        } catch (error) {
          return `Cannot read/parse file: ${error.message}`;
        }
      }
    });

    const raw = readFileSync(filePath.trim(), 'utf8');
    let reportData = JSON.parse(raw);

    const validation = validateReportData(reportData);
    if (validation !== true) {
      console.log(chalk.red(`Invalid report data: ${validation}`));
      return;
    }

    // Bundle selection
    const allBundles = listReportBundles(reportData);

    if (allBundles.length === 0) {
      console.log(chalk.yellow('No bundles found in report.'));
      return;
    }

    const importScope = await select({
      message: 'What would you like to import?',
      choices: [
        { value: 'all', name: 'All bundles' },
        { value: 'select', name: 'Select specific bundles' }
      ]
    });

    if (importScope === 'select') {
      const selectedKeys = await checkbox({
        message: 'Select bundles to import:',
        choices: allBundles.map(b => ({
          value: `${b.entityType}:${b.bundle}`,
          name: `${b.label} (${getEntityTypeSingularLabel(b.entityType)})`,
          checked: false
        }))
      });

      if (selectedKeys.length === 0) {
        console.log(chalk.yellow('No bundles selected.'));
        return;
      }

      const selectedBundles = selectedKeys.map(key => {
        const [entityType, bundle] = key.split(':');
        return { entityType, bundle };
      });

      // Resolve dependencies
      const deps = resolveImportDependencies(reportData, selectedBundles);
      const confirmedDeps = [];

      if (deps.dependencies.length > 0) {
        console.log(chalk.cyan('\nThe selected bundles reference other bundles in the report:'));

        for (const dep of deps.dependencies) {
          const shouldInclude = await confirm({
            message: `Import "${dep.label}" (${getEntityTypeSingularLabel(dep.entityType)})?`,
            default: true
          });

          if (shouldInclude) {
            confirmedDeps.push(dep);
          }
        }
      }

      const allIncluded = [...selectedBundles, ...confirmedDeps];
      reportData = filterReportData(reportData, allIncluded, project.entities);
    }

    const audit = auditImport(project, reportData);

    if (audit.hasBlockers) {
      console.log(chalk.red('\nImport blocked — resolve the following issues:\n'));
      for (const b of audit.blocked) {
        console.log(chalk.red(`  • ${b.message}`));
      }
      console.log(chalk.yellow('\nEdit the JSON file to fix collisions, then re-run.\n'));
      return;
    }

    // Show skipped bundles
    if (audit.skipped.length > 0) {
      console.log(chalk.yellow('\nThe following bundles already exist and will be skipped:'));
      for (const s of audit.skipped) {
        console.log(chalk.yellow(`  • ${s.message}`));
      }
    }

    // Show summary
    const bundleCount = audit.toCreate.filter(i => i.kind === 'bundle').length;
    const fieldCount = audit.toCreate.filter(i => i.kind === 'field').length;
    console.log(chalk.cyan(`\nImport summary:`));
    console.log(chalk.cyan(`  Bundles to create: ${bundleCount}`));
    console.log(chalk.cyan(`  Fields to create:  ${fieldCount}`));
    if (audit.skipped.length > 0) {
      console.log(chalk.cyan(`  Bundles skipped:   ${audit.skipped.length}`));
    }
    if (audit.reused.length > 0) {
      console.log(chalk.cyan(`  Fields reusing existing storage: ${audit.reused.length}`));
    }

    if (bundleCount === 0 && fieldCount === 0 && audit.reused.length === 0) {
      console.log(chalk.yellow('\nNothing to import — all bundles already exist.'));
      return;
    }

    const proceed = await select({
      message: 'Proceed with import?',
      choices: [
        { value: 'yes', name: 'Yes' },
        { value: 'no', name: 'No' }
      ]
    });

    if (proceed !== 'yes') {
      console.log(chalk.yellow('Import cancelled.'));
      return;
    }

    const result = await importContentModel(project, reportData, audit);

    const bundlesCreated = result.created.filter(c => c.kind === 'bundle').length;
    const fieldsCreated = result.created.filter(c => c.kind === 'field').length;
    console.log(chalk.green(`\nImport complete!`));
    console.log(chalk.cyan(`  Bundles created: ${bundlesCreated}`));
    console.log(chalk.cyan(`  Fields created:  ${fieldsCreated}`));
    if (audit.skipped.length > 0) {
      console.log(chalk.cyan(`  Bundles skipped: ${audit.skipped.length}`));
    }

    if (result.errors.length > 0) {
      console.log(chalk.red(`\n  Errors: ${result.errors.length}`));
      for (const err of result.errors) {
        console.log(chalk.red(`    • ${err.message}`));
      }
    }
  } catch (error) {
    if (error.name === 'ExitPromptError') {
      return;
    }
    console.log(chalk.red(`Error: ${error.message}`));
  }
}

/**
 * Get admin URLs for a bundle based on entity type
 * @param {string} entityType - Entity type
 * @param {string} bundle - Bundle machine name
 * @returns {object[]} - Array of {name, path} objects
 */
function getAdminUrls(entityType, bundle) {
  const urls = {
    node: [
      { name: 'Edit Form', path: `/admin/structure/types/manage/${bundle}` },
      { name: 'Manage Fields', path: `/admin/structure/types/manage/${bundle}/fields` },
      { name: 'Manage Form Display', path: `/admin/structure/types/manage/${bundle}/form-display` },
      { name: 'Manage Display', path: `/admin/structure/types/manage/${bundle}/display` },
      { name: 'Manage Permissions', path: `/admin/structure/types/manage/${bundle}/permissions` }
    ],
    paragraph: [
      { name: 'Edit Form', path: `/admin/structure/paragraphs_type/${bundle}` },
      { name: 'Manage Fields', path: `/admin/structure/paragraphs_type/${bundle}/fields` },
      { name: 'Manage Form Display', path: `/admin/structure/paragraphs_type/${bundle}/form-display` },
      { name: 'Manage Display', path: `/admin/structure/paragraphs_type/${bundle}/display` }
    ],
    taxonomy_term: [
      { name: 'Edit Form', path: `/admin/structure/taxonomy/manage/${bundle}` },
      { name: 'Manage Fields', path: `/admin/structure/taxonomy/manage/${bundle}/overview/fields` },
      { name: 'Manage Form Display', path: `/admin/structure/taxonomy/manage/${bundle}/overview/form-display` },
      { name: 'Manage Display', path: `/admin/structure/taxonomy/manage/${bundle}/overview/display` },
      { name: 'Manage Permissions', path: `/admin/structure/taxonomy/manage/${bundle}/overview/permissions` }
    ],
    block_content: [
      { name: 'Edit Form', path: `/admin/structure/block-content/manage/${bundle}` },
      { name: 'Manage Fields', path: `/admin/structure/block-content/manage/${bundle}/fields` },
      { name: 'Manage Form Display', path: `/admin/structure/block-content/manage/${bundle}/form-display` },
      { name: 'Manage Display', path: `/admin/structure/block-content/manage/${bundle}/display` },
      { name: 'Manage Permissions', path: `/admin/structure/block-content/manage/${bundle}/permissions` }
    ],
    media: [
      { name: 'Edit Form', path: `/admin/structure/media/manage/${bundle}` },
      { name: 'Manage Fields', path: `/admin/structure/media/manage/${bundle}/fields` },
      { name: 'Manage Form Display', path: `/admin/structure/media/manage/${bundle}/form-display` },
      { name: 'Manage Display', path: `/admin/structure/media/manage/${bundle}/display` },
      { name: 'Manage Permissions', path: `/admin/structure/media/manage/${bundle}/permissions` }
    ]
  };

  return urls[entityType] || [];
}

/**
 * Handle admin links action
 * @param {object} project - The current project
 * @returns {Promise<void>}
 */
export async function handleAdminLinks(project) {
  try {
    const summary = getBundleSummary(project);

    if (!summary.synced) {
      console.log(chalk.yellow('Project has not been synced. Run sync first.'));
      return;
    }

    // Select entity type
    const entityTypes = Object.keys(project.entities).filter(
      type => Object.keys(project.entities[type]).length > 0
    );

    if (entityTypes.length === 0) {
      console.log(chalk.yellow('No entities found.'));
      return;
    }

    const entityChoices = entityTypes.map(type => ({
      value: type,
      name: `${type} (${Object.keys(project.entities[type]).length} bundles)`
    }));

    const entityType = await select({
      message: 'Select entity type:',
      choices: entityChoices
    });

    // Select bundle
    const bundles = project.entities[entityType];
    const bundleEntries = Object.entries(bundles)
      .sort(([, a], [, b]) => (a.label || '').localeCompare(b.label || ''))
      .map(([id, bundle]) => ({
        value: id,
        name: `${bundle.label || id} (${id})`,
        label: bundle.label || id
      }));

    const selectedBundle = await search({
      message: 'Select bundle (type to search):',
      source: async (searchInput) => {
        const searchTerm = (searchInput || '').toLowerCase();
        return bundleEntries.filter(b =>
          b.name.toLowerCase().includes(searchTerm) ||
          b.value.toLowerCase().includes(searchTerm)
        );
      }
    });

    const bundle = bundles[selectedBundle];
    const adminUrls = getAdminUrls(entityType, selectedBundle);

    if (adminUrls.length === 0) {
      console.log(chalk.yellow(`No admin links available for ${entityType}.`));
      return;
    }

    const baseUrl = project.baseUrl || '';

    console.log();
    console.log(chalk.cyan(`Admin links for ${entityType} > ${bundle.label || selectedBundle}`));
    console.log();

    for (const url of adminUrls) {
      const fullUrl = baseUrl ? `${baseUrl}${url.path}` : url.path;
      console.log(`  ${url.name}: ${chalk.blue(fullUrl)}`);
    }
    console.log();
  } catch (error) {
    if (error.name === 'ExitPromptError') {
      return;
    }
    console.log(chalk.red(`Error: ${error.message}`));
  }
}

/**
 * Handle drush sync action
 * @param {object} project - The current project
 * @returns {Promise<void>}
 */
export async function handleDrushSync(project) {
  try {
    const status = getSyncStatus(project);

    console.log();
    console.log(chalk.cyan('Drupal Configuration Sync'));
    console.log();

    if (!status.configured) {
      console.log(chalk.yellow(status.message));
      console.log();

      const configure = await select({
        message: 'Would you like to configure drush sync now?',
        choices: [
          { value: true, name: 'Yes, edit project settings' },
          { value: false, name: 'No, go back' }
        ]
      });

      if (configure) {
        console.log(chalk.cyan('Use "Edit project" to set the Drupal root directory.'));
      }
      return;
    }

    console.log(`  Drupal root: ${chalk.cyan(status.drupalRoot)}`);
    console.log(`  Drush command: ${chalk.cyan(status.drushCommand)}`);
    console.log();

    const confirm = await select({
      message: 'Run drush config import then export?',
      choices: [
        { value: true, name: 'Yes, sync now' },
        { value: false, name: 'No, cancel' }
      ]
    });

    if (!confirm) {
      return;
    }

    console.log();

    const result = await syncWithDrupal(project, {
      onProgress: (msg) => console.log(chalk.cyan(msg))
    });

    console.log();
    if (result.success) {
      console.log(chalk.green(result.message));
    } else {
      console.log(chalk.red(result.message));
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
    console.log();
  } catch (error) {
    if (error.name === 'ExitPromptError') {
      return;
    }
    console.log(chalk.red(`Error: ${error.message}`));
  }
}

/**
 * Handle migration report generation (all migrations)
 * @param {object} project - The current project
 * @returns {Promise<void>}
 */
export async function handleMigrationReport(project) {
  try {
    const migrations = await listMigrations(project);

    if (migrations.length === 0) {
      console.log(chalk.yellow('No migration configs found in this project.'));
      return;
    }

    const format = await select({
      message: `Found ${migrations.length} migrations. Output format:`,
      choices: [
        { value: 'markdown', name: 'Markdown report' },
        { value: 'json', name: 'JSON (for LLM consumption)' }
      ]
    });

    if (format === 'json') {
      const data = await getMigrationReportData(project);
      const defaultPath = join(getReportsDir(project.slug), `${project.slug}-migrations.json`);
      const outputPath = await input({
        message: 'Output file path:',
        default: defaultPath
      });

      await mkdir(dirname(outputPath.trim()), { recursive: true });
      await writeFile(outputPath.trim(), JSON.stringify(data, null, 2), 'utf8');
      console.log(chalk.green(`JSON exported to: ${outputPath.trim()}`));
    } else {
      const filename = `${project.slug}-migrations-report.md`;
      const outputPath = join(getReportsDir(project.slug), filename);
      await createMigrationReport(project, outputPath);
      console.log(chalk.green(`Report saved to: ${outputPath}`));
    }
  } catch (error) {
    if (error.name === 'ExitPromptError') return;
    console.log(chalk.red(`Error: ${error.message}`));
  }
}

/**
 * Handle single migration report generation
 * @param {object} project - The current project
 * @returns {Promise<void>}
 */
export async function handleSingleMigrationReport(project) {
  try {
    const migrations = await listMigrations(project);

    if (migrations.length === 0) {
      console.log(chalk.yellow('No migration configs found in this project.'));
      return;
    }

    const migrationChoices = migrations.map(m => ({
      value: m.id,
      name: `${m.label} (${m.id})${m.group ? ` [${m.group}]` : ''}`,
      label: m.label
    }));

    const migrationId = await search({
      message: 'Select migration (type to search):',
      source: async (searchInput) => {
        const term = (searchInput || '').toLowerCase();
        return migrationChoices.filter(c =>
          c.name.toLowerCase().includes(term) ||
          c.value.toLowerCase().includes(term)
        );
      }
    });

    const filename = `${project.slug}-migration-${migrationId}.md`;
    const outputPath = join(getReportsDir(project.slug), filename);

    const result = await createSingleMigrationReport(project, migrationId, outputPath);
    if (result) {
      console.log(chalk.green(`Report saved to: ${outputPath}`));
    } else {
      console.log(chalk.red(`Migration "${migrationId}" not found.`));
    }
  } catch (error) {
    if (error.name === 'ExitPromptError') return;
    console.log(chalk.red(`Error: ${error.message}`));
  }
}
