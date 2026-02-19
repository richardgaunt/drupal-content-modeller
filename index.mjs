#!/usr/bin/env node

import { Command } from 'commander';
import { showMainMenu } from './src/cli/menus.js';
import {
  cmdHelp,
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
  cmdAdminLinks,
  cmdFormDisplayCreate,
  cmdFormDisplayView,
  cmdFormDisplayListModes,
  cmdFormDisplayHide,
  cmdFormDisplayShow,
  cmdFormDisplaySetWidget,
  cmdFormDisplaySetWidgetSetting,
  cmdFormDisplayListWidgets,
  cmdFormDisplayGroupCreate,
  cmdFormDisplayGroupEdit,
  cmdFormDisplayGroupDelete,
  cmdFormDisplayGroupList,
  cmdFormDisplayMove,
  cmdFormDisplayReorder,
  cmdFormDisplaySetWeight,
  cmdFormDisplayReset,
  cmdRoleCreate,
  cmdRoleList,
  cmdRoleView,
  cmdRoleDelete,
  cmdRoleAddPermission,
  cmdRoleRemovePermission,
  cmdRoleSetPermissions,
  cmdRoleListPermissions,
  cmdDrushSync,
  cmdDrushStatus
} from './src/cli/commands.js';
import {
  PROJECT_HELP, PROJECT_HELP_DATA,
  BUNDLE_HELP, BUNDLE_HELP_DATA,
  FIELD_HELP, FIELD_HELP_DATA,
  FIELD_CREATE_HELP, FIELD_CREATE_HELP_DATA,
  FORM_DISPLAY_HELP, FORM_DISPLAY_HELP_DATA,
  ROLE_HELP, ROLE_HELP_DATA,
  DRUSH_HELP, DRUSH_HELP_DATA,
  REPORT_HELP, REPORT_HELP_DATA,
  ADMIN_HELP, ADMIN_HELP_DATA
} from './src/cli/help/index.js';

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

projectCmd.addHelpText('after', PROJECT_HELP);
projectCmd._helpData = PROJECT_HELP_DATA;

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

bundleCmd.addHelpText('after', BUNDLE_HELP);
bundleCmd._helpData = BUNDLE_HELP_DATA;

bundleCmd
  .command('create')
  .description('Create a new entity bundle')
  .requiredOption('-p, --project <slug>', 'Project slug')
  .requiredOption('-e, --entity-type <type>', 'Entity type (node, media, paragraph, taxonomy_term, block_content)')
  .requiredOption('-l, --label <label>', 'Bundle label')
  .option('-m, --machine-name <name>', 'Machine name (auto-generated if omitted)')
  .option('-d, --description <desc>', 'Bundle description')
  .option('-s, --source-type <type>', 'Media source type (image, file, remote_video) - required for media')
  .option('--sync', 'Sync with Drupal after creation (runs drush cim && drush cex)')
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

fieldCmd.addHelpText('after', FIELD_HELP);
fieldCmd._helpData = FIELD_HELP_DATA;

const fieldCreateCmd = fieldCmd
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
  .option('--sync', 'Sync with Drupal after creation (runs drush cim && drush cex)')
  .option('-j, --json', 'Output as JSON')
  .action(cmdFieldCreate);

fieldCreateCmd.addHelpText('after', FIELD_CREATE_HELP);
fieldCreateCmd._helpData = FIELD_CREATE_HELP_DATA;

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
  .option('--sync', 'Sync with Drupal after edit (runs drush cim && drush cex)')
  .option('-j, --json', 'Output as JSON')
  .action(cmdFieldEdit);

// ============================================
// Report Commands
// ============================================

const reportCmd = program
  .command('report')
  .description('Report generation commands');

reportCmd.addHelpText('after', REPORT_HELP);
reportCmd._helpData = REPORT_HELP_DATA;

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

adminCmd.addHelpText('after', ADMIN_HELP);
adminCmd._helpData = ADMIN_HELP_DATA;

adminCmd
  .command('links')
  .description('Display admin links for a bundle')
  .requiredOption('-p, --project <slug>', 'Project slug')
  .requiredOption('-e, --entity-type <type>', 'Entity type')
  .requiredOption('-b, --bundle <bundle>', 'Bundle machine name')
  .option('-j, --json', 'Output as JSON')
  .action(cmdAdminLinks);

// ============================================
// Form Display Commands
// ============================================

const formDisplayCmd = program
  .command('form-display')
  .description('Form display management commands');

formDisplayCmd.addHelpText('after', FORM_DISPLAY_HELP);
formDisplayCmd._helpData = FORM_DISPLAY_HELP_DATA;

formDisplayCmd
  .command('create')
  .description('Create a new form display with default widgets')
  .requiredOption('-p, --project <slug>', 'Project slug')
  .requiredOption('-e, --entity-type <type>', 'Entity type')
  .requiredOption('-b, --bundle <bundle>', 'Bundle machine name')
  .option('-j, --json', 'Output as JSON')
  .action(cmdFormDisplayCreate);

formDisplayCmd
  .command('view')
  .description('View form display layout as a tree')
  .requiredOption('-p, --project <slug>', 'Project slug')
  .requiredOption('-e, --entity-type <type>', 'Entity type')
  .requiredOption('-b, --bundle <bundle>', 'Bundle machine name')
  .option('-m, --mode <mode>', 'Form mode', 'default')
  .option('-j, --json', 'Output as JSON')
  .action(cmdFormDisplayView);

formDisplayCmd
  .command('list-modes')
  .description('List available form display modes for a bundle')
  .requiredOption('-p, --project <slug>', 'Project slug')
  .requiredOption('-e, --entity-type <type>', 'Entity type')
  .requiredOption('-b, --bundle <bundle>', 'Bundle machine name')
  .option('-j, --json', 'Output as JSON')
  .action(cmdFormDisplayListModes);

formDisplayCmd
  .command('hide')
  .description('Hide one or more fields from the form display')
  .requiredOption('-p, --project <slug>', 'Project slug')
  .requiredOption('-e, --entity-type <type>', 'Entity type')
  .requiredOption('-b, --bundle <bundle>', 'Bundle machine name')
  .requiredOption('-f, --fields <fields>', 'Comma-separated field names to hide')
  .option('-j, --json', 'Output as JSON')
  .action(cmdFormDisplayHide);

formDisplayCmd
  .command('show')
  .description('Show one or more hidden fields')
  .requiredOption('-p, --project <slug>', 'Project slug')
  .requiredOption('-e, --entity-type <type>', 'Entity type')
  .requiredOption('-b, --bundle <bundle>', 'Bundle machine name')
  .requiredOption('-f, --fields <fields>', 'Comma-separated field names to show')
  .option('-j, --json', 'Output as JSON')
  .action(cmdFormDisplayShow);

formDisplayCmd
  .command('set-widget')
  .description('Change the widget type for a field')
  .requiredOption('-p, --project <slug>', 'Project slug')
  .requiredOption('-e, --entity-type <type>', 'Entity type')
  .requiredOption('-b, --bundle <bundle>', 'Bundle machine name')
  .requiredOption('-f, --field <field>', 'Field name')
  .requiredOption('-w, --widget <widget>', 'Widget type')
  .option('-j, --json', 'Output as JSON')
  .action(cmdFormDisplaySetWidget);

formDisplayCmd
  .command('set-widget-setting')
  .description('Update a specific widget setting for a field')
  .requiredOption('-p, --project <slug>', 'Project slug')
  .requiredOption('-e, --entity-type <type>', 'Entity type')
  .requiredOption('-b, --bundle <bundle>', 'Bundle machine name')
  .requiredOption('-f, --field <field>', 'Field name')
  .requiredOption('-s, --setting <setting>', 'Setting name')
  .requiredOption('-v, --value <value>', 'Setting value')
  .option('-j, --json', 'Output as JSON')
  .action(cmdFormDisplaySetWidgetSetting);

formDisplayCmd
  .command('list-widgets')
  .description('List available widgets for a field type')
  .requiredOption('-t, --field-type <type>', 'Field type')
  .option('-j, --json', 'Output as JSON')
  .action(cmdFormDisplayListWidgets);

// Form Display Group subcommands
const formDisplayGroupCmd = formDisplayCmd
  .command('group')
  .description('Field group management commands');

formDisplayGroupCmd
  .command('create')
  .description('Create a new field group')
  .requiredOption('-p, --project <slug>', 'Project slug')
  .requiredOption('-e, --entity-type <type>', 'Entity type')
  .requiredOption('-b, --bundle <bundle>', 'Bundle machine name')
  .requiredOption('-l, --label <label>', 'Group label')
  .option('-n, --name <name>', 'Machine name (auto-generated if omitted)')
  .option('-f, --format <format>', 'Format type: tabs, tab, details, fieldset', 'details')
  .option('--parent <parent>', 'Parent group name (if nesting)')
  .option('-j, --json', 'Output as JSON')
  .action(cmdFormDisplayGroupCreate);

formDisplayGroupCmd
  .command('edit')
  .description('Edit a field group\'s properties')
  .requiredOption('-p, --project <slug>', 'Project slug')
  .requiredOption('-e, --entity-type <type>', 'Entity type')
  .requiredOption('-b, --bundle <bundle>', 'Bundle machine name')
  .requiredOption('-n, --name <name>', 'Group machine name')
  .option('-l, --label <label>', 'New group label')
  .option('-f, --format <format>', 'New format type')
  .option('-j, --json', 'Output as JSON')
  .action(cmdFormDisplayGroupEdit);

formDisplayGroupCmd
  .command('delete')
  .description('Delete a field group')
  .requiredOption('-p, --project <slug>', 'Project slug')
  .requiredOption('-e, --entity-type <type>', 'Entity type')
  .requiredOption('-b, --bundle <bundle>', 'Bundle machine name')
  .requiredOption('-n, --name <name>', 'Group machine name to delete')
  .option('--move-children-to <target>', 'Where to move children: parent (default) or root', 'parent')
  .option('-j, --json', 'Output as JSON')
  .action(cmdFormDisplayGroupDelete);

formDisplayGroupCmd
  .command('list')
  .description('List all field groups in a form display')
  .requiredOption('-p, --project <slug>', 'Project slug')
  .requiredOption('-e, --entity-type <type>', 'Entity type')
  .requiredOption('-b, --bundle <bundle>', 'Bundle machine name')
  .option('-j, --json', 'Output as JSON')
  .action(cmdFormDisplayGroupList);

// Form Display Movement commands
formDisplayCmd
  .command('move')
  .description('Move a field or group to a different parent')
  .requiredOption('-p, --project <slug>', 'Project slug')
  .requiredOption('-e, --entity-type <type>', 'Entity type')
  .requiredOption('-b, --bundle <bundle>', 'Bundle machine name')
  .requiredOption('-i, --item <item>', 'Field or group name to move')
  .requiredOption('-t, --to <target>', 'Target group name, or "root" for root level')
  .option('-j, --json', 'Output as JSON')
  .action(cmdFormDisplayMove);

formDisplayCmd
  .command('reorder')
  .description('Reorder items within a group (or at root level)')
  .requiredOption('-p, --project <slug>', 'Project slug')
  .requiredOption('-e, --entity-type <type>', 'Entity type')
  .requiredOption('-b, --bundle <bundle>', 'Bundle machine name')
  .requiredOption('-o, --order <order>', 'Comma-separated list of items in desired order')
  .option('-g, --group <group>', 'Group to reorder within (omit for root level)')
  .option('-j, --json', 'Output as JSON')
  .action(cmdFormDisplayReorder);

formDisplayCmd
  .command('set-weight')
  .description('Set the weight of a specific field or group')
  .requiredOption('-p, --project <slug>', 'Project slug')
  .requiredOption('-e, --entity-type <type>', 'Entity type')
  .requiredOption('-b, --bundle <bundle>', 'Bundle machine name')
  .requiredOption('-i, --item <item>', 'Field or group name')
  .requiredOption('-w, --weight <weight>', 'Weight value (lower = higher position)')
  .option('-j, --json', 'Output as JSON')
  .action(cmdFormDisplaySetWeight);

formDisplayCmd
  .command('reset')
  .description('Reset form display to defaults')
  .requiredOption('-p, --project <slug>', 'Project slug')
  .requiredOption('-e, --entity-type <type>', 'Entity type')
  .requiredOption('-b, --bundle <bundle>', 'Bundle machine name')
  .option('--keep-groups', 'Keep field groups (only reset field widgets)')
  .option('-f, --force', 'Skip confirmation')
  .option('-j, --json', 'Output as JSON')
  .action(cmdFormDisplayReset);

// ============================================
// Role Commands
// ============================================

const roleCmd = program
  .command('role')
  .description('Role and permission management commands');

roleCmd.addHelpText('after', ROLE_HELP);
roleCmd._helpData = ROLE_HELP_DATA;

roleCmd
  .command('create')
  .description('Create a new role')
  .requiredOption('-p, --project <slug>', 'Project slug')
  .requiredOption('-l, --label <label>', 'Role label')
  .option('-n, --name <name>', 'Machine name (auto-generated if omitted)')
  .option('--is-admin', 'Make this an admin role')
  .option('--sync', 'Sync with Drupal after creation (runs drush cim && drush cex)')
  .option('-j, --json', 'Output as JSON')
  .action(cmdRoleCreate);

roleCmd
  .command('list')
  .description('List all roles')
  .requiredOption('-p, --project <slug>', 'Project slug')
  .option('-j, --json', 'Output as JSON')
  .action(cmdRoleList);

roleCmd
  .command('view')
  .description('View role details and permissions')
  .requiredOption('-p, --project <slug>', 'Project slug')
  .requiredOption('-r, --role <id>', 'Role machine name')
  .option('-j, --json', 'Output as JSON')
  .action(cmdRoleView);

roleCmd
  .command('delete')
  .description('Delete a role')
  .requiredOption('-p, --project <slug>', 'Project slug')
  .requiredOption('-r, --role <id>', 'Role machine name')
  .option('-f, --force', 'Skip confirmation')
  .option('-j, --json', 'Output as JSON')
  .action(cmdRoleDelete);

roleCmd
  .command('add-permission')
  .description('Add permissions to a role')
  .requiredOption('-p, --project <slug>', 'Project slug')
  .requiredOption('-r, --role <id>', 'Role machine name')
  .requiredOption('-e, --entity-type <type>', 'Entity type')
  .requiredOption('-b, --bundle <bundle>', 'Bundle machine name')
  .requiredOption('--permissions <list>', 'Comma-separated permission short names or "all"')
  .option('--sync', 'Sync with Drupal after edit (runs drush cim && drush cex)')
  .option('-j, --json', 'Output as JSON')
  .action(cmdRoleAddPermission);

roleCmd
  .command('remove-permission')
  .description('Remove permissions from a role')
  .requiredOption('-p, --project <slug>', 'Project slug')
  .requiredOption('-r, --role <id>', 'Role machine name')
  .requiredOption('--permissions <list>', 'Comma-separated full permission keys')
  .option('--sync', 'Sync with Drupal after edit (runs drush cim && drush cex)')
  .option('-j, --json', 'Output as JSON')
  .action(cmdRoleRemovePermission);

roleCmd
  .command('set-permissions')
  .description('Set permissions for a bundle (replaces existing)')
  .requiredOption('-p, --project <slug>', 'Project slug')
  .requiredOption('-r, --role <id>', 'Role machine name')
  .requiredOption('-e, --entity-type <type>', 'Entity type')
  .requiredOption('-b, --bundle <bundle>', 'Bundle machine name')
  .requiredOption('--permissions <list>', 'Comma-separated permission short names, "all", or "none"')
  .option('--sync', 'Sync with Drupal after edit (runs drush cim && drush cex)')
  .option('-j, --json', 'Output as JSON')
  .action(cmdRoleSetPermissions);

roleCmd
  .command('list-permissions')
  .description('List available permissions for a bundle')
  .requiredOption('-e, --entity-type <type>', 'Entity type')
  .requiredOption('-b, --bundle <bundle>', 'Bundle machine name')
  .option('-j, --json', 'Output as JSON')
  .action(cmdRoleListPermissions);

// ============================================
// Drush Commands
// ============================================

const drushCmd = program
  .command('drush')
  .description('Drush integration commands');

drushCmd.addHelpText('after', DRUSH_HELP);
drushCmd._helpData = DRUSH_HELP_DATA;

drushCmd
  .command('sync')
  .description('Sync configuration with Drupal (runs drush cim && drush cex)')
  .requiredOption('-p, --project <slug>', 'Project slug')
  .option('-j, --json', 'Output as JSON')
  .action(cmdDrushSync);

drushCmd
  .command('status')
  .description('Check drush sync configuration status')
  .requiredOption('-p, --project <slug>', 'Project slug')
  .option('-j, --json', 'Output as JSON')
  .action(cmdDrushStatus);

// ============================================
// Help Command
// ============================================

program
  .command('help')
  .description('Show full CLI reference documentation')
  .argument('[command]', 'Command group to show help for (e.g., project, bundle, field)')
  .option('-j, --json', 'Output as JSON')
  .action(cmdHelp);

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
