import yaml from 'js-yaml';

import {
  generateMachineName,
  validateMachineName,
  getBundleFilename,
  generateNodeType,
  generateMediaType,
  generateParagraphType,
  generateVocabulary,
  generateBlockContentType,
  generateBundle
} from '../src/generators/bundleGenerator.js';

const yamlLoad = yaml.load;

describe('Bundle Generator', () => {
  describe('generateMachineName', () => {
    test('converts to lowercase', () => {
      expect(generateMachineName('My Type')).toBe('my_type');
    });

    test('replaces spaces with underscores', () => {
      expect(generateMachineName('my type name')).toBe('my_type_name');
    });

    test('removes special characters', () => {
      expect(generateMachineName('My Type!')).toBe('my_type');
    });

    test('returns empty string for null', () => {
      expect(generateMachineName(null)).toBe('');
    });
  });

  describe('validateMachineName', () => {
    test('accepts valid names', () => {
      expect(validateMachineName('page')).toBe(true);
      expect(validateMachineName('my_type')).toBe(true);
      expect(validateMachineName('type123')).toBe(true);
    });

    test('rejects invalid names', () => {
      expect(validateMachineName('123type')).toBe(false);
      expect(validateMachineName('my-type')).toBe(false);
      expect(validateMachineName('')).toBe(false);
    });
  });

  describe('getBundleFilename', () => {
    test('returns correct filename for node', () => {
      expect(getBundleFilename('node', 'page')).toBe('node.type.page.yml');
    });

    test('returns correct filename for media', () => {
      expect(getBundleFilename('media', 'image')).toBe('media.type.image.yml');
    });

    test('returns correct filename for paragraph', () => {
      expect(getBundleFilename('paragraph', 'text')).toBe('paragraphs.paragraphs_type.text.yml');
    });

    test('returns correct filename for taxonomy_term', () => {
      expect(getBundleFilename('taxonomy_term', 'tags')).toBe('taxonomy.vocabulary.tags.yml');
    });

    test('returns correct filename for block_content', () => {
      expect(getBundleFilename('block_content', 'banner')).toBe('block_content.type.banner.yml');
    });

    test('throws for unknown entity type', () => {
      expect(() => getBundleFilename('unknown', 'test')).toThrow('Unknown entity type');
    });
  });

  describe('generateNodeType', () => {
    test('generates valid YAML', () => {
      const result = generateNodeType({
        label: 'Page',
        machineName: 'page',
        description: 'A basic page'
      });

      const parsed = yamlLoad(result);
      expect(parsed.name).toBe('Page');
      expect(parsed.type).toBe('page');
      expect(parsed.description).toBe('A basic page');
    });
  });

  describe('generateMediaType', () => {
    test('generates valid YAML', () => {
      const result = generateMediaType({
        label: 'Image',
        machineName: 'image',
        description: 'An image media type',
        sourceType: 'image',
        sourceField: 'field_c_m_image_source'
      });

      const parsed = yamlLoad(result);
      expect(parsed.label).toBe('Image');
      expect(parsed.id).toBe('image');
      expect(parsed.source).toBe('image');
    });
  });

  describe('generateParagraphType', () => {
    test('generates valid YAML', () => {
      const result = generateParagraphType({
        label: 'Text',
        machineName: 'text',
        description: 'A text paragraph'
      });

      const parsed = yamlLoad(result);
      expect(parsed.label).toBe('Text');
      expect(parsed.id).toBe('text');
    });
  });

  describe('generateVocabulary', () => {
    test('generates valid YAML', () => {
      const result = generateVocabulary({
        label: 'Tags',
        machineName: 'tags',
        description: 'A tags vocabulary'
      });

      const parsed = yamlLoad(result);
      expect(parsed.name).toBe('Tags');
      expect(parsed.vid).toBe('tags');
    });
  });

  describe('generateBlockContentType', () => {
    test('generates valid YAML', () => {
      const result = generateBlockContentType({
        label: 'Banner',
        machineName: 'banner',
        description: 'A banner block type'
      });

      const parsed = yamlLoad(result);
      expect(parsed.label).toBe('Banner');
      expect(parsed.id).toBe('banner');
      expect(parsed.description).toBe('A banner block type');
      expect(parsed.revision).toBe(false);
    });

    test('includes required fields', () => {
      const result = generateBlockContentType({
        label: 'Test Block',
        machineName: 'test_block'
      });

      const parsed = yamlLoad(result);
      expect(parsed.langcode).toBe('en');
      expect(parsed.status).toBe(true);
      expect(parsed.dependencies).toEqual({});
    });

    test('handles empty description', () => {
      const result = generateBlockContentType({
        label: 'Test',
        machineName: 'test'
      });

      const parsed = yamlLoad(result);
      expect(parsed.description).toBe('');
    });
  });

  describe('generateBundle', () => {
    test('uses correct generator for node', () => {
      const result = generateBundle('node', { label: 'Page', machineName: 'page' });
      const parsed = yamlLoad(result);
      expect(parsed.type).toBe('page');
    });

    test('uses correct generator for media', () => {
      const result = generateBundle('media', {
        label: 'Image',
        machineName: 'image',
        sourceType: 'image',
        sourceField: 'field_source'
      });
      const parsed = yamlLoad(result);
      expect(parsed.id).toBe('image');
      expect(parsed.source).toBe('image');
    });

    test('uses correct generator for paragraph', () => {
      const result = generateBundle('paragraph', { label: 'Text', machineName: 'text' });
      const parsed = yamlLoad(result);
      expect(parsed.id).toBe('text');
    });

    test('uses correct generator for taxonomy_term', () => {
      const result = generateBundle('taxonomy_term', { label: 'Tags', machineName: 'tags' });
      const parsed = yamlLoad(result);
      expect(parsed.vid).toBe('tags');
    });

    test('uses correct generator for block_content', () => {
      const result = generateBundle('block_content', { label: 'Banner', machineName: 'banner' });
      const parsed = yamlLoad(result);
      expect(parsed.id).toBe('banner');
      expect(parsed.label).toBe('Banner');
      expect(parsed.revision).toBe(false);
    });

    test('throws for unknown entity type', () => {
      expect(() => generateBundle('unknown', {})).toThrow('Unknown entity type');
    });
  });
});
