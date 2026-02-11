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
import { syncProject, getSyncSummary } from '../commands/sync.js';

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
          console.log(chalk.yellow('Create bundle not yet implemented'));
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
  const summary = getSyncSummary(project);

  if (summary.totalBundles === 0) {
    console.log(chalk.yellow('No entities found. Run sync first.'));
    return;
  }

  console.log();
  console.log(chalk.cyan('Entity Types:'));

  const entityTypes = ['node', 'media', 'paragraph', 'taxonomy_term'];
  for (const entityType of entityTypes) {
    if (summary[entityType] > 0) {
      console.log(`  ${entityType}: ${summary[entityType]} bundles`);
    }
  }

  console.log();
  console.log(`Total: ${summary.totalBundles} bundles, ${summary.totalFields} fields`);
  console.log();
}

/**
 * Handle list fields of entity type action
 * @param {object} project - The current project
 * @returns {Promise<void>}
 */
async function handleListEntityFields(project) {
  if (!project.entities) {
    console.log(chalk.yellow('No entities found. Run sync first.'));
    return;
  }

  const entityTypes = Object.keys(project.entities).filter(
    type => Object.keys(project.entities[type]).length > 0
  );

  if (entityTypes.length === 0) {
    console.log(chalk.yellow('No entities found. Run sync first.'));
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

  console.log();
  console.log(chalk.cyan(`Fields in ${selectedType}:`));

  const bundles = project.entities[selectedType];
  for (const [bundleId, bundle] of Object.entries(bundles)) {
    console.log(`  ${bundle.label || bundleId} (${bundleId}):`);
    if (bundle.fields && Object.keys(bundle.fields).length > 0) {
      for (const [fieldName, field] of Object.entries(bundle.fields)) {
        const required = field.required ? ' *' : '';
        console.log(`    - ${field.label || fieldName} (${fieldName}): ${field.type}${required}`);
      }
    } else {
      console.log('    No custom fields');
    }
  }
  console.log();
}

/**
 * Handle list fields of specific bundle action
 * @param {object} project - The current project
 * @returns {Promise<void>}
 */
async function handleListBundleFields(project) {
  if (!project.entities) {
    console.log(chalk.yellow('No entities found. Run sync first.'));
    return;
  }

  const entityTypes = Object.keys(project.entities).filter(
    type => Object.keys(project.entities[type]).length > 0
  );

  if (entityTypes.length === 0) {
    console.log(chalk.yellow('No entities found. Run sync first.'));
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
  const bundleChoices = Object.entries(bundles).map(([id, bundle]) => ({
    value: id,
    name: `${bundle.label || id} (${id})`
  }));

  const selectedBundle = await select({
    message: 'Select bundle:',
    choices: bundleChoices
  });

  const bundle = bundles[selectedBundle];

  console.log();
  console.log(chalk.cyan(`Fields in ${selectedType}.${selectedBundle}:`));

  if (bundle.fields && Object.keys(bundle.fields).length > 0) {
    for (const [fieldName, field] of Object.entries(bundle.fields)) {
      const required = field.required ? ' (required)' : '';
      const cardinality = field.cardinality === -1 ? 'unlimited' : field.cardinality;
      console.log(`  ${field.label || fieldName} (${fieldName})`);
      console.log(`    Type: ${field.type}`);
      console.log(`    Cardinality: ${cardinality}`);
      if (required) console.log(`    Required: yes`);
      if (field.description) console.log(`    Description: ${field.description}`);
    }
  } else {
    console.log('  No custom fields');
  }
  console.log();
}
