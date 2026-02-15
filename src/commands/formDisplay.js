/**
 * Form Display Commands - Orchestration layer
 * Combines I/O with pure functions for form display operations.
 */

import {
  readFormDisplay,
  formDisplayExists,
  getFormDisplayPath,
  readFieldInstance,
  getFormDisplayPathWithMode,
  listFormDisplayModes
} from '../io/configReader.js';
import { writeYamlFile } from '../io/fileSystem.js';
import {
  generateFormDisplay,
  createNewGroup,
  addChildToGroup,
  removeChildFromGroup
} from '../generators/formDisplayGenerator.js';
import {
  buildFormDisplayTree,
  formatTreeForDisplay,
  findFieldParentGroup,
  getGroupChoices,
  getFieldChoices,
  generateGroupName
} from '../parsers/formDisplayParser.js';
import {
  getDefaultWidget,
  getWidgetsForFieldType,
  getWidgetByType
} from '../constants/fieldWidgets.js';
import {
  isBaseField,
  getBaseFieldConfig
} from '../constants/baseFields.js';

/**
 * Load form display for a bundle
 * @param {object} project - Project object with configDirectory
 * @param {string} entityType - Entity type
 * @param {string} bundle - Bundle name
 * @returns {Promise<object|null>} - Form display data or null
 */
export async function loadFormDisplay(project, entityType, bundle) {
  const configPath = project.configDirectory;

  if (!formDisplayExists(configPath, entityType, bundle)) {
    return null;
  }

  return readFormDisplay(configPath, entityType, bundle);
}

/**
 * Check if form display exists for a bundle
 * @param {object} project - Project object with configDirectory
 * @param {string} entityType - Entity type
 * @param {string} bundle - Bundle name
 * @returns {boolean} - True if exists
 */
export function hasFormDisplay(project, entityType, bundle) {
  return formDisplayExists(project.configDirectory, entityType, bundle);
}

/**
 * Save form display to config directory
 * @param {object} project - Project object with configDirectory
 * @param {object} formDisplay - Form display data
 * @returns {Promise<void>}
 */
export async function saveFormDisplay(project, formDisplay) {
  const { entityType, bundle } = formDisplay;
  const filePath = getFormDisplayPath(project.configDirectory, entityType, bundle);
  const yamlContent = generateFormDisplay(formDisplay);
  await writeYamlFile(filePath, yamlContent);
}

/**
 * Get display tree for console output
 * @param {object} formDisplay - Form display data
 * @returns {string} - Formatted tree string
 */
export function getFormDisplayTree(formDisplay) {
  const tree = buildFormDisplayTree(
    formDisplay.groups,
    formDisplay.fields,
    formDisplay.hidden
  );
  return formatTreeForDisplay(tree, formDisplay.entityType, formDisplay.bundle);
}

/**
 * Reorder children within a group
 * - Both fields and groups use weights for ordering
 * - The children array in a group lists members but weight determines order
 * @param {object} formDisplay - Form display data
 * @param {string} groupName - Group name ('' for root level)
 * @param {string[]} newOrder - New order of child names
 * @returns {object} - Updated form display
 */
export function reorderGroupChildren(formDisplay, groupName, newOrder) {
  const { groups, fields } = formDisplay;

  // Build weight map for all items in the new order
  const weightMap = new Map();
  newOrder.forEach((name, index) => {
    weightMap.set(name, index);
  });

  if (groupName === '') {
    // Reordering at root level
    // - Update weights for root-level groups
    // - Update weights for ungrouped fields
    const updatedFields = fields.map(field => {
      if (weightMap.has(field.name)) {
        return { ...field, weight: weightMap.get(field.name) };
      }
      return field;
    });

    const updatedGroups = groups.map(group => {
      if (weightMap.has(group.name)) {
        return { ...group, weight: weightMap.get(group.name) };
      }
      return group;
    });

    return {
      ...formDisplay,
      fields: updatedFields,
      groups: updatedGroups
    };
  }

  // Reordering within a group:
  // - Update children array to reflect new order
  // - Update weights for all items (both fields and nested groups)
  const updatedFields = fields.map(field => {
    if (weightMap.has(field.name)) {
      return { ...field, weight: weightMap.get(field.name) };
    }
    return field;
  });

  const updatedGroups = groups.map(group => {
    if (group.name === groupName) {
      // Update children array to reflect new order
      return { ...group, children: newOrder };
    }
    // Update weight of nested groups that are in the new order
    if (weightMap.has(group.name)) {
      return { ...group, weight: weightMap.get(group.name) };
    }
    return group;
  });

  return {
    ...formDisplay,
    fields: updatedFields,
    groups: updatedGroups
  };
}

/**
 * Move a field to a different group
 * @param {object} formDisplay - Form display data
 * @param {string} fieldName - Field name to move
 * @param {string} targetGroupName - Target group name ('' for root)
 * @returns {object} - Updated form display
 */
export function moveFieldToGroup(formDisplay, fieldName, targetGroupName) {
  const { groups } = formDisplay;

  // Find current parent group
  const currentParent = findFieldParentGroup(fieldName, groups);

  // If already in target group, no change needed
  if (currentParent === targetGroupName) {
    return formDisplay;
  }

  // Remove from current parent
  let updatedGroups = groups.map(group => {
    if (group.name === currentParent) {
      return removeChildFromGroup(group, fieldName);
    }
    return group;
  });

  // Add to new parent (if not root)
  if (targetGroupName !== '') {
    updatedGroups = updatedGroups.map(group => {
      if (group.name === targetGroupName) {
        return addChildToGroup(group, fieldName);
      }
      return group;
    });
  }

  return {
    ...formDisplay,
    groups: updatedGroups
  };
}

/**
 * Move a group to a different parent group
 * @param {object} formDisplay - Form display data
 * @param {string} groupNameToMove - Group name to move
 * @param {string} targetParentName - Target parent group name ('' for root)
 * @returns {object} - Updated form display
 */
export function moveGroupToParent(formDisplay, groupNameToMove, targetParentName) {
  const { groups } = formDisplay;

  // Find the group to move
  const groupToMove = groups.find(g => g.name === groupNameToMove);
  if (!groupToMove) {
    return formDisplay;
  }

  // Get current parent
  const currentParent = groupToMove.parentName || '';

  // If already in target parent, no change needed
  if (currentParent === targetParentName) {
    return formDisplay;
  }

  // Remove from current parent's children array
  let updatedGroups = groups.map(group => {
    if (group.name === currentParent) {
      return removeChildFromGroup(group, groupNameToMove);
    }
    return group;
  });

  // Update the group's parentName
  updatedGroups = updatedGroups.map(group => {
    if (group.name === groupNameToMove) {
      return { ...group, parentName: targetParentName };
    }
    return group;
  });

  // Add to new parent's children array (if not root)
  if (targetParentName !== '') {
    updatedGroups = updatedGroups.map(group => {
      if (group.name === targetParentName) {
        return addChildToGroup(group, groupNameToMove);
      }
      return group;
    });
  }

  return {
    ...formDisplay,
    groups: updatedGroups
  };
}

/**
 * Create a new field group
 * @param {object} formDisplay - Form display data
 * @param {object} groupConfig - Group configuration
 * @returns {object} - Updated form display
 */
export function createFieldGroup(formDisplay, groupConfig) {
  const { groups } = formDisplay;

  // Generate machine name from label if not provided
  const name = groupConfig.name || generateGroupName(groupConfig.label);

  // Create new group
  const newGroup = createNewGroup({
    ...groupConfig,
    name
  });

  // Add to groups array
  let updatedGroups = [...groups, newGroup];

  // If parent is specified, add to parent's children
  if (groupConfig.parentName) {
    updatedGroups = updatedGroups.map(group => {
      if (group.name === groupConfig.parentName) {
        return addChildToGroup(group, name);
      }
      return group;
    });
  }

  return {
    ...formDisplay,
    groups: updatedGroups
  };
}

/**
 * Delete a field group
 * @param {object} formDisplay - Form display data
 * @param {string} groupName - Group to delete
 * @param {boolean} moveChildrenToParent - If true, move children to parent; if false, move to root
 * @returns {object} - Updated form display
 */
export function deleteFieldGroup(formDisplay, groupName, moveChildrenToParent = true) {
  const { groups } = formDisplay;

  // Find the group to delete
  const groupToDelete = groups.find(g => g.name === groupName);
  if (!groupToDelete) {
    return formDisplay;
  }

  const children = groupToDelete.children || [];
  const parentName = groupToDelete.parentName || '';

  // Remove group from groups array
  let updatedGroups = groups.filter(g => g.name !== groupName);

  // Remove from parent's children
  if (parentName) {
    updatedGroups = updatedGroups.map(group => {
      if (group.name === parentName) {
        return removeChildFromGroup(group, groupName);
      }
      return group;
    });
  }

  // Handle orphaned children
  if (moveChildrenToParent && parentName) {
    // Add children to parent
    updatedGroups = updatedGroups.map(group => {
      if (group.name === parentName) {
        let updated = group;
        for (const child of children) {
          updated = addChildToGroup(updated, child);
        }
        return updated;
      }
      return group;
    });

    // Update child groups' parent_name
    updatedGroups = updatedGroups.map(group => {
      if (children.includes(group.name)) {
        return { ...group, parentName };
      }
      return group;
    });
  } else {
    // Move children to root
    updatedGroups = updatedGroups.map(group => {
      if (children.includes(group.name)) {
        return { ...group, parentName: '' };
      }
      return group;
    });
  }

  return {
    ...formDisplay,
    groups: updatedGroups
  };
}

/**
 * Update field group settings
 * @param {object} formDisplay - Form display data
 * @param {string} groupName - Group name to update
 * @param {object} updates - Properties to update
 * @returns {object} - Updated form display
 */
export function updateFieldGroup(formDisplay, groupName, updates) {
  const { groups } = formDisplay;

  const updatedGroups = groups.map(group => {
    if (group.name === groupName) {
      return {
        ...group,
        ...updates,
        // Merge format settings if provided
        formatSettings: updates.formatSettings
          ? { ...group.formatSettings, ...updates.formatSettings }
          : group.formatSettings
      };
    }
    return group;
  });

  return {
    ...formDisplay,
    groups: updatedGroups
  };
}

/**
 * Toggle field visibility (hidden/visible)
 * @param {object} formDisplay - Form display data
 * @param {string} fieldName - Field to toggle
 * @returns {object} - Updated form display
 */
export function toggleFieldVisibility(formDisplay, fieldName) {
  const { hidden } = formDisplay;

  if (hidden.includes(fieldName)) {
    // Make visible
    return {
      ...formDisplay,
      hidden: hidden.filter(f => f !== fieldName)
    };
  } else {
    // Hide field
    return {
      ...formDisplay,
      hidden: [...hidden, fieldName]
    };
  }
}

/**
 * Hide multiple fields
 * @param {object} formDisplay - Form display data
 * @param {string[]} fieldNames - Fields to hide
 * @returns {object} - Updated form display
 */
export function hideFields(formDisplay, fieldNames) {
  const { hidden } = formDisplay;
  const newHidden = new Set([...hidden, ...fieldNames]);

  return {
    ...formDisplay,
    hidden: Array.from(newHidden)
  };
}

/**
 * Show multiple fields (remove from hidden)
 * @param {object} formDisplay - Form display data
 * @param {string[]} fieldNames - Fields to show
 * @returns {object} - Updated form display
 */
export function showFields(formDisplay, fieldNames) {
  const { hidden } = formDisplay;
  const fieldsToShow = new Set(fieldNames);

  return {
    ...formDisplay,
    hidden: hidden.filter(f => !fieldsToShow.has(f))
  };
}

/**
 * Get available groups for selection
 * @param {object} formDisplay - Form display data
 * @returns {object[]} - Group choices for prompts
 */
export function getAvailableGroups(formDisplay) {
  return getGroupChoices(formDisplay.groups);
}

/**
 * Get visible fields for selection
 * @param {object} formDisplay - Form display data
 * @returns {object[]} - Field choices for prompts
 */
export function getVisibleFields(formDisplay) {
  return getFieldChoices(formDisplay.fields, formDisplay.hidden);
}

/**
 * Get hidden fields for selection
 * @param {object} formDisplay - Form display data
 * @returns {object[]} - Hidden field choices for prompts
 */
export function getHiddenFields(formDisplay) {
  return formDisplay.hidden.map(name => ({
    value: name,
    name
  }));
}

/**
 * Add fields to a group
 * @param {object} formDisplay - Form display data
 * @param {string} groupName - Target group name
 * @param {string[]} fieldNames - Fields to add
 * @returns {object} - Updated form display
 */
export function addFieldsToGroup(formDisplay, groupName, fieldNames) {
  let updated = formDisplay;

  for (const fieldName of fieldNames) {
    updated = moveFieldToGroup(updated, fieldName, groupName);
  }

  return updated;
}

/**
 * Get the next available weight for a field
 * @param {object[]} fields - Existing fields
 * @returns {number} - Next weight value
 */
export function getNextWeight(fields) {
  if (!fields || fields.length === 0) {
    return 0;
  }
  const maxWeight = Math.max(...fields.map(f => f.weight || 0));
  return maxWeight + 1;
}

/**
 * Show a hidden field with correct widget configuration
 * Checks for base fields first, then reads field instance config
 * @param {object} project - Project object with configDirectory
 * @param {object} formDisplay - Form display data
 * @param {string} fieldName - Field name to show
 * @returns {Promise<object>} - Updated form display
 */
export async function showHiddenField(project, formDisplay, fieldName) {
  const { entityType, bundle, hidden, fields } = formDisplay;

  // Check if field is actually hidden
  if (!hidden.includes(fieldName)) {
    throw new Error(`Field is not hidden: ${fieldName}`);
  }

  let widgetType;
  let widgetSettings;

  // Check if it's a base field first
  if (isBaseField(entityType, fieldName)) {
    const baseFieldConfig = getBaseFieldConfig(entityType, fieldName);
    widgetType = baseFieldConfig.widget;
    widgetSettings = baseFieldConfig.settings;
  } else {
    // Read field instance to get field type
    const fieldInstance = await readFieldInstance(
      project.configDirectory,
      entityType,
      bundle,
      fieldName
    );

    if (!fieldInstance) {
      throw new Error(`Field instance not found: ${fieldName}`);
    }

    // Get default widget for field type
    const defaultWidget = getDefaultWidget(fieldInstance.type);
    if (!defaultWidget) {
      throw new Error(`No widget found for field type: ${fieldInstance.type}`);
    }

    widgetType = defaultWidget.type;
    widgetSettings = defaultWidget.settings;
  }

  // Create new field entry with widget
  const newField = {
    name: fieldName,
    type: widgetType,
    weight: getNextWeight(fields),
    region: 'content',
    settings: { ...widgetSettings },
    thirdPartySettings: {}
  };

  return {
    ...formDisplay,
    fields: [...fields, newField],
    hidden: hidden.filter(f => f !== fieldName)
  };
}

/**
 * Update a field's widget type
 * @param {object} project - Project object with configDirectory
 * @param {object} formDisplay - Form display data
 * @param {string} fieldName - Field name to update
 * @param {string} newWidgetType - New widget type
 * @returns {Promise<object>} - Updated form display
 */
export async function updateFieldWidget(project, formDisplay, fieldName, newWidgetType) {
  const { entityType, bundle, fields } = formDisplay;

  // Find the field
  const fieldIndex = fields.findIndex(f => f.name === fieldName);
  if (fieldIndex === -1) {
    throw new Error(`Field not found: ${fieldName}`);
  }

  let fieldType;

  // Check if it's a base field first
  if (isBaseField(entityType, fieldName)) {
    const baseFieldConfig = getBaseFieldConfig(entityType, fieldName);
    fieldType = baseFieldConfig.type;
  } else {
    // Read field instance to get field type
    const fieldInstance = await readFieldInstance(
      project.configDirectory,
      entityType,
      bundle,
      fieldName
    );

    if (!fieldInstance) {
      throw new Error(`Field instance not found: ${fieldName}`);
    }

    fieldType = fieldInstance.type;
  }

  // Get the new widget configuration
  const newWidget = getWidgetByType(fieldType, newWidgetType);
  if (!newWidget) {
    throw new Error(`Widget ${newWidgetType} not available for field type: ${fieldType}`);
  }

  // Update the field with new widget
  const updatedFields = [...fields];
  updatedFields[fieldIndex] = {
    ...fields[fieldIndex],
    type: newWidgetType,
    settings: { ...newWidget.settings }
  };

  return {
    ...formDisplay,
    fields: updatedFields
  };
}

/**
 * Update a field's widget settings
 * @param {object} formDisplay - Form display data
 * @param {string} fieldName - Field name to update
 * @param {object} newSettings - New settings to merge
 * @returns {object} - Updated form display
 */
export function updateFieldSettings(formDisplay, fieldName, newSettings) {
  const { fields } = formDisplay;

  // Find the field
  const fieldIndex = fields.findIndex(f => f.name === fieldName);
  if (fieldIndex === -1) {
    throw new Error(`Field not found: ${fieldName}`);
  }

  // Update the field settings
  const updatedFields = [...fields];
  updatedFields[fieldIndex] = {
    ...fields[fieldIndex],
    settings: {
      ...fields[fieldIndex].settings,
      ...newSettings
    }
  };

  return {
    ...formDisplay,
    fields: updatedFields
  };
}

/**
 * Get available widgets for a field
 * @param {object} project - Project object with configDirectory
 * @param {object} formDisplay - Form display data
 * @param {string} fieldName - Field name
 * @returns {Promise<object[]>} - Available widgets
 */
export async function getAvailableWidgetsForField(project, formDisplay, fieldName) {
  const { entityType, bundle } = formDisplay;

  // Check if it's a base field first
  if (isBaseField(entityType, fieldName)) {
    const baseFieldConfig = getBaseFieldConfig(entityType, fieldName);
    return getWidgetsForFieldType(baseFieldConfig.type);
  }

  const fieldInstance = await readFieldInstance(
    project.configDirectory,
    entityType,
    bundle,
    fieldName
  );

  if (!fieldInstance) {
    return [];
  }

  return getWidgetsForFieldType(fieldInstance.type);
}

/**
 * Create a new form display for a bundle
 * @param {object} project - Project object with configDirectory
 * @param {string} entityType - Entity type
 * @param {string} bundle - Bundle name
 * @param {string} mode - Form mode (default: 'default')
 * @param {object} options - Creation options
 * @param {string} options.copyFrom - Mode to copy from
 * @param {boolean} options.includeAllFields - Include all bundle fields
 * @returns {Promise<object>} - New form display
 */
export async function createNewFormDisplay(project, entityType, bundle, mode = 'default', options = {}) {
  const { copyFrom, includeAllFields } = options;
  const configPath = project.configDirectory;

  if (copyFrom) {
    // Copy from existing form display
    const existing = await readFormDisplay(configPath, entityType, bundle);
    if (!existing) {
      throw new Error(`Source form display not found: ${copyFrom}`);
    }
    return {
      ...existing,
      mode,
      id: `${entityType}.${bundle}.${mode}`
    };
  }

  if (includeAllFields) {
    // Get all field instances for the bundle
    const { parseFieldInstances } = await import('../io/configReader.js');
    const fieldInstances = await parseFieldInstances(configPath, entityType, bundle);

    const formFields = [];
    for (const instance of fieldInstances) {
      const widget = getDefaultWidget(instance.type);
      formFields.push({
        name: instance.name,
        type: widget?.type || 'string_textfield',
        weight: formFields.length,
        region: 'content',
        settings: widget?.settings ? { ...widget.settings } : {},
        thirdPartySettings: {}
      });
    }

    return {
      entityType,
      bundle,
      mode,
      id: `${entityType}.${bundle}.${mode}`,
      groups: [],
      fields: formFields,
      hidden: []
    };
  }

  // Empty form display
  return {
    entityType,
    bundle,
    mode,
    id: `${entityType}.${bundle}.${mode}`,
    groups: [],
    fields: [],
    hidden: []
  };
}

/**
 * Reset form display to default widget configuration
 * Regenerates all fields with their default widgets
 * @param {object} project - Project object with configDirectory
 * @param {object} formDisplay - Form display data
 * @param {object} options - Reset options
 * @param {boolean} options.keepFieldOrder - Preserve existing field order
 * @param {boolean} options.clearGroups - Remove all field groups
 * @returns {Promise<object>} - Reset form display
 */
export async function resetFormDisplay(project, formDisplay, options = {}) {
  const { keepFieldOrder = true, clearGroups = false } = options;
  const { entityType, bundle, fields, hidden, groups } = formDisplay;
  const configPath = project.configDirectory;

  // Get all current field names (visible and hidden)
  const allFieldNames = [...fields.map(f => f.name), ...hidden];

  // Regenerate fields with default widgets
  const newFields = [];

  for (let i = 0; i < allFieldNames.length; i++) {
    const fieldName = allFieldNames[i];
    const existingField = fields.find(f => f.name === fieldName);

    // Check if it's a base field first
    if (isBaseField(entityType, fieldName)) {
      const baseFieldConfig = getBaseFieldConfig(entityType, fieldName);
      newFields.push({
        name: fieldName,
        type: baseFieldConfig.widget,
        weight: keepFieldOrder && existingField ? existingField.weight : i,
        region: 'content',
        settings: { ...baseFieldConfig.settings },
        thirdPartySettings: {}
      });
    } else {
      const fieldInstance = await readFieldInstance(
        configPath,
        entityType,
        bundle,
        fieldName
      );

      if (fieldInstance) {
        const widget = getDefaultWidget(fieldInstance.type);

        newFields.push({
          name: fieldName,
          type: widget?.type || 'string_textfield',
          weight: keepFieldOrder && existingField ? existingField.weight : i,
          region: 'content',
          settings: widget?.settings ? { ...widget.settings } : {},
          thirdPartySettings: {}
        });
      }
    }
  }

  return {
    ...formDisplay,
    fields: newFields,
    hidden: [],
    groups: clearGroups ? [] : groups
  };
}

/**
 * Clear all field groups from form display
 * Moves all grouped fields to root level
 * @param {object} formDisplay - Form display data
 * @returns {object} - Updated form display
 */
export function clearFieldGroups(formDisplay) {
  return {
    ...formDisplay,
    groups: []
  };
}

/**
 * List available form display modes for a bundle
 * @param {object} project - Project object with configDirectory
 * @param {string} entityType - Entity type
 * @param {string} bundle - Bundle name
 * @returns {Promise<string[]>} - Available modes
 */
export async function getFormDisplayModes(project, entityType, bundle) {
  return listFormDisplayModes(project.configDirectory, entityType, bundle);
}

/**
 * Load form display for a specific mode
 * @param {object} project - Project object with configDirectory
 * @param {string} entityType - Entity type
 * @param {string} bundle - Bundle name
 * @param {string} mode - Form mode
 * @returns {Promise<object|null>} - Form display data or null
 */
export async function loadFormDisplayWithMode(project, entityType, bundle, mode) {
  const filePath = getFormDisplayPathWithMode(project.configDirectory, entityType, bundle, mode);
  const { existsSync } = await import('fs');
  const { readTextFile } = await import('../io/fileSystem.js');
  const { parseYaml } = await import('../parsers/configParser.js');
  const { parseFormDisplay } = await import('../parsers/formDisplayParser.js');

  if (!existsSync(filePath)) {
    return null;
  }

  try {
    const content = await readTextFile(filePath);
    const config = parseYaml(content);
    return parseFormDisplay(config);
  } catch (error) {
    console.warn(`Warning: Could not parse form display: ${error.message}`);
    return null;
  }
}

/**
 * Save form display with a specific mode
 * @param {object} project - Project object with configDirectory
 * @param {object} formDisplay - Form display data
 * @param {string} mode - Form mode (default: 'default')
 * @returns {Promise<void>}
 */
export async function saveFormDisplayWithMode(project, formDisplay, mode = 'default') {
  const { entityType, bundle } = formDisplay;
  const filePath = getFormDisplayPathWithMode(project.configDirectory, entityType, bundle, mode);
  const yamlContent = generateFormDisplay({ ...formDisplay, mode });
  await writeYamlFile(filePath, yamlContent);
}
