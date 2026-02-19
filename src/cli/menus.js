/**
 * CLI Menu System
 * Handles interactive menu navigation and actions.
 */

import { select, input, checkbox, search } from '@inquirer/prompts';
import sortableCheckbox from 'inquirer-sortable-checkbox';
import chalk from 'chalk';
import { selectWithBack, BACK } from './selectWithBack.js';
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
import { syncProject, checkProjectModules, enableProjectModules, getRecommendedModules } from '../commands/sync.js';
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
import { createBundle, validateBundleMachineName, createField, validateFieldMachineName, getReusableFields, updateField } from '../commands/create.js';
import { createEntityReport, createProjectReport, createBundleReport } from '../commands/report.js';
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
  getAvailableGroups,
  getVisibleFields,
  getHiddenFields,
  showHiddenField,
  updateFieldWidget,
  updateFieldSettings,
  getAvailableWidgetsForField,
  resetFormDisplay,
  clearFieldGroups
} from '../commands/formDisplay.js';
import {
  listRoles,
  loadRole,
  createRole,
  deleteRole,
  saveRole,
  getRoleChoices,
  getPermissionChoices,
  getRoleContentPermissions,
  getRoleOtherPermissions,
  generateRoleMachineName,
  validateRoleMachineName
} from '../commands/role.js';
import {
  addPermissionsToRole,
  removePermissionsFromRole,
  setRoleBundlePermissions,
  getRoleSummary
} from '../parsers/roleParser.js';
import { getPermissionsForBundle } from '../constants/permissions.js';
import { syncWithDrupal, getSyncStatus } from '../commands/drush.js';
import { FIELD_GROUP_FORMATS, getDefaultFormatSettings } from '../generators/formDisplayGenerator.js';
import { generateGroupName, validateGroupName } from '../parsers/formDisplayParser.js';
import { generateMachineName } from '../generators/bundleGenerator.js';
import { generateFieldName, FIELD_TYPES } from '../generators/fieldGenerator.js';
import { getEntityTypeLabel } from '../generators/reportGenerator.js';
import {
  listStories,
  loadStory,
  saveStory,
  deleteStory,
  exportStoryToMarkdown,
  storyExists,
  addFieldToStory,
  updateFieldInStory,
  removeFieldFromStory,
  updateStoryBundleInfo,
  updateStoryPurpose,
  updateStoryPermissions
} from '../commands/story.js';
import { createEmptyStory } from '../generators/storyGenerator.js';

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

    const project = await createProject(name, configDir, baseUrl, {
      drupalRoot: drupalRoot.trim(),
      drushCommand: drushCommand.trim() || 'drush'
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
      const action = await search({
        message: menuConfig.message,
        source: async (input) => {
          const searchTerm = (input || '').toLowerCase();
          return menuConfig.choices.filter(c =>
            c.name.toLowerCase().includes(searchTerm) ||
            c.value.toLowerCase().includes(searchTerm)
          );
        }
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
        case 'edit-field':
          await handleEditField(project);
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

    // Check for missing recommended modules
    await checkAndPromptForModules(project);
  } catch (error) {
    console.log(chalk.red(`Sync failed: ${error.message}`));
  }
}

/**
 * Check for missing recommended modules and prompt to enable them
 * @param {object} project - The current project
 * @returns {Promise<void>}
 */
async function checkAndPromptForModules(project) {
  try {
    const { missingModules } = await checkProjectModules(project);

    if (missingModules.length === 0) {
      return;
    }

    console.log();
    console.log(chalk.yellow('Some recommended modules are not enabled:'));
    for (const mod of missingModules) {
      console.log(chalk.yellow(`  - ${mod}`));
    }
    console.log();
    console.log(chalk.cyan('These modules are recommended for effective content modelling.'));

    const enableNow = await select({
      message: 'Would you like to enable these modules now?',
      choices: [
        { value: 'select', name: 'Select which modules to enable' },
        { value: 'all', name: 'Enable all missing modules' },
        { value: 'skip', name: 'Skip for now' }
      ]
    });

    if (enableNow === 'skip') {
      return;
    }

    let modulesToEnable;
    if (enableNow === 'all') {
      modulesToEnable = missingModules;
    } else {
      modulesToEnable = await checkbox({
        message: 'Select modules to enable:',
        choices: missingModules.map(mod => ({
          value: mod,
          name: mod,
          checked: true
        }))
      });
    }

    if (modulesToEnable.length > 0) {
      await enableProjectModules(project, modulesToEnable);
      console.log(chalk.green('Modules enabled in core.extension.yml:'));
      for (const mod of modulesToEnable) {
        console.log(chalk.green(`  - ${mod}`));
      }
    }
  } catch (error) {
    console.log(chalk.yellow(`Could not check modules: ${error.message}`));
  }
}

/**
 * Handle enable required modules action
 * @param {object} project - The current project
 * @returns {Promise<void>}
 */
async function handleEnableModules(project) {
  try {
    const { missingModules, enabledModules } = await checkProjectModules(project);
    const recommended = getRecommendedModules();

    console.log();
    console.log(chalk.cyan('Recommended content modules:'));
    for (const mod of recommended) {
      if (enabledModules.includes(mod)) {
        console.log(chalk.green(`  ✓ ${mod}`));
      } else {
        console.log(chalk.yellow(`  ✗ ${mod}`));
      }
    }
    console.log();

    if (missingModules.length === 0) {
      console.log(chalk.green('All strongly recommended content modules are enabled.'));
      return;
    }

    const enableNow = await select({
      message: 'Enable missing modules?',
      choices: [
        { value: 'select', name: 'Select which modules to enable' },
        { value: 'all', name: 'Enable all missing modules' },
        { value: 'skip', name: 'Cancel' }
      ]
    });

    if (enableNow === 'skip') {
      return;
    }

    let modulesToEnable;
    if (enableNow === 'all') {
      modulesToEnable = missingModules;
    } else {
      modulesToEnable = await checkbox({
        message: 'Select modules to enable:',
        choices: missingModules.map(mod => ({
          value: mod,
          name: mod,
          checked: true
        }))
      });
    }

    if (modulesToEnable.length > 0) {
      await enableProjectModules(project, modulesToEnable);
      console.log();
      console.log(chalk.green('Modules enabled in core.extension.yml:'));
      for (const mod of modulesToEnable) {
        console.log(chalk.green(`  - ${mod}`));
      }
      console.log();
    }
  } catch (error) {
    if (error.name === 'ExitPromptError') {
      return;
    }
    console.log(chalk.red(`Error: ${error.message}`));
  }
}

/**
 * Form display menu choices
 */
const FORM_DISPLAY_MENU_CHOICES = [
  { value: 'view', name: 'View form layout' },
  { value: 'reorder', name: 'Reorder items in group' },
  { value: 'move', name: 'Move field or group' },
  { value: 'configure-field', name: 'Configure field widget' },
  { value: 'create-group', name: 'Create field group' },
  { value: 'edit-group', name: 'Edit field group' },
  { value: 'delete-group', name: 'Delete field group' },
  { value: 'visibility', name: 'Hide/show fields' },
  { value: 'reset', name: 'Reset form display' },
  { value: 'back', name: 'Back' }
];

/**
 * Handle edit form display action
 * @param {object} project - The current project
 * @returns {Promise<void>}
 */
async function handleEditFormDisplay(project) {
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

    // Load form display
    const formDisplay = await loadFormDisplay(project, entityType, selectedBundle);

    if (!formDisplay) {
      console.log(chalk.yellow(`No form display found for ${entityType} > ${selectedBundle}.`));
      console.log(chalk.yellow('Form display configuration is created when the bundle has fields.'));
      return;
    }

    // Show form display menu
    await showFormDisplayMenu(project, formDisplay);
  } catch (error) {
    if (error.name === 'ExitPromptError') {
      return;
    }
    console.log(chalk.red(`Error: ${error.message}`));
  }
}

/**
 * Show form display menu
 * @param {object} project - The current project
 * @param {object} formDisplay - Form display data
 * @returns {Promise<void>}
 */
async function showFormDisplayMenu(project, formDisplay) {
  let currentFormDisplay = formDisplay;

  // Display tree on entry
  console.log();
  console.log(getFormDisplayTree(currentFormDisplay));
  console.log();

  while (true) {
    try {
      const action = await selectWithBack({
        message: `Form Display - ${currentFormDisplay.entityType} > ${currentFormDisplay.bundle}`,
        choices: FORM_DISPLAY_MENU_CHOICES
      });

      // Handle backspace to go back
      if (action === BACK) {
        return;
      }

      switch (action) {
        case 'view':
          console.log();
          console.log(getFormDisplayTree(currentFormDisplay));
          console.log();
          break;

        case 'reorder': {
          const result = await handleReorderFields(currentFormDisplay);
          if (result) {
            currentFormDisplay = result;
            await saveFormDisplay(project, currentFormDisplay);
            console.log(chalk.green('Changes saved.'));
          }
          break;
        }

        case 'move': {
          const result = await handleMoveField(currentFormDisplay);
          if (result) {
            currentFormDisplay = result;
            await saveFormDisplay(project, currentFormDisplay);
            console.log(chalk.green('Changes saved.'));
          }
          break;
        }

        case 'configure-field': {
          const result = await handleConfigureField(project, currentFormDisplay);
          if (result) {
            currentFormDisplay = result;
            await saveFormDisplay(project, currentFormDisplay);
            console.log(chalk.green('Changes saved.'));
          }
          break;
        }

        case 'create-group': {
          const result = await handleCreateGroup(currentFormDisplay);
          if (result) {
            currentFormDisplay = result;
            await saveFormDisplay(project, currentFormDisplay);
            console.log(chalk.green('Changes saved.'));
          }
          break;
        }

        case 'edit-group': {
          const result = await handleEditGroup(currentFormDisplay);
          if (result) {
            currentFormDisplay = result;
            await saveFormDisplay(project, currentFormDisplay);
            console.log(chalk.green('Changes saved.'));
          }
          break;
        }

        case 'delete-group': {
          const result = await handleDeleteGroup(currentFormDisplay);
          if (result) {
            currentFormDisplay = result;
            await saveFormDisplay(project, currentFormDisplay);
            console.log(chalk.green('Changes saved.'));
          }
          break;
        }

        case 'visibility': {
          const result = await handleToggleVisibility(project, currentFormDisplay);
          if (result) {
            currentFormDisplay = result;
            await saveFormDisplay(project, currentFormDisplay);
            console.log(chalk.green('Changes saved.'));
          }
          break;
        }

        case 'reset': {
          const result = await handleResetFormDisplay(project, currentFormDisplay);
          if (result) {
            currentFormDisplay = result;
            await saveFormDisplay(project, currentFormDisplay);
            console.log(chalk.green('Changes saved.'));
          }
          break;
        }

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
 * Handle reordering fields within a group
 * @param {object} formDisplay - Form display data
 * @returns {Promise<object|null>} - Updated form display or null
 */
async function handleReorderFields(formDisplay) {
  try {
    const groupChoices = getAvailableGroups(formDisplay);

    const groupName = await selectWithBack({
      message: 'Select group to reorder:',
      choices: groupChoices
    });

    if (groupName === BACK) {
      return null;
    }

    // Get children of selected group
    let children;
    if (groupName === '') {
    // Root level: get ungrouped fields and root groups
      const groupedFields = new Set();
      for (const group of formDisplay.groups) {
        for (const child of group.children || []) {
          groupedFields.add(child);
        }
      }

      // Get root level items
      const rootGroups = formDisplay.groups.filter(g => !g.parentName);
      const rootFields = formDisplay.fields.filter(f => !groupedFields.has(f.name));

      children = [
        ...rootGroups.map(g => ({ name: g.name, label: `[${g.formatType}] ${g.label}`, weight: g.weight })),
        ...rootFields.map(f => ({ name: f.name, label: `${f.name} (${f.type})`, weight: f.weight }))
      ].sort((a, b) => a.weight - b.weight);
    } else {
      const group = formDisplay.groups.find(g => g.name === groupName);
      if (!group || !group.children || group.children.length === 0) {
        console.log(chalk.yellow('This group has no children to reorder.'));
        return null;
      }

      // For items within a group:
      // - Nested groups are ordered by weight
      // - Fields are ordered by position in children array
      // First, separate groups and fields
      const childGroups = [];
      const childFields = [];

      for (const childName of group.children) {
        const childGroup = formDisplay.groups.find(g => g.name === childName);
        if (childGroup) {
          childGroups.push({ name: childGroup.name, label: `[${childGroup.formatType}] ${childGroup.label}`, weight: childGroup.weight, isGroup: true });
        } else {
          const field = formDisplay.fields.find(f => f.name === childName);
          if (field) {
            childFields.push({ name: field.name, label: `${field.name} (${field.type})`, weight: 0, isGroup: false });
          } else {
            childFields.push({ name: childName, label: childName, weight: 0, isGroup: false });
          }
        }
      }

      // Sort groups by weight, fields stay in children array order
      childGroups.sort((a, b) => a.weight - b.weight);

      // Combine: show groups first (by weight), then fields (by array order)
      // Actually, we should show them interleaved based on their position in children array
      // but groups sorted by weight among themselves
      children = group.children.map(childName => {
        const childGroup = formDisplay.groups.find(g => g.name === childName);
        if (childGroup) {
          return { name: childGroup.name, label: `[${childGroup.formatType}] ${childGroup.label}`, weight: childGroup.weight, isGroup: true };
        }
        const field = formDisplay.fields.find(f => f.name === childName);
        if (field) {
          return { name: field.name, label: `${field.name} (${field.type})`, weight: 0, isGroup: false };
        }
        return { name: childName, label: childName, weight: 0, isGroup: false };
      });
    // Keep the children array order - this is how Drupal orders fields within a group
    }

    if (children.length === 0) {
      console.log(chalk.yellow('No items to reorder.'));
      return null;
    }

    // Build choices for sortable checkbox
    const itemChoices = children.map(item => ({
      value: item.name,
      name: item.label,
      checked: true
    }));

    console.log();
    console.log(chalk.cyan('Use Ctrl+Up/Down to reorder items. Press Enter when done.'));
    console.log();

    const selectedOrder = await sortableCheckbox({
      message: 'Reorder items:',
      choices: itemChoices,
      pageSize: 15,
      loop: true
    });

    if (selectedOrder.length === 0) {
      console.log(chalk.yellow('No items selected.'));
      return null;
    }

    return reorderGroupChildren(formDisplay, groupName, selectedOrder);
  } catch (error) {
    if (error.name === 'ExitPromptError') {
      return null;
    }
    throw error;
  }
}

/**
 * Handle moving a field or group to a different location
 * @param {object} formDisplay - Form display data
 * @returns {Promise<object|null>} - Updated form display or null
 */
async function handleMoveField(formDisplay) {
  try {
    // Build list of movable items (fields and groups)
    const visibleFields = getVisibleFields(formDisplay);
    const movableGroups = formDisplay.groups.map(g => ({
      value: `group:${g.name}`,
      name: `[${g.formatType}] ${g.label}`
    }));

    const allItems = [
      ...visibleFields.map(f => ({ value: `field:${f.value}`, name: f.name })),
      ...movableGroups
    ];

    if (allItems.length === 0) {
      console.log(chalk.yellow('No items available to move.'));
      return null;
    }

    const selectedItem = await selectWithBack({
      message: 'Select field or group to move:',
      choices: allItems
    });

    if (selectedItem === BACK) {
      return null;
    }

    const [itemType, itemName] = selectedItem.split(':');

    // Build target choices - include root level option
    const groupChoices = getAvailableGroups(formDisplay);

    // Filter out the selected group from targets (can't move group into itself)
    const filteredChoices = itemType === 'group'
      ? groupChoices.filter(c => c.value !== itemName)
      : groupChoices;

    const targetGroup = await selectWithBack({
      message: 'Move to:',
      choices: filteredChoices
    });

    if (targetGroup === BACK) {
      return null;
    }

    if (itemType === 'field') {
      return moveFieldToGroup(formDisplay, itemName, targetGroup);
    } else {
      // Moving a group
      return moveGroupToParent(formDisplay, itemName, targetGroup);
    }
  } catch (error) {
    if (error.name === 'ExitPromptError') {
      return null;
    }
    throw error;
  }
}

/**
 * Handle creating a new field group
 * @param {object} formDisplay - Form display data
 * @returns {Promise<object|null>} - Updated form display or null
 */
async function handleCreateGroup(formDisplay) {
  try {
    const label = await input({
      message: 'Group label?',
      validate: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Label is required';
        }
        return true;
      }
    });

    const suggestedName = generateGroupName(label);
    const name = await input({
      message: 'Machine name?',
      default: suggestedName,
      validate: (value) => validateGroupName(value, formDisplay.groups)
    });

    const formatType = await selectWithBack({
      message: 'Format type?',
      choices: FIELD_GROUP_FORMATS
    });

    if (formatType === BACK) {
      return null;
    }

    const groupChoices = getAvailableGroups(formDisplay);
    const parentName = await selectWithBack({
      message: 'Parent group?',
      choices: groupChoices
    });

    if (parentName === BACK) {
      return null;
    }

    const groupConfig = {
      name,
      label: label.trim(),
      formatType,
      parentName
    };

    const updated = createFieldGroup(formDisplay, groupConfig);

    console.log(chalk.green(`Field group "${label}" created.`));
    return updated;
  } catch (error) {
    if (error.name === 'ExitPromptError') {
      return null;
    }
    throw error;
  }
}

/**
 * Handle editing a field group
 * @param {object} formDisplay - Form display data
 * @returns {Promise<object|null>} - Updated form display or null
 */
async function handleEditGroup(formDisplay) {
  try {
    if (formDisplay.groups.length === 0) {
      console.log(chalk.yellow('No field groups to edit.'));
      return null;
    }

    const groupChoices = formDisplay.groups.map(g => ({
      value: g.name,
      name: `${g.label} [${g.formatType}]`
    }));

    const groupName = await selectWithBack({
      message: 'Select group to edit:',
      choices: groupChoices
    });

    if (groupName === BACK) {
      return null;
    }

    const group = formDisplay.groups.find(g => g.name === groupName);

    const label = await input({
      message: 'Label:',
      default: group.label,
      validate: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Label is required';
        }
        return true;
      }
    });

    const formatType = await selectWithBack({
      message: 'Format type:',
      choices: FIELD_GROUP_FORMATS,
      default: group.formatType
    });

    if (formatType === BACK) {
      return null;
    }

    const updates = {
      label: label.trim(),
      formatType,
      formatSettings: getDefaultFormatSettings(formatType)
    };

    console.log(chalk.green(`Group "${label}" updated.`));
    return updateFieldGroup(formDisplay, groupName, updates);
  } catch (error) {
    if (error.name === 'ExitPromptError') {
      return null;
    }
    throw error;
  }
}

/**
 * Handle deleting a field group
 * @param {object} formDisplay - Form display data
 * @returns {Promise<object|null>} - Updated form display or null
 */
async function handleDeleteGroup(formDisplay) {
  try {
    if (formDisplay.groups.length === 0) {
      console.log(chalk.yellow('No field groups to delete.'));
      return null;
    }

    const groupChoices = formDisplay.groups.map(g => ({
      value: g.name,
      name: `${g.label} [${g.formatType}] (${g.children?.length || 0} children)`
    }));

    const groupName = await selectWithBack({
      message: 'Select group to delete:',
      choices: groupChoices
    });

    if (groupName === BACK) {
      return null;
    }

    const group = formDisplay.groups.find(g => g.name === groupName);

    const confirm = await selectWithBack({
      message: `Delete "${group.label}"? Children will be moved to parent.`,
      choices: [
        { value: false, name: 'No, cancel' },
        { value: true, name: 'Yes, delete' }
      ]
    });

    if (confirm === BACK) {
      return null;
    }

    if (!confirm) {
      return null;
    }

    console.log(chalk.green(`Group "${group.label}" deleted.`));
    return deleteFieldGroup(formDisplay, groupName, true);
  } catch (error) {
    if (error.name === 'ExitPromptError') {
      return null;
    }
    throw error;
  }
}

/**
 * Handle hiding/showing fields
 * @param {object} project - Project object
 * @param {object} formDisplay - Form display data
 * @returns {Promise<object|null>} - Updated form display or null
 */
async function handleToggleVisibility(project, formDisplay) {
  try {
    const action = await selectWithBack({
      message: 'What would you like to do?',
      choices: [
        { value: 'hide', name: 'Hide fields' },
        { value: 'show', name: 'Show hidden fields' }
      ]
    });

    if (action === BACK) {
      return null;
    }

    if (action === 'hide') {
      const visibleFields = getVisibleFields(formDisplay);
      if (visibleFields.length === 0) {
        console.log(chalk.yellow('No visible fields to hide.'));
        return null;
      }

      const fieldsToHide = await checkbox({
        message: 'Select fields to hide:',
        choices: visibleFields.map(f => ({
          value: f.value,
          name: f.name
        }))
      });

      if (fieldsToHide.length === 0) {
        return null;
      }

      let updated = formDisplay;
      for (const fieldName of fieldsToHide) {
        updated = toggleFieldVisibility(updated, fieldName);
      }
      console.log(chalk.green(`Hidden ${fieldsToHide.length} field(s).`));
      return updated;
    }

    if (action === 'show') {
      const hiddenFields = getHiddenFields(formDisplay);
      if (hiddenFields.length === 0) {
        console.log(chalk.yellow('No hidden fields to show.'));
        return null;
      }

      const fieldsToShow = await checkbox({
        message: 'Select fields to show:',
        choices: hiddenFields.map(f => ({
          value: f.value,
          name: f.name
        }))
      });

      if (fieldsToShow.length === 0) {
        return null;
      }

      // Use showHiddenField to properly restore widget configuration
      let updated = formDisplay;
      for (const fieldName of fieldsToShow) {
        try {
          updated = await showHiddenField(project, updated, fieldName);
        } catch (err) {
          console.log(chalk.yellow(`Warning: Could not get widget for ${fieldName}: ${err.message}`));
          // Fallback to simple toggle if widget lookup fails
          updated = toggleFieldVisibility(updated, fieldName);
        }
      }
      console.log(chalk.green(`Shown ${fieldsToShow.length} field(s).`));
      return updated;
    }

    return null;
  } catch (error) {
    if (error.name === 'ExitPromptError') {
      return null;
    }
    throw error;
  }
}

/**
 * Handle configuring a field's widget
 * @param {object} project - Project object
 * @param {object} formDisplay - Form display data
 * @returns {Promise<object|null>} - Updated form display or null
 */
async function handleConfigureField(project, formDisplay) {
  try {
    const visibleFields = getVisibleFields(formDisplay);
    if (visibleFields.length === 0) {
      console.log(chalk.yellow('No visible fields to configure.'));
      return null;
    }

    // Add current widget type to field choices
    const fieldChoices = visibleFields.map(f => {
      const field = formDisplay.fields.find(fd => fd.name === f.value);
      const widgetType = field?.type || 'unknown';
      return {
        value: f.value,
        name: `${f.name} (${widgetType})`
      };
    });

    const selectedField = await selectWithBack({
      message: 'Select field to configure:',
      choices: fieldChoices
    });

    if (selectedField === BACK) {
      return null;
    }

    const field = formDisplay.fields.find(f => f.name === selectedField);
    const availableWidgets = await getAvailableWidgetsForField(project, formDisplay, selectedField);

    if (availableWidgets.length === 0) {
      console.log(chalk.yellow('No widgets available for this field type.'));
      return null;
    }

    const configAction = await selectWithBack({
      message: `Current widget: ${field.type}`,
      choices: [
        { value: 'change-widget', name: 'Change widget type' },
        { value: 'edit-settings', name: 'Edit widget settings' }
      ]
    });

    if (configAction === BACK) {
      return null;
    }

    if (configAction === 'change-widget') {
      const widgetChoices = availableWidgets.map(w => ({
        value: w.type,
        name: `${w.label} (${w.type})${w.type === field.type ? ' - current' : ''}`
      }));

      const newWidgetType = await selectWithBack({
        message: 'Select widget:',
        choices: widgetChoices
      });

      if (newWidgetType === BACK) {
        return null;
      }

      if (newWidgetType === field.type) {
        console.log(chalk.yellow('Widget unchanged.'));
        return null;
      }

      const updated = await updateFieldWidget(project, formDisplay, selectedField, newWidgetType);
      console.log(chalk.green(`Widget changed to ${newWidgetType}.`));
      return updated;
    }

    if (configAction === 'edit-settings') {
      const currentSettings = field.settings || {};
      const widget = availableWidgets.find(w => w.type === field.type);
      const widgetDefaults = widget?.settings || {};

      // Merge defaults with current settings
      const allSettings = { ...widgetDefaults, ...currentSettings };

      if (Object.keys(allSettings).length === 0) {
        console.log(chalk.yellow('This widget has no configurable settings.'));
        return null;
      }

      console.log();
      console.log(chalk.cyan('Edit widget settings'));
      console.log(chalk.cyan('Press Enter to keep current value'));
      console.log();

      const newSettings = {};

      for (const [key, defaultValue] of Object.entries(allSettings)) {
        const currentValue = currentSettings[key] ?? defaultValue;

        if (typeof currentValue === 'boolean') {
          newSettings[key] = await select({
            message: `${key}:`,
            choices: [
              { value: true, name: 'Yes' },
              { value: false, name: 'No' }
            ],
            default: currentValue
          });
        } else if (typeof currentValue === 'number') {
          const numValue = await input({
            message: `${key}:`,
            default: String(currentValue),
            validate: (value) => {
              if (value === '') return true;
              const num = parseInt(value, 10);
              if (isNaN(num)) return 'Must be a number';
              return true;
            }
          });
          newSettings[key] = numValue === '' ? currentValue : parseInt(numValue, 10);
        } else if (Array.isArray(currentValue)) {
          const arrValue = await input({
            message: `${key} (comma-separated):`,
            default: currentValue.join(', ')
          });
          newSettings[key] = arrValue ? arrValue.split(',').map(v => v.trim()).filter(v => v) : [];
        } else {
          newSettings[key] = await input({
            message: `${key}:`,
            default: String(currentValue || '')
          });
        }
      }

      const updated = updateFieldSettings(formDisplay, selectedField, newSettings);
      console.log(chalk.green('Widget settings updated.'));
      return updated;
    }

    return null;
  } catch (error) {
    if (error.name === 'ExitPromptError') {
      return null;
    }
    throw error;
  }
}

/**
 * Handle resetting form display
 * @param {object} project - Project object
 * @param {object} formDisplay - Form display data
 * @returns {Promise<object|null>} - Updated form display or null
 */
async function handleResetFormDisplay(project, formDisplay) {
  try {
    const action = await selectWithBack({
      message: 'Reset form display:',
      choices: [
        { value: 'regenerate', name: 'Regenerate with default widgets' },
        { value: 'clear-groups', name: 'Clear all field groups' },
        { value: 'show-all', name: 'Show all hidden fields' }
      ]
    });

    if (action === BACK) {
      return null;
    }

    if (action === 'regenerate') {
      const confirm = await selectWithBack({
        message: 'This will reset all fields to their default widgets. Continue?',
        choices: [
          { value: false, name: 'No, cancel' },
          { value: true, name: 'Yes, regenerate' }
        ]
      });

      if (confirm === BACK || !confirm) {
        return null;
      }

      const keepGroups = await selectWithBack({
        message: 'Keep field groups?',
        choices: [
          { value: true, name: 'Yes, keep groups' },
          { value: false, name: 'No, clear groups' }
        ]
      });

      if (keepGroups === BACK) {
        return null;
      }

      const updated = await resetFormDisplay(project, formDisplay, {
        keepFieldOrder: true,
        clearGroups: !keepGroups
      });
      console.log(chalk.green('Form display regenerated with default widgets.'));
      return updated;
    }

    if (action === 'clear-groups') {
      const confirm = await selectWithBack({
        message: 'This will remove all field groups. Fields will remain. Continue?',
        choices: [
          { value: false, name: 'No, cancel' },
          { value: true, name: 'Yes, clear groups' }
        ]
      });

      if (confirm === BACK || !confirm) {
        return null;
      }

      const updated = clearFieldGroups(formDisplay);
      console.log(chalk.green('Field groups cleared.'));
      return updated;
    }

    if (action === 'show-all') {
      if (formDisplay.hidden.length === 0) {
        console.log(chalk.yellow('No hidden fields to show.'));
        return null;
      }

      const confirm = await selectWithBack({
        message: `Show all ${formDisplay.hidden.length} hidden field(s)?`,
        choices: [
          { value: false, name: 'No, cancel' },
          { value: true, name: 'Yes, show all' }
        ]
      });

      if (confirm === BACK || !confirm) {
        return null;
      }

      let updated = formDisplay;
      for (const fieldName of [...formDisplay.hidden]) {
        try {
          updated = await showHiddenField(project, updated, fieldName);
        } catch (err) {
          console.log(chalk.yellow(`Warning: Could not show ${fieldName}: ${err.message}`));
        }
      }
      console.log(chalk.green('All hidden fields shown.'));
      return updated;
    }

    return null;
  } catch (error) {
    if (error.name === 'ExitPromptError') {
      return null;
    }
    throw error;
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
      source: async (input) => {
        const searchTerm = (input || '').toLowerCase();
        return bundleEntries.filter(b =>
          b.name.toLowerCase().includes(searchTerm) ||
          b.value.toLowerCase().includes(searchTerm)
        );
      }
    });

    const selectedBundles = [selectedBundle];

    // Select field type
    const fieldType = await select({
      message: 'Select field type:',
      choices: FIELD_TYPES
    });

    // Check for reusable fields
    const reusableFields = getReusableFields(project, entityType, fieldType, selectedBundles);

    let fieldName;
    let label;
    let description;
    let required;
    let cardinality;
    let settings;
    let isReuse = false;

    if (reusableFields.length > 0) {
      // Offer choice to reuse or create new
      const reuseChoice = await select({
        message: 'Field options:',
        choices: [
          { value: 'reuse', name: 'Reuse existing field' },
          { value: 'new', name: 'Create new field' }
        ]
      });

      if (reuseChoice === 'reuse') {
        // Show list of reusable fields
        const fieldChoices = reusableFields.map(f => ({
          value: f.fieldName,
          name: `${f.label} (${f.fieldName}) - used in: ${f.usedInBundles.join(', ')}`
        }));
        fieldChoices.push({ value: '__new__', name: 'Create new field' });

        const selectedField = await select({
          message: 'Select field to reuse:',
          choices: fieldChoices
        });

        if (selectedField !== '__new__') {
          isReuse = true;
          const reusedField = reusableFields.find(f => f.fieldName === selectedField);
          fieldName = reusedField.fieldName;
          cardinality = reusedField.cardinality;
          settings = reusedField.settings;

          // Prompt for label (default to existing)
          label = await input({
            message: 'Field label?',
            default: reusedField.label,
            validate: (value) => {
              if (!value || value.trim().length === 0) {
                return 'Label is required';
              }
              return true;
            }
          });

          // Prompt for description
          description = await input({
            message: 'Description (optional)?'
          });

          // Prompt for required
          required = await select({
            message: 'Required?',
            choices: [
              { value: false, name: 'No' },
              { value: true, name: 'Yes' }
            ]
          });
        }
      }
    }

    // If not reusing, go through full creation flow
    if (!isReuse) {
      // Prompt for label
      label = await input({
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
      fieldName = await input({
        message: 'Machine name?',
        default: suggestedFieldName,
        validate: validateFieldMachineName
      });

      // Prompt for description
      description = await input({
        message: 'Description (optional)?'
      });

      // Prompt for required
      required = await select({
        message: 'Required?',
        choices: [
          { value: false, name: 'No' },
          { value: true, name: 'Yes' }
        ]
      });

      // Prompt for cardinality
      cardinality = await select({
        message: 'Cardinality?',
        choices: [
          { value: 1, name: 'Single value' },
          { value: -1, name: 'Unlimited' }
        ]
      });

      // Type-specific settings
      settings = await getTypeSpecificSettings(fieldType, project);
    }

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
 * Handle edit field action
 * @param {object} project - The current project
 * @returns {Promise<void>}
 */
async function handleEditField(project) {
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

    // Select field
    const bundle = bundles[selectedBundle];
    if (!bundle.fields || Object.keys(bundle.fields).length === 0) {
      console.log(chalk.yellow('No fields found on this bundle.'));
      return;
    }

    const fieldEntries = Object.entries(bundle.fields)
      .sort(([, a], [, b]) => (a.label || '').localeCompare(b.label || ''))
      .map(([fieldName, field]) => ({
        value: fieldName,
        name: `${field.label || fieldName} (${fieldName}) - ${field.type}`,
        label: field.label || fieldName,
        type: field.type
      }));

    const selectedField = await search({
      message: 'Select field (type to search):',
      source: async (searchInput) => {
        const searchTerm = (searchInput || '').toLowerCase();
        return fieldEntries.filter(f =>
          f.name.toLowerCase().includes(searchTerm) ||
          f.value.toLowerCase().includes(searchTerm)
        );
      }
    });

    const field = bundle.fields[selectedField];
    const fieldType = field.type;

    console.log();
    console.log(chalk.cyan('Edit field instance'));
    console.log(chalk.cyan('Press Enter to keep current value'));
    console.log();

    // Prompt for label
    const label = await input({
      message: 'Label:',
      default: field.label || '',
      validate: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Label is required';
        }
        return true;
      }
    });

    // Prompt for description
    const description = await input({
      message: 'Description:',
      default: field.description || ''
    });

    // Prompt for required
    const required = await select({
      message: 'Required?',
      choices: [
        { value: false, name: 'No' },
        { value: true, name: 'Yes' }
      ],
      default: field.required ? true : false
    });

    // For entity reference fields, prompt for target bundles
    let targetBundles;
    if (fieldType === 'entity_reference' || fieldType === 'entity_reference_revisions') {
      // Get target type from settings
      const targetType = fieldType === 'entity_reference_revisions'
        ? 'paragraph'
        : (field.settings?.targetType || 'node');

      // Get current target bundles
      const currentTargetBundles = field.settings?.handler_settings?.target_bundles
        ? Object.keys(field.settings.handler_settings.target_bundles)
        : [];

      // Get available bundles from project
      if (project.entities && project.entities[targetType]) {
        const availableBundles = project.entities[targetType];
        if (Object.keys(availableBundles).length > 0) {
          const bundleOptions = Object.entries(availableBundles)
            .sort(([, a], [, b]) => (a.label || '').localeCompare(b.label || ''))
            .map(([id, bundleData]) => ({
              value: id,
              name: `${bundleData.label || id} (${id})`,
              checked: currentTargetBundles.includes(id)
            }));

          targetBundles = await checkbox({
            message: `Select target ${targetType} bundles:`,
            choices: bundleOptions
          });
        }
      }
    }

    // Build updates object
    const updates = {
      label: label.trim(),
      description: description.trim(),
      required
    };

    if (targetBundles !== undefined) {
      updates.targetBundles = targetBundles;
    }

    // Update the field
    const result = await updateField(project, entityType, selectedBundle, selectedField, updates);

    console.log();
    console.log(chalk.green(`Field "${result.fieldName}" updated successfully!`));
    console.log(chalk.cyan(`Updated file: ${result.updatedFile}`));
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

    const drupalRoot = await input({
      message: 'Drupal root directory (for drush sync):',
      default: project.drupalRoot || ''
    });

    const drushCommand = await input({
      message: 'Drush command (e.g., drush, ahoy drush, ddev drush):',
      default: project.drushCommand || 'drush'
    });

    const updates = {
      name: name.trim(),
      configDirectory: configDirectory.trim(),
      baseUrl: baseUrl.trim(),
      drupalRoot: drupalRoot.trim(),
      drushCommand: drushCommand.trim() || 'drush'
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
 * Handle single bundle report generation
 * @param {object} project - The current project
 * @returns {Promise<void>}
 */
async function handleBundleReport(project) {
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

    // Generate reports for all selected bundles
    for (const bundleId of bundleIds) {
      const filename = `${project.slug}-${entityType}-${bundleId}-report.md`;
      const outputPath = join(getReportsDir(project.slug), filename);

      const result = await createBundleReport(project, entityType, bundleId, outputPath, baseUrl);
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
async function handleAdminLinks(project) {
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

    case 'datetime':
    case 'daterange':
      settings.datetimeType = await select({
        message: 'Date type?',
        choices: [
          { value: 'date', name: 'Date only' },
          { value: 'datetime', name: 'Date and time' }
        ]
      });
      break;

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

/**
 * Role management menu choices
 */
const ROLE_MENU_CHOICES = [
  { value: 'list', name: 'List roles' },
  { value: 'view', name: 'View role details' },
  { value: 'create', name: 'Create role' },
  { value: 'edit-permissions', name: 'Edit role permissions' },
  { value: 'delete', name: 'Delete role' },
  { value: 'back', name: 'Back' }
];

/**
 * Handle manage roles action
 * @param {object} project - The current project
 * @returns {Promise<void>}
 */
async function handleManageRoles(project) {
  while (true) {
    try {
      const action = await selectWithBack({
        message: 'Role Management',
        choices: ROLE_MENU_CHOICES
      });

      if (action === BACK) {
        return;
      }

      switch (action) {
        case 'list':
          await handleListRoles(project);
          break;
        case 'view':
          await handleViewRole(project);
          break;
        case 'create':
          await handleCreateRole(project);
          break;
        case 'edit-permissions':
          await handleEditRolePermissions(project);
          break;
        case 'delete':
          await handleDeleteRole(project);
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
 * Handle list roles action
 * @param {object} project - The current project
 * @returns {Promise<void>}
 */
async function handleListRoles(project) {
  try {
    const roles = await listRoles(project);

    if (roles.length === 0) {
      console.log(chalk.yellow('No custom roles found.'));
      return;
    }

    console.log();
    console.log(chalk.cyan(`Roles in "${project.name}"`));
    console.log();

    for (const role of roles) {
      const summary = getRoleSummary(role);
      const adminBadge = role.isAdmin ? chalk.red(' [admin]') : '';
      console.log(`  ${chalk.bold(role.label)}${adminBadge} (${role.id})`);
      console.log(`    Permissions: ${summary.totalPermissions} total (${summary.contentPermissions} content, ${summary.otherPermissions} other)`);
    }

    console.log();
    console.log(`Total: ${roles.length} role(s)`);
    console.log();
  } catch (error) {
    console.log(chalk.red(`Error listing roles: ${error.message}`));
  }
}

/**
 * Handle view role action
 * @param {object} project - The current project
 * @returns {Promise<void>}
 */
async function handleViewRole(project) {
  try {
    const roles = await listRoles(project);

    if (roles.length === 0) {
      console.log(chalk.yellow('No custom roles found.'));
      return;
    }

    const choices = getRoleChoices(roles);
    const roleId = await selectWithBack({
      message: 'Select role:',
      choices
    });

    if (roleId === BACK) {
      return;
    }

    const role = await loadRole(project, roleId);
    if (!role) {
      console.log(chalk.red(`Role not found: ${roleId}`));
      return;
    }

    const summary = getRoleSummary(role);
    const contentPerms = getRoleContentPermissions(role);
    const otherPerms = getRoleOtherPermissions(role);

    console.log();
    console.log(chalk.cyan(`Role: ${role.label} (${role.id})`));
    console.log();

    if (role.isAdmin) {
      console.log(chalk.red('  This is an admin role - has all permissions'));
    }

    console.log(`  Weight: ${role.weight}`);
    console.log(`  Total permissions: ${summary.totalPermissions}`);
    console.log();

    // Show content permissions by entity type
    if (Object.keys(contentPerms).length > 0) {
      console.log(chalk.cyan('  Content Permissions:'));
      for (const [entityType, bundles] of Object.entries(contentPerms)) {
        for (const [bundle, perms] of Object.entries(bundles)) {
          const permList = perms.map(p => p.short).join(', ');
          console.log(`    ${entityType} > ${bundle}: ${permList}`);
        }
      }
      console.log();
    }

    // Show other permissions
    if (otherPerms.length > 0) {
      console.log(chalk.cyan('  Other Permissions:'));
      for (const perm of otherPerms.slice(0, 10)) {
        console.log(`    - ${perm}`);
      }
      if (otherPerms.length > 10) {
        console.log(`    ... and ${otherPerms.length - 10} more`);
      }
      console.log();
    }
  } catch (error) {
    if (error.name === 'ExitPromptError') {
      return;
    }
    console.log(chalk.red(`Error: ${error.message}`));
  }
}

/**
 * Handle create role action
 * @param {object} project - The current project
 * @returns {Promise<void>}
 */
async function handleCreateRole(project) {
  try {
    const label = await input({
      message: 'Role label?',
      validate: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Label is required';
        }
        return true;
      }
    });

    const suggestedId = generateRoleMachineName(label);
    const roles = await listRoles(project);
    const existingIds = roles.map(r => r.id);

    const id = await input({
      message: 'Machine name?',
      default: suggestedId,
      validate: (value) => validateRoleMachineName(value, existingIds)
    });

    const isAdmin = await select({
      message: 'Is this an admin role?',
      choices: [
        { value: false, name: 'No' },
        { value: true, name: 'Yes (has all permissions)' }
      ]
    });

    const role = await createRole(project, { label: label.trim(), id, isAdmin });

    console.log();
    console.log(chalk.green(`Role "${role.label}" created successfully!`));
    console.log(chalk.cyan(`Machine name: ${role.id}`));
    console.log();
  } catch (error) {
    if (error.name === 'ExitPromptError') {
      return;
    }
    console.log(chalk.red(`Error: ${error.message}`));
  }
}

/**
 * Handle edit role permissions action
 * @param {object} project - The current project
 * @returns {Promise<void>}
 */
async function handleEditRolePermissions(project) {
  // Initial role selection outside the loop
  let roles;
  let role;

  try {
    roles = await listRoles(project);

    if (roles.length === 0) {
      console.log(chalk.yellow('No custom roles found.'));
      return;
    }

    const choices = getRoleChoices(roles);
    const roleId = await selectWithBack({
      message: 'Select role:',
      choices
    });

    if (roleId === BACK) {
      return;
    }

    role = await loadRole(project, roleId);
    if (!role) {
      console.log(chalk.red(`Role not found: ${roleId}`));
      return;
    }
  } catch (error) {
    if (error.name === 'ExitPromptError') {
      return;
    }
    console.log(chalk.red(`Error: ${error.message}`));
    return;
  }

  // Show permission editing submenu - errors here stay in the loop
  while (true) {
    try {
      const action = await selectWithBack({
        message: `Permissions for ${role.label}`,
        choices: [
          { value: 'add-bundle', name: 'Add permissions for a bundle' },
          { value: 'add-all-bundles', name: 'Add permissions for all bundles' },
          { value: 'remove-bundle', name: 'Remove permissions for a bundle' },
          { value: 'add-custom', name: 'Add custom permission' },
          { value: 'remove-custom', name: 'Remove a permission' },
          { value: 'view', name: 'View current permissions' },
          { value: 'back', name: 'Back' }
        ]
      });

      if (action === BACK || action === 'back') {
        return;
      }

      switch (action) {
        case 'add-bundle': {
          const result = await handleAddBundlePermissions(project, role);
          if (result) {
            role = result;
          }
          break;
        }

        case 'add-all-bundles': {
          const result = await handleAddAllBundlesPermissions(project, role);
          if (result) {
            role = result;
          }
          break;
        }

        case 'remove-bundle': {
          const result = await handleRemoveBundlePermissions(project, role);
          if (result) {
            role = result;
          }
          break;
        }

        case 'add-custom': {
          const perm = await input({
            message: 'Permission string:',
            validate: (value) => {
              if (!value || value.trim().length === 0) {
                return 'Permission is required';
              }
              return true;
            }
          });

          role = addPermissionsToRole(role, [perm.trim()]);
          await saveRole(project, role);
          console.log(chalk.green('Permission added.'));
          break;
        }

        case 'remove-custom': {
          if (!role.permissions || role.permissions.length === 0) {
            console.log(chalk.yellow('No permissions to remove.'));
            break;
          }

          const permToRemove = await selectWithBack({
            message: 'Select permission to remove:',
            choices: role.permissions.map(p => ({ value: p, name: p }))
          });

          if (permToRemove !== BACK) {
            role = removePermissionsFromRole(role, [permToRemove]);
            await saveRole(project, role);
            console.log(chalk.green('Permission removed.'));
          }
          break;
        }

        case 'view': {
          const summary = getRoleSummary(role);
          console.log();
          console.log(chalk.cyan(`Permissions for ${role.label}: ${summary.totalPermissions} total`));
          for (const perm of role.permissions || []) {
            console.log(`  - ${perm}`);
          }
          console.log();
          break;
        }
      }
    } catch (error) {
      if (error.name === 'ExitPromptError') {
        return;
      }
      console.log(chalk.red(`Error: ${error.message}`));
      // Continue the loop - stay in the role's permission menu
    }
  }
}

/**
 * Handle adding bundle permissions to a role
 * @param {object} project - The current project
 * @param {object} role - Role object
 * @returns {Promise<object|null>} - Updated role or null
 */
async function handleAddBundlePermissions(project, role) {
  try {
    // Select entity type
    const entityTypes = Object.keys(project.entities || {}).filter(
      type => type !== 'paragraph' && Object.keys(project.entities[type]).length > 0
    );

    if (entityTypes.length === 0) {
      console.log(chalk.yellow('No entities found. Sync the project first.'));
      return null;
    }

    const entityChoices = entityTypes.map(type => ({
      value: type,
      name: `${type} (${Object.keys(project.entities[type]).length} bundles)`
    }));

    const entityType = await selectWithBack({
      message: 'Select entity type:',
      choices: entityChoices
    });

    if (entityType === BACK) {
      return null;
    }

    // Select bundle
    const bundles = project.entities[entityType];
    const bundleEntries = Object.entries(bundles)
      .sort(([, a], [, b]) => (a.label || '').localeCompare(b.label || ''))
      .map(([id, bundle]) => ({
        value: id,
        name: `${bundle.label || id} (${id})`
      }));

    const selectedBundle = await selectWithBack({
      message: 'Select bundle:',
      choices: bundleEntries
    });

    if (selectedBundle === BACK) {
      return null;
    }

    // Get permissions for this bundle
    const permChoices = getPermissionChoices(entityType, selectedBundle, role.permissions);

    if (permChoices.length === 0) {
      console.log(chalk.yellow('No permissions available for this bundle.'));
      return null;
    }

    const selectedPerms = await checkbox({
      message: 'Select permissions:',
      choices: permChoices
    });

    if (selectedPerms.length === 0) {
      return null;
    }

    const updated = setRoleBundlePermissions(role, entityType, selectedBundle, selectedPerms);
    await saveRole(project, updated);
    console.log(chalk.green(`Set ${selectedPerms.length} permission(s) for ${entityType} > ${selectedBundle}.`));
    return updated;
  } catch (error) {
    if (error.name === 'ExitPromptError') {
      return null;
    }
    throw error;
  }
}

/**
 * Handle adding permissions for all bundles of an entity type
 * @param {object} project - The current project
 * @param {object} role - Role object
 * @returns {Promise<object|null>} - Updated role or null
 */
async function handleAddAllBundlesPermissions(project, role) {
  try {
    // Select entity type
    const entityTypes = Object.keys(project.entities || {}).filter(
      type => type !== 'paragraph' && Object.keys(project.entities[type]).length > 0
    );

    if (entityTypes.length === 0) {
      console.log(chalk.yellow('No entities found. Sync the project first.'));
      return null;
    }

    const entityChoices = entityTypes.map(type => ({
      value: type,
      name: `${type} (${Object.keys(project.entities[type]).length} bundles)`
    }));

    const entityType = await selectWithBack({
      message: 'Select entity type:',
      choices: entityChoices
    });

    if (entityType === BACK) {
      return null;
    }

    // Get all bundles for this entity type
    const bundles = Object.keys(project.entities[entityType]);

    if (bundles.length === 0) {
      console.log(chalk.yellow('No bundles found for this entity type.'));
      return null;
    }

    // Get permission templates for this entity type (use first bundle as template)
    const permTemplates = getPermissionsForBundle(entityType, bundles[0]);

    if (permTemplates.length === 0) {
      console.log(chalk.yellow('No permissions available for this entity type.'));
      return null;
    }

    // Let user select which permission types to apply
    const permChoices = permTemplates.map(p => ({
      value: p.short,
      name: p.label,
      checked: false
    }));

    console.log();
    console.log(chalk.cyan(`Select permissions to add for all ${bundles.length} ${entityType} bundles:`));

    const selectedShorts = await checkbox({
      message: 'Select permission types:',
      choices: permChoices
    });

    if (selectedShorts.length === 0) {
      return null;
    }

    // Generate all permissions for all bundles
    const allPermissions = [];
    for (const bundle of bundles) {
      const bundlePerms = getPermissionsForBundle(entityType, bundle);
      for (const perm of bundlePerms) {
        if (selectedShorts.includes(perm.short)) {
          allPermissions.push(perm.key);
        }
      }
    }

    // Add all permissions to role
    const updated = addPermissionsToRole(role, allPermissions);
    await saveRole(project, updated);

    console.log(chalk.green(`Added ${allPermissions.length} permission(s) across ${bundles.length} ${entityType} bundles.`));
    return updated;
  } catch (error) {
    if (error.name === 'ExitPromptError') {
      return null;
    }
    throw error;
  }
}

/**
 * Handle removing bundle permissions from a role
 * @param {object} project - The current project
 * @param {object} role - Role object
 * @returns {Promise<object|null>} - Updated role or null
 */
async function handleRemoveBundlePermissions(project, role) {
  try {
    const contentPerms = getRoleContentPermissions(role);

    if (Object.keys(contentPerms).length === 0) {
      console.log(chalk.yellow('No bundle permissions to remove.'));
      return null;
    }

    // Build choices from current content permissions
    const bundleChoices = [];
    for (const [entityType, bundles] of Object.entries(contentPerms)) {
      for (const [bundle, perms] of Object.entries(bundles)) {
        bundleChoices.push({
          value: `${entityType}:${bundle}`,
          name: `${entityType} > ${bundle} (${perms.length} permissions)`
        });
      }
    }

    const selected = await selectWithBack({
      message: 'Select bundle to remove permissions from:',
      choices: bundleChoices
    });

    if (selected === BACK) {
      return null;
    }

    const [entityType, bundle] = selected.split(':');

    const confirm = await selectWithBack({
      message: `Remove all permissions for ${entityType} > ${bundle}?`,
      choices: [
        { value: false, name: 'No, cancel' },
        { value: true, name: 'Yes, remove' }
      ]
    });

    if (confirm === BACK || !confirm) {
      return null;
    }

    const bundlePerms = getPermissionsForBundle(entityType, bundle).map(p => p.key);
    const updated = removePermissionsFromRole(role, bundlePerms);
    await saveRole(project, updated);
    console.log(chalk.green(`Removed permissions for ${entityType} > ${bundle}.`));
    return updated;
  } catch (error) {
    if (error.name === 'ExitPromptError') {
      return null;
    }
    throw error;
  }
}

/**
 * Handle delete role action
 * @param {object} project - The current project
 * @returns {Promise<void>}
 */
async function handleDeleteRole(project) {
  try {
    const roles = await listRoles(project);

    if (roles.length === 0) {
      console.log(chalk.yellow('No custom roles found.'));
      return;
    }

    const choices = getRoleChoices(roles);
    const roleId = await selectWithBack({
      message: 'Select role to delete:',
      choices
    });

    if (roleId === BACK) {
      return;
    }

    const role = roles.find(r => r.id === roleId);

    const confirm = await selectWithBack({
      message: `Delete role "${role.label}"? This cannot be undone.`,
      choices: [
        { value: false, name: 'No, cancel' },
        { value: true, name: 'Yes, delete' }
      ]
    });

    if (confirm === BACK || !confirm) {
      return;
    }

    await deleteRole(project, roleId);
    console.log(chalk.green(`Role "${role.label}" deleted.`));
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
async function handleDrushSync(project) {
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
 * Handle manage stories action
 * @param {object} project - The current project
 * @returns {Promise<void>}
 */
async function handleManageStories(project) {
  try {
    while (true) {
      const stories = await listStories(project);

      const choices = [
        { value: '__create__', name: chalk.green('+ Create new story') }
      ];

      for (const story of stories) {
        const date = new Date(story.updatedAt).toLocaleDateString();
        const status = story.status === 'exported' ? chalk.green('exported') : chalk.yellow(story.status);
        choices.push({
          value: story.machineName,
          name: `${story.label} (${story.entityType}) [${status}] - ${story.fieldCount} fields - ${date}`
        });
      }

      choices.push({ value: '__back__', name: 'Back' });

      const choice = await select({
        message: 'Manage Stories',
        choices
      });

      if (choice === '__back__') {
        return;
      }

      if (choice === '__create__') {
        await handleCreateStory(project);
      } else {
        const story = await loadStory(project, choice);
        if (story) {
          await handleEditStory(project, story);
        }
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
 * Handle create story action
 * @param {object} project - The current project
 * @returns {Promise<void>}
 */
async function handleCreateStory(project) {
  try {
    // Select entity type
    const entityType = await select({
      message: 'Select entity type:',
      choices: ENTITY_TYPE_CHOICES
    });

    // Enter bundle label
    const label = await input({
      message: 'Bundle label (human-readable name)?',
      validate: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Label is required';
        }
        return true;
      }
    });

    // Generate and confirm machine name
    const suggestedMachineName = generateMachineName(label);
    const machineName = await input({
      message: 'Machine name?',
      default: suggestedMachineName,
      validate: async (value) => {
        if (!value || value.trim().length === 0) {
          return 'Machine name is required';
        }
        if (!/^[a-z][a-z0-9_]*$/.test(value)) {
          return 'Machine name must contain only lowercase letters, numbers, and underscores';
        }
        if (await storyExists(project, value)) {
          return `A story for "${value}" already exists`;
        }
        return true;
      }
    });

    // Enter purpose
    const purpose = await input({
      message: 'Purpose (So that I can...)?',
      default: ''
    });

    // Create story
    const story = createEmptyStory(entityType, label, machineName);
    story.purpose = purpose;

    await saveStory(project, story);

    console.log();
    console.log(chalk.green(`Story "${label}" created!`));
    console.log();

    // Go to edit menu
    await handleEditStory(project, story);
  } catch (error) {
    if (error.name === 'ExitPromptError') {
      return;
    }
    console.log(chalk.red(`Error: ${error.message}`));
  }
}

/**
 * Handle edit story action
 * @param {object} project - The current project
 * @param {object} story - The story to edit
 * @returns {Promise<void>}
 */
async function handleEditStory(project, story) {
  try {
    let currentStory = story;

    while (true) {
      const fieldCount = currentStory.fields?.length || 0;
      const hasPermissions = Object.keys(currentStory.permissions || {}).length > 0;

      const choices = [
        { value: 'edit-bundle', name: `Edit bundle info (${currentStory.bundle.label})` },
        { value: 'edit-purpose', name: `Edit purpose${currentStory.purpose ? '' : chalk.yellow(' (not set)')}` },
        { value: 'manage-fields', name: `Manage fields (${fieldCount} fields)` },
        { value: 'edit-permissions', name: `Edit permissions${hasPermissions ? '' : chalk.yellow(' (not set)')}` },
        { value: 'preview', name: 'Preview markdown' },
        { value: 'export', name: chalk.green('Export to markdown') },
        { value: 'delete', name: chalk.red('Delete story') },
        { value: 'back', name: 'Back' }
      ];

      const choice = await select({
        message: `Editing: ${currentStory.bundle.label}`,
        choices
      });

      switch (choice) {
        case 'edit-bundle':
          currentStory = await handleEditStoryBundle(project, currentStory);
          break;
        case 'edit-purpose':
          currentStory = await handleEditStoryPurpose(project, currentStory);
          break;
        case 'manage-fields':
          currentStory = await handleManageStoryFields(project, currentStory);
          break;
        case 'edit-permissions':
          currentStory = await handleEditStoryPermissions(project, currentStory);
          break;
        case 'preview':
          await handlePreviewStory(currentStory);
          break;
        case 'export':
          await handleExportStory(project, currentStory);
          break;
        case 'delete': {
          const deleted = await handleDeleteStory(project, currentStory);
          if (deleted) return;
          break;
        }
        case 'back':
          return;
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
 * Handle edit story bundle info
 * @param {object} project - The current project
 * @param {object} story - The story to edit
 * @returns {Promise<object>} - Updated story
 */
async function handleEditStoryBundle(project, story) {
  try {
    const label = await input({
      message: 'Bundle label?',
      default: story.bundle.label,
      validate: (value) => value?.trim().length > 0 || 'Label is required'
    });

    const description = await input({
      message: 'Description?',
      default: story.bundle.description || ''
    });

    const updatedStory = updateStoryBundleInfo(story, { label, description });
    await saveStory(project, updatedStory);

    console.log(chalk.green('Bundle info updated!'));
    return updatedStory;
  } catch (error) {
    if (error.name === 'ExitPromptError') {
      return story;
    }
    throw error;
  }
}

/**
 * Handle edit story purpose
 * @param {object} project - The current project
 * @param {object} story - The story to edit
 * @returns {Promise<object>} - Updated story
 */
async function handleEditStoryPurpose(project, story) {
  try {
    const purpose = await input({
      message: 'Purpose (So that I can...)?',
      default: story.purpose || ''
    });

    const updatedStory = updateStoryPurpose(story, purpose);
    await saveStory(project, updatedStory);

    console.log(chalk.green('Purpose updated!'));
    return updatedStory;
  } catch (error) {
    if (error.name === 'ExitPromptError') {
      return story;
    }
    throw error;
  }
}

/**
 * Handle manage story fields
 * @param {object} project - The current project
 * @param {object} story - The story to edit
 * @returns {Promise<object>} - Updated story
 */
async function handleManageStoryFields(project, story) {
  try {
    let currentStory = story;

    while (true) {
      const choices = [
        { value: '__add__', name: chalk.green('+ Add field') }
      ];

      for (let i = 0; i < currentStory.fields.length; i++) {
        const field = currentStory.fields[i];
        choices.push({
          value: i,
          name: `${field.label} (${field.type})${field.required ? ' *' : ''}`
        });
      }

      choices.push({ value: '__back__', name: 'Back' });

      const choice = await select({
        message: `Fields (${currentStory.fields.length})`,
        choices
      });

      if (choice === '__back__') {
        return currentStory;
      }

      if (choice === '__add__') {
        currentStory = await handleAddStoryField(project, currentStory);
      } else {
        currentStory = await handleEditStoryField(project, currentStory, choice);
      }
    }
  } catch (error) {
    if (error.name === 'ExitPromptError') {
      return story;
    }
    throw error;
  }
}

/**
 * Handle add story field
 * @param {object} project - The current project
 * @param {object} story - The story to edit
 * @returns {Promise<object>} - Updated story
 */
async function handleAddStoryField(project, story) {
  try {
    // Select field type
    const fieldType = await select({
      message: 'Select field type:',
      choices: FIELD_TYPES
    });

    // Enter field label
    const label = await input({
      message: 'Field label?',
      validate: (value) => value?.trim().length > 0 || 'Label is required'
    });

    // Generate and confirm field name
    const suggestedFieldName = generateFieldName(story.entityType, label);
    const fieldName = await input({
      message: 'Field machine name?',
      default: suggestedFieldName,
      validate: validateFieldMachineName
    });

    // Enter description/help text
    const description = await input({
      message: 'Description/help text (optional)?',
      default: ''
    });

    // Required?
    const required = await select({
      message: 'Required?',
      choices: [
        { value: false, name: 'No' },
        { value: true, name: 'Yes' }
      ]
    });

    // Cardinality
    const cardinality = await select({
      message: 'Cardinality?',
      choices: [
        { value: 1, name: 'Single value' },
        { value: -1, name: 'Unlimited' }
      ]
    });

    // Type-specific settings
    const settings = await getTypeSpecificSettings(fieldType, project);

    const field = {
      label,
      name: fieldName,
      type: fieldType,
      description,
      required,
      cardinality,
      settings
    };

    const updatedStory = addFieldToStory(story, field);
    await saveStory(project, updatedStory);

    console.log(chalk.green(`Field "${label}" added!`));
    return updatedStory;
  } catch (error) {
    if (error.name === 'ExitPromptError') {
      return story;
    }
    throw error;
  }
}

/**
 * Handle edit story field
 * @param {object} project - The current project
 * @param {object} story - The story to edit
 * @param {number} fieldIndex - Field index
 * @returns {Promise<object>} - Updated story
 */
async function handleEditStoryField(project, story, fieldIndex) {
  try {
    const field = story.fields[fieldIndex];

    const choice = await select({
      message: `Field: ${field.label}`,
      choices: [
        { value: 'edit', name: 'Edit field' },
        { value: 'move-up', name: 'Move up', disabled: fieldIndex === 0 },
        { value: 'move-down', name: 'Move down', disabled: fieldIndex === story.fields.length - 1 },
        { value: 'delete', name: chalk.red('Delete field') },
        { value: 'back', name: 'Back' }
      ]
    });

    switch (choice) {
      case 'edit': {
        const label = await input({
          message: 'Field label?',
          default: field.label,
          validate: (value) => value?.trim().length > 0 || 'Label is required'
        });

        const description = await input({
          message: 'Description/help text?',
          default: field.description || ''
        });

        const required = await select({
          message: 'Required?',
          choices: [
            { value: false, name: 'No' },
            { value: true, name: 'Yes' }
          ],
          default: field.required ? 1 : 0
        });

        const updatedField = { ...field, label, description, required };
        const updatedStory = updateFieldInStory(story, fieldIndex, updatedField);
        await saveStory(project, updatedStory);

        console.log(chalk.green('Field updated!'));
        return updatedStory;
      }

      case 'move-up': {
        const fields = [...story.fields];
        [fields[fieldIndex - 1], fields[fieldIndex]] = [fields[fieldIndex], fields[fieldIndex - 1]];
        const updatedStory = { ...story, fields };
        await saveStory(project, updatedStory);
        return updatedStory;
      }

      case 'move-down': {
        const fields = [...story.fields];
        [fields[fieldIndex], fields[fieldIndex + 1]] = [fields[fieldIndex + 1], fields[fieldIndex]];
        const updatedStory = { ...story, fields };
        await saveStory(project, updatedStory);
        return updatedStory;
      }

      case 'delete': {
        const confirm = await select({
          message: `Delete field "${field.label}"?`,
          choices: [
            { value: false, name: 'No, keep it' },
            { value: true, name: 'Yes, delete it' }
          ]
        });

        if (confirm) {
          const updatedStory = removeFieldFromStory(story, fieldIndex);
          await saveStory(project, updatedStory);
          console.log(chalk.green('Field deleted!'));
          return updatedStory;
        }
        return story;
      }

      default:
        return story;
    }
  } catch (error) {
    if (error.name === 'ExitPromptError') {
      return story;
    }
    throw error;
  }
}

/**
 * Handle edit story permissions
 * @param {object} project - The current project
 * @param {object} story - The story to edit
 * @returns {Promise<object>} - Updated story
 */
async function handleEditStoryPermissions(project, story) {
  try {
    // Get roles from project
    const roles = await listRoles(project);

    if (roles.length === 0) {
      console.log(chalk.yellow('No roles found in project. Sync the project first.'));
      return story;
    }

    // Select roles to include
    const roleChoices = roles.map(r => ({
      value: r.id,
      name: r.label,
      checked: story.permissions?.[r.id] !== undefined
    }));

    const selectedRoles = await checkbox({
      message: 'Select roles to include in permissions table:',
      choices: roleChoices
    });

    if (selectedRoles.length === 0) {
      console.log(chalk.yellow('No roles selected.'));
      return story;
    }

    // For each role, select permissions
    const permissions = {};
    const roleLabels = {};

    const permissionOptions = [
      { value: 'create', name: 'Create new content' },
      { value: 'edit_own', name: 'Edit own content' },
      { value: 'edit_any', name: 'Edit any content' },
      { value: 'delete_own', name: 'Delete own content' },
      { value: 'delete_any', name: 'Delete any content' }
    ];

    for (const roleId of selectedRoles) {
      const role = roles.find(r => r.id === roleId);
      roleLabels[roleId] = role?.label || roleId;

      const existingPerms = story.permissions?.[roleId] || {};

      const permChoices = permissionOptions.map(p => ({
        value: p.value,
        name: p.name,
        checked: existingPerms[p.value] === true
      }));

      const selectedPerms = await checkbox({
        message: `Permissions for ${role?.label || roleId}:`,
        choices: permChoices
      });

      permissions[roleId] = {};
      for (const opt of permissionOptions) {
        permissions[roleId][opt.value] = selectedPerms.includes(opt.value);
      }
    }

    const updatedStory = updateStoryPermissions(story, permissions, roleLabels);
    await saveStory(project, updatedStory);

    console.log(chalk.green('Permissions updated!'));
    return updatedStory;
  } catch (error) {
    if (error.name === 'ExitPromptError') {
      return story;
    }
    throw error;
  }
}

/**
 * Handle preview story
 * @param {object} story - The story to preview
 * @returns {Promise<void>}
 */
async function handlePreviewStory(story) {
  const { generateFullStory } = await import('../generators/storyGenerator.js');
  const markdown = generateFullStory(story);

  console.log();
  console.log(chalk.cyan('='.repeat(60)));
  console.log(markdown);
  console.log(chalk.cyan('='.repeat(60)));
  console.log();

  await input({ message: 'Press Enter to continue...' });
}

/**
 * Handle export story to markdown
 * @param {object} project - The current project
 * @param {object} story - The story to export
 * @returns {Promise<void>}
 */
async function handleExportStory(project, story) {
  try {
    const path = await exportStoryToMarkdown(project, story);
    console.log();
    console.log(chalk.green('Story exported to:'));
    console.log(chalk.cyan(path));
    console.log();
  } catch (error) {
    console.log(chalk.red(`Error exporting: ${error.message}`));
  }
}

/**
 * Handle delete story
 * @param {object} project - The current project
 * @param {object} story - The story to delete
 * @returns {Promise<boolean>} - True if deleted
 */
async function handleDeleteStory(project, story) {
  try {
    const confirm = await select({
      message: `Delete story "${story.bundle.label}"? This cannot be undone.`,
      choices: [
        { value: false, name: 'No, keep it' },
        { value: true, name: 'Yes, delete it' }
      ]
    });

    if (confirm) {
      await deleteStory(project, story.bundle.machineName);
      console.log(chalk.green('Story deleted!'));
      return true;
    }

    return false;
  } catch (error) {
    if (error.name === 'ExitPromptError') {
      return false;
    }
    throw error;
  }
}
