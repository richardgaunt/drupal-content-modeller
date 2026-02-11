import yaml from 'js-yaml';
import { mkdtemp, rm, writeFile, readFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

import {
  generateMachineName,
  validateMachineName,
  getBundleFilename,
  getSourceFieldName,
  generateNodeType,
  generateMediaType,
  generateParagraphType,
  generateVocabulary,
  generateBlockContentType,
  generateMediaSourceFieldStorage,
  generateMediaSourceFieldInstance,
  generateBundle
} from '../src/generators/bundleGenerator.js';

import {
  bundleExists,
  validateBundleMachineName,
  createBundle
} from '../src/commands/create.js';

import { setProjectsDir } from '../src/io/fileSystem.js';
import { createProject } from '../src/commands/project.js';

describe('Bundle Generator', () => {
  describe('generateMachineName', () => {
    test('converts spaces to underscores', () => {
      expect(generateMachineName('My Type')).toBe('my_type');
    });

    test('lowercases', () => {
      expect(generateMachineName('MyType')).toBe('mytype');
    });

    test('removes invalid characters', () => {
      expect(generateMachineName('My Type!')).toBe('my_type');
      expect(generateMachineName('My-Type')).toBe('my_type');
      expect(generateMachineName('My.Type')).toBe('my_type');
    });

    test('handles multiple spaces', () => {
      expect(generateMachineName('My   Content   Type')).toBe('my_content_type');
    });

    test('trims leading/trailing underscores', () => {
      expect(generateMachineName('  My Type  ')).toBe('my_type');
    });

    test('returns empty for null', () => {
      expect(generateMachineName(null)).toBe('');
    });

    test('returns empty for undefined', () => {
      expect(generateMachineName(undefined)).toBe('');
    });
  });

  describe('validateMachineName', () => {
    test('accepts valid name', () => {
      expect(validateMachineName('my_type')).toBe(true);
      expect(validateMachineName('mytype')).toBe(true);
      expect(validateMachineName('my_content_type')).toBe(true);
    });

    test('accepts single character', () => {
      expect(validateMachineName('a')).toBe(true);
    });

    test('accepts name with numbers', () => {
      expect(validateMachineName('type1')).toBe(true);
      expect(validateMachineName('my_type_2')).toBe(true);
    });

    test('rejects name starting with number', () => {
      expect(validateMachineName('1type')).toBe(false);
    });

    test('rejects invalid characters', () => {
      expect(validateMachineName('my-type')).toBe(false);
      expect(validateMachineName('my.type')).toBe(false);
      expect(validateMachineName('my type')).toBe(false);
    });

    test('rejects uppercase', () => {
      expect(validateMachineName('MyType')).toBe(false);
    });

    test('rejects null', () => {
      expect(validateMachineName(null)).toBe(false);
    });

    test('rejects empty string', () => {
      expect(validateMachineName('')).toBe(false);
    });
  });

  describe('getBundleFilename', () => {
    test('returns correct name for node', () => {
      expect(getBundleFilename('node', 'page')).toBe('node.type.page.yml');
    });

    test('returns correct name for media', () => {
      expect(getBundleFilename('media', 'image')).toBe('media.type.image.yml');
    });

    test('returns correct name for paragraph', () => {
      expect(getBundleFilename('paragraph', 'text')).toBe('paragraphs.paragraphs_type.text.yml');
    });

    test('returns correct name for taxonomy', () => {
      expect(getBundleFilename('taxonomy_term', 'tags')).toBe('taxonomy.vocabulary.tags.yml');
    });

    test('returns correct name for block_content', () => {
      expect(getBundleFilename('block_content', 'banner')).toBe('block_content.type.banner.yml');
    });

    test('throws for unknown entity type', () => {
      expect(() => getBundleFilename('unknown', 'test')).toThrow('Unknown entity type');
    });
  });

  describe('getSourceFieldName', () => {
    test('returns correct name for image', () => {
      expect(getSourceFieldName('my_media', 'image')).toBe('field_c_m_my_media_image');
    });

    test('returns correct name for file', () => {
      expect(getSourceFieldName('my_media', 'file')).toBe('field_c_m_my_media_file');
    });

    test('returns correct name for remote_video', () => {
      expect(getSourceFieldName('my_media', 'remote_video')).toBe('field_c_m_my_media_video_url');
    });
  });

  describe('generateNodeType', () => {
    test('returns valid YAML', () => {
      const result = generateNodeType({
        label: 'Page',
        machineName: 'page',
        description: 'A page content type.'
      });

      const parsed = yaml.load(result);
      expect(parsed).toBeDefined();
    });

    test('includes all required fields', () => {
      const result = generateNodeType({
        label: 'Page',
        machineName: 'page',
        description: 'A page content type.'
      });

      const parsed = yaml.load(result);
      expect(parsed.langcode).toBe('en');
      expect(parsed.status).toBe(true);
      expect(parsed.name).toBe('Page');
      expect(parsed.type).toBe('page');
      expect(parsed.description).toBe('A page content type.');
      expect(parsed.new_revision).toBe(true);
    });

    test('handles empty description', () => {
      const result = generateNodeType({
        label: 'Page',
        machineName: 'page'
      });

      const parsed = yaml.load(result);
      expect(parsed.description).toBe('');
    });
  });

  describe('generateMediaType', () => {
    test('returns valid YAML', () => {
      const result = generateMediaType({
        label: 'Image',
        machineName: 'image',
        description: 'Image media type.',
        sourceType: 'image',
        sourceField: 'field_c_m_image_image'
      });

      const parsed = yaml.load(result);
      expect(parsed).toBeDefined();
    });

    test('includes source configuration', () => {
      const result = generateMediaType({
        label: 'Image',
        machineName: 'image',
        sourceType: 'image',
        sourceField: 'field_c_m_image_image'
      });

      const parsed = yaml.load(result);
      expect(parsed.source_configuration).toBeDefined();
      expect(parsed.source_configuration.source_field).toBe('field_c_m_image_image');
    });

    test('sets correct source plugin for image', () => {
      const result = generateMediaType({
        label: 'Image',
        machineName: 'image',
        sourceType: 'image',
        sourceField: 'field_c_m_image_image'
      });

      const parsed = yaml.load(result);
      expect(parsed.source).toBe('image');
    });

    test('sets correct source plugin for file', () => {
      const result = generateMediaType({
        label: 'Document',
        machineName: 'document',
        sourceType: 'file',
        sourceField: 'field_c_m_document_file'
      });

      const parsed = yaml.load(result);
      expect(parsed.source).toBe('file');
    });

    test('sets correct source plugin for remote_video', () => {
      const result = generateMediaType({
        label: 'Video',
        machineName: 'video',
        sourceType: 'remote_video',
        sourceField: 'field_c_m_video_video_url'
      });

      const parsed = yaml.load(result);
      expect(parsed.source).toBe('oembed:video');
    });
  });

  describe('generateParagraphType', () => {
    test('returns valid YAML', () => {
      const result = generateParagraphType({
        label: 'Text',
        machineName: 'text',
        description: 'Text paragraph.'
      });

      const parsed = yaml.load(result);
      expect(parsed).toBeDefined();
    });

    test('includes all required fields', () => {
      const result = generateParagraphType({
        label: 'Text',
        machineName: 'text',
        description: 'Text paragraph.'
      });

      const parsed = yaml.load(result);
      expect(parsed.langcode).toBe('en');
      expect(parsed.status).toBe(true);
      expect(parsed.id).toBe('text');
      expect(parsed.label).toBe('Text');
      expect(parsed.description).toBe('Text paragraph.');
    });
  });

  describe('generateVocabulary', () => {
    test('returns valid YAML', () => {
      const result = generateVocabulary({
        label: 'Tags',
        machineName: 'tags',
        description: 'Tags vocabulary.'
      });

      const parsed = yaml.load(result);
      expect(parsed).toBeDefined();
    });

    test('includes all required fields', () => {
      const result = generateVocabulary({
        label: 'Tags',
        machineName: 'tags',
        description: 'Tags vocabulary.'
      });

      const parsed = yaml.load(result);
      expect(parsed.langcode).toBe('en');
      expect(parsed.status).toBe(true);
      expect(parsed.name).toBe('Tags');
      expect(parsed.vid).toBe('tags');
      expect(parsed.description).toBe('Tags vocabulary.');
    });
  });

  describe('generateBlockContentType', () => {
    test('returns valid YAML', () => {
      const result = generateBlockContentType({
        label: 'Banner',
        machineName: 'banner',
        description: 'A banner block type.'
      });

      const parsed = yaml.load(result);
      expect(parsed).toBeDefined();
    });

    test('includes all required fields', () => {
      const result = generateBlockContentType({
        label: 'Banner',
        machineName: 'banner',
        description: 'A banner block type.'
      });

      const parsed = yaml.load(result);
      expect(parsed.langcode).toBe('en');
      expect(parsed.status).toBe(true);
      expect(parsed.id).toBe('banner');
      expect(parsed.label).toBe('Banner');
      expect(parsed.description).toBe('A banner block type.');
      expect(parsed.revision).toBe(false);
    });

    test('handles empty description', () => {
      const result = generateBlockContentType({
        label: 'Banner',
        machineName: 'banner'
      });

      const parsed = yaml.load(result);
      expect(parsed.description).toBe('');
    });
  });

  describe('generateMediaSourceFieldStorage', () => {
    test('creates valid storage YAML for image', () => {
      const result = generateMediaSourceFieldStorage({
        fieldName: 'field_c_m_image_image',
        sourceType: 'image'
      });

      const parsed = yaml.load(result);
      expect(parsed.id).toBe('media.field_c_m_image_image');
      expect(parsed.field_name).toBe('field_c_m_image_image');
      expect(parsed.entity_type).toBe('media');
      expect(parsed.type).toBe('image');
    });

    test('creates valid storage YAML for file', () => {
      const result = generateMediaSourceFieldStorage({
        fieldName: 'field_c_m_doc_file',
        sourceType: 'file'
      });

      const parsed = yaml.load(result);
      expect(parsed.type).toBe('file');
    });

    test('creates valid storage YAML for remote_video', () => {
      const result = generateMediaSourceFieldStorage({
        fieldName: 'field_c_m_video_video_url',
        sourceType: 'remote_video'
      });

      const parsed = yaml.load(result);
      expect(parsed.type).toBe('string');
    });
  });

  describe('generateMediaSourceFieldInstance', () => {
    test('creates valid instance YAML', () => {
      const result = generateMediaSourceFieldInstance({
        fieldName: 'field_c_m_image_image',
        bundleName: 'image',
        sourceType: 'image',
        label: 'Image'
      });

      const parsed = yaml.load(result);
      expect(parsed.id).toBe('media.image.field_c_m_image_image');
      expect(parsed.field_name).toBe('field_c_m_image_image');
      expect(parsed.entity_type).toBe('media');
      expect(parsed.bundle).toBe('image');
      expect(parsed.label).toBe('Image');
      expect(parsed.required).toBe(true);
    });
  });

  describe('generateBundle', () => {
    test('generates node type', () => {
      const result = generateBundle('node', {
        label: 'Page',
        machineName: 'page'
      });

      const parsed = yaml.load(result);
      expect(parsed.type).toBe('page');
    });

    test('generates media type', () => {
      const result = generateBundle('media', {
        label: 'Image',
        machineName: 'image',
        sourceType: 'image',
        sourceField: 'field_c_m_image_image'
      });

      const parsed = yaml.load(result);
      expect(parsed.id).toBe('image');
    });

    test('generates paragraph type', () => {
      const result = generateBundle('paragraph', {
        label: 'Text',
        machineName: 'text'
      });

      const parsed = yaml.load(result);
      expect(parsed.id).toBe('text');
    });

    test('generates vocabulary', () => {
      const result = generateBundle('taxonomy_term', {
        label: 'Tags',
        machineName: 'tags'
      });

      const parsed = yaml.load(result);
      expect(parsed.vid).toBe('tags');
    });

    test('generates block_content type', () => {
      const result = generateBundle('block_content', {
        label: 'Banner',
        machineName: 'banner'
      });

      const parsed = yaml.load(result);
      expect(parsed.id).toBe('banner');
      expect(parsed.label).toBe('Banner');
      expect(parsed.revision).toBe(false);
    });

    test('throws for unknown entity type', () => {
      expect(() => generateBundle('unknown', {})).toThrow('Unknown entity type');
    });
  });
});

describe('Create Commands', () => {
  let tempDir;
  let tempConfigDir;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'dcm-test-'));
    tempConfigDir = await mkdtemp(join(tmpdir(), 'dcm-config-'));
    setProjectsDir(tempDir);

    // Create a placeholder yml file
    await writeFile(join(tempConfigDir, 'system.site.yml'), 'name: Test');
  });

  afterEach(async () => {
    setProjectsDir(null);
    await rm(tempDir, { recursive: true, force: true });
    await rm(tempConfigDir, { recursive: true, force: true });
  });

  describe('bundleExists', () => {
    test('returns false for null entities', () => {
      const project = { entities: null };
      expect(bundleExists(project, 'node', 'page')).toBe(false);
    });

    test('returns false for missing entity type', () => {
      const project = { entities: { node: {} } };
      expect(bundleExists(project, 'media', 'image')).toBe(false);
    });

    test('returns false for non-existent bundle', () => {
      const project = { entities: { node: { article: {} } } };
      expect(bundleExists(project, 'node', 'page')).toBe(false);
    });

    test('returns true for existing bundle', () => {
      const project = { entities: { node: { page: {} } } };
      expect(bundleExists(project, 'node', 'page')).toBe(true);
    });
  });

  describe('validateBundleMachineName', () => {
    test('rejects empty name', () => {
      const project = { entities: {} };
      expect(validateBundleMachineName(project, 'node', '')).not.toBe(true);
    });

    test('rejects invalid characters', () => {
      const project = { entities: {} };
      expect(validateBundleMachineName(project, 'node', 'my-type')).not.toBe(true);
    });

    test('rejects existing bundle', () => {
      const project = { entities: { node: { page: {} } } };
      const result = validateBundleMachineName(project, 'node', 'page');
      expect(result).toContain('already exists');
    });

    test('accepts valid unique name', () => {
      const project = { entities: { node: {} } };
      expect(validateBundleMachineName(project, 'node', 'my_type')).toBe(true);
    });
  });

  describe('createBundle', () => {
    test('creates node type file', async () => {
      const project = await createProject('Test Project', tempConfigDir);

      const result = await createBundle(project, 'node', {
        label: 'Page',
        machineName: 'page',
        description: 'A page.'
      });

      expect(result.createdFiles).toContain('node.type.page.yml');

      const content = await readFile(join(tempConfigDir, 'node.type.page.yml'), 'utf-8');
      const parsed = yaml.load(content);
      expect(parsed.name).toBe('Page');
      expect(parsed.type).toBe('page');
    });

    test('creates media type with source field files', async () => {
      const project = await createProject('Test Project', tempConfigDir);

      const result = await createBundle(project, 'media', {
        label: 'Image',
        machineName: 'image',
        description: 'Image media.',
        sourceType: 'image'
      });

      expect(result.createdFiles).toContain('media.type.image.yml');
      expect(result.createdFiles.some(f => f.startsWith('field.storage.media.'))).toBe(true);
      expect(result.createdFiles.some(f => f.startsWith('field.field.media.image.'))).toBe(true);
    });

    test('creates paragraph type file', async () => {
      const project = await createProject('Test Project', tempConfigDir);

      const result = await createBundle(project, 'paragraph', {
        label: 'Text',
        machineName: 'text'
      });

      expect(result.createdFiles).toContain('paragraphs.paragraphs_type.text.yml');
    });

    test('creates vocabulary file', async () => {
      const project = await createProject('Test Project', tempConfigDir);

      const result = await createBundle(project, 'taxonomy_term', {
        label: 'Tags',
        machineName: 'tags'
      });

      expect(result.createdFiles).toContain('taxonomy.vocabulary.tags.yml');
    });

    test('updates project entities after creation', async () => {
      const project = await createProject('Test Project', tempConfigDir);

      await createBundle(project, 'node', {
        label: 'Page',
        machineName: 'page'
      });

      expect(project.entities.node.page).toBeDefined();
      expect(project.entities.node.page.label).toBe('Page');
    });

    test('throws for invalid project', async () => {
      await expect(createBundle(null, 'node', {})).rejects.toThrow('Invalid project');
    });

    test('throws for invalid machine name', async () => {
      const project = await createProject('Test Project', tempConfigDir);

      await expect(createBundle(project, 'node', {
        label: 'Page',
        machineName: 'my-page'
      })).rejects.toThrow();
    });

    test('throws for duplicate bundle', async () => {
      const project = await createProject('Test Project', tempConfigDir);

      await createBundle(project, 'node', {
        label: 'Page',
        machineName: 'page'
      });

      await expect(createBundle(project, 'node', {
        label: 'Page 2',
        machineName: 'page'
      })).rejects.toThrow('already exists');
    });
  });
});
