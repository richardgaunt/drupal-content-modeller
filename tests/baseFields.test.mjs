/**
 * Tests for base fields constants
 */

import {
  NODE_BASE_FIELDS,
  PARAGRAPH_BASE_FIELDS,
  TAXONOMY_TERM_BASE_FIELDS,
  MEDIA_BASE_FIELDS,
  BLOCK_CONTENT_BASE_FIELDS,
  getBaseFields,
  isBaseField,
  getBaseFieldConfig,
  getBaseFieldNames
} from '../src/constants/baseFields.js';

describe('Base Fields Constants', () => {
  describe('NODE_BASE_FIELDS', () => {
    it('contains title field', () => {
      expect(NODE_BASE_FIELDS.title).toBeDefined();
      expect(NODE_BASE_FIELDS.title.type).toBe('string');
      expect(NODE_BASE_FIELDS.title.widget).toBe('string_textfield');
    });

    it('contains status field', () => {
      expect(NODE_BASE_FIELDS.status).toBeDefined();
      expect(NODE_BASE_FIELDS.status.type).toBe('boolean');
      expect(NODE_BASE_FIELDS.status.widget).toBe('boolean_checkbox');
    });

    it('contains uid field', () => {
      expect(NODE_BASE_FIELDS.uid).toBeDefined();
      expect(NODE_BASE_FIELDS.uid.type).toBe('entity_reference');
      expect(NODE_BASE_FIELDS.uid.widget).toBe('entity_reference_autocomplete');
    });

    it('contains moderation_state field', () => {
      expect(NODE_BASE_FIELDS.moderation_state).toBeDefined();
      expect(NODE_BASE_FIELDS.moderation_state.widget).toBe('moderation_state_default');
    });

    it('contains path field', () => {
      expect(NODE_BASE_FIELDS.path).toBeDefined();
      expect(NODE_BASE_FIELDS.path.widget).toBe('path');
    });

    it('contains promote field', () => {
      expect(NODE_BASE_FIELDS.promote).toBeDefined();
      expect(NODE_BASE_FIELDS.promote.type).toBe('boolean');
    });

    it('contains sticky field', () => {
      expect(NODE_BASE_FIELDS.sticky).toBeDefined();
      expect(NODE_BASE_FIELDS.sticky.type).toBe('boolean');
    });
  });

  describe('PARAGRAPH_BASE_FIELDS', () => {
    it('contains status field', () => {
      expect(PARAGRAPH_BASE_FIELDS.status).toBeDefined();
      expect(PARAGRAPH_BASE_FIELDS.status.type).toBe('boolean');
    });
  });

  describe('TAXONOMY_TERM_BASE_FIELDS', () => {
    it('contains name field', () => {
      expect(TAXONOMY_TERM_BASE_FIELDS.name).toBeDefined();
      expect(TAXONOMY_TERM_BASE_FIELDS.name.type).toBe('string');
    });

    it('contains description field', () => {
      expect(TAXONOMY_TERM_BASE_FIELDS.description).toBeDefined();
      expect(TAXONOMY_TERM_BASE_FIELDS.description.type).toBe('text_long');
    });

    it('contains weight field', () => {
      expect(TAXONOMY_TERM_BASE_FIELDS.weight).toBeDefined();
      expect(TAXONOMY_TERM_BASE_FIELDS.weight.type).toBe('integer');
    });

    it('contains parent field', () => {
      expect(TAXONOMY_TERM_BASE_FIELDS.parent).toBeDefined();
      expect(TAXONOMY_TERM_BASE_FIELDS.parent.type).toBe('entity_reference');
    });
  });

  describe('MEDIA_BASE_FIELDS', () => {
    it('contains name field', () => {
      expect(MEDIA_BASE_FIELDS.name).toBeDefined();
      expect(MEDIA_BASE_FIELDS.name.type).toBe('string');
    });

    it('contains uid field', () => {
      expect(MEDIA_BASE_FIELDS.uid).toBeDefined();
    });

    it('contains moderation_state field', () => {
      expect(MEDIA_BASE_FIELDS.moderation_state).toBeDefined();
    });
  });

  describe('BLOCK_CONTENT_BASE_FIELDS', () => {
    it('contains info field', () => {
      expect(BLOCK_CONTENT_BASE_FIELDS.info).toBeDefined();
      expect(BLOCK_CONTENT_BASE_FIELDS.info.type).toBe('string');
    });

    it('contains reusable field', () => {
      expect(BLOCK_CONTENT_BASE_FIELDS.reusable).toBeDefined();
      expect(BLOCK_CONTENT_BASE_FIELDS.reusable.type).toBe('boolean');
    });
  });
});

describe('getBaseFields', () => {
  it('returns node base fields', () => {
    const fields = getBaseFields('node');
    expect(fields).toBe(NODE_BASE_FIELDS);
  });

  it('returns paragraph base fields', () => {
    const fields = getBaseFields('paragraph');
    expect(fields).toBe(PARAGRAPH_BASE_FIELDS);
  });

  it('returns taxonomy_term base fields', () => {
    const fields = getBaseFields('taxonomy_term');
    expect(fields).toBe(TAXONOMY_TERM_BASE_FIELDS);
  });

  it('returns media base fields', () => {
    const fields = getBaseFields('media');
    expect(fields).toBe(MEDIA_BASE_FIELDS);
  });

  it('returns block_content base fields', () => {
    const fields = getBaseFields('block_content');
    expect(fields).toBe(BLOCK_CONTENT_BASE_FIELDS);
  });

  it('returns empty object for unknown entity type', () => {
    const fields = getBaseFields('unknown');
    expect(fields).toEqual({});
  });
});

describe('isBaseField', () => {
  it('returns true for node title', () => {
    expect(isBaseField('node', 'title')).toBe(true);
  });

  it('returns true for node status', () => {
    expect(isBaseField('node', 'status')).toBe(true);
  });

  it('returns false for custom field', () => {
    expect(isBaseField('node', 'field_n_summary')).toBe(false);
  });

  it('returns false for unknown entity type', () => {
    expect(isBaseField('unknown', 'title')).toBe(false);
  });

  it('returns true for taxonomy_term name', () => {
    expect(isBaseField('taxonomy_term', 'name')).toBe(true);
  });

  it('returns true for media name', () => {
    expect(isBaseField('media', 'name')).toBe(true);
  });

  it('returns true for block_content info', () => {
    expect(isBaseField('block_content', 'info')).toBe(true);
  });
});

describe('getBaseFieldConfig', () => {
  it('returns config for node title', () => {
    const config = getBaseFieldConfig('node', 'title');
    expect(config).not.toBeNull();
    expect(config.type).toBe('string');
    expect(config.widget).toBe('string_textfield');
    expect(config.settings.size).toBe(60);
  });

  it('returns config for node status', () => {
    const config = getBaseFieldConfig('node', 'status');
    expect(config).not.toBeNull();
    expect(config.type).toBe('boolean');
    expect(config.settings.display_label).toBe(true);
  });

  it('returns null for custom field', () => {
    const config = getBaseFieldConfig('node', 'field_n_summary');
    expect(config).toBeNull();
  });

  it('returns null for unknown entity type', () => {
    const config = getBaseFieldConfig('unknown', 'title');
    expect(config).toBeNull();
  });

  it('returns a copy (not the original)', () => {
    const config1 = getBaseFieldConfig('node', 'title');
    const config2 = getBaseFieldConfig('node', 'title');
    expect(config1).not.toBe(config2);
    expect(config1.settings).not.toBe(config2.settings);
  });
});

describe('getBaseFieldNames', () => {
  it('returns node base field names', () => {
    const names = getBaseFieldNames('node');
    expect(names).toContain('title');
    expect(names).toContain('status');
    expect(names).toContain('uid');
    expect(names).toContain('promote');
    expect(names).toContain('sticky');
    expect(names).toContain('moderation_state');
    expect(names).toContain('path');
  });

  it('returns paragraph base field names', () => {
    const names = getBaseFieldNames('paragraph');
    expect(names).toContain('status');
  });

  it('returns taxonomy_term base field names', () => {
    const names = getBaseFieldNames('taxonomy_term');
    expect(names).toContain('name');
    expect(names).toContain('description');
    expect(names).toContain('weight');
    expect(names).toContain('parent');
  });

  it('returns empty array for unknown entity type', () => {
    const names = getBaseFieldNames('unknown');
    expect(names).toEqual([]);
  });
});
