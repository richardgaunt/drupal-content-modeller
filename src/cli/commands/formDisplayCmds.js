/**
 * Form Display Commands
 */

import chalk from 'chalk';
import { loadProject } from '../../commands/project.js';
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
} from '../../commands/formDisplay.js';
import {
  getWidgetsForFieldType,
  FIELD_WIDGETS
} from '../../constants/fieldWidgets.js';
import { generateGroupName } from '../../parsers/formDisplayParser.js';
import {
  output,
  handleError,
  logSuccess,
  isValidEntityType,
  VALID_ENTITY_TYPES,
  autoSyncProject
} from '../cliUtils.js';

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
    logSuccess(options.project);
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
    logSuccess(options.project);
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
    logSuccess(options.project);
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
    logSuccess(options.project);
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
    logSuccess(options.project);
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
    logSuccess(options.project);
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
    logSuccess(options.project);
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
    logSuccess(options.project);
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
    logSuccess(options.project);
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
    logSuccess(options.project);
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
    logSuccess(options.project);
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
    logSuccess(options.project);
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
