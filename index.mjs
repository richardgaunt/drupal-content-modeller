#!/usr/bin/env node

import { Command } from 'commander';
import { showMainMenu } from './src/cli/menus.js';
import {
  cmdProjectCreate,
  cmdProjectList,
  cmdProjectEdit,
  cmdProjectSync,
  cmdProjectDelete,
  cmdBundleCreate,
  cmdBundleList,
  cmdFieldCreate,
  cmdFieldList,
  cmdFieldEdit,
  cmdReportEntity,
  cmdReportProject,
  cmdAdminLinks
} from './src/cli/commands.js';

const program = new Command();

program
  .name('dcm')
  .description('Drupal Content Modeller - CLI tool for managing Drupal content models')
  .version('1.0.0');

// ============================================
// Project Commands
// ============================================

const projectCmd = program
  .command('project')
  .description('Project management commands');

projectCmd
  .command('create')
  .description('Create a new project')
  .requiredOption('-n, --name <name>', 'Project name')
  .requiredOption('-c, --config-path <path>', 'Path to Drupal configuration directory')
  .option('-u, --base-url <url>', 'Base URL of the Drupal site')
  .option('-j, --json', 'Output as JSON')
  .action(cmdProjectCreate);

projectCmd
  .command('list')
  .description('List all projects')
  .option('-j, --json', 'Output as JSON')
  .action(cmdProjectList);

projectCmd
  .command('edit')
  .description('Edit project settings')
  .requiredOption('-p, --project <slug>', 'Project slug')
  .option('-n, --name <name>', 'New project name')
  .option('-c, --config-path <path>', 'New configuration directory path')
  .option('-u, --base-url <url>', 'New base URL')
  .option('-j, --json', 'Output as JSON')
  .action(cmdProjectEdit);

projectCmd
  .command('sync')
  .description('Sync project configuration from Drupal config directory')
  .requiredOption('-p, --project <slug>', 'Project slug')
  .option('-j, --json', 'Output as JSON')
  .action(cmdProjectSync);

projectCmd
  .command('delete')
  .description('Delete a project')
  .requiredOption('-p, --project <slug>', 'Project slug')
  .option('-f, --force', 'Skip confirmation')
  .option('-j, --json', 'Output as JSON')
  .action(cmdProjectDelete);

// ============================================
// Bundle Commands
// ============================================

const bundleCmd = program
  .command('bundle')
  .description('Bundle management commands');

bundleCmd
  .command('create')
  .description('Create a new entity bundle')
  .requiredOption('-p, --project <slug>', 'Project slug')
  .requiredOption('-e, --entity-type <type>', 'Entity type (node, media, paragraph, taxonomy_term, block_content)')
  .requiredOption('-l, --label <label>', 'Bundle label')
  .option('-m, --machine-name <name>', 'Machine name (auto-generated if omitted)')
  .option('-d, --description <desc>', 'Bundle description')
  .option('-s, --source-type <type>', 'Media source type (image, file, remote_video) - required for media')
  .option('-j, --json', 'Output as JSON')
  .action(cmdBundleCreate);

bundleCmd
  .command('list')
  .description('List bundles in a project')
  .requiredOption('-p, --project <slug>', 'Project slug')
  .option('-e, --entity-type <type>', 'Filter by entity type')
  .option('-j, --json', 'Output as JSON')
  .action(cmdBundleList);

// ============================================
// Field Commands
// ============================================

const fieldCmd = program
  .command('field')
  .description('Field management commands');

fieldCmd
  .command('create')
  .description('Create a new field on a bundle')
  .requiredOption('-p, --project <slug>', 'Project slug')
  .requiredOption('-e, --entity-type <type>', 'Entity type')
  .requiredOption('-b, --bundle <bundle>', 'Bundle machine name')
  .requiredOption('-t, --field-type <type>', 'Field type')
  .requiredOption('-l, --label <label>', 'Field label')
  .option('-n, --field-name <name>', 'Field machine name (auto-generated if omitted)')
  .option('-d, --description <desc>', 'Field description/help text')
  .option('-r, --required', 'Make field required')
  .option('--cardinality <num>', 'Number of values (1 for single, -1 for unlimited)')
  .option('--max-length <num>', 'Maximum length (for string fields)')
  .option('--allowed-values <values>', 'Allowed values as key|label,key|label (for list fields)')
  .option('--target-type <type>', 'Target entity type (for entity_reference)')
  .option('--target-bundles <bundles>', 'Target bundles, comma-separated (for entity_reference)')
  .option('--datetime-type <type>', 'Date type: date or datetime')
  .option('--link-type <type>', 'Link type: external or internal')
  .option('--title-option <opt>', 'Link title: optional, required, or disabled')
  .option('--file-extensions <exts>', 'Allowed file extensions (space-separated)')
  .option('--file-directory <dir>', 'Upload directory path')
  .option('--alt-required', 'Require alt text (for image fields)')
  .option('-j, --json', 'Output as JSON')
  .action(cmdFieldCreate);

fieldCmd
  .command('list')
  .description('List fields on a bundle or entity type')
  .requiredOption('-p, --project <slug>', 'Project slug')
  .requiredOption('-e, --entity-type <type>', 'Entity type')
  .option('-b, --bundle <bundle>', 'Bundle machine name (if omitted, lists all fields)')
  .option('-j, --json', 'Output as JSON')
  .action(cmdFieldList);

fieldCmd
  .command('edit')
  .description('Edit a field instance')
  .requiredOption('-p, --project <slug>', 'Project slug')
  .requiredOption('-e, --entity-type <type>', 'Entity type')
  .requiredOption('-b, --bundle <bundle>', 'Bundle machine name')
  .requiredOption('-n, --field-name <name>', 'Field machine name')
  .option('-l, --label <label>', 'New field label')
  .option('-d, --description <desc>', 'New description')
  .option('-r, --required', 'Make field required')
  .option('--not-required', 'Make field optional')
  .option('--target-bundles <bundles>', 'Update target bundles, comma-separated')
  .option('-j, --json', 'Output as JSON')
  .action(cmdFieldEdit);

// ============================================
// Report Commands
// ============================================

const reportCmd = program
  .command('report')
  .description('Report generation commands');

reportCmd
  .command('entity')
  .description('Generate a report for an entity type')
  .requiredOption('-p, --project <slug>', 'Project slug')
  .requiredOption('-e, --entity-type <type>', 'Entity type')
  .option('-o, --output <path>', 'Output file path')
  .option('-u, --base-url <url>', 'Base URL for admin links')
  .option('-j, --json', 'Output as JSON')
  .action(cmdReportEntity);

reportCmd
  .command('project')
  .description('Generate a full project report')
  .requiredOption('-p, --project <slug>', 'Project slug')
  .option('-o, --output <path>', 'Output file path')
  .option('-u, --base-url <url>', 'Base URL for admin links')
  .option('-j, --json', 'Output as JSON')
  .action(cmdReportProject);

// ============================================
// Admin Commands
// ============================================

const adminCmd = program
  .command('admin')
  .description('Admin utility commands');

adminCmd
  .command('links')
  .description('Display admin links for a bundle')
  .requiredOption('-p, --project <slug>', 'Project slug')
  .requiredOption('-e, --entity-type <type>', 'Entity type')
  .requiredOption('-b, --bundle <bundle>', 'Bundle machine name')
  .option('-j, --json', 'Output as JSON')
  .action(cmdAdminLinks);

// ============================================
// Interactive Mode
// ============================================

/**
 * Main entry point
 * If no arguments provided, launch interactive mode
 */
async function main() {
  // Check if any arguments were provided (beyond node and script path)
  const hasArgs = process.argv.length > 2;

  if (!hasArgs) {
    // No arguments - launch interactive mode
    try {
      await showMainMenu();
    } catch (error) {
      if (error.name !== 'ExitPromptError') {
        console.error('Fatal error:', error.message);
        process.exit(1);
      }
    }
  } else {
    // Arguments provided - use commander
    await program.parseAsync(process.argv);
  }
}

main();
