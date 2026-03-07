import {
  PROP_TYPES,
  isValidPropName,
  buildPropSchema,
  addPropToSchema,
  removePropFromSchema,
  addSlotToSchema,
  removeSlotFromSchema
} from '../src/utils/propSchema.js';

describe('Prop Schema Utilities', () => {
  describe('PROP_TYPES', () => {
    test('contains all expected types', () => {
      expect(PROP_TYPES).toEqual(['string', 'boolean', 'integer', 'number', 'array', 'object']);
    });
  });

  describe('isValidPropName', () => {
    test('accepts valid snake_case names', () => {
      expect(isValidPropName('title')).toBe(true);
      expect(isValidPropName('is_active')).toBe(true);
      expect(isValidPropName('modifier_class')).toBe(true);
      expect(isValidPropName('items2')).toBe(true);
    });

    test('rejects invalid names', () => {
      expect(isValidPropName('')).toBe(false);
      expect(isValidPropName(null)).toBe(false);
      expect(isValidPropName(undefined)).toBe(false);
      expect(isValidPropName('My Prop')).toBe(false);
      expect(isValidPropName('myProp')).toBe(false);
      expect(isValidPropName('123abc')).toBe(false);
      expect(isValidPropName('_leading')).toBe(false);
    });
  });

  describe('buildPropSchema', () => {
    test('builds simple string prop (required)', () => {
      const result = buildPropSchema({
        type: 'string',
        title: 'Title',
        description: 'The title text',
        required: true
      });

      expect(result).toEqual({
        type: 'string',
        title: 'Title',
        description: 'The title text'
      });
    });

    test('builds nullable string prop (not required)', () => {
      const result = buildPropSchema({
        type: 'string',
        title: 'Title',
        description: 'The title text',
        required: false
      });

      expect(result).toEqual({
        type: ['string', 'null'],
        title: 'Title',
        description: 'The title text'
      });
    });

    test('boolean props are never nullable', () => {
      const result = buildPropSchema({
        type: 'boolean',
        title: 'Is Active',
        description: 'Whether the item is active',
        required: false
      });

      expect(result).toEqual({
        type: 'boolean',
        title: 'Is Active',
        description: 'Whether the item is active'
      });
    });

    test('boolean props when required', () => {
      const result = buildPropSchema({
        type: 'boolean',
        title: 'Is Active',
        description: 'Whether active',
        required: true
      });

      expect(result.type).toBe('boolean');
    });

    test('builds nullable integer prop', () => {
      const result = buildPropSchema({
        type: 'integer',
        title: 'Count',
        description: 'Number of items',
        required: false
      });

      expect(result.type).toEqual(['integer', 'null']);
    });

    test('builds required number prop', () => {
      const result = buildPropSchema({
        type: 'number',
        title: 'Level',
        description: 'Menu level',
        required: true
      });

      expect(result.type).toBe('number');
    });

    test('builds string prop with enum', () => {
      const result = buildPropSchema({
        type: 'string',
        title: 'Theme',
        description: 'Theme variation',
        required: true,
        enumValues: ['light', 'dark']
      });

      expect(result).toEqual({
        type: 'string',
        title: 'Theme',
        description: 'Theme variation',
        enum: ['light', 'dark']
      });
    });

    test('builds prop with default value', () => {
      const result = buildPropSchema({
        type: 'string',
        title: 'Size',
        description: 'Component size',
        required: true,
        defaultValue: 'regular'
      });

      expect(result.default).toBe('regular');
    });

    test('ignores empty default value', () => {
      const result = buildPropSchema({
        type: 'string',
        title: 'Size',
        description: '',
        required: true,
        defaultValue: ''
      });

      expect(result).not.toHaveProperty('default');
    });

    test('builds array prop with string items', () => {
      const result = buildPropSchema({
        type: 'array',
        title: 'Items',
        description: 'List of items',
        required: false,
        items: { type: 'string' }
      });

      expect(result).toEqual({
        type: ['array', 'null'],
        title: 'Items',
        description: 'List of items',
        items: { type: 'string' }
      });
    });

    test('builds array prop with object items', () => {
      const result = buildPropSchema({
        type: 'array',
        title: 'Links',
        description: 'Navigation links',
        required: true,
        items: {
          type: 'object',
          properties: {
            text: { type: 'string', title: 'Text' },
            url: { type: 'string', title: 'URL' }
          }
        }
      });

      expect(result.type).toBe('array');
      expect(result.items.type).toBe('object');
      expect(result.items.properties.text).toEqual({ type: 'string', title: 'Text' });
      expect(result.items.properties.url).toEqual({ type: 'string', title: 'URL' });
    });

    test('builds object prop with nested properties', () => {
      const result = buildPropSchema({
        type: 'object',
        title: 'Image',
        description: 'Image data',
        required: false,
        properties: {
          url: { type: 'string', title: 'URL', description: 'Image URL' },
          alt: { type: 'string', title: 'Alt text', description: 'Alternative text' }
        }
      });

      expect(result.type).toEqual(['object', 'null']);
      expect(result.properties.url).toEqual({ type: 'string', title: 'URL', description: 'Image URL' });
      expect(result.properties.alt).toEqual({ type: 'string', title: 'Alt text', description: 'Alternative text' });
    });

    test('does not add items for non-array type', () => {
      const result = buildPropSchema({
        type: 'string',
        title: 'Name',
        description: '',
        required: true,
        items: { type: 'string' }
      });

      expect(result).not.toHaveProperty('items');
    });

    test('does not add properties for non-object type', () => {
      const result = buildPropSchema({
        type: 'string',
        title: 'Name',
        description: '',
        required: true,
        properties: { foo: { type: 'string' } }
      });

      expect(result).not.toHaveProperty('properties');
    });

    test('defaults required to false', () => {
      const result = buildPropSchema({
        type: 'string',
        title: 'Name',
        description: ''
      });

      expect(result.type).toEqual(['string', 'null']);
    });

    test('omits title and description when empty', () => {
      const result = buildPropSchema({
        type: 'string',
        title: '',
        description: '',
        required: true
      });

      expect(result).not.toHaveProperty('title');
      expect(result).not.toHaveProperty('description');
    });

    test('builds integer prop with enum', () => {
      const result = buildPropSchema({
        type: 'integer',
        title: 'Columns',
        description: 'Number of columns',
        required: true,
        enumValues: [1, 2, 3, 4]
      });

      expect(result.enum).toEqual([1, 2, 3, 4]);
    });

    test('builds required array prop', () => {
      const result = buildPropSchema({
        type: 'array',
        title: 'Rows',
        description: 'Table rows',
        required: true,
        items: { type: 'string' }
      });

      expect(result.type).toBe('array');
    });

    test('builds required object prop', () => {
      const result = buildPropSchema({
        type: 'object',
        title: 'Config',
        description: 'Configuration',
        required: true,
        properties: { key: { type: 'string' } }
      });

      expect(result.type).toBe('object');
    });
  });

  describe('addPropToSchema', () => {
    test('adds prop to existing schema', () => {
      const existing = {
        type: 'object',
        properties: {
          title: { type: 'string', title: 'Title' }
        }
      };

      const result = addPropToSchema(existing, 'theme', { type: 'string', title: 'Theme' });

      expect(result.properties.title).toEqual({ type: 'string', title: 'Title' });
      expect(result.properties.theme).toEqual({ type: 'string', title: 'Theme' });
    });

    test('creates schema from null', () => {
      const result = addPropToSchema(null, 'title', { type: 'string', title: 'Title' });

      expect(result.type).toBe('object');
      expect(result.properties.title).toEqual({ type: 'string', title: 'Title' });
    });

    test('creates properties on schema without them', () => {
      const result = addPropToSchema({ type: 'object' }, 'title', { type: 'string' });

      expect(result.properties.title).toEqual({ type: 'string' });
    });

    test('does not mutate original schema', () => {
      const existing = {
        type: 'object',
        properties: { title: { type: 'string' } }
      };

      const result = addPropToSchema(existing, 'theme', { type: 'string' });

      expect(existing.properties).not.toHaveProperty('theme');
      expect(result.properties).toHaveProperty('theme');
    });
  });

  describe('removePropFromSchema', () => {
    test('removes existing prop', () => {
      const schema = {
        type: 'object',
        properties: {
          title: { type: 'string' },
          theme: { type: 'string' }
        }
      };

      const result = removePropFromSchema(schema, 'theme');

      expect(result.properties).toHaveProperty('title');
      expect(result.properties).not.toHaveProperty('theme');
    });

    test('returns schema unchanged when prop does not exist', () => {
      const schema = {
        type: 'object',
        properties: { title: { type: 'string' } }
      };

      const result = removePropFromSchema(schema, 'nonexistent');

      expect(result.properties.title).toEqual({ type: 'string' });
    });

    test('handles null schema', () => {
      expect(removePropFromSchema(null, 'title')).toBeNull();
    });

    test('handles schema without properties', () => {
      const schema = { type: 'object' };
      expect(removePropFromSchema(schema, 'title')).toEqual({ type: 'object' });
    });

    test('does not mutate original schema', () => {
      const schema = {
        type: 'object',
        properties: { title: { type: 'string' }, theme: { type: 'string' } }
      };

      removePropFromSchema(schema, 'theme');

      expect(schema.properties).toHaveProperty('theme');
    });
  });

  describe('addSlotToSchema', () => {
    test('adds slot to existing slots', () => {
      const existing = {
        content: { title: 'Content', description: 'Main content' }
      };

      const result = addSlotToSchema(existing, 'footer', {
        title: 'Footer',
        description: 'Footer content'
      });

      expect(result.content).toEqual({ title: 'Content', description: 'Main content' });
      expect(result.footer).toEqual({ title: 'Footer', description: 'Footer content' });
    });

    test('creates slots from null', () => {
      const result = addSlotToSchema(null, 'content', {
        title: 'Content',
        description: 'Main content'
      });

      expect(result.content).toEqual({ title: 'Content', description: 'Main content' });
    });

    test('does not mutate original slots', () => {
      const existing = { content: { title: 'Content' } };
      const result = addSlotToSchema(existing, 'footer', { title: 'Footer' });

      expect(existing).not.toHaveProperty('footer');
      expect(result).toHaveProperty('footer');
    });
  });

  describe('removeSlotFromSchema', () => {
    test('removes existing slot', () => {
      const slots = {
        content: { title: 'Content' },
        footer: { title: 'Footer' }
      };

      const result = removeSlotFromSchema(slots, 'footer');

      expect(result).toHaveProperty('content');
      expect(result).not.toHaveProperty('footer');
    });

    test('handles null slots', () => {
      expect(removeSlotFromSchema(null, 'content')).toBeNull();
    });

    test('returns unchanged when slot does not exist', () => {
      const slots = { content: { title: 'Content' } };
      const result = removeSlotFromSchema(slots, 'nonexistent');

      expect(result.content).toEqual({ title: 'Content' });
    });

    test('does not mutate original slots', () => {
      const slots = { content: { title: 'Content' }, footer: { title: 'Footer' } };

      removeSlotFromSchema(slots, 'footer');

      expect(slots).toHaveProperty('footer');
    });
  });
});
