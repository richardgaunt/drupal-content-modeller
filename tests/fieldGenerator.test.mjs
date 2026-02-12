import yaml from 'js-yaml';
import { mkdtemp, rm, writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

import {
  getModuleForFieldType,
  generateFieldName,
  getStorageFilename,
  getInstanceFilename,
  getStringSettings,
  getListStringSettings,
  getEntityReferenceSettings,
  getEntityReferenceHandlerSettings,
  getEntityReferenceRevisionsStorageSettings,
  getEntityReferenceRevisionsHandlerSettings,
  getLinkSettings,
  getImageSettings,
  getFileSettings,
  generateFieldStorage,
  generateFieldInstance,
  fieldStorageExists,
  getExistingFieldType
} from '../src/generators/fieldGenerator.js';

import {
  validateFieldMachineName,
  createField
} from '../src/commands/create.js';

import { setProjectsDir } from '../src/io/fileSystem.js';
import { createProject } from '../src/commands/project.js';

const yamlLoad = yaml.load;

describe('Field Generator', () => {
  describe('getModuleForFieldType', () => {
    test('returns core for string', () => {
      expect(getModuleForFieldType('string')).toBe('core');
    });

    test('returns text for text_long', () => {
      expect(getModuleForFieldType('text_long')).toBe('text');
    });

    test('returns options for list_string', () => {
      expect(getModuleForFieldType('list_string')).toBe('options');
    });

    test('returns link for link', () => {
      expect(getModuleForFieldType('link')).toBe('link');
    });

    test('returns image for image', () => {
      expect(getModuleForFieldType('image')).toBe('image');
    });

    test('returns file for file', () => {
      expect(getModuleForFieldType('file')).toBe('file');
    });

    test('returns core for entity_reference', () => {
      expect(getModuleForFieldType('entity_reference')).toBe('core');
    });

    test('returns entity_reference_revisions for entity_reference_revisions', () => {
      expect(getModuleForFieldType('entity_reference_revisions')).toBe('entity_reference_revisions');
    });

    test('returns core for unknown type', () => {
      expect(getModuleForFieldType('unknown')).toBe('core');
    });
  });

  describe('generateFieldName', () => {
    test('adds correct prefix for node', () => {
      expect(generateFieldName('node', 'My Field')).toBe('field_n_my_field');
    });

    test('adds correct prefix for media', () => {
      expect(generateFieldName('media', 'My Field')).toBe('field_m_my_field');
    });

    test('adds correct prefix for paragraph', () => {
      expect(generateFieldName('paragraph', 'My Field')).toBe('field_p_my_field');
    });

    test('adds correct prefix for taxonomy_term', () => {
      expect(generateFieldName('taxonomy_term', 'My Field')).toBe('field_t_my_field');
    });

    test('adds correct prefix for block_content', () => {
      expect(generateFieldName('block_content', 'My Field')).toBe('field_b_my_field');
    });

    test('converts label to machine name', () => {
      expect(generateFieldName('node', 'My Field')).toBe('field_n_my_field');
      expect(generateFieldName('node', 'Related Topics')).toBe('field_n_related_topics');
    });
  });

  describe('getStorageFilename', () => {
    test('returns correct format', () => {
      expect(getStorageFilename('node', 'field_body')).toBe('field.storage.node.field_body.yml');
      expect(getStorageFilename('media', 'field_image')).toBe('field.storage.media.field_image.yml');
    });
  });

  describe('getInstanceFilename', () => {
    test('returns correct format', () => {
      expect(getInstanceFilename('node', 'page', 'field_body')).toBe('field.field.node.page.field_body.yml');
      expect(getInstanceFilename('media', 'image', 'field_alt')).toBe('field.field.media.image.field_alt.yml');
    });
  });

  describe('getStringSettings', () => {
    test('includes max_length', () => {
      const settings = getStringSettings();
      expect(settings.max_length).toBe(255);
    });

    test('uses custom max_length', () => {
      const settings = getStringSettings({ maxLength: 100 });
      expect(settings.max_length).toBe(100);
    });
  });

  describe('getListStringSettings', () => {
    test('includes allowed_values', () => {
      const settings = getListStringSettings({
        allowedValues: [
          { value: 'opt1', label: 'Option 1' },
          { value: 'opt2', label: 'Option 2' }
        ]
      });

      expect(settings.allowed_values).toHaveLength(2);
      expect(settings.allowed_values[0].value).toBe('opt1');
      expect(settings.allowed_values[0].label).toBe('Option 1');
    });

    test('handles empty allowed_values', () => {
      const settings = getListStringSettings();
      expect(settings.allowed_values).toEqual([]);
    });
  });

  describe('getEntityReferenceSettings', () => {
    test('includes target_type', () => {
      const settings = getEntityReferenceSettings({ targetType: 'media' });
      expect(settings.target_type).toBe('media');
    });

    test('defaults to node', () => {
      const settings = getEntityReferenceSettings();
      expect(settings.target_type).toBe('node');
    });
  });

  describe('getEntityReferenceHandlerSettings', () => {
    test('includes handler_settings with target_bundles', () => {
      const settings = getEntityReferenceHandlerSettings({
        targetBundles: ['page', 'article']
      });

      expect(settings.handler).toBe('default');
      expect(settings.handler_settings.target_bundles).toEqual({
        page: 'page',
        article: 'article'
      });
    });
  });

  describe('getEntityReferenceRevisionsStorageSettings', () => {
    test('always returns paragraph as target_type', () => {
      const settings = getEntityReferenceRevisionsStorageSettings();
      expect(settings.target_type).toBe('paragraph');
    });
  });

  describe('getEntityReferenceRevisionsHandlerSettings', () => {
    test('uses default:paragraph handler', () => {
      const settings = getEntityReferenceRevisionsHandlerSettings({
        targetBundles: ['accordion', 'content']
      });

      expect(settings.handler).toBe('default:paragraph');
    });

    test('includes target_bundles', () => {
      const settings = getEntityReferenceRevisionsHandlerSettings({
        targetBundles: ['accordion', 'content']
      });

      expect(settings.handler_settings.target_bundles).toEqual({
        accordion: 'accordion',
        content: 'content'
      });
    });

    test('includes negate setting', () => {
      const settings = getEntityReferenceRevisionsHandlerSettings({
        targetBundles: ['accordion']
      });

      expect(settings.handler_settings.negate).toBe(0);
    });

    test('includes target_bundles_drag_drop with weights', () => {
      const settings = getEntityReferenceRevisionsHandlerSettings({
        targetBundles: ['accordion', 'content', 'text']
      });

      expect(settings.handler_settings.target_bundles_drag_drop).toEqual({
        accordion: { weight: 0, enabled: true },
        content: { weight: 1, enabled: true },
        text: { weight: 2, enabled: true }
      });
    });

    test('handles empty target bundles', () => {
      const settings = getEntityReferenceRevisionsHandlerSettings({});

      expect(settings.handler_settings.target_bundles).toEqual({});
      expect(settings.handler_settings.target_bundles_drag_drop).toEqual({});
    });
  });

  describe('getLinkSettings', () => {
    test('includes link_type 17 when external allowed', () => {
      const settings = getLinkSettings({ allowExternal: true });
      expect(settings.link_type).toBe(17);
    });

    test('includes link_type 1 when external not allowed', () => {
      const settings = getLinkSettings({ allowExternal: false });
      expect(settings.link_type).toBe(1);
    });

    test('includes title setting', () => {
      expect(getLinkSettings({ titleOption: 'disabled' }).title).toBe(0);
      expect(getLinkSettings({ titleOption: 'optional' }).title).toBe(1);
      expect(getLinkSettings({ titleOption: 'required' }).title).toBe(2);
    });
  });

  describe('getImageSettings', () => {
    test('includes file_extensions', () => {
      const settings = getImageSettings();
      expect(settings.file_extensions).toBe('png gif jpg jpeg svg');
    });

    test('includes alt_field_required', () => {
      expect(getImageSettings().alt_field_required).toBe(true);
      expect(getImageSettings({ altRequired: false }).alt_field_required).toBe(false);
    });

    test('includes file_directory', () => {
      const settings = getImageSettings();
      expect(settings.file_directory).toBe('images/[date:custom:Y]-[date:custom:m]');
    });

    test('uses custom extensions', () => {
      const settings = getImageSettings({ fileExtensions: 'png jpg' });
      expect(settings.file_extensions).toBe('png jpg');
    });
  });

  describe('getFileSettings', () => {
    test('includes file_extensions', () => {
      const settings = getFileSettings();
      expect(settings.file_extensions).toBe('txt pdf doc docx xls xlsx');
    });

    test('includes file_directory', () => {
      const settings = getFileSettings();
      expect(settings.file_directory).toBe('documents/[date:custom:Y]-[date:custom:m]');
    });
  });

  describe('generateFieldStorage', () => {
    test('returns valid YAML', () => {
      const result = generateFieldStorage({
        entityType: 'node',
        fieldName: 'field_body',
        fieldType: 'text_long',
        cardinality: 1
      });

      const parsed = yamlLoad(result);
      expect(parsed).toBeDefined();
    });

    test('includes correct module', () => {
      const result = generateFieldStorage({
        entityType: 'node',
        fieldName: 'field_body',
        fieldType: 'text_long',
        cardinality: 1
      });

      const parsed = yamlLoad(result);
      expect(parsed.module).toBe('text');
    });

    test('sets cardinality', () => {
      const single = generateFieldStorage({
        entityType: 'node',
        fieldName: 'field_body',
        fieldType: 'string',
        cardinality: 1
      });

      const unlimited = generateFieldStorage({
        entityType: 'node',
        fieldName: 'field_tags',
        fieldType: 'entity_reference',
        cardinality: -1
      });

      expect(yamlLoad(single).cardinality).toBe(1);
      expect(yamlLoad(unlimited).cardinality).toBe(-1);
    });

    test('includes type-specific settings for list_string', () => {
      const result = generateFieldStorage({
        entityType: 'node',
        fieldName: 'field_status',
        fieldType: 'list_string',
        cardinality: 1,
        settings: {
          allowedValues: [
            { value: 'draft', label: 'Draft' },
            { value: 'published', label: 'Published' }
          ]
        }
      });

      const parsed = yamlLoad(result);
      expect(parsed.settings.allowed_values).toBeDefined();
      expect(parsed.settings.allowed_values).toHaveLength(2);
    });

    test('includes both modules for entity_reference_revisions', () => {
      const result = generateFieldStorage({
        entityType: 'node',
        fieldName: 'field_n_components',
        fieldType: 'entity_reference_revisions',
        cardinality: -1
      });

      const parsed = yamlLoad(result);
      expect(parsed.dependencies.module).toContain('entity_reference_revisions');
      expect(parsed.dependencies.module).toContain('paragraphs');
    });

    test('uses paragraph target_type for entity_reference_revisions', () => {
      const result = generateFieldStorage({
        entityType: 'node',
        fieldName: 'field_n_components',
        fieldType: 'entity_reference_revisions',
        cardinality: -1
      });

      const parsed = yamlLoad(result);
      expect(parsed.settings.target_type).toBe('paragraph');
    });
  });

  describe('generateFieldInstance', () => {
    test('returns valid YAML', () => {
      const result = generateFieldInstance({
        entityType: 'node',
        bundle: 'page',
        fieldName: 'field_body',
        fieldType: 'text_long',
        label: 'Body',
        required: false
      });

      const parsed = yamlLoad(result);
      expect(parsed).toBeDefined();
    });

    test('includes dependencies', () => {
      const result = generateFieldInstance({
        entityType: 'node',
        bundle: 'page',
        fieldName: 'field_body',
        fieldType: 'text_long',
        label: 'Body'
      });

      const parsed = yamlLoad(result);
      expect(parsed.dependencies.config).toContain('field.storage.node.field_body');
      expect(parsed.dependencies.config).toContain('node.type.page');
    });

    test('includes block_content type dependency', () => {
      const result = generateFieldInstance({
        entityType: 'block_content',
        bundle: 'banner',
        fieldName: 'field_b_theme',
        fieldType: 'list_string',
        label: 'Theme'
      });

      const parsed = yamlLoad(result);
      expect(parsed.dependencies.config).toContain('field.storage.block_content.field_b_theme');
      expect(parsed.dependencies.config).toContain('block_content.type.banner');
    });

    test('sets required', () => {
      const required = generateFieldInstance({
        entityType: 'node',
        bundle: 'page',
        fieldName: 'field_body',
        fieldType: 'text_long',
        label: 'Body',
        required: true
      });

      const optional = generateFieldInstance({
        entityType: 'node',
        bundle: 'page',
        fieldName: 'field_body',
        fieldType: 'text_long',
        label: 'Body',
        required: false
      });

      expect(yamlLoad(required).required).toBe(true);
      expect(yamlLoad(optional).required).toBe(false);
    });

    test('includes type-specific settings for entity_reference', () => {
      const result = generateFieldInstance({
        entityType: 'node',
        bundle: 'page',
        fieldName: 'field_tags',
        fieldType: 'entity_reference',
        label: 'Tags',
        settings: {
          targetBundles: ['tags', 'categories']
        }
      });

      const parsed = yamlLoad(result);
      expect(parsed.settings.handler_settings).toBeDefined();
      expect(parsed.settings.handler_settings.target_bundles).toEqual({
        tags: 'tags',
        categories: 'categories'
      });
    });

    test('uses default:paragraph handler for entity_reference_revisions', () => {
      const result = generateFieldInstance({
        entityType: 'node',
        bundle: 'page',
        fieldName: 'field_n_components',
        fieldType: 'entity_reference_revisions',
        label: 'Components',
        settings: {
          targetBundles: ['accordion', 'content']
        }
      });

      const parsed = yamlLoad(result);
      expect(parsed.settings.handler).toBe('default:paragraph');
    });

    test('includes target_bundles_drag_drop for entity_reference_revisions', () => {
      const result = generateFieldInstance({
        entityType: 'node',
        bundle: 'page',
        fieldName: 'field_n_components',
        fieldType: 'entity_reference_revisions',
        label: 'Components',
        settings: {
          targetBundles: ['accordion', 'content']
        }
      });

      const parsed = yamlLoad(result);
      expect(parsed.settings.handler_settings.target_bundles_drag_drop).toEqual({
        accordion: { weight: 0, enabled: true },
        content: { weight: 1, enabled: true }
      });
    });

    test('includes paragraph type dependencies for entity_reference_revisions', () => {
      const result = generateFieldInstance({
        entityType: 'node',
        bundle: 'page',
        fieldName: 'field_n_components',
        fieldType: 'entity_reference_revisions',
        label: 'Components',
        settings: {
          targetBundles: ['accordion', 'content']
        }
      });

      const parsed = yamlLoad(result);
      expect(parsed.dependencies.config).toContain('paragraphs.paragraphs_type.accordion');
      expect(parsed.dependencies.config).toContain('paragraphs.paragraphs_type.content');
    });
  });

  describe('fieldStorageExists', () => {
    test('returns false for null entities', () => {
      const project = { entities: null };
      expect(fieldStorageExists(project, 'node', 'field_body')).toBe(false);
    });

    test('returns false for non-existent field', () => {
      const project = {
        entities: {
          node: {
            page: { fields: {} }
          }
        }
      };
      expect(fieldStorageExists(project, 'node', 'field_body')).toBe(false);
    });

    test('returns true for existing field', () => {
      const project = {
        entities: {
          node: {
            page: {
              fields: {
                field_body: { type: 'text_long' }
              }
            }
          }
        }
      };
      expect(fieldStorageExists(project, 'node', 'field_body')).toBe(true);
    });
  });

  describe('getExistingFieldType', () => {
    test('returns null for non-existent field', () => {
      const project = {
        entities: {
          node: {
            page: { fields: {} }
          }
        }
      };
      expect(getExistingFieldType(project, 'node', 'field_body')).toBe(null);
    });

    test('returns field type for existing field', () => {
      const project = {
        entities: {
          node: {
            page: {
              fields: {
                field_body: { type: 'text_long' }
              }
            }
          }
        }
      };
      expect(getExistingFieldType(project, 'node', 'field_body')).toBe('text_long');
    });
  });
});

describe('Field Creation Commands', () => {
  let tempDir;
  let tempConfigDir;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'dcm-test-'));
    tempConfigDir = await mkdtemp(join(tmpdir(), 'dcm-config-'));
    setProjectsDir(tempDir);

    // Create a placeholder yml file and a node type
    await writeFile(join(tempConfigDir, 'system.site.yml'), 'name: Test');
    await writeFile(join(tempConfigDir, 'node.type.page.yml'), `
langcode: en
status: true
name: Page
type: page
description: A page.
`);
  });

  afterEach(async () => {
    setProjectsDir(null);
    await rm(tempDir, { recursive: true, force: true });
    await rm(tempConfigDir, { recursive: true, force: true });
  });

  describe('validateFieldMachineName', () => {
    test('rejects empty name', () => {
      expect(validateFieldMachineName('')).not.toBe(true);
    });

    test('rejects name not starting with field_', () => {
      expect(validateFieldMachineName('my_field')).not.toBe(true);
    });

    test('rejects invalid characters', () => {
      expect(validateFieldMachineName('field_my-field')).not.toBe(true);
    });

    test('accepts valid name', () => {
      expect(validateFieldMachineName('field_body')).toBe(true);
      expect(validateFieldMachineName('field_n_my_field')).toBe(true);
    });
  });

  describe('createField', () => {
    test('creates storage and instance files', async () => {
      const project = await createProject('Test Project', tempConfigDir);

      const result = await createField(project, 'node', ['page'], {
        fieldName: 'field_body',
        fieldType: 'text_long',
        label: 'Body',
        description: 'Page body content',
        required: false,
        cardinality: 1
      });

      expect(result.storageCreated).toBe(true);
      expect(result.createdFiles).toContain('field.storage.node.field_body.yml');
      expect(result.createdFiles).toContain('field.field.node.page.field_body.yml');
    });

    test('creates instance for multiple bundles', async () => {
      // Create another node type
      await writeFile(join(tempConfigDir, 'node.type.article.yml'), `
langcode: en
status: true
name: Article
type: article
`);

      const project = await createProject('Test Project', tempConfigDir);

      const result = await createField(project, 'node', ['page', 'article'], {
        fieldName: 'field_summary',
        fieldType: 'string',
        label: 'Summary',
        cardinality: 1
      });

      expect(result.createdFiles).toContain('field.storage.node.field_summary.yml');
      expect(result.createdFiles).toContain('field.field.node.page.field_summary.yml');
      expect(result.createdFiles).toContain('field.field.node.article.field_summary.yml');
    });

    test('reuses existing storage', async () => {
      // Create another node type first
      await writeFile(join(tempConfigDir, 'node.type.article.yml'), `
langcode: en
status: true
name: Article
type: article
`);

      const project = await createProject('Test Project', tempConfigDir);

      // Create first field on page
      await createField(project, 'node', ['page'], {
        fieldName: 'field_shared',
        fieldType: 'string',
        label: 'Shared Field',
        cardinality: 1
      });

      // Create second instance on article - should reuse storage
      const result = await createField(project, 'node', ['article'], {
        fieldName: 'field_shared',
        fieldType: 'string',
        label: 'Shared Field',
        cardinality: 1
      });

      expect(result.storageCreated).toBe(false);
      expect(result.createdFiles).not.toContain('field.storage.node.field_shared.yml');
      expect(result.createdFiles).toContain('field.field.node.article.field_shared.yml');
    });

    test('throws for invalid project', async () => {
      await expect(createField(null, 'node', ['page'], {})).rejects.toThrow('Invalid project');
    });

    test('throws for empty bundles', async () => {
      const project = await createProject('Test Project', tempConfigDir);

      await expect(createField(project, 'node', [], {
        fieldName: 'field_body',
        fieldType: 'text_long',
        label: 'Body'
      })).rejects.toThrow('At least one bundle');
    });

    test('throws for invalid field name', async () => {
      const project = await createProject('Test Project', tempConfigDir);

      await expect(createField(project, 'node', ['page'], {
        fieldName: 'invalid-name',
        fieldType: 'text_long',
        label: 'Body'
      })).rejects.toThrow();
    });
  });
});
