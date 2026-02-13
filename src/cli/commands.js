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
