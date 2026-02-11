/**
 * CLI Menu System
 * Handles interactive menu navigation and actions.
 */

import { select, input } from '@inquirer/prompts';
import chalk from 'chalk';

import {
  getMainMenuChoices,
  getProjectMenuChoices,
  validateProjectName,
  validateProjectNameUnique,
  validateConfigDirectory
} from './prompts.js';
import { createProject, loadProject, listProjects } from '../commands/project.js';
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
import { createBundle, validateBundleMachineName } from '../commands/create.js';
import { generateMachineName } from '../generators/bundleGenerator.js';

/**
 * Entity type choices for bundle creation
 */
const ENTITY_TYPE_CHOICES = [
  { value: 'node', name: 'Node (Content Type)' },
  { value: 'media', name: 'Media Type' },
  { value: 'paragraph', name: 'Paragraph Type' },
  { value: 'taxonomy_term', name: 'Taxonomy Vocabulary' }
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
      // Handle Ctrl+C or other interrupts
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
    // Prompt for project name
    const name = await input({
      message: 'Project name?',
      validate: (value) => {
        const nameValidation = validateProjectName(value);
        if (nameValidation !== true) return nameValidation;
        return validateProjectNameUnique(value);
      }
    });

    // Prompt for config directory
    const configDir = await input({
      message: 'Configuration directory path?',
      validate: validateConfigDirectory
    });

    // Create the project
    const project = await createProject(name, configDir);
    console.log(chalk.green(`Project "${project.name}" created successfully!`));
    console.log(chalk.cyan(`Slug: ${project.slug}`));
    console.log();

    // Show project menu
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
          // Reload project to get updated data
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
          // Reload project to get updated data
          project = await loadProject(project.slug);
          break;
        case 'create-field':
          console.log(chalk.yellow('Create field not yet implemented'));
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

  // Select entity type
  const entityChoices = entityTypes.map(type => ({
    value: type,
    name: `${type} (${Object.keys(project.entities[type]).length} bundles)`
  }));

  const selectedType = await select({
    message: 'Select entity type:',
    choices: entityChoices
  });

  // Select bundle
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
    // Select entity type
    const entityType = await select({
      message: 'Select entity type:',
      choices: ENTITY_TYPE_CHOICES
    });

    // Prompt for label
    const label = await input({
      message: 'Label (human-readable name)?',
      validate: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Label is required';
        }
        return true;
      }
    });

    // Generate and prompt for machine name
    const suggestedMachineName = generateMachineName(label);
    const machineName = await input({
      message: 'Machine name?',
      default: suggestedMachineName,
      validate: (value) => validateBundleMachineName(project, entityType, value)
    });

    // Prompt for description
    const description = await input({
      message: 'Description (optional)?'
    });

    // For media types, prompt for source type
    let sourceType = null;
    if (entityType === 'media') {
      sourceType = await select({
        message: 'Media source type?',
        choices: MEDIA_SOURCE_CHOICES
      });
    }

    // Create the bundle
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
