/**
 * Story Menu Handlers
 * Handles story management menu actions.
 */

import { select, input, checkbox } from '@inquirer/prompts';
import chalk from 'chalk';

import { ENTITY_TYPE_CHOICES, getTypeSpecificSettings } from './contentMenus.js';
import { validateFieldMachineName } from '../../commands/create.js';
import { generateMachineName } from '../../generators/bundleGenerator.js';
import { generateFieldName, FIELD_TYPES } from '../../generators/fieldGenerator.js';
import { listRoles } from '../../commands/role.js';
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
} from '../../commands/story.js';
import { createEmptyStory } from '../../generators/storyGenerator.js';

/**
 * Handle manage stories action
 * @param {object} project - The current project
 * @returns {Promise<void>}
 */
export async function handleManageStories(project) {
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
export async function handleCreateStory(project) {
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
export async function handleEditStory(project, story) {
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
export async function handleEditStoryBundle(project, story) {
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
export async function handleEditStoryPurpose(project, story) {
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
export async function handleManageStoryFields(project, story) {
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
export async function handleAddStoryField(project, story) {
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
export async function handleEditStoryField(project, story, fieldIndex) {
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
export async function handleEditStoryPermissions(project, story) {
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
export async function handlePreviewStory(story) {
  const { generateFullStory } = await import('../../generators/storyGenerator.js');
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
export async function handleExportStory(project, story) {
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
export async function handleDeleteStory(project, story) {
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
