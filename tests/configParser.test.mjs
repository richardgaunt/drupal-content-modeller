import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { mkdtemp, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';

// Import pure parsing functions
import {
  parseYaml,
  extractBundleIdFromFilename,
  extractFieldNameFromStorageFilename,
  extractFieldNameFromInstanceFilename,
  isFieldInstanceFile,
  parseNodeTypeBundle,
  parseMediaTypeBundle,
  parseParagraphTypeBundle,
  parseTaxonomyVocabularyBundle,
  parseBlockContentTypeBundle,
  parseBundleConfig,
  parseFieldStorage,
  parseFieldInstance,
  filterBundleFiles,
  filterFieldStorageFiles,
  filterFieldInstanceFiles
} from '../src/parsers/configParser';

// Import I/O functions
import {
  parseBundleConfigs,
  parseFieldStorages,
  parseFieldInstances,
  parseConfigDirectory
} from '../src/io/configReader';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesPath = join(__dirname, 'fixtures');

describe('Config Parser - Pure Functions', () => {
  describe('parseYaml', () => {
    test('parses valid YAML', () => {
      const result = parseYaml('name: Test\ntype: test');
      expect(result).toEqual({ name: 'Test', type: 'test' });
    });

    test('returns null for invalid YAML', () => {
      const result = parseYaml('invalid: yaml: content:');
      expect(result).toBeNull();
    });

    test('returns null for empty string', () => {
      const result = parseYaml('');
      expect(result).toBeNull();
    });
  });

  describe('extractBundleIdFromFilename', () => {
    test('extracts node type bundle id', () => {
      expect(extractBundleIdFromFilename('node.type.page.yml', 'node')).toBe('page');
    });

    test('extracts media type bundle id', () => {
      expect(extractBundleIdFromFilename('media.type.image.yml', 'media')).toBe('image');
    });

    test('extracts paragraph type bundle id', () => {
      expect(extractBundleIdFromFilename('paragraphs.paragraphs_type.text.yml', 'paragraph')).toBe('text');
    });

    test('extracts taxonomy vocabulary id', () => {
      expect(extractBundleIdFromFilename('taxonomy.vocabulary.tags.yml', 'taxonomy_term')).toBe('tags');
    });

    test('extracts block content type id', () => {
      expect(extractBundleIdFromFilename('block_content.type.banner.yml', 'block_content')).toBe('banner');
    });

    test('returns null for non-matching filename', () => {
      expect(extractBundleIdFromFilename('other.file.yml', 'node')).toBeNull();
    });

    test('returns null for unknown entity type', () => {
      expect(extractBundleIdFromFilename('node.type.page.yml', 'unknown')).toBeNull();
    });
  });

  describe('extractFieldNameFromStorageFilename', () => {
    test('extracts field name from storage file', () => {
      expect(extractFieldNameFromStorageFilename('field.storage.node.field_body.yml', 'node'))
        .toBe('field_body');
    });

    test('returns null for non-matching filename', () => {
      expect(extractFieldNameFromStorageFilename('other.file.yml', 'node')).toBeNull();
    });
  });

  describe('isFieldInstanceFile', () => {
    test('returns true for matching field instance file', () => {
      expect(isFieldInstanceFile('field.field.node.page.field_body.yml', 'node', 'page')).toBe(true);
    });

    test('returns false for different bundle', () => {
      expect(isFieldInstanceFile('field.field.node.page.field_body.yml', 'node', 'article')).toBe(false);
    });

    test('returns false for non-field file', () => {
      expect(isFieldInstanceFile('node.type.page.yml', 'node', 'page')).toBe(false);
    });
  });

  describe('extractFieldNameFromInstanceFilename', () => {
    test('extracts field name from instance file', () => {
      expect(extractFieldNameFromInstanceFilename('field.field.node.page.field_body.yml', 'node', 'page'))
        .toBe('field_body');
    });

    test('returns null for non-matching filename', () => {
      expect(extractFieldNameFromInstanceFilename('other.file.yml', 'node', 'page')).toBeNull();
    });
  });

  describe('parseNodeTypeBundle', () => {
    test('extracts id, label, description', () => {
      const config = {
        type: 'page',
        name: 'Page',
        description: 'A page content type'
      };
      const result = parseNodeTypeBundle(config);
      expect(result).toEqual({
        id: 'page',
        label: 'Page',
        description: 'A page content type'
      });
    });

    test('handles missing fields', () => {
      const result = parseNodeTypeBundle({});
      expect(result).toEqual({ id: '', label: '', description: '' });
    });
  });

  describe('parseMediaTypeBundle', () => {
    test('extracts id, label, description, source', () => {
      const config = {
        id: 'image',
        label: 'Image',
        description: 'An image media type',
        source: 'image'
      };
      const result = parseMediaTypeBundle(config);
      expect(result).toEqual({
        id: 'image',
        label: 'Image',
        description: 'An image media type',
        source: 'image'
      });
    });
  });

  describe('parseParagraphTypeBundle', () => {
    test('extracts id, label, description', () => {
      const config = {
        id: 'text',
        label: 'Text',
        description: 'A text paragraph'
      };
      const result = parseParagraphTypeBundle(config);
      expect(result).toEqual({
        id: 'text',
        label: 'Text',
        description: 'A text paragraph'
      });
    });
  });

  describe('parseTaxonomyVocabularyBundle', () => {
    test('extracts id from vid, label from name', () => {
      const config = {
        vid: 'tags',
        name: 'Tags',
        description: 'A tags vocabulary'
      };
      const result = parseTaxonomyVocabularyBundle(config);
      expect(result).toEqual({
        id: 'tags',
        label: 'Tags',
        description: 'A tags vocabulary'
      });
    });
  });

  describe('parseBlockContentTypeBundle', () => {
    test('extracts id, label, description', () => {
      const config = {
        id: 'banner',
        label: 'Banner',
        description: 'A banner block type'
      };
      const result = parseBlockContentTypeBundle(config);
      expect(result).toEqual({
        id: 'banner',
        label: 'Banner',
        description: 'A banner block type'
      });
    });

    test('handles missing fields', () => {
      const result = parseBlockContentTypeBundle({});
      expect(result).toEqual({ id: '', label: '', description: '' });
    });
  });

  describe('parseBundleConfig', () => {
    test('uses correct parser for node', () => {
      const config = { type: 'page', name: 'Page' };
      const result = parseBundleConfig(config, 'node');
      expect(result.id).toBe('page');
    });

    test('uses correct parser for media', () => {
      const config = { id: 'image', label: 'Image' };
      const result = parseBundleConfig(config, 'media');
      expect(result.id).toBe('image');
    });

    test('uses correct parser for paragraph', () => {
      const config = { id: 'text', label: 'Text' };
      const result = parseBundleConfig(config, 'paragraph');
      expect(result.id).toBe('text');
    });

    test('uses correct parser for taxonomy_term', () => {
      const config = { vid: 'tags', name: 'Tags' };
      const result = parseBundleConfig(config, 'taxonomy_term');
      expect(result.id).toBe('tags');
    });

    test('uses correct parser for block_content', () => {
      const config = { id: 'banner', label: 'Banner' };
      const result = parseBundleConfig(config, 'block_content');
      expect(result.id).toBe('banner');
    });
  });

  describe('parseFieldStorage', () => {
    test('extracts name, type, cardinality, settings', () => {
      const config = {
        field_name: 'field_body',
        type: 'text_long',
        cardinality: 1,
        settings: { max_length: 255 }
      };
      const result = parseFieldStorage(config);
      expect(result).toEqual({
        name: 'field_body',
        type: 'text_long',
        cardinality: 1,
        settings: { max_length: 255 }
      });
    });

    test('handles unlimited cardinality', () => {
      const config = { field_name: 'field_tags', type: 'entity_reference', cardinality: -1 };
      const result = parseFieldStorage(config);
      expect(result.cardinality).toBe(-1);
    });

    test('defaults cardinality to 1', () => {
      const config = { field_name: 'field_body', type: 'text_long' };
      const result = parseFieldStorage(config);
      expect(result.cardinality).toBe(1);
    });
  });

  describe('parseFieldInstance', () => {
    test('extracts name, label, type, required, settings', () => {
      const config = {
        field_name: 'field_body',
        label: 'Body',
        field_type: 'text_long',
        required: true,
        description: 'The body field',
        settings: { display_summary: true }
      };
      const result = parseFieldInstance(config);
      expect(result).toEqual({
        name: 'field_body',
        label: 'Body',
        type: 'text_long',
        required: true,
        description: 'The body field',
        settings: { display_summary: true }
      });
    });

    test('defaults required to false', () => {
      const config = { field_name: 'field_body', label: 'Body' };
      const result = parseFieldInstance(config);
      expect(result.required).toBe(false);
    });
  });

  describe('filterBundleFiles', () => {
    const files = [
      'node.type.page.yml',
      'node.type.article.yml',
      'media.type.image.yml',
      'field.storage.node.field_body.yml',
      'other.yml'
    ];

    test('filters node type files', () => {
      const result = filterBundleFiles(files, 'node');
      expect(result).toEqual(['node.type.page.yml', 'node.type.article.yml']);
    });

    test('filters media type files', () => {
      const result = filterBundleFiles(files, 'media');
      expect(result).toEqual(['media.type.image.yml']);
    });

    test('returns empty for unknown entity type', () => {
      const result = filterBundleFiles(files, 'unknown');
      expect(result).toEqual([]);
    });
  });

  describe('filterFieldStorageFiles', () => {
    const files = [
      'field.storage.node.field_body.yml',
      'field.storage.node.field_tags.yml',
      'field.storage.media.field_image.yml',
      'node.type.page.yml'
    ];

    test('filters node field storages', () => {
      const result = filterFieldStorageFiles(files, 'node');
      expect(result).toEqual([
        'field.storage.node.field_body.yml',
        'field.storage.node.field_tags.yml'
      ]);
    });

    test('filters media field storages', () => {
      const result = filterFieldStorageFiles(files, 'media');
      expect(result).toEqual(['field.storage.media.field_image.yml']);
    });
  });

  describe('filterFieldInstanceFiles', () => {
    const files = [
      'field.field.node.page.field_body.yml',
      'field.field.node.page.field_tags.yml',
      'field.field.node.article.field_body.yml',
      'node.type.page.yml'
    ];

    test('filters field instances for specific bundle', () => {
      const result = filterFieldInstanceFiles(files, 'node', 'page');
      expect(result).toEqual([
        'field.field.node.page.field_body.yml',
        'field.field.node.page.field_tags.yml'
      ]);
    });

    test('returns empty for bundle with no fields', () => {
      const result = filterFieldInstanceFiles(files, 'node', 'event');
      expect(result).toEqual([]);
    });
  });
});

describe('Config Reader - I/O Functions', () => {
  describe('parseBundleConfigs', () => {
    test('finds node types', async () => {
      const bundles = await parseBundleConfigs(fixturesPath, 'node');
      expect(bundles.length).toBe(2);
      expect(bundles.map(b => b.id).sort()).toEqual(['test_article', 'test_page']);
    });

    test('finds media types', async () => {
      const bundles = await parseBundleConfigs(fixturesPath, 'media');
      expect(bundles.length).toBe(1);
      expect(bundles[0].id).toBe('test_image');
      expect(bundles[0].source).toBe('image');
    });

    test('finds paragraph types', async () => {
      const bundles = await parseBundleConfigs(fixturesPath, 'paragraph');
      expect(bundles.length).toBe(1);
      expect(bundles[0].id).toBe('test_text');
    });

    test('finds vocabularies', async () => {
      const bundles = await parseBundleConfigs(fixturesPath, 'taxonomy_term');
      expect(bundles.length).toBe(1);
      expect(bundles[0].id).toBe('test_tags');
    });

    test('finds block content types', async () => {
      const bundles = await parseBundleConfigs(fixturesPath, 'block_content');
      expect(bundles.length).toBe(1);
      expect(bundles[0].id).toBe('test_banner');
      expect(bundles[0].label).toBe('Test Banner');
    });

    test('extracts id, label, description', async () => {
      const bundles = await parseBundleConfigs(fixturesPath, 'node');
      const page = bundles.find(b => b.id === 'test_page');
      expect(page.label).toBe('Test Page');
      expect(page.description).toBe('A test page content type.');
    });

    test('returns empty array for entity type with no bundles', async () => {
      const tempDir = await mkdtemp(join(tmpdir(), 'dcm-test-'));
      try {
        const bundles = await parseBundleConfigs(tempDir, 'node');
        expect(bundles).toEqual([]);
      } finally {
        await rm(tempDir, { recursive: true, force: true });
      }
    });

    test('throws for missing directory', async () => {
      await expect(parseBundleConfigs('/nonexistent/path', 'node'))
        .rejects.toThrow('does not exist');
    });
  });

  describe('parseFieldStorages', () => {
    test('finds field storages', async () => {
      const storages = await parseFieldStorages(fixturesPath, 'node');
      expect(storages.length).toBe(2);
    });

    test('extracts type and cardinality', async () => {
      const storages = await parseFieldStorages(fixturesPath, 'node');
      const bodyField = storages.find(s => s.name === 'field_body');
      expect(bodyField.type).toBe('text_long');
      expect(bodyField.cardinality).toBe(1);
    });

    test('extracts settings', async () => {
      const storages = await parseFieldStorages(fixturesPath, 'node');
      const tagsField = storages.find(s => s.name === 'field_tags');
      expect(tagsField.settings.target_type).toBe('taxonomy_term');
    });

    test('returns empty for no storages', async () => {
      const tempDir = await mkdtemp(join(tmpdir(), 'dcm-test-'));
      try {
        const storages = await parseFieldStorages(tempDir, 'node');
        expect(storages).toEqual([]);
      } finally {
        await rm(tempDir, { recursive: true, force: true });
      }
    });
  });

  describe('parseFieldInstances', () => {
    test('finds field instances', async () => {
      const instances = await parseFieldInstances(fixturesPath, 'node', 'test_page');
      expect(instances.length).toBe(2);
    });

    test('extracts label and required', async () => {
      const instances = await parseFieldInstances(fixturesPath, 'node', 'test_page');
      const bodyField = instances.find(i => i.name === 'field_body');
      expect(bodyField.label).toBe('Body');
      expect(bodyField.required).toBe(false);

      const tagsField = instances.find(i => i.name === 'field_tags');
      expect(tagsField.label).toBe('Tags');
      expect(tagsField.required).toBe(true);
    });

    test('extracts settings', async () => {
      const instances = await parseFieldInstances(fixturesPath, 'node', 'test_page');
      const tagsField = instances.find(i => i.name === 'field_tags');
      expect(tagsField.settings.handler).toBe('default:taxonomy_term');
    });

    test('returns empty for bundle with no fields', async () => {
      const instances = await parseFieldInstances(fixturesPath, 'node', 'nonexistent');
      expect(instances).toEqual([]);
    });
  });

  describe('parseConfigDirectory', () => {
    test('parses all entity types', async () => {
      const result = await parseConfigDirectory(fixturesPath);
      expect(result).toHaveProperty('node');
      expect(result).toHaveProperty('media');
      expect(result).toHaveProperty('paragraph');
      expect(result).toHaveProperty('taxonomy_term');
      expect(result).toHaveProperty('block_content');
    });

    test('includes bundles with fields', async () => {
      const result = await parseConfigDirectory(fixturesPath);
      expect(result.node.test_page).toBeDefined();
      expect(result.node.test_page.fields.field_body).toBeDefined();
      expect(result.node.test_page.fields.field_tags).toBeDefined();
    });

    test('merges storage and instance data', async () => {
      const result = await parseConfigDirectory(fixturesPath);
      const bodyField = result.node.test_page.fields.field_body;
      expect(bodyField.label).toBe('Body');
      expect(bodyField.type).toBe('text_long');
      expect(bodyField.cardinality).toBe(1);
    });

    test('throws for missing directory', async () => {
      await expect(parseConfigDirectory('/nonexistent/path'))
        .rejects.toThrow('does not exist');
    });
  });

  describe('Error Handling', () => {
    test('handles malformed YAML gracefully', async () => {
      const tempDir = await mkdtemp(join(tmpdir(), 'dcm-test-'));
      try {
        await writeFile(join(tempDir, 'node.type.bad.yml'), 'invalid: yaml: content:');
        await writeFile(join(tempDir, 'node.type.good.yml'), 'name: Good\ntype: good');

        // Should not throw, should skip bad file
        const bundles = await parseBundleConfigs(tempDir, 'node');
        expect(bundles.length).toBe(1);
        expect(bundles[0].id).toBe('good');
      } finally {
        await rm(tempDir, { recursive: true, force: true });
      }
    });
  });
});
