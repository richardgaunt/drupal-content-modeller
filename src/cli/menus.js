/**
 * CLI Menu System
 * Handles interactive menu navigation and actions.
 */

import { select, input, checkbox } from '@inquirer/prompts';
import chalk from 'chalk';
import { join } from 'path';

import {
  getMainMenuChoices,
  getProjectMenuChoices,
  validateProjectName,
  validateProjectNameUnique,
  validateConfigDirectory,
  validateBaseUrl
} from './prompts.js';
import { createProject, loadProject, listProjects, updateProject } from '../commands/project.js';
import { syncProject } from '../commands/sync.js';
import {
  formatLastSync,
  groupBundlesByEntityType,
  getBundleSummary,
  formatEntityTypeTable,
  getFieldsForEntityType,
  getFieldsForBundle,
  formatEntityFieldsTable,
  formatBundleFieldsTable
} from '../commands/list.js';
import { createBundle, validateBundleMachineName, createField, validateFieldMachineName } from '../commands/create.js';
import { createEntityReport, createProjectReport } from '../commands/report.js';
import { getReportsDir } from '../io/fileSystem.js';
import { generateMachineName } from '../generators/bundleGenerator.js';
import { generateFieldName, FIELD_TYPES } from '../generators/fieldGenerator.js';
import { getEntityTypeLabel } from '../generators/reportGenerator.js';

/**
 * Entity type choices for bundle creation
 */
const ENTITY_TYPE_CHOICES = [
  { value: 'node', name: 'Node (Content Type)' },
  { value: 'media', name: 'Media Type' },
  { value: 'paragraph', name: 'Paragraph Type' },
  { value: 'taxonomy_term', name: 'Taxonomy Vocabulary' },
  { value: 'block_content', name: 'Block Content Type' }
];

/**
 * Media source type choices
 */
const MEDIA_SOURCE_CHOICES = [
  { value: 'image', name: 'Image' },
  { value: 'file', name: 'File' },
  { value: 'remote_video', name: 'Remote Video' }
];

/**
 * Entity reference target type choices
 */
const REFERENCE_TARGET_CHOICES = [
  { value: 'node', name: 'Content (Node)' },
  { value: 'media', name: 'Media' },
  { value: 'taxonomy_term', name: 'Taxonomy Term' },
  { value: 'paragraph', name: 'Paragraph' },
  { value: 'block_content', name: 'Block Content' }
];

/**
 * Display the main menu and handle user selection
 * @returns {Promise<void>}
 */
export async function showMainMenu() {
  console.log();
  console.log(chalk.cyan('Drupal Content Modeller'));
  console.log();

  while (true) {
    try {
      const action = await select({
        message: 'What would you like to do?',
        choices: getMainMenuChoices()
      });

      switch (action) {
        case 'create':
          await handleCreateProject();
          break;
        case 'load':
          await handleLoadProject();
          break;
        case 'exit':
          console.log(chalk.green('Goodbye!'));
          return;
      }
    } catch (error) {
      if (error.name === 'ExitPromptError') {
        console.log();
        console.log(chalk.green('Goodbye!'));
        return;
      }
      throw error;
    }
  }
}

/**
 * Handle create project flow
 * @returns {Promise<void>}
 */
async function handleCreateProject() {
  try {
    const name = await input({
      message: 'Project name?',
      validate: (value) => {
        const nameValidation = validateProjectName(value);
        if (nameValidation !== true) return nameValidation;
        return validateProjectNameUnique(value);
      }
    });

    const configDir = await input({
      message: 'Configuration directory path?',
      validate: validateConfigDirectory
    });

    const baseUrl = await input({
      message: 'Base URL of the project (optional, e.g., https://example.com)?',
      validate: validateBaseUrl
    });

    const project = await createProject(name, configDir, baseUrl);
    console.log(chalk.green(`Project "${project.name}" created successfully!`));
    console.log(chalk.cyan(`Slug: ${project.slug}`));
    console.log();

    await showProjectMenu(project);
  } catch (error) {
    if (error.name === 'ExitPromptError') {
      return;
    }
    console.log(chalk.red(`Error: ${error.message}`));
  }
}

/**
 * Handle load project flow
 * @returns {Promise<void>}
 */
async function handleLoadProject() {
  try {
    const projects = await listProjects();

    if (projects.length === 0) {
      console.log(chalk.yellow('No projects found. Create a project first.'));
      return;
    }

    const choices = projects.map(p => ({
      value: p.slug,
      name: `${p.name} (${p.slug})`
    }));

    const selectedSlug = await select({
      message: 'Select a project:',
      choices
    });

    const project = await loadProject(selectedSlug);
    await showProjectMenu(project);
  } catch (error) {
    if (error.name === 'ExitPromptError') {
      return;
    }
    console.log(chalk.red(`Error: ${error.message}`));
  }
}

/**
 * Display the project menu and handle user selection
 * @param {object} project - The current project
 * @returns {Promise<void>}
 */
async function showProjectMenu(project) {
  const menuConfig = getProjectMenuChoices(project.name);

  while (true) {
    try {
      const action = await select({
        message: menuConfig.message,
        choices: menuConfig.choices
      });

      switch (action) {
        case 'sync':
          await handleSync(project);
          project = await loadProject(project.slug);
          break;
        case 'list-entities':
          handleListEntities(project);
          break;
        case 'list-entity-fields':
          await handleListEntityFields(project);
          break;
        case 'list-bundle-fields':
          await handleListBundleFields(project);
          break;
        case 'create-bundle':
          await handleCreateBundle(project);
          project = await loadProject(project.slug);
          break;
        case 'create-field':
          await handleCreateField(project);
          project = await loadProject(project.slug);
          break;
        case 'edit-project':
          project = await handleEditProject(project);
          break;
        case 'report-entity':
          await handleEntityReport(project);
          break;
        case 'report-project':
          await handleProjectReport(project);
          break;
        case 'back':
          return;
      }
    } catch (error) {
      if (error.name === 'ExitPromptError') {
        return;
      }
      console.log(chalk.red(`Error: ${error.message}`));
    }
  }
}

/**
 * Handle sync configuration action
 * @param {object} project - The current project
 * @returns {Promise<void>}
 */
async function handleSync(project) {
  console.log(chalk.cyan('Syncing configuration...'));

  try {
    const result = await syncProject(project);
    console.log(chalk.green('Sync complete!'));
    console.log(chalk.cyan(`Found ${result.bundlesFound} bundles and ${result.fieldsFound} fields`));
  } catch (error) {
    console.log(chalk.red(`Sync failed: ${error.message}`));
  }
}

/**
 * Handle list entity types action
 * @param {object} project - The current project
 */
function handleListEntities(project) {
  const summary = getBundleSummary(project);

  if (!summary.synced) {
    console.log(chalk.yellow('Project has not been synced. Run sync first.'));
    return;
  }

  console.log();
  console.log(chalk.cyan(`Entity Types for "${project.name}"`));
  console.log(`Last synced: ${formatLastSync(summary.lastSync)}`);
  console.log();

  const groups = groupBundlesByEntityType(project.entities);

  for (const [entityType, group] of Object.entries(groups)) {
    console.log(formatEntityTypeTable(entityType, group));
  }

  console.log(`Total: ${summary.bundleCount} bundles across ${summary.entityTypeCount} entity types`);
  console.log();
}

/**
 * Handle list fields of entity type action
 * @param {object} project - The current project
 * @returns {Promise<void>}
 */
async function handleListEntityFields(project) {
  const summary = getBundleSummary(project);

  if (!summary.synced) {
    console.log(chalk.yellow('Project has not been synced. Run sync first.'));
    return;
  }

  const entityTypes = Object.keys(project.entities).filter(
    type => Object.keys(project.entities[type]).length > 0
  );

  if (entityTypes.length === 0) {
    console.log(chalk.yellow('No entities found.'));
    return;
  }

  const choices = entityTypes.map(type => ({
    value: type,
    name: `${type} (${Object.keys(project.entities[type]).length} bundles)`
  }));

  const selectedType = await select({
    message: 'Select entity type:',
    choices
  });

  const fields = getFieldsForEntityType(project.entities, selectedType);
  const bundleCount = Object.keys(project.entities[selectedType]).length;

  console.log();
  console.log(chalk.cyan(`Fields for ${selectedType} types in "${project.name}"`));
  console.log();
  console.log(formatEntityFieldsTable(fields));
  console.log();
  console.log(`Total: ${fields.length} unique fields across ${bundleCount} ${selectedType} types`);
  console.log();
}

/**
 * Handle list fields of specific bundle action
 * @param {object} project - The current project
 * @returns {Promise<void>}
 */
async function handleListBundleFields(project) {
  const summary = getBundleSummary(project);

  if (!summary.synced) {
    console.log(chalk.yellow('Project has not been synced. Run sync first.'));
    return;
  }

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

  const selectedType = await select({
    message: 'Select entity type:',
    choices: entityChoices
  });

  const bundles = project.entities[selectedType];
  const bundleChoices = Object.entries(bundles)
    .sort(([, a], [, b]) => (a.label || '').localeCompare(b.label || ''))
    .map(([id, bundle]) => ({
      value: id,
      name: `${bundle.label || id} (${id})`
    }));

  const selectedBundle = await select({
    message: 'Select bundle:',
    choices: bundleChoices
  });

  const bundle = bundles[selectedBundle];
  const fields = getFieldsForBundle(project.entities, selectedType, selectedBundle);

  console.log();
  console.log(chalk.cyan(`Fields for ${selectedType} > ${bundle.label || selectedBundle} in "${project.name}"`));
  console.log();
  console.log(formatBundleFieldsTable(fields));
  console.log();
  console.log(`Total: ${fields.length} fields`);
  console.log();
}

/**
 * Handle create bundle action
 * @param {object} project - The current project
 * @returns {Promise<void>}
 */
async function handleCreateBundle(project) {
  try {
    const entityType = await select({
      message: 'Select entity type:',
      choices: ENTITY_TYPE_CHOICES
    });

    const label = await input({
      message: 'Label (human-readable name)?',
      validate: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Label is required';
        }
        return true;
      }
    });

    const suggestedMachineName = generateMachineName(label);
    const machineName = await input({
      message: 'Machine name?',
      default: suggestedMachineName,
      validate: (value) => validateBundleMachineName(project, entityType, value)
    });

    const description = await input({
      message: 'Description (optional)?'
    });

    let sourceType = null;
    if (entityType === 'media') {
      sourceType = await select({
        message: 'Media source type?',
        choices: MEDIA_SOURCE_CHOICES
      });
    }

    const result = await createBundle(project, entityType, {
      label,
      machineName,
      description,
      sourceType
    });

    console.log();
    console.log(chalk.green(`Bundle "${result.label}" created successfully!`));
    console.log(chalk.cyan('Created files:'));
    for (const file of result.createdFiles) {
      console.log(`  - ${file}`);
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
 * Handle create field action
 * @param {object} project - The current project
 * @returns {Promise<void>}
 */
async function handleCreateField(project) {
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
      console.log(chalk.yellow('No bundles found. Create a bundle first.'));
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

    // Select bundle(s)
    const bundles = project.entities[entityType];
    const bundleOptions = Object.entries(bundles)
      .sort(([, a], [, b]) => (a.label || '').localeCompare(b.label || ''))
      .map(([id, bundle]) => ({
        value: id,
        name: `${bundle.label || id} (${id})`
      }));

    const selectedBundles = await checkbox({
      message: 'Select bundle(s):',
      choices: bundleOptions,
      required: true
    });

    if (selectedBundles.length === 0) {
      console.log(chalk.yellow('At least one bundle is required.'));
      return;
    }

    // Select field type
    const fieldType = await select({
      message: 'Select field type:',
      choices: FIELD_TYPES
    });

    // Prompt for label
    const label = await input({
      message: 'Field label?',
      validate: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Label is required';
        }
        return true;
      }
    });

    // Generate and prompt for field name
    const suggestedFieldName = generateFieldName(entityType, label);
    const fieldName = await input({
      message: 'Machine name?',
      default: suggestedFieldName,
      validate: validateFieldMachineName
    });

    // Prompt for description
    const description = await input({
      message: 'Description (optional)?'
    });

    // Prompt for required
    const required = await select({
      message: 'Required?',
      choices: [
        { value: false, name: 'No' },
        { value: true, name: 'Yes' }
      ]
    });

    // Prompt for cardinality
    const cardinality = await select({
      message: 'Cardinality?',
      choices: [
        { value: 1, name: 'Single value' },
        { value: -1, name: 'Unlimited' }
      ]
    });

    // Type-specific settings
    const settings = await getTypeSpecificSettings(fieldType, project);

    // Create the field
    const result = await createField(project, entityType, selectedBundles, {
      fieldName,
      fieldType,
      label,
      description,
      required,
      cardinality,
      settings
    });

    console.log();
    console.log(chalk.green(`Field "${result.label}" created successfully!`));
    if (result.storageCreated) {
      console.log(chalk.cyan('Created storage and instance files:'));
    } else {
      console.log(chalk.cyan('Storage already exists. Created instance files:'));
    }
    for (const file of result.createdFiles) {
      console.log(`  - ${file}`);
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
 * Handle edit project action
 * @param {object} project - The current project
 * @returns {Promise<object>} - Updated project object
 */
async function handleEditProject(project) {
  try {
    console.log();
    console.log(chalk.cyan('Edit project settings'));
    console.log(chalk.cyan('Press Enter to keep current value'));
    console.log();

    const name = await input({
      message: 'Project name:',
      default: project.name,
      validate: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Project name is required';
        }
        return true;
      }
    });

    const configDirectory = await input({
      message: 'Configuration directory:',
      default: project.configDirectory,
      validate: validateConfigDirectory
    });

    const baseUrl = await input({
      message: 'Base URL (e.g., https://example.com):',
      default: project.baseUrl || '',
      validate: validateBaseUrl
    });

    const updates = {
      name: name.trim(),
      configDirectory: configDirectory.trim(),
      baseUrl: baseUrl.trim()
    };

    const updatedProject = await updateProject(project, updates);

    console.log();
    console.log(chalk.green('Project updated successfully!'));
    if (updatedProject.slug !== project.slug) {
      console.log(chalk.cyan(`Slug changed: ${project.slug} → ${updatedProject.slug}`));
    }
    console.log();

    return updatedProject;
  } catch (error) {
    if (error.name === 'ExitPromptError') {
      return project;
    }
    console.log(chalk.red(`Error: ${error.message}`));
    return project;
  }
}

/**
 * Handle entity type report generation
 * @param {object} project - The current project
 * @returns {Promise<void>}
 */
async function handleEntityReport(project) {
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

    // Generate filename in project reports directory
    const filename = `${project.slug}-${entityType}-report.md`;
    const outputPath = join(getReportsDir(project.slug), filename);

    await createEntityReport(project, entityType, outputPath, baseUrl);
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
async function handleProjectReport(project) {
  try {
    const summary = getBundleSummary(project);

    if (!summary.synced) {
      console.log(chalk.yellow('Project has not been synced. Run sync first.'));
      return;
    }

    // Ask about base URL
    const baseUrl = await promptForReportUrl(project);

    // Generate filename in project reports directory
    const filename = `${project.slug}-content-model.md`;
    const outputPath = join(getReportsDir(project.slug), filename);

    await createProjectReport(project, outputPath, baseUrl);
    console.log(chalk.green(`Report saved to: ${outputPath}`));
  } catch (error) {
    if (error.name === 'ExitPromptError') {
      return;
    }
    console.log(chalk.red(`Error: ${error.message}`));
  }
}

/**
 * Prompt for report base URL
 * @param {object} project - Project object
 * @returns {Promise<string>} - Base URL to use
 */
async function promptForReportUrl(project) {
  const projectUrl = project.baseUrl || '';

  if (projectUrl) {
    const useProjectUrl = await select({
      message: `Use project base URL (${projectUrl})?`,
      choices: [
        { value: true, name: 'Yes' },
        { value: false, name: 'No, enter a different URL' }
      ]
    });

    if (useProjectUrl) {
      return projectUrl;
    }
  }

  const customUrl = await input({
    message: 'Enter base URL for report links (leave empty for relative paths):',
    default: ''
  });

  return customUrl.trim();
}

/**
 * Get type-specific field settings
 * @param {string} fieldType - Field type
 * @param {object} project - Project object
 * @returns {Promise<object>} - Settings object
 */
async function getTypeSpecificSettings(fieldType, project) {
  const settings = {};

  switch (fieldType) {
    case 'string':
      settings.maxLength = await input({
        message: 'Max length?',
        default: '255',
        validate: (value) => {
          const num = parseInt(value, 10);
          if (isNaN(num) || num < 1) {
            return 'Must be a positive number';
          }
          return true;
        }
      });
      settings.maxLength = parseInt(settings.maxLength, 10);
      break;

    case 'list_string':
      settings.allowedValues = await promptForListValues();
      break;

    case 'entity_reference':
    case 'entity_reference_revisions': {
      if (fieldType === 'entity_reference_revisions') {
        settings.targetType = 'paragraph';
      } else {
        settings.targetType = await select({
          message: 'Target entity type?',
          choices: REFERENCE_TARGET_CHOICES
        });
      }

      // Get target bundles from project
      const targetBundles = await selectTargetBundles(project, settings.targetType);
      settings.targetBundles = targetBundles;
      break;
    }

    case 'link':
      settings.allowExternal = await select({
        message: 'Allow external URLs?',
        choices: [
          { value: true, name: 'Yes' },
          { value: false, name: 'No (internal only)' }
        ]
      });

      settings.titleOption = await select({
        message: 'Link title?',
        choices: [
          { value: 'optional', name: 'Optional' },
          { value: 'required', name: 'Required' },
          { value: 'disabled', name: 'Disabled' }
        ]
      });
      break;

    case 'image':
      settings.fileExtensions = await input({
        message: 'Allowed extensions?',
        default: 'png gif jpg jpeg svg'
      });

      settings.altRequired = await select({
        message: 'Alt text required?',
        choices: [
          { value: true, name: 'Yes' },
          { value: false, name: 'No' }
        ]
      });

      settings.fileDirectory = await input({
        message: 'File directory?',
        default: 'images/[date:custom:Y]-[date:custom:m]'
      });

      settings.maxFileSize = await input({
        message: 'Max file size (e.g., 2MB, leave empty for default)?',
        default: ''
      });
      break;

    case 'file':
      settings.fileExtensions = await input({
        message: 'Allowed extensions?',
        default: 'txt pdf doc docx xls xlsx'
      });

      settings.fileDirectory = await input({
        message: 'File directory?',
        default: 'documents/[date:custom:Y]-[date:custom:m]'
      });

      settings.maxFileSize = await input({
        message: 'Max file size (e.g., 10MB, leave empty for default)?',
        default: ''
      });
      break;
  }

  return settings;
}

/**
 * Prompt for list values (key|label pairs)
 * @returns {Promise<object[]>} - Array of {value, label} objects
 */
async function promptForListValues() {
  const values = [];
  console.log(chalk.cyan('Enter list options (key|label format). Empty input to finish.'));

  while (true) {
    const entry = await input({
      message: `Option ${values.length + 1}:`,
      default: ''
    });

    if (!entry || entry.trim() === '') {
      break;
    }

    const parts = entry.split('|');
    if (parts.length === 2) {
      values.push({ value: parts[0].trim(), label: parts[1].trim() });
    } else {
      values.push({ value: entry.trim(), label: entry.trim() });
    }
  }

  return values;
}

/**
 * Select target bundles for entity reference field
 * @param {object} project - Project object
 * @param {string} targetType - Target entity type
 * @returns {Promise<string[]>} - Selected bundle IDs
 */
async function selectTargetBundles(project, targetType) {
  if (!project.entities || !project.entities[targetType]) {
    console.log(chalk.yellow(`No ${targetType} bundles found in project.`));
    return [];
  }

  const bundles = project.entities[targetType];
  if (Object.keys(bundles).length === 0) {
    console.log(chalk.yellow(`No ${targetType} bundles found in project.`));
    return [];
  }

  const bundleOptions = Object.entries(bundles)
    .sort(([, a], [, b]) => (a.label || '').localeCompare(b.label || ''))
    .map(([id, bundle]) => ({
      value: id,
      name: `${bundle.label || id} (${id})`
    }));

  const selected = await checkbox({
    message: 'Select target bundles:',
    choices: bundleOptions
  });

  return selected;
}
