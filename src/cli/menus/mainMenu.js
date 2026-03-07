/**
 * Main Menu
 * The routing hub for the CLI application.
 */

import { select, input, search } from '@inquirer/prompts';
import chalk from 'chalk';
import { setPermissionErrorHandler } from '../../io/fileSystem.js';

import {
  getMainMenuChoices,
  getProjectMenuChoices,
  getSubmenuChoices,
  validateProjectName,
  validateProjectNameUnique,
  validateConfigDirectory,
  validateBaseUrl,
  validateThemeDirectory
} from '../prompts.js';
import { resolveThemeChain } from '../../io/themeReader.js';
import { createProject, loadProject, listProjects } from '../../commands/project.js';
import {
  formatLastSync,
  groupBundlesByEntityType,
  getBundleSummary,
  formatEntityTypeTable
} from '../../commands/list.js';

// Import handlers from other menu modules
import { handleSync, checkAndPromptForModules, handleEnableModules } from './syncMenus.js';
import {
  handleCreateBundle,
  handleCreateField,
  handleEditField,
  handleAddBundleToRefs,
  handleListEntityFields,
  handleListBundleFields,
  handleEditProject
} from './contentMenus.js';
import { handleEditFormDisplay } from './formDisplayMenus.js';
import { handleManageRoles } from './roleMenus.js';
import { handleManageStories } from './storyMenus.js';
import {
  handleBundleReport,
  handleEntityReport,
  handleProjectReport,
  handleImportModel,
  handleAdminLinks,
  handleDrushSync
} from './reportMenus.js';

/**
 * Display the main menu and handle user selection
 * @returns {Promise<void>}
 */
export async function showMainMenu() {
  setPermissionErrorHandler(async (error) => {
    console.log(chalk.red(`\nPermission denied: ${error.message}`));
    console.log(
      chalk.yellow('Fix file permissions in another terminal, then retry.\n')
    );
    const retry = await select({
      message: 'Would you like to retry?',
      choices: [
        { value: true, name: 'Yes, retry' },
        { value: false, name: 'No, cancel' },
      ],
    });
    return retry;
  });

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

    // Drupal sync configuration
    const drupalRoot = await input({
      message: 'Drupal root directory (optional, for drush sync)?',
      default: ''
    });

    let drushCommand = 'drush';
    if (drupalRoot) {
      drushCommand = await input({
        message: 'Drush command (e.g., drush, ahoy drush, ddev drush)?',
        default: 'drush'
      });
    }

    const themeDir = await input({
      message: 'Active theme directory (optional, path to sub-theme)?',
      default: '',
      validate: validateThemeDirectory
    });

    let theme = null;
    if (themeDir.trim()) {
      try {
        theme = await resolveThemeChain(themeDir.trim());
        console.log();
        console.log(chalk.cyan('Theme chain discovered:'));
        for (const t of theme.themes) {
          console.log(chalk.white(`  ${t.name} (${t.machine_name}) → ${t.directory}`));
        }
        console.log();
      } catch (err) {
        console.log(chalk.yellow(`Warning: Could not resolve theme chain: ${err.message}`));
      }
    }

    const project = await createProject(name, configDir, baseUrl, {
      drupalRoot: drupalRoot.trim(),
      drushCommand: drushCommand.trim() || 'drush',
      theme
    });
    console.log(chalk.green(`Project "${project.name}" created successfully!`));
    console.log(chalk.cyan(`Slug: ${project.slug}`));
    console.log();

    // Check for missing recommended modules on project creation
    await checkAndPromptForModules(project);

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
      const category = await select({
        message: menuConfig.message,
        choices: menuConfig.choices
      });

      if (category === 'back') return;

      // Roles category has only one action — go directly to it
      if (category === 'roles') {
        await handleManageRoles(project);
        continue;
      }

      project = await showSubmenu(project, category);
    } catch (error) {
      if (error.name === 'ExitPromptError') {
        return;
      }
      console.log(chalk.red(`Error: ${error.message}`));
    }
  }
}

/**
 * Display a submenu for a project menu category
 * @param {object} project - The current project
 * @param {string} category - The category key
 * @returns {Promise<object>} - Updated project
 */
async function showSubmenu(project, category) {
  const choices = getSubmenuChoices(category);

  while (true) {
    try {
      const action = await search({
        message: `${project.name} - Select action:`,
        source: async (input) => {
          const searchTerm = (input || '').toLowerCase();
          return choices.filter(c =>
            c.name.toLowerCase().includes(searchTerm) ||
            c.value.toLowerCase().includes(searchTerm)
          );
        }
      });

      if (action === 'back') return project;

      project = await handleAction(project, action);
    } catch (error) {
      if (error.name === 'ExitPromptError') {
        return project;
      }
      console.log(chalk.red(`Error: ${error.message}`));
    }
  }
}

/**
 * Handle a single project menu action
 * @param {object} project - The current project
 * @param {string} action - The action value
 * @returns {Promise<object>} - Updated project
 */
async function handleAction(project, action) {
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
    case 'edit-field':
      await handleEditField(project);
      project = await loadProject(project.slug);
      break;
    case 'add-bundle-to-refs':
      await handleAddBundleToRefs(project);
      project = await loadProject(project.slug);
      break;
    case 'edit-form-display':
      await handleEditFormDisplay(project);
      break;
    case 'edit-project':
      project = await handleEditProject(project);
      break;
    case 'enable-modules':
      await handleEnableModules(project);
      break;
    case 'report-bundle':
      await handleBundleReport(project);
      break;
    case 'report-entity':
      await handleEntityReport(project);
      break;
    case 'report-project':
      await handleProjectReport(project);
      break;
    case 'import-model':
      await handleImportModel(project);
      project = await loadProject(project.slug);
      break;
    case 'admin-links':
      await handleAdminLinks(project);
      break;
    case 'manage-roles':
      await handleManageRoles(project);
      break;
    case 'manage-stories':
      await handleManageStories(project);
      break;
    case 'drush-sync':
      await handleDrushSync(project);
      break;
  }
  return project;
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
