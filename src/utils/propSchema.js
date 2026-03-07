/**
 * Prop Schema utilities - PURE functions
 * Functions for building and modifying JSON Schema prop objects
 * used in Drupal Single Directory Component (SDC) *.component.yml files.
 */

export const PROP_TYPES = ['string', 'boolean', 'integer', 'number', 'array', 'object'];

/**
 * Validate a property machine name (snake_case).
 * @param {string} name - Machine name to validate
 * @returns {boolean}
 */
export function isValidPropName(name) {
  if (!name || typeof name !== 'string') return false;
  return /^[a-z][a-z0-9_]*$/.test(name);
}

/**
 * Build a JSON Schema prop definition from collected data.
 * Handles nullable types: non-required, non-boolean props get type [type, 'null'].
 * @param {object} options
 * @param {string} options.type - JSON Schema type
 * @param {string} options.title - Display name
 * @param {string} options.description - Description text
 * @param {boolean} options.required - Whether the prop is required
 * @param {string[]} options.enumValues - Allowed values (for string/integer)
 * @param {*} options.defaultValue - Default value
 * @param {object} options.items - Array items schema (for array type)
 * @param {object} options.properties - Object properties (for object type)
 * @returns {object} - JSON Schema property definition
 */
export function buildPropSchema({ type, title, description, required = false, enumValues, defaultValue, items, properties }) {
  const prop = {};

  // Determine type - nullable for non-required, non-boolean props
  if (!required && type !== 'boolean') {
    prop.type = [type, 'null'];
  } else {
    prop.type = type;
  }

  if (title) prop.title = title;
  if (description) prop.description = description;

  if (enumValues && enumValues.length > 0) {
    prop.enum = enumValues;
  }

  if (defaultValue !== undefined && defaultValue !== '') {
    prop.default = defaultValue;
  }

  if (type === 'array' && items) {
    prop.items = items;
  }

  if (type === 'object' && properties) {
    prop.properties = properties;
  }

  return prop;
}

/**
 * Add a prop to an existing props schema.
 * Creates the props structure if it doesn't exist.
 * @param {object|null} propsSchema - Existing props schema (or null)
 * @param {string} machineName - Property machine name
 * @param {object} propDefinition - JSON Schema property definition
 * @returns {object} - Updated props schema
 */
export function addPropToSchema(propsSchema, machineName, propDefinition) {
  const schema = propsSchema ? { ...propsSchema } : { type: 'object' };

  if (!schema.properties) {
    schema.properties = {};
  }

  schema.properties = { ...schema.properties, [machineName]: propDefinition };
  return schema;
}

/**
 * Remove a prop from an existing props schema.
 * @param {object} propsSchema - Existing props schema
 * @param {string} machineName - Property machine name to remove
 * @returns {object} - Updated props schema
 */
export function removePropFromSchema(propsSchema, machineName) {
  if (!propsSchema?.properties) return propsSchema;

  const { [machineName]: _, ...remaining } = propsSchema.properties;
  return { ...propsSchema, properties: remaining };
}

/**
 * Add a slot to an existing slots object.
 * @param {object|null} slots - Existing slots object (or null)
 * @param {string} machineName - Slot machine name
 * @param {object} slotDefinition - Slot definition with title and description
 * @returns {object} - Updated slots object
 */
export function addSlotToSchema(slots, machineName, slotDefinition) {
  return { ...(slots || {}), [machineName]: slotDefinition };
}

/**
 * Remove a slot from an existing slots object.
 * @param {object} slots - Existing slots object
 * @param {string} machineName - Slot machine name to remove
 * @returns {object} - Updated slots object
 */
export function removeSlotFromSchema(slots, machineName) {
  if (!slots) return slots;
  const { [machineName]: _, ...remaining } = slots;
  return remaining;
}
