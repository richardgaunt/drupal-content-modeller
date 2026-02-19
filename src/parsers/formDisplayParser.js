/**
 * Form Display Parser - PURE functions
 * Parse YAML configs to extract form display data.
 * No file I/O - receives parsed YAML objects as input.
 */

/**
 * Get filename pattern for form display
 * @param {string} entityType - Entity type
 * @param {string} bundle - Bundle name
 * @returns {string} - Filename
 */
export function getFormDisplayFilename(entityType, bundle) {
  return `core.entity_form_display.${entityType}.${bundle}.default.yml`;
}

/**
 * Parse a form display config object
 * @param {object} config - Parsed YAML config
 * @returns {object|null} - Parsed form display or null if invalid
 */
export function parseFormDisplay(config) {
  if (!config || typeof config !== 'object') {
    return null;
  }

  const entityType = config.targetEntityType || '';
  const bundle = config.bundle || '';

  if (!entityType || !bundle) {
    return null;
  }

  const groups = parseFieldGroups(config.third_party_settings);
  const fields = parseFormFields(config.content);
  const hidden = parseHiddenFields(config.hidden);

  const result = {
    entityType,
    bundle,
    mode: config.mode || 'default',
    dependencies: config.dependencies || {},
    groups,
    fields,
    hidden
  };

  if (config.uuid) {
    result.uuid = config.uuid;
  }

  return result;
}

/**
 * Extract field groups from third_party_settings
 * @param {object} thirdPartySettings - third_party_settings section
 * @returns {object[]} - Array of field groups
 */
export function parseFieldGroups(thirdPartySettings) {
  if (!thirdPartySettings || !thirdPartySettings.field_group) {
    return [];
  }

  const fieldGroup = thirdPartySettings.field_group;
  const groups = [];

  for (const [name, groupConfig] of Object.entries(fieldGroup)) {
    groups.push({
      name,
      label: groupConfig.label || name,
      children: groupConfig.children || [],
      parentName: groupConfig.parent_name || '',
      weight: groupConfig.weight ?? 0,
      formatType: groupConfig.format_type || 'fieldset',
      formatSettings: groupConfig.format_settings || {},
      region: groupConfig.region || 'content'
    });
  }

  return groups;
}

/**
 * Extract fields from content section
 * @param {object} content - content section
 * @returns {object[]} - Array of fields
 */
export function parseFormFields(content) {
  if (!content || typeof content !== 'object') {
    return [];
  }

  const fields = [];

  for (const [name, fieldConfig] of Object.entries(content)) {
    fields.push({
      name,
      type: fieldConfig.type || '',
      weight: fieldConfig.weight ?? 0,
      region: fieldConfig.region || 'content',
      settings: fieldConfig.settings || {},
      thirdPartySettings: fieldConfig.third_party_settings || {}
    });
  }

  return fields;
}

/**
 * Extract hidden fields from hidden section
 * @param {object} hidden - hidden section
 * @returns {string[]} - Array of hidden field names
 */
export function parseHiddenFields(hidden) {
  if (!hidden || typeof hidden !== 'object') {
    return [];
  }

  return Object.keys(hidden).filter(key => hidden[key] === true);
}

/**
 * Find which group a field belongs to
 * @param {string} fieldName - Field name
 * @param {object[]} groups - All groups
 * @returns {string} - Parent group name or '' if root
 */
export function findFieldParentGroup(fieldName, groups) {
  for (const group of groups) {
    if (group.children.includes(fieldName)) {
      return group.name;
    }
  }
  return '';
}

/**
 * Get children of a group, sorted by weight
 * @param {string} groupName - Parent group name ('' for root)
 * @param {object[]} groups - All groups
 * @param {object[]} fields - All fields
 * @returns {object[]} - Sorted child nodes
 */
export function getGroupChildren(groupName, groups, fields) {
  const children = [];

  if (groupName === '') {
    // Root level: get groups with no parent and fields not in any group
    for (const group of groups) {
      if (!group.parentName) {
        children.push({
          type: 'group',
          name: group.name,
          label: group.label,
          formatType: group.formatType,
          weight: group.weight,
          children: []
        });
      }
    }

    // Find fields not in any group
    const groupedFields = new Set();
    for (const group of groups) {
      for (const child of group.children) {
        groupedFields.add(child);
      }
    }

    for (const field of fields) {
      if (!groupedFields.has(field.name)) {
        children.push({
          type: 'field',
          name: field.name,
          label: field.name,
          widgetType: field.type,
          weight: field.weight
        });
      }
    }
  } else {
    // Get children of specific group
    const group = groups.find(g => g.name === groupName);
    if (!group) {
      return [];
    }

    for (const childName of group.children) {
      // Check if child is a group
      const childGroup = groups.find(g => g.name === childName);
      if (childGroup) {
        children.push({
          type: 'group',
          name: childGroup.name,
          label: childGroup.label,
          formatType: childGroup.formatType,
          weight: childGroup.weight,
          children: []
        });
      } else {
        // Child is a field
        const childField = fields.find(f => f.name === childName);
        if (childField) {
          children.push({
            type: 'field',
            name: childField.name,
            label: childField.name,
            widgetType: childField.type,
            weight: childField.weight
          });
        }
      }
    }
  }

  // Sort by weight
  children.sort((a, b) => a.weight - b.weight);

  return children;
}

/**
 * Build hierarchical tree from flat groups and fields
 * @param {object[]} groups - Flat list of groups
 * @param {object[]} fields - Flat list of fields
 * @param {string[]} hidden - Hidden field names
 * @returns {object} - Hierarchical tree
 */
export function buildFormDisplayTree(groups, fields, hidden) {
  const buildSubtree = (parentName) => {
    const children = getGroupChildren(parentName, groups, fields);

    for (const child of children) {
      if (child.type === 'group') {
        child.children = buildSubtree(child.name);
      }
    }

    return children;
  };

  return {
    nodes: buildSubtree(''),
    hidden: hidden || []
  };
}

/**
 * Format tree for console display
 * @param {object} tree - Display tree
 * @param {string} entityType - Entity type for title
 * @param {string} bundle - Bundle name for title
 * @returns {string} - Formatted tree string with indentation
 */
export function formatTreeForDisplay(tree, entityType = '', bundle = '') {
  const lines = [];

  if (entityType && bundle) {
    lines.push(`Form Display: ${entityType} > ${bundle}`);
    lines.push('');
  }

  const formatNode = (node, prefix = '', isLast = true) => {
    const connector = isLast ? '└── ' : '├── ';
    const childPrefix = prefix + (isLast ? '    ' : '│   ');

    if (node.type === 'group') {
      lines.push(`${prefix}${connector}[${node.formatType}] ${node.label}`);

      if (node.children && node.children.length > 0) {
        node.children.forEach((child, index) => {
          const childIsLast = index === node.children.length - 1;
          formatNode(child, childPrefix, childIsLast);
        });
      }
    } else {
      const widgetInfo = node.widgetType ? ` (${node.widgetType})` : '';
      lines.push(`${prefix}${connector}${node.name}${widgetInfo}`);
    }
  };

  if (tree.nodes.length === 0) {
    lines.push('No fields configured.');
  } else {
    tree.nodes.forEach((node, index) => {
      const isLast = index === tree.nodes.length - 1;
      formatNode(node, '', isLast);
    });
  }

  if (tree.hidden && tree.hidden.length > 0) {
    lines.push('');
    lines.push(`Hidden: ${tree.hidden.join(', ')}`);
  }

  return lines.join('\n');
}

/**
 * Get all group names (for selection lists)
 * @param {object[]} groups - All groups
 * @returns {object[]} - Array of {name, label, formatType} for selection
 */
export function getGroupChoices(groups) {
  const choices = [
    { value: '', name: 'Root level (ungrouped)' }
  ];

  for (const group of groups) {
    choices.push({
      value: group.name,
      name: `${group.label} [${group.formatType}]`
    });
  }

  return choices;
}

/**
 * Get all visible fields for selection
 * @param {object[]} fields - All fields
 * @param {string[]} hidden - Hidden field names
 * @returns {object[]} - Array of {value, name} for selection
 */
export function getFieldChoices(fields, hidden = []) {
  const hiddenSet = new Set(hidden);

  return fields
    .filter(f => !hiddenSet.has(f.name))
    .map(f => ({
      value: f.name,
      name: `${f.name} (${f.type || 'unknown'})`
    }));
}

/**
 * Validate group name is unique
 * @param {string} name - Proposed group name
 * @param {object[]} groups - Existing groups
 * @returns {boolean|string} - true if valid, error message if not
 */
export function validateGroupName(name, groups) {
  if (!name || name.trim().length === 0) {
    return 'Group name is required';
  }

  const normalized = name.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
  const fullName = normalized.startsWith('group_') ? normalized : `group_${normalized}`;

  if (groups.some(g => g.name === fullName)) {
    return `Group "${fullName}" already exists`;
  }

  return true;
}

/**
 * Generate group machine name from label
 * @param {string} label - Human-readable label
 * @returns {string} - Machine name (group_xxx)
 */
export function generateGroupName(label) {
  if (!label || typeof label !== 'string') {
    return '';
  }

  const normalized = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_');

  return `group_${normalized}`;
}
