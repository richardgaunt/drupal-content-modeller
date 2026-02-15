/**
 * Entity Base Fields
 * Defines the configurable base fields for each entity type.
 * These fields are built into Drupal entities and can be configured
 * in form displays but are not stored in field config YAML files.
 */

/**
 * Node (Content) base fields
 */
export const NODE_BASE_FIELDS = {
  title: {
    type: 'string',
    label: 'Title',
    widget: 'string_textfield',
    settings: { size: 60, placeholder: '' }
  },
  status: {
    type: 'boolean',
    label: 'Published',
    widget: 'boolean_checkbox',
    settings: { display_label: true }
  },
  uid: {
    type: 'entity_reference',
    label: 'Authored by',
    widget: 'entity_reference_autocomplete',
    settings: { match_operator: 'CONTAINS', match_limit: 10, size: 60, placeholder: '' }
  },
  promote: {
    type: 'boolean',
    label: 'Promoted to front page',
    widget: 'boolean_checkbox',
    settings: { display_label: true }
  },
  sticky: {
    type: 'boolean',
    label: 'Sticky at top of lists',
    widget: 'boolean_checkbox',
    settings: { display_label: true }
  },
  moderation_state: {
    type: 'string',
    label: 'Moderation state',
    widget: 'moderation_state_default',
    settings: {}
  },
  path: {
    type: 'path',
    label: 'URL alias',
    widget: 'path',
    settings: {}
  }
};

/**
 * Paragraph base fields
 */
export const PARAGRAPH_BASE_FIELDS = {
  status: {
    type: 'boolean',
    label: 'Published',
    widget: 'boolean_checkbox',
    settings: { display_label: true }
  }
};

/**
 * Taxonomy term base fields
 */
export const TAXONOMY_TERM_BASE_FIELDS = {
  name: {
    type: 'string',
    label: 'Name',
    widget: 'string_textfield',
    settings: { size: 60, placeholder: '' }
  },
  description: {
    type: 'text_long',
    label: 'Description',
    widget: 'text_textarea',
    settings: { rows: 5, placeholder: '' }
  },
  status: {
    type: 'boolean',
    label: 'Published',
    widget: 'boolean_checkbox',
    settings: { display_label: true }
  },
  weight: {
    type: 'integer',
    label: 'Weight',
    widget: 'number',
    settings: {}
  },
  parent: {
    type: 'entity_reference',
    label: 'Term Parents',
    widget: 'entity_reference_autocomplete',
    settings: { match_operator: 'CONTAINS', match_limit: 10, size: 60, placeholder: '' }
  },
  path: {
    type: 'path',
    label: 'URL alias',
    widget: 'path',
    settings: {}
  }
};

/**
 * Media base fields
 */
export const MEDIA_BASE_FIELDS = {
  name: {
    type: 'string',
    label: 'Name',
    widget: 'string_textfield',
    settings: { size: 60, placeholder: '' }
  },
  status: {
    type: 'boolean',
    label: 'Published',
    widget: 'boolean_checkbox',
    settings: { display_label: true }
  },
  uid: {
    type: 'entity_reference',
    label: 'Authored by',
    widget: 'entity_reference_autocomplete',
    settings: { match_operator: 'CONTAINS', match_limit: 10, size: 60, placeholder: '' }
  },
  moderation_state: {
    type: 'string',
    label: 'Moderation state',
    widget: 'moderation_state_default',
    settings: {}
  },
  path: {
    type: 'path',
    label: 'URL alias',
    widget: 'path',
    settings: {}
  }
};

/**
 * Block content base fields
 */
export const BLOCK_CONTENT_BASE_FIELDS = {
  info: {
    type: 'string',
    label: 'Block description',
    widget: 'string_textfield',
    settings: { size: 60, placeholder: '' }
  },
  status: {
    type: 'boolean',
    label: 'Published',
    widget: 'boolean_checkbox',
    settings: { display_label: true }
  },
  reusable: {
    type: 'boolean',
    label: 'Reusable',
    widget: 'boolean_checkbox',
    settings: { display_label: true }
  },
  moderation_state: {
    type: 'string',
    label: 'Moderation state',
    widget: 'moderation_state_default',
    settings: {}
  }
};

/**
 * Map of entity type to base fields
 */
export const BASE_FIELDS_BY_ENTITY_TYPE = {
  node: NODE_BASE_FIELDS,
  paragraph: PARAGRAPH_BASE_FIELDS,
  taxonomy_term: TAXONOMY_TERM_BASE_FIELDS,
  media: MEDIA_BASE_FIELDS,
  block_content: BLOCK_CONTENT_BASE_FIELDS
};

/**
 * Get base fields for an entity type
 * @param {string} entityType - Entity type
 * @returns {object} - Base fields object or empty object
 */
export function getBaseFields(entityType) {
  return BASE_FIELDS_BY_ENTITY_TYPE[entityType] || {};
}

/**
 * Check if a field name is a base field for an entity type
 * @param {string} entityType - Entity type
 * @param {string} fieldName - Field name
 * @returns {boolean} - True if it's a base field
 */
export function isBaseField(entityType, fieldName) {
  const baseFields = BASE_FIELDS_BY_ENTITY_TYPE[entityType];
  return baseFields ? fieldName in baseFields : false;
}

/**
 * Get base field configuration
 * @param {string} entityType - Entity type
 * @param {string} fieldName - Field name
 * @returns {object|null} - Base field config or null
 */
export function getBaseFieldConfig(entityType, fieldName) {
  const baseFields = BASE_FIELDS_BY_ENTITY_TYPE[entityType];
  if (!baseFields || !(fieldName in baseFields)) {
    return null;
  }
  // Return a copy to prevent mutation
  const config = baseFields[fieldName];
  return {
    ...config,
    settings: { ...config.settings }
  };
}

/**
 * Get all base field names for an entity type
 * @param {string} entityType - Entity type
 * @returns {string[]} - Array of base field names
 */
export function getBaseFieldNames(entityType) {
  const baseFields = BASE_FIELDS_BY_ENTITY_TYPE[entityType];
  return baseFields ? Object.keys(baseFields) : [];
}
