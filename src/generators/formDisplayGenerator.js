/**
 * Form Display Generator - PURE functions
 * Generate YAML configuration for Drupal form displays.
 */

import yaml from 'js-yaml';

/**
 * Available field group format types
 */
export const FIELD_GROUP_FORMATS = [
  { value: 'tabs', name: 'Tabs (container for tab items)' },
  { value: 'tab', name: 'Tab (within a tabs container)' },
  { value: 'details', name: 'Details (collapsible fieldset)' },
  { value: 'details_sidebar', name: 'Details Sidebar' },
  { value: 'fieldset', name: 'Fieldset (non-collapsible)' }
];

/**
 * Get default format settings for a format type
 * @param {string} formatType - Format type
 * @returns {object} - Default format settings
 */
export function getDefaultFormatSettings(formatType) {
  const base = {
    classes: '',
    id: ''
  };

  switch (formatType) {
    case 'tabs':
      return {
        ...base,
        direction: 'horizontal'
      };
    case 'tab':
      return {
        ...base,
        formatter: 'closed',
        description: '',
        required_fields: true
      };
    case 'details':
    case 'details_sidebar':
      return {
        ...base,
        show_empty_fields: false,
        open: false,
        description: '',
        required_fields: true
      };
    case 'fieldset':
      return {
        ...base,
        description: '',
        required_fields: true
      };
    default:
      return base;
  }
}

/**
 * Recalculate weights after reordering
 * Weights are assigned based on position starting from a base weight
 * @param {string[]} orderedNames - Item names in desired order
 * @param {object[]} items - Items to update (fields or groups)
 * @param {number} baseWeight - Starting weight (default 0)
 * @returns {object[]} - Items with updated weights
 */
export function recalculateWeights(orderedNames, items, baseWeight = 0) {
  const itemMap = new Map();
  for (const item of items) {
    itemMap.set(item.name, item);
  }

  const result = [];
  let weight = baseWeight;

  for (const name of orderedNames) {
    const item = itemMap.get(name);
    if (item) {
      result.push({
        ...item,
        weight
      });
      weight++;
    }
  }

  // Add any items not in the ordered list at the end
  for (const item of items) {
    if (!orderedNames.includes(item.name)) {
      result.push({
        ...item,
        weight
      });
      weight++;
    }
  }

  return result;
}

/**
 * Generate third_party_settings section
 * @param {object[]} groups - Field groups
 * @returns {object} - third_party_settings object
 */
export function generateThirdPartySettings(groups) {
  if (!groups || groups.length === 0) {
    return {};
  }

  const fieldGroup = {};

  for (const group of groups) {
    fieldGroup[group.name] = {
      children: group.children || [],
      label: group.label,
      region: group.region || 'content',
      parent_name: group.parentName || '',
      weight: group.weight ?? 0,
      format_type: group.formatType,
      format_settings: group.formatSettings || getDefaultFormatSettings(group.formatType)
    };
  }

  return {
    field_group: fieldGroup
  };
}

/**
 * Generate content section
 * @param {object[]} fields - Form fields
 * @returns {object} - content object
 */
export function generateContentSection(fields) {
  if (!fields || fields.length === 0) {
    return {};
  }

  const content = {};

  for (const field of fields) {
    content[field.name] = {
      type: field.type,
      weight: field.weight ?? 0,
      region: field.region || 'content',
      settings: field.settings || {},
      third_party_settings: field.thirdPartySettings || {}
    };
  }

  return content;
}

/**
 * Generate hidden section
 * @param {string[]} hiddenFields - Hidden field names
 * @returns {object} - hidden object
 */
export function generateHiddenSection(hiddenFields) {
  if (!hiddenFields || hiddenFields.length === 0) {
    return {};
  }

  const hidden = {};
  for (const fieldName of hiddenFields) {
    hidden[fieldName] = true;
  }

  return hidden;
}

/**
 * Generate dependencies from field groups and fields
 * @param {object[]} groups - Field groups
 * @param {object[]} fields - Form fields
 * @param {string} entityType - Entity type
 * @param {string} bundle - Bundle name
 * @returns {object} - dependencies object
 */
export function generateDependencies(groups, fields, entityType, bundle) {
  const configDeps = [];
  const moduleDeps = new Set();

  // Add field dependencies
  for (const field of fields) {
    configDeps.push(`field.field.${entityType}.${bundle}.${field.name}`);
  }

  // Add bundle dependency
  switch (entityType) {
    case 'node':
      configDeps.push(`node.type.${bundle}`);
      break;
    case 'media':
      configDeps.push(`media.type.${bundle}`);
      break;
    case 'paragraph':
      configDeps.push(`paragraphs.paragraphs_type.${bundle}`);
      break;
    case 'taxonomy_term':
      configDeps.push(`taxonomy.vocabulary.${bundle}`);
      break;
    case 'block_content':
      configDeps.push(`block_content.type.${bundle}`);
      break;
  }

  // Add field_group module if groups exist
  if (groups && groups.length > 0) {
    moduleDeps.add('field_group');
  }

  // Add module dependencies based on field widget types
  for (const field of fields) {
    switch (field.type) {
      case 'datetime_default':
      case 'datetime_timestamp':
        moduleDeps.add('datetime');
        break;
      case 'media_library_widget':
        moduleDeps.add('media_library');
        break;
      case 'paragraphs':
        moduleDeps.add('paragraphs');
        break;
      case 'path':
        moduleDeps.add('path');
        break;
    }
  }

  const dependencies = {
    config: configDeps.sort()
  };

  if (moduleDeps.size > 0) {
    dependencies.module = Array.from(moduleDeps).sort();
  }

  return dependencies;
}

/**
 * Generate complete form display YAML
 * @param {object} formDisplay - Form display data
 * @returns {string} - YAML string
 */
export function generateFormDisplay(formDisplay) {
  const { entityType, bundle, mode, groups, fields, hidden } = formDisplay;

  // Separate visible fields from hidden
  const hiddenSet = new Set(hidden || []);
  const visibleFields = fields.filter(f => !hiddenSet.has(f.name));
  const hiddenFields = hidden || [];

  const config = {
    langcode: 'en',
    status: true,
    dependencies: generateDependencies(groups, visibleFields, entityType, bundle),
    id: `${entityType}.${bundle}.${mode || 'default'}`,
    targetEntityType: entityType,
    bundle: bundle,
    mode: mode || 'default',
    content: generateContentSection(visibleFields),
    hidden: generateHiddenSection(hiddenFields)
  };

  if (formDisplay.uuid) {
    config.uuid = formDisplay.uuid;
  }

  // Add third_party_settings if there are groups
  if (groups && groups.length > 0) {
    config.third_party_settings = generateThirdPartySettings(groups);
  }

  return yaml.dump(config, {
    quotingType: "'",
    forceQuotes: false,
    lineWidth: -1,
    noRefs: true
  });
}

/**
 * Update group children array
 * @param {object} group - Group to update
 * @param {string[]} newChildren - New children array
 * @returns {object} - Updated group
 */
export function updateGroupChildren(group, newChildren) {
  return {
    ...group,
    children: newChildren
  };
}

/**
 * Add item to group's children at specified position
 * @param {object} group - Group to update
 * @param {string} itemName - Item name to add
 * @param {number} position - Position to insert (default: end)
 * @returns {object} - Updated group
 */
export function addChildToGroup(group, itemName, position = -1) {
  const children = [...group.children];

  if (position < 0 || position >= children.length) {
    children.push(itemName);
  } else {
    children.splice(position, 0, itemName);
  }

  return {
    ...group,
    children
  };
}

/**
 * Remove item from group's children
 * @param {object} group - Group to update
 * @param {string} itemName - Item name to remove
 * @returns {object} - Updated group
 */
export function removeChildFromGroup(group, itemName) {
  return {
    ...group,
    children: group.children.filter(c => c !== itemName)
  };
}

/**
 * Create a new field group with defaults
 * @param {object} options - Group options
 * @returns {object} - New group object
 */
export function createNewGroup(options) {
  const { name, label, formatType, parentName = '', weight = 0 } = options;

  return {
    name,
    label,
    children: [],
    parentName,
    weight,
    formatType,
    formatSettings: getDefaultFormatSettings(formatType),
    region: 'content'
  };
}
