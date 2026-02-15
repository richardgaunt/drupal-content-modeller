/**
 * CLI Commands
 * Command handlers for non-interactive CLI mode.
 */

import chalk from 'chalk';
import { join } from 'path';
import { createProject, loadProject, listProjects, updateProject, deleteProject } from '../commands/project.js';
import { syncProject } from '../commands/sync.js';
import { createBundle, createField, updateField } from '../commands/create.js';
import { createEntityReport, createProjectReport } from '../commands/report.js';
import {
  groupBundlesByEntityType,
  getFieldsForEntityType,
  getFieldsForBundle
} from '../commands/list.js';
import { getBundleAdminUrls } from '../generators/reportGenerator.js';
import { generateMachineName } from '../generators/bundleGenerator.js';
import { generateFieldName } from '../generators/fieldGenerator.js';
import { getReportsDir } from '../io/fileSystem.js';
import {
  loadFormDisplay,
  saveFormDisplay,
  getFormDisplayTree,
  reorderGroupChildren,
  moveFieldToGroup,
  moveGroupToParent,
  createFieldGroup,
  deleteFieldGroup,
  updateFieldGroup,
  toggleFieldVisibility,
  showHiddenField,
  updateFieldWidget,
  updateFieldSettings,
  resetFormDisplay,
  getFormDisplayModes,
  createFormDisplay
} from '../commands/formDisplay.js';
import {
  getWidgetsForFieldType,
  FIELD_WIDGETS
} from '../constants/fieldWidgets.js';
import { generateGroupName } from '../parsers/formDisplayParser.js';
import {
  listRoles,
  loadRole,
  createRole,
  deleteRole,
  addRolePermissions,
  removeRolePermissions,
  setRoleBundlePermissionsCmd,
  parseShortPermissions
} from '../commands/role.js';
import {
  getPermissionsForBundle,
  groupPermissionsByBundle
} from '../constants/permissions.js';
import {
  checkDrushAvailable,
  syncWithDrupal,
  getSyncStatus
} from '../commands/drush.js';

/**
 * Valid entity types
 */
const VALID_ENTITY_TYPES = ['node', 'media', 'paragraph', 'taxonomy_term', 'block_content'];

/**
 * Valid media source types
 */
const VALID_SOURCE_TYPES = ['image', 'file', 'remote_video'];

/**
 * Valid field types
 */
const VALID_FIELD_TYPES = [
  'string', 'string_long', 'text_long', 'boolean', 'integer',
  'list_string', 'list_integer', 'datetime', 'daterange',
  'link', 'image', 'file', 'entity_reference', 'entity_reference_revisions', 'webform'
];

/**
 * Validate entity type
 * @param {string} entityType - Entity type to validate
 * @returns {boolean} - True if valid
 */
function isValidEntityType(entityType) {
  return VALID_ENTITY_TYPES.includes(entityType);
}

/**
 * Validate field type
 * @param {string} fieldType - Field type to validate
 * @returns {boolean} - True if valid
 */
function isValidFieldType(fieldType) {
  return VALID_FIELD_TYPES.includes(fieldType);
}

/**
 * Output data as JSON or formatted text
 * @param {*} data - Data to output
 * @param {boolean} json - Whether to output as JSON
 */
function output(data, json = false) {
  if (json) {
    console.log(JSON.stringify(data, null, 2));
  } else if (typeof data === 'string') {
    console.log(data);
  } else {
    console.log(data);
  }
}

/**
 * Handle errors consistently
 * @param {Error} error - Error object
 */
function handleError(error) {
  console.error(chalk.red(`Error: ${error.message}`));
  process.exit(1);
}

/**
 * Sync project configuration (updates project.json with config directory contents)
 * @param {object} project - Project object
 * @returns {Promise<void>}
 */
async function autoSyncProject(project) {
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
async function runSyncIfRequested(project, options) {
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

// ============================================
// Project Commands
// ============================================

/**
 * Create a new project
 */
export async function cmdProjectCreate(options) {
  try {
    if (!options.name) {
      throw new Error('--name is required');
    }
    if (!options.configPath) {
      throw new Error('--config-path is required');
    }

    const project = await createProject(options.name, options.configPath, options.baseUrl || '');

    if (options.json) {
      output(project, true);
    } else {
      console.log(chalk.green(`Project "${project.name}" created successfully!`));
      console.log(chalk.cyan(`Slug: ${project.slug}`));
    }
  } catch (error) {
    handleError(error);
  }
}

/**
 * List all projects
 */
export async function cmdProjectList(options) {
  try {
    const projects = await listProjects();

    if (options.json) {
      output(projects, true);
    } else if (projects.length === 0) {
      console.log(chalk.yellow('No projects found.'));
    } else {
      console.log(chalk.cyan('Projects:'));
      console.log();
      for (const p of projects) {
        console.log(`  ${p.name} (${p.slug})`);
        if (p.configDirectory) {
          console.log(chalk.gray(`    Config: ${p.configDirectory}`));
        }
      }
    }
  } catch (error) {
    handleError(error);
  }
}

/**
 * Edit a project
 */
export async function cmdProjectEdit(options) {
  try {
    if (!options.project) {
      throw new Error('--project is required');
    }

    const project = await loadProject(options.project);

    const updates = {
      name: options.name || project.name,
      configDirectory: options.configPath || project.configDirectory,
      baseUrl: options.baseUrl !== undefined ? options.baseUrl : project.baseUrl
    };

    const updated = await updateProject(project, updates);

    if (options.json) {
      output(updated, true);
    } else {
      console.log(chalk.green(`Project "${updated.name}" updated successfully!`));
      if (updated.slug !== options.project) {
        console.log(chalk.cyan(`Slug changed: ${options.project} -> ${updated.slug}`));
      }
    }
  } catch (error) {
    handleError(error);
  }
}

/**
 * Sync a project
 */
export async function cmdProjectSync(options) {
  try {
    if (!options.project) {
      throw new Error('--project is required');
    }

    const project = await loadProject(options.project);
    const result = await syncProject(project);

    if (options.json) {
      output(result, true);
    } else {
      console.log(chalk.green('Sync complete!'));
      console.log(chalk.cyan(`Found ${result.bundlesFound} bundles and ${result.fieldsFound} fields`));
    }
  } catch (error) {
    handleError(error);
  }
}

/**
 * Delete a project
 */
export async function cmdProjectDelete(options) {
  try {
    if (!options.project) {
      throw new Error('--project is required');
    }

    // Load project first to confirm it exists
    await loadProject(options.project);

    const deleted = await deleteProject(options.project);

    if (deleted) {
      if (options.json) {
        output({ deleted: true, slug: options.project }, true);
      } else {
        console.log(chalk.green(`Project "${options.project}" deleted successfully!`));
      }
    } else {
      throw new Error(`Failed to delete project "${options.project}"`);
    }
  } catch (error) {
    handleError(error);
  }
}

// ============================================
// Bundle Commands
// ============================================

/**
 * Create a new bundle
 */
export async function cmdBundleCreate(options) {
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
    if (!options.label) {
      throw new Error('--label is required');
    }
    if (options.entityType === 'media' && !options.sourceType) {
      throw new Error('--source-type is required for media entity type');
    }
    if (options.sourceType && !VALID_SOURCE_TYPES.includes(options.sourceType)) {
      throw new Error(`Invalid source type. Must be one of: ${VALID_SOURCE_TYPES.join(', ')}`);
    }

    const project = await loadProject(options.project);

    const machineName = options.machineName || generateMachineName(options.label);

    const bundleOptions = {
      label: options.label,
      machineName,
      description: options.description || '',
      sourceType: options.sourceType
    };

    const result = await createBundle(project, options.entityType, bundleOptions);

    if (options.json) {
      output(result, true);
    } else {
      console.log(chalk.green(`Bundle "${result.label}" created successfully!`));
      console.log(chalk.cyan('Created files:'));
      for (const file of result.createdFiles) {
        console.log(`  - ${file}`);
      }
    }

    await runSyncIfRequested(project, options);
  } catch (error) {
    handleError(error);
  }
}

/**
 * List bundles in a project
 */
export async function cmdBundleList(options) {
  try {
    if (!options.project) {
      throw new Error('--project is required');
    }
    if (options.entityType && !isValidEntityType(options.entityType)) {
      throw new Error(`Invalid entity type. Must be one of: ${VALID_ENTITY_TYPES.join(', ')}`);
    }

    const project = await loadProject(options.project);

    if (!project.entities) {
      throw new Error('Project has not been synced. Run "dcm project sync" first.');
    }

    const groups = groupBundlesByEntityType(project.entities);

    if (options.json) {
      if (options.entityType) {
        output(groups[options.entityType] || { bundles: [] }, true);
      } else {
        output(groups, true);
      }
    } else {
      const entityTypes = options.entityType ? [options.entityType] : Object.keys(groups);

      if (entityTypes.length === 0) {
        console.log(chalk.yellow('No bundles found.'));
        return;
      }

      for (const et of entityTypes) {
        const group = groups[et];
        if (!group) continue;

        console.log();
        console.log(chalk.cyan(`${group.label} (${group.bundles.length})`));
        for (const bundle of group.bundles) {
          console.log(`  ${bundle.label} (${bundle.id}) - ${bundle.fieldCount} fields`);
        }
      }
      console.log();
    }
  } catch (error) {
    handleError(error);
  }
}

// ============================================
// Field Commands
// ============================================

/**
 * Parse allowed values from CLI format
 * @param {string} value - Comma-separated key|label pairs
 * @returns {object[]} - Array of {value, label} objects
 */
function parseAllowedValues(value) {
  if (!value) return [];

  return value.split(',').map(pair => {
    const [key, label] = pair.split('|');
    return { value: key.trim(), label: (label || key).trim() };
  });
}

/**
 * Create a new field
 */
export async function cmdFieldCreate(options) {
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
    if (!options.fieldType) {
      throw new Error('--field-type is required');
    }
    if (!isValidFieldType(options.fieldType)) {
      throw new Error(`Invalid field type. Must be one of: ${VALID_FIELD_TYPES.join(', ')}`);
    }
    if (!options.label) {
      throw new Error('--label is required');
    }

    const project = await loadProject(options.project);

    // Generate field name if not provided
    const fieldName = options.fieldName || generateFieldName(options.entityType, options.label);

    // Build settings based on field type
    const settings = {};

    // String field settings
    if (options.fieldType === 'string' && options.maxLength) {
      settings.maxLength = parseInt(options.maxLength, 10);
    }

    // List field settings
    if ((options.fieldType === 'list_string' || options.fieldType === 'list_integer') && options.allowedValues) {
      settings.allowedValues = parseAllowedValues(options.allowedValues);
    }

    // Entity reference settings
    if (options.fieldType === 'entity_reference') {
      settings.targetType = options.targetType || 'node';
      if (options.targetBundles) {
        settings.targetBundles = options.targetBundles.split(',').map(b => b.trim());
      }
    }

    // Entity reference revisions settings
    if (options.fieldType === 'entity_reference_revisions') {
      settings.targetType = 'paragraph';
      if (options.targetBundles) {
        settings.targetBundles = options.targetBundles.split(',').map(b => b.trim());
      }
    }

    // Datetime settings
    if (options.fieldType === 'datetime' || options.fieldType === 'daterange') {
      settings.datetimeType = options.datetimeType || 'date';
    }

    // Link settings
    if (options.fieldType === 'link') {
      settings.allowExternal = options.linkType !== 'internal';
      settings.titleOption = options.titleOption || 'optional';
    }

    // Image settings
    if (options.fieldType === 'image') {
      settings.fileExtensions = options.fileExtensions || 'png gif jpg jpeg svg';
      settings.altRequired = !!options.altRequired;
      settings.fileDirectory = options.fileDirectory || 'images/[date:custom:Y]-[date:custom:m]';
    }

    // File settings
    if (options.fieldType === 'file') {
      settings.fileExtensions = options.fileExtensions || 'txt pdf doc docx xls xlsx';
      settings.fileDirectory = options.fileDirectory || 'documents/[date:custom:Y]-[date:custom:m]';
    }

    const fieldOptions = {
      fieldName,
      fieldType: options.fieldType,
      label: options.label,
      description: options.description || '',
      required: !!options.required,
      cardinality: options.cardinality ? parseInt(options.cardinality, 10) : 1,
      settings
    };

    const result = await createField(project, options.entityType, [options.bundle], fieldOptions);

    if (options.json) {
      output(result, true);
    } else {
      console.log(chalk.green(`Field "${result.label}" created successfully!`));
      if (result.storageCreated) {
        console.log(chalk.cyan('Created storage and instance files:'));
      } else {
        console.log(chalk.cyan('Storage already exists. Created instance files:'));
      }
      for (const file of result.createdFiles) {
        console.log(`  - ${file}`);
      }
    }

    await runSyncIfRequested(project, options);
  } catch (error) {
    handleError(error);
  }
}

/**
 * List fields
 */
export async function cmdFieldList(options) {
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

    if (!project.entities) {
      throw new Error('Project has not been synced. Run "dcm project sync" first.');
    }

    let fields;
    if (options.bundle) {
      fields = getFieldsForBundle(project.entities, options.entityType, options.bundle);
    } else {
      fields = getFieldsForEntityType(project.entities, options.entityType);
    }

    if (options.json) {
      output(fields, true);
    } else {
      if (fields.length === 0) {
        console.log(chalk.yellow('No fields found.'));
        return;
      }

      console.log();
      if (options.bundle) {
        console.log(chalk.cyan(`Fields for ${options.entityType} > ${options.bundle}:`));
      } else {
        console.log(chalk.cyan(`Fields for ${options.entityType}:`));
      }
      console.log();

      for (const field of fields) {
        const required = field.required ? ' (required)' : '';
        const cardinality = field.cardinality === -1 ? ' [unlimited]' : field.cardinality > 1 ? ` [${field.cardinality}]` : '';
        console.log(`  ${field.label} (${field.name}) - ${field.type}${required}${cardinality}`);
      }
      console.log();
    }
  } catch (error) {
    handleError(error);
  }
}

/**
 * Edit a field
 */
export async function cmdFieldEdit(options) {
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
    if (!options.fieldName) {
      throw new Error('--field-name is required');
    }

    const project = await loadProject(options.project);

    const updates = {};
    if (options.label) {
      updates.label = options.label;
    }
    if (options.description !== undefined) {
      updates.description = options.description;
    }
    if (options.required) {
      updates.required = true;
    }
    if (options.notRequired) {
      updates.required = false;
    }
    if (options.targetBundles) {
      updates.targetBundles = options.targetBundles.split(',').map(b => b.trim());
    }

    if (Object.keys(updates).length === 0) {
      throw new Error('No updates specified. Use --label, --description, --required, --not-required, or --target-bundles.');
    }

    const result = await updateField(project, options.entityType, options.bundle, options.fieldName, updates);

    if (options.json) {
      output(result, true);
    } else {
      console.log(chalk.green(`Field "${result.fieldName}" updated successfully!`));
      console.log(chalk.cyan(`Updated file: ${result.updatedFile}`));
    }

    await runSyncIfRequested(project, options);
  } catch (error) {
    handleError(error);
  }
}

// ============================================
// Report Commands
// ============================================

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

    if (!project.entities) {
      throw new Error('Project has not been synced. Run "dcm project sync" first.');
    }

    const baseUrl = options.baseUrl || project.baseUrl || '';
    const outputPath = options.output || join(getReportsDir(project.slug), `${project.slug}-${options.entityType}-report.md`);

    await createEntityReport(project, options.entityType, outputPath, baseUrl);

    if (options.json) {
      output({ outputPath, entityType: options.entityType }, true);
    } else {
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

    if (!project.entities) {
      throw new Error('Project has not been synced. Run "dcm project sync" first.');
    }

    const baseUrl = options.baseUrl || project.baseUrl || '';
    const outputPath = options.output || join(getReportsDir(project.slug), `${project.slug}-content-model.md`);

    await createProjectReport(project, outputPath, baseUrl);

    if (options.json) {
      output({ outputPath }, true);
    } else {
      console.log(chalk.green(`Report saved to: ${outputPath}`));
    }
  } catch (error) {
    handleError(error);
  }
}

// ============================================
// Admin Commands
// ============================================

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

// ============================================
// Form Display Commands
// ============================================

/**
 * Valid field group formats
 */
const VALID_GROUP_FORMATS = ['tabs', 'tab', 'details', 'fieldset'];

/**
 * Create a new form display
 */
export async function cmdFormDisplayCreate(options) {
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
    const formDisplay = await createFormDisplay(project, options.entityType, options.bundle);
    await autoSyncProject(project);

    if (options.json) {
      output(formDisplay, true);
    } else {
      console.log(chalk.green(`Form display created for ${options.entityType} > ${options.bundle}`));
      console.log();
      console.log(getFormDisplayTree(formDisplay));
      console.log();
    }
  } catch (error) {
    handleError(error);
  }
}

/**
 * View form display layout
 */
export async function cmdFormDisplayView(options) {
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
    const formDisplay = await loadFormDisplay(project, options.entityType, options.bundle);

    if (!formDisplay) {
      throw new Error(`No form display found for ${options.entityType} > ${options.bundle}`);
    }

    if (options.json) {
      output(formDisplay, true);
    } else {
      console.log();
      console.log(getFormDisplayTree(formDisplay));
      console.log();
    }
  } catch (error) {
    handleError(error);
  }
}

/**
 * List form display modes
 */
export async function cmdFormDisplayListModes(options) {
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
    const modes = await getFormDisplayModes(project, options.entityType, options.bundle);

    if (options.json) {
      output({ entityType: options.entityType, bundle: options.bundle, modes }, true);
    } else {
      if (modes.length === 0) {
        console.log(chalk.yellow('No form display modes found.'));
      } else {
        console.log();
        console.log(chalk.cyan(`Form display modes for ${options.entityType} > ${options.bundle}:`));
        for (const mode of modes) {
          console.log(`  - ${mode}`);
        }
        console.log();
      }
    }
  } catch (error) {
    handleError(error);
  }
}

/**
 * Hide fields from form display
 */
export async function cmdFormDisplayHide(options) {
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
    if (!options.fields) {
      throw new Error('--fields is required');
    }

    const project = await loadProject(options.project);
    let formDisplay = await loadFormDisplay(project, options.entityType, options.bundle);

    if (!formDisplay) {
      throw new Error(`No form display found for ${options.entityType} > ${options.bundle}`);
    }

    const fieldsToHide = options.fields.split(',').map(f => f.trim());

    for (const fieldName of fieldsToHide) {
      formDisplay = toggleFieldVisibility(formDisplay, fieldName);
    }

    await saveFormDisplay(project, formDisplay);
    await autoSyncProject(project);

    if (options.json) {
      output({ hidden: fieldsToHide }, true);
    } else {
      console.log(chalk.green(`Hidden ${fieldsToHide.length} field(s): ${fieldsToHide.join(', ')}`));
    }
  } catch (error) {
    handleError(error);
  }
}

/**
 * Show hidden fields in form display
 */
export async function cmdFormDisplayShow(options) {
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
    if (!options.fields) {
      throw new Error('--fields is required');
    }

    const project = await loadProject(options.project);
    let formDisplay = await loadFormDisplay(project, options.entityType, options.bundle);

    if (!formDisplay) {
      throw new Error(`No form display found for ${options.entityType} > ${options.bundle}`);
    }

    const fieldsToShow = options.fields.split(',').map(f => f.trim());
    const shown = [];

    for (const fieldName of fieldsToShow) {
      try {
        formDisplay = await showHiddenField(project, formDisplay, fieldName);
        shown.push(fieldName);
      } catch (err) {
        console.warn(chalk.yellow(`Warning: Could not show ${fieldName}: ${err.message}`));
      }
    }

    await saveFormDisplay(project, formDisplay);
    await autoSyncProject(project);

    if (options.json) {
      output({ shown }, true);
    } else {
      console.log(chalk.green(`Shown ${shown.length} field(s): ${shown.join(', ')}`));
    }
  } catch (error) {
    handleError(error);
  }
}

/**
 * Set widget type for a field
 */
export async function cmdFormDisplaySetWidget(options) {
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
    if (!options.field) {
      throw new Error('--field is required');
    }
    if (!options.widget) {
      throw new Error('--widget is required');
    }

    const project = await loadProject(options.project);
    let formDisplay = await loadFormDisplay(project, options.entityType, options.bundle);

    if (!formDisplay) {
      throw new Error(`No form display found for ${options.entityType} > ${options.bundle}`);
    }

    formDisplay = await updateFieldWidget(project, formDisplay, options.field, options.widget);
    await saveFormDisplay(project, formDisplay);
    await autoSyncProject(project);

    if (options.json) {
      output({ field: options.field, widget: options.widget }, true);
    } else {
      console.log(chalk.green(`Widget for "${options.field}" changed to "${options.widget}"`));
    }
  } catch (error) {
    handleError(error);
  }
}

/**
 * Set a widget setting for a field
 */
export async function cmdFormDisplaySetWidgetSetting(options) {
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
    if (!options.field) {
      throw new Error('--field is required');
    }
    if (!options.setting) {
      throw new Error('--setting is required');
    }
    if (options.value === undefined) {
      throw new Error('--value is required');
    }

    const project = await loadProject(options.project);
    let formDisplay = await loadFormDisplay(project, options.entityType, options.bundle);

    if (!formDisplay) {
      throw new Error(`No form display found for ${options.entityType} > ${options.bundle}`);
    }

    // Parse value (try to detect type)
    let parsedValue = options.value;
    if (options.value === 'true') parsedValue = true;
    else if (options.value === 'false') parsedValue = false;
    else if (!isNaN(Number(options.value))) parsedValue = Number(options.value);

    const settings = { [options.setting]: parsedValue };
    formDisplay = updateFieldSettings(formDisplay, options.field, settings);
    await saveFormDisplay(project, formDisplay);
    await autoSyncProject(project);

    if (options.json) {
      output({ field: options.field, setting: options.setting, value: parsedValue }, true);
    } else {
      console.log(chalk.green(`Setting "${options.setting}" for "${options.field}" set to "${parsedValue}"`));
    }
  } catch (error) {
    handleError(error);
  }
}

/**
 * List available widgets for a field type
 */
export async function cmdFormDisplayListWidgets(options) {
  try {
    if (!options.fieldType) {
      throw new Error('--field-type is required');
    }

    const widgets = getWidgetsForFieldType(options.fieldType);

    if (options.json) {
      output({ fieldType: options.fieldType, widgets }, true);
    } else {
      if (widgets.length === 0) {
        console.log(chalk.yellow(`No widgets found for field type "${options.fieldType}"`));
        console.log(chalk.cyan(`Available field types: ${Object.keys(FIELD_WIDGETS).join(', ')}`));
      } else {
        console.log();
        console.log(chalk.cyan(`Widgets for ${options.fieldType}:`));
        for (const widget of widgets) {
          console.log(`  - ${widget.type} (${widget.label})`);
        }
        console.log();
      }
    }
  } catch (error) {
    handleError(error);
  }
}

/**
 * Create a field group
 */
export async function cmdFormDisplayGroupCreate(options) {
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
    if (!options.label) {
      throw new Error('--label is required');
    }

    const format = options.format || 'details';
    if (!VALID_GROUP_FORMATS.includes(format)) {
      throw new Error(`Invalid format. Must be one of: ${VALID_GROUP_FORMATS.join(', ')}`);
    }

    const project = await loadProject(options.project);
    let formDisplay = await loadFormDisplay(project, options.entityType, options.bundle);

    if (!formDisplay) {
      throw new Error(`No form display found for ${options.entityType} > ${options.bundle}`);
    }

    const groupName = options.name || generateGroupName(options.label);

    formDisplay = createFieldGroup(formDisplay, {
      name: groupName,
      label: options.label,
      formatType: format,
      parentName: options.parent || ''
    });

    await saveFormDisplay(project, formDisplay);
    await autoSyncProject(project);

    if (options.json) {
      output({ name: groupName, label: options.label, format, parent: options.parent || null }, true);
    } else {
      console.log(chalk.green(`Field group "${options.label}" (${groupName}) created`));
    }
  } catch (error) {
    handleError(error);
  }
}

/**
 * Edit a field group
 */
export async function cmdFormDisplayGroupEdit(options) {
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
    if (!options.name) {
      throw new Error('--name is required');
    }

    if (options.format && !VALID_GROUP_FORMATS.includes(options.format)) {
      throw new Error(`Invalid format. Must be one of: ${VALID_GROUP_FORMATS.join(', ')}`);
    }

    const project = await loadProject(options.project);
    let formDisplay = await loadFormDisplay(project, options.entityType, options.bundle);

    if (!formDisplay) {
      throw new Error(`No form display found for ${options.entityType} > ${options.bundle}`);
    }

    const updates = {};
    if (options.label) updates.label = options.label;
    if (options.format) updates.formatType = options.format;

    if (Object.keys(updates).length === 0) {
      throw new Error('No updates specified. Use --label or --format.');
    }

    formDisplay = updateFieldGroup(formDisplay, options.name, updates);
    await saveFormDisplay(project, formDisplay);
    await autoSyncProject(project);

    if (options.json) {
      output({ name: options.name, updates }, true);
    } else {
      console.log(chalk.green(`Field group "${options.name}" updated`));
    }
  } catch (error) {
    handleError(error);
  }
}

/**
 * Delete a field group
 */
export async function cmdFormDisplayGroupDelete(options) {
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
    if (!options.name) {
      throw new Error('--name is required');
    }

    const project = await loadProject(options.project);
    let formDisplay = await loadFormDisplay(project, options.entityType, options.bundle);

    if (!formDisplay) {
      throw new Error(`No form display found for ${options.entityType} > ${options.bundle}`);
    }

    const moveToParent = options.moveChildrenTo !== 'root';
    formDisplay = deleteFieldGroup(formDisplay, options.name, moveToParent);
    await saveFormDisplay(project, formDisplay);
    await autoSyncProject(project);

    if (options.json) {
      output({ deleted: options.name, childrenMovedTo: moveToParent ? 'parent' : 'root' }, true);
    } else {
      console.log(chalk.green(`Field group "${options.name}" deleted`));
    }
  } catch (error) {
    handleError(error);
  }
}

/**
 * List field groups
 */
export async function cmdFormDisplayGroupList(options) {
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
    const formDisplay = await loadFormDisplay(project, options.entityType, options.bundle);

    if (!formDisplay) {
      throw new Error(`No form display found for ${options.entityType} > ${options.bundle}`);
    }

    const groups = formDisplay.groups || [];

    if (options.json) {
      output({ groups }, true);
    } else {
      if (groups.length === 0) {
        console.log(chalk.yellow('No field groups found.'));
      } else {
        console.log();
        console.log(chalk.cyan(`Field groups for ${options.entityType} > ${options.bundle}:`));
        for (const group of groups) {
          const parent = group.parentName ? ` (parent: ${group.parentName})` : '';
          const children = group.children?.length || 0;
          console.log(`  - ${group.label} [${group.formatType}] (${group.name}) - ${children} children${parent}`);
        }
        console.log();
      }
    }
  } catch (error) {
    handleError(error);
  }
}

/**
 * Move a field or group
 */
export async function cmdFormDisplayMove(options) {
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
    if (!options.item) {
      throw new Error('--item is required');
    }
    if (!options.to) {
      throw new Error('--to is required');
    }

    const project = await loadProject(options.project);
    let formDisplay = await loadFormDisplay(project, options.entityType, options.bundle);

    if (!formDisplay) {
      throw new Error(`No form display found for ${options.entityType} > ${options.bundle}`);
    }

    const targetGroup = options.to === 'root' ? '' : options.to;

    // Check if item is a group or field
    const isGroup = formDisplay.groups.some(g => g.name === options.item);

    if (isGroup) {
      formDisplay = moveGroupToParent(formDisplay, options.item, targetGroup);
    } else {
      formDisplay = moveFieldToGroup(formDisplay, options.item, targetGroup);
    }

    await saveFormDisplay(project, formDisplay);
    await autoSyncProject(project);

    if (options.json) {
      output({ item: options.item, movedTo: options.to, isGroup }, true);
    } else {
      const type = isGroup ? 'Group' : 'Field';
      console.log(chalk.green(`${type} "${options.item}" moved to "${options.to}"`));
    }
  } catch (error) {
    handleError(error);
  }
}

/**
 * Reorder items within a group
 */
export async function cmdFormDisplayReorder(options) {
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
    if (!options.order) {
      throw new Error('--order is required');
    }

    const project = await loadProject(options.project);
    let formDisplay = await loadFormDisplay(project, options.entityType, options.bundle);

    if (!formDisplay) {
      throw new Error(`No form display found for ${options.entityType} > ${options.bundle}`);
    }

    const groupName = options.group || '';
    const newOrder = options.order.split(',').map(item => item.trim());

    formDisplay = reorderGroupChildren(formDisplay, groupName, newOrder);
    await saveFormDisplay(project, formDisplay);
    await autoSyncProject(project);

    if (options.json) {
      output({ group: groupName || 'root', order: newOrder }, true);
    } else {
      const groupLabel = groupName || 'root level';
      console.log(chalk.green(`Items in "${groupLabel}" reordered`));
    }
  } catch (error) {
    handleError(error);
  }
}

/**
 * Set weight for a field or group
 */
export async function cmdFormDisplaySetWeight(options) {
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
    if (!options.item) {
      throw new Error('--item is required');
    }
    if (options.weight === undefined) {
      throw new Error('--weight is required');
    }

    const weight = parseInt(options.weight, 10);
    if (isNaN(weight)) {
      throw new Error('--weight must be a number');
    }

    const project = await loadProject(options.project);
    const formDisplay = await loadFormDisplay(project, options.entityType, options.bundle);

    if (!formDisplay) {
      throw new Error(`No form display found for ${options.entityType} > ${options.bundle}`);
    }

    // Check if item is a group or field
    const groupIndex = formDisplay.groups.findIndex(g => g.name === options.item);
    const fieldIndex = formDisplay.fields.findIndex(f => f.name === options.item);

    if (groupIndex !== -1) {
      formDisplay.groups[groupIndex] = { ...formDisplay.groups[groupIndex], weight };
    } else if (fieldIndex !== -1) {
      formDisplay.fields[fieldIndex] = { ...formDisplay.fields[fieldIndex], weight };
    } else {
      throw new Error(`Item "${options.item}" not found in form display`);
    }

    await saveFormDisplay(project, formDisplay);
    await autoSyncProject(project);

    if (options.json) {
      output({ item: options.item, weight }, true);
    } else {
      console.log(chalk.green(`Weight for "${options.item}" set to ${weight}`));
    }
  } catch (error) {
    handleError(error);
  }
}

/**
 * Reset form display
 */
export async function cmdFormDisplayReset(options) {
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
    let formDisplay = await loadFormDisplay(project, options.entityType, options.bundle);

    if (!formDisplay) {
      throw new Error(`No form display found for ${options.entityType} > ${options.bundle}`);
    }

    formDisplay = await resetFormDisplay(project, formDisplay, {
      keepFieldOrder: true,
      clearGroups: !options.keepGroups
    });

    await saveFormDisplay(project, formDisplay);
    await autoSyncProject(project);

    if (options.json) {
      output({ reset: true, keepGroups: !!options.keepGroups }, true);
    } else {
      const groupsMsg = options.keepGroups ? ' (groups preserved)' : '';
      console.log(chalk.green(`Form display reset to default widgets${groupsMsg}`));
    }
  } catch (error) {
    handleError(error);
  }
}

// ============================================
// Role Commands
// ============================================

/**
 * Create a new role
 */
export async function cmdRoleCreate(options) {
  try {
    if (!options.project) {
      throw new Error('--project is required');
    }
    if (!options.label) {
      throw new Error('--label is required');
    }

    const project = await loadProject(options.project);
    const role = await createRole(project, {
      label: options.label,
      id: options.name,
      isAdmin: options.isAdmin || false
    });

    if (options.json) {
      output(role, true);
    } else {
      console.log(chalk.green(`Role "${role.label}" created with ID: ${role.id}`));
    }

    await runSyncIfRequested(project, options);
  } catch (error) {
    handleError(error);
  }
}

/**
 * List all roles
 */
export async function cmdRoleList(options) {
  try {
    if (!options.project) {
      throw new Error('--project is required');
    }

    const project = await loadProject(options.project);
    const roles = await listRoles(project);

    if (options.json) {
      output(roles, true);
    } else {
      if (roles.length === 0) {
        console.log('No roles found.');
      } else {
        console.log(chalk.bold('Roles:'));
        for (const role of roles) {
          const adminBadge = role.isAdmin ? chalk.yellow(' (admin)') : '';
          const permCount = role.permissions?.length || 0;
          console.log(`  ${role.label}${adminBadge} [${role.id}] - ${permCount} permissions`);
        }
      }
    }
  } catch (error) {
    handleError(error);
  }
}

/**
 * View role details
 */
export async function cmdRoleView(options) {
  try {
    if (!options.project) {
      throw new Error('--project is required');
    }
    if (!options.role) {
      throw new Error('--role is required');
    }

    const project = await loadProject(options.project);
    const role = await loadRole(project, options.role);

    if (!role) {
      throw new Error(`Role not found: ${options.role}`);
    }

    if (options.json) {
      output(role, true);
    } else {
      console.log(chalk.bold(`Role: ${role.label}`));
      console.log(`  ID: ${role.id}`);
      console.log(`  Admin: ${role.isAdmin ? 'Yes' : 'No'}`);
      console.log(`  Weight: ${role.weight}`);
      console.log(`  Permissions: ${role.permissions?.length || 0}`);

      if (role.permissions && role.permissions.length > 0) {
        const grouped = groupPermissionsByBundle(role.permissions);
        const otherPerms = role.permissions.filter(p => {
          for (const entityType of Object.keys(grouped)) {
            for (const bundle of Object.keys(grouped[entityType])) {
              if (grouped[entityType][bundle].some(bp => bp.key === p)) {
                return false;
              }
            }
          }
          return true;
        });

        console.log('\n' + chalk.bold('Content Permissions:'));
        for (const [entityType, bundles] of Object.entries(grouped)) {
          for (const [bundle, perms] of Object.entries(bundles)) {
            console.log(`  ${entityType} > ${bundle}:`);
            for (const perm of perms) {
              console.log(`    - ${perm.label}`);
            }
          }
        }

        if (otherPerms.length > 0) {
          console.log('\n' + chalk.bold('Other Permissions:'));
          for (const perm of otherPerms) {
            console.log(`  - ${perm}`);
          }
        }
      }
    }
  } catch (error) {
    handleError(error);
  }
}

/**
 * Delete a role
 */
export async function cmdRoleDelete(options) {
  try {
    if (!options.project) {
      throw new Error('--project is required');
    }
    if (!options.role) {
      throw new Error('--role is required');
    }

    const project = await loadProject(options.project);
    const deleted = await deleteRole(project, options.role);

    if (!deleted) {
      throw new Error(`Role not found: ${options.role}`);
    }

    await autoSyncProject(project);

    if (options.json) {
      output({ deleted: true, role: options.role }, true);
    } else {
      console.log(chalk.green(`Role "${options.role}" deleted.`));
    }
  } catch (error) {
    handleError(error);
  }
}

/**
 * Add permissions to role
 */
export async function cmdRoleAddPermission(options) {
  try {
    if (!options.project) {
      throw new Error('--project is required');
    }
    if (!options.role) {
      throw new Error('--role is required');
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
    if (!options.permissions) {
      throw new Error('--permissions is required');
    }

    const project = await loadProject(options.project);

    // Parse permissions (can be short names or 'all')
    const shortNames = options.permissions.split(',').map(p => p.trim());
    const permissions = parseShortPermissions(options.entityType, options.bundle, shortNames);

    if (permissions.length === 0) {
      throw new Error('No valid permissions specified');
    }

    const role = await addRolePermissions(project, options.role, permissions);

    if (options.json) {
      output({ role: role.id, added: permissions }, true);
    } else {
      console.log(chalk.green(`Added ${permissions.length} permission(s) to role "${role.label}"`));
      for (const perm of permissions) {
        console.log(`  + ${perm}`);
      }
    }

    await runSyncIfRequested(project, options);
  } catch (error) {
    handleError(error);
  }
}

/**
 * Remove permissions from role
 */
export async function cmdRoleRemovePermission(options) {
  try {
    if (!options.project) {
      throw new Error('--project is required');
    }
    if (!options.role) {
      throw new Error('--role is required');
    }
    if (!options.permissions) {
      throw new Error('--permissions is required');
    }

    const project = await loadProject(options.project);

    // Parse permissions (full permission keys)
    const permissions = options.permissions.split(',').map(p => p.trim());

    const role = await removeRolePermissions(project, options.role, permissions);

    if (options.json) {
      output({ role: role.id, removed: permissions }, true);
    } else {
      console.log(chalk.green(`Removed ${permissions.length} permission(s) from role "${role.label}"`));
      for (const perm of permissions) {
        console.log(`  - ${perm}`);
      }
    }

    await runSyncIfRequested(project, options);
  } catch (error) {
    handleError(error);
  }
}

/**
 * Set permissions for a bundle (replaces existing)
 */
export async function cmdRoleSetPermissions(options) {
  try {
    if (!options.project) {
      throw new Error('--project is required');
    }
    if (!options.role) {
      throw new Error('--role is required');
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
    if (!options.permissions) {
      throw new Error('--permissions is required (use "none" to remove all)');
    }

    const project = await loadProject(options.project);

    let permissions = [];
    if (options.permissions !== 'none') {
      const shortNames = options.permissions.split(',').map(p => p.trim());
      permissions = parseShortPermissions(options.entityType, options.bundle, shortNames);
    }

    const role = await setRoleBundlePermissionsCmd(
      project,
      options.role,
      options.entityType,
      options.bundle,
      permissions
    );

    if (options.json) {
      output({ role: role.id, entityType: options.entityType, bundle: options.bundle, permissions }, true);
    } else {
      if (permissions.length === 0) {
        console.log(chalk.green(`Removed all ${options.entityType} > ${options.bundle} permissions from role "${role.label}"`));
      } else {
        console.log(chalk.green(`Set ${permissions.length} permission(s) for ${options.entityType} > ${options.bundle} on role "${role.label}"`));
        for (const perm of permissions) {
          console.log(`  = ${perm}`);
        }
      }
    }

    await runSyncIfRequested(project, options);
  } catch (error) {
    handleError(error);
  }
}

/**
 * List available permissions for a bundle
 */
export async function cmdRoleListPermissions(options) {
  try {
    if (!options.entityType) {
      throw new Error('--entity-type is required');
    }
    if (!isValidEntityType(options.entityType)) {
      throw new Error(`Invalid entity type. Must be one of: ${VALID_ENTITY_TYPES.join(', ')}`);
    }
    if (!options.bundle) {
      throw new Error('--bundle is required');
    }

    const permissions = getPermissionsForBundle(options.entityType, options.bundle);

    if (options.json) {
      output(permissions, true);
    } else {
      console.log(chalk.bold(`Permissions for ${options.entityType} > ${options.bundle}:`));
      for (const perm of permissions) {
        console.log(`  ${perm.short} - ${perm.label}`);
        console.log(`    Key: ${perm.key}`);
      }
    }
  } catch (error) {
    handleError(error);
  }
}

// ============================================
// Drush Commands
// ============================================

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
