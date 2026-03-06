/**
 * Form Display Menu Handlers
 * Handles form display editing menu actions.
 */

import { select, input, checkbox, search } from '@inquirer/prompts';
import sortableCheckbox from 'inquirer-sortable-checkbox';
import chalk from 'chalk';
import { selectWithBack, BACK } from '../selectWithBack.js';

import { getBundleSummary } from '../../commands/list.js';
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
} from '../../commands/formDisplay.js';
import { FIELD_GROUP_FORMATS, getDefaultFormatSettings } from '../../generators/formDisplayGenerator.js';
import { generateGroupName, validateGroupName } from '../../parsers/formDisplayParser.js';

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
export async function handleEditFormDisplay(project) {
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
export async function showFormDisplayMenu(project, formDisplay) {
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
export async function handleReorderFields(formDisplay) {
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
export async function handleMoveField(formDisplay) {
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
export async function handleCreateGroup(formDisplay) {
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
export async function handleEditGroup(formDisplay) {
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
export async function handleDeleteGroup(formDisplay) {
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
export async function handleToggleVisibility(project, formDisplay) {
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
export async function handleConfigureField(project, formDisplay) {
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
export async function handleResetFormDisplay(project, formDisplay) {
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
