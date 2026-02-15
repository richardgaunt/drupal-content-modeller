/**
 * Form Display Commands - Orchestration layer
 * Combines I/O with pure functions for form display operations.
 */

import { readFormDisplay, formDisplayExists, getFormDisplayPath } from '../io/configReader.js';
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
 * - Field groups are ordered by weight
 * - Fields within a group are ordered by position in children array
 * @param {object} formDisplay - Form display data
 * @param {string} groupName - Group name ('' for root level)
 * @param {string[]} newOrder - New order of child names
 * @returns {object} - Updated form display
 */
export function reorderGroupChildren(formDisplay, groupName, newOrder) {
  const { groups, fields } = formDisplay;

  // Build a set of group names for quick lookup
  const groupNames = new Set(groups.map(g => g.name));

  // Calculate weights for groups (0, 1, 2, 3...)
  const weightMap = new Map();
  newOrder.forEach((name, index) => {
    if (groupNames.has(name)) {
      weightMap.set(name, index);
    }
  });

  if (groupName === '') {
    // Reordering at root level
    // - Update weights for root-level groups
    // - Update weights for ungrouped fields (they also use weight at root)
    const updatedFields = fields.map(field => {
      const orderIndex = newOrder.indexOf(field.name);
      if (orderIndex !== -1) {
        return { ...field, weight: orderIndex };
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
  // - Nested groups: update their weights
  // - Fields: update the children array order (fields use array position, not weight)
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
