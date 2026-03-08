import yaml from 'js-yaml';
import { mkdtemp, rm, writeFile, readdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { existsSync } from 'fs';

import {
  isViewModeFile,
  filterViewModeFiles,
  filterViewModeFilesByEntityType,
  extractViewModeFromFilename,
  getViewModeFilename,
  parseViewMode
} from '../src/parsers/viewModeParser.js';

import {
  generateViewMode
} from '../src/generators/viewModeGenerator.js';

import {
  parseViewModes,
  viewModeExists,
  writeViewMode,
  deleteViewMode
} from '../src/io/configReader.js';

describe('View Mode Parser', () => {
  describe('isViewModeFile', () => {
    test('identifies view mode files', () => {
      expect(isViewModeFile('core.entity_view_mode.node.teaser.yml')).toBe(true);
      expect(isViewModeFile('core.entity_view_mode.media.component.yml')).toBe(true);
    });

    test('rejects non-view-mode files', () => {
      expect(isViewModeFile('node.type.page.yml')).toBe(false);
      expect(isViewModeFile('core.entity_form_display.node.page.default.yml')).toBe(false);
    });
  });

  describe('filterViewModeFiles', () => {
    test('filters only view mode files', () => {
      const files = [
        'core.entity_view_mode.node.teaser.yml',
        'node.type.page.yml',
        'core.entity_view_mode.media.component.yml',
        'field.storage.node.field_n_body.yml'
      ];

      const result = filterViewModeFiles(files);
      expect(result).toEqual([
        'core.entity_view_mode.node.teaser.yml',
        'core.entity_view_mode.media.component.yml'
      ]);
    });
  });

  describe('filterViewModeFilesByEntityType', () => {
    test('filters view mode files by entity type', () => {
      const files = [
        'core.entity_view_mode.node.teaser.yml',
        'core.entity_view_mode.node.full.yml',
        'core.entity_view_mode.media.component.yml'
      ];

      expect(filterViewModeFilesByEntityType(files, 'node')).toEqual([
        'core.entity_view_mode.node.teaser.yml',
        'core.entity_view_mode.node.full.yml'
      ]);

      expect(filterViewModeFilesByEntityType(files, 'media')).toEqual([
        'core.entity_view_mode.media.component.yml'
      ]);

      expect(filterViewModeFilesByEntityType(files, 'paragraph')).toEqual([]);
    });
  });

  describe('extractViewModeFromFilename', () => {
    test('extracts entity type and view mode name', () => {
      expect(extractViewModeFromFilename('core.entity_view_mode.node.teaser.yml')).toEqual({
        entityType: 'node',
        viewModeName: 'teaser'
      });
    });

    test('handles underscored view mode names', () => {
      expect(extractViewModeFromFilename('core.entity_view_mode.node.civictheme_promo_card.yml')).toEqual({
        entityType: 'node',
        viewModeName: 'civictheme_promo_card'
      });
    });

    test('handles taxonomy_term entity type', () => {
      // Note: taxonomy_term contains a dot-separated format in the filename
      // The filename format is core.entity_view_mode.<entityType>.<viewModeName>.yml
      // For taxonomy_term, the entityType portion is "taxonomy_term"
      expect(extractViewModeFromFilename('core.entity_view_mode.taxonomy_term.card.yml')).toEqual({
        entityType: 'taxonomy_term',
        viewModeName: 'card'
      });
    });

    test('returns null for non-view-mode files', () => {
      expect(extractViewModeFromFilename('node.type.page.yml')).toBeNull();
    });
  });

  describe('getViewModeFilename', () => {
    test('generates correct filename', () => {
      expect(getViewModeFilename('node', 'teaser')).toBe('core.entity_view_mode.node.teaser.yml');
      expect(getViewModeFilename('media', 'component')).toBe('core.entity_view_mode.media.component.yml');
    });
  });

  describe('parseViewMode', () => {
    test('parses view mode config', () => {
      const config = {
        langcode: 'en',
        status: true,
        dependencies: { module: ['node'] },
        id: 'node.teaser',
        label: 'Teaser',
        description: 'A teaser view',
        targetEntityType: 'node',
        cache: true
      };

      const result = parseViewMode(config);
      expect(result).toEqual({
        id: 'node.teaser',
        label: 'Teaser',
        description: 'A teaser view',
        targetEntityType: 'node',
        cache: true,
        dependencies: { module: ['node'] }
      });
    });

    test('handles missing fields with defaults', () => {
      const config = {
        id: 'media.component',
        label: 'Component'
      };

      const result = parseViewMode(config);
      expect(result.description).toBe('');
      expect(result.targetEntityType).toBe('');
      expect(result.cache).toBe(true);
    });

    test('returns null for null input', () => {
      expect(parseViewMode(null)).toBeNull();
    });
  });
});

describe('View Mode Generator', () => {
  test('generates valid YAML for node view mode', () => {
    const result = generateViewMode({
      entityType: 'node',
      viewModeName: 'promo_card',
      label: 'Promo Card',
      description: ''
    });

    const parsed = yaml.load(result);
    expect(parsed.langcode).toBe('en');
    expect(parsed.status).toBe(true);
    expect(parsed.dependencies.module).toEqual(['node']);
    expect(parsed.id).toBe('node.promo_card');
    expect(parsed.label).toBe('Promo Card');
    expect(parsed.description).toBe('');
    expect(parsed.targetEntityType).toBe('node');
    expect(parsed.cache).toBe(true);
  });

  test('generates correct module dependency for media', () => {
    const result = generateViewMode({
      entityType: 'media',
      viewModeName: 'component',
      label: 'Component'
    });

    const parsed = yaml.load(result);
    expect(parsed.dependencies.module).toEqual(['media']);
    expect(parsed.targetEntityType).toBe('media');
  });

  test('generates correct module dependency for paragraph', () => {
    const result = generateViewMode({
      entityType: 'paragraph',
      viewModeName: 'preview',
      label: 'Preview'
    });

    const parsed = yaml.load(result);
    expect(parsed.dependencies.module).toEqual(['paragraphs']);
    expect(parsed.targetEntityType).toBe('paragraph');
  });

  test('generates correct module dependency for taxonomy_term', () => {
    const result = generateViewMode({
      entityType: 'taxonomy_term',
      viewModeName: 'card',
      label: 'Card'
    });

    const parsed = yaml.load(result);
    expect(parsed.dependencies.module).toEqual(['taxonomy']);
    expect(parsed.targetEntityType).toBe('taxonomy_term');
  });

  test('generates correct module dependency for block_content', () => {
    const result = generateViewMode({
      entityType: 'block_content',
      viewModeName: 'full',
      label: 'Full'
    });

    const parsed = yaml.load(result);
    expect(parsed.dependencies.module).toEqual(['block_content']);
    expect(parsed.targetEntityType).toBe('block_content');
  });

  test('includes description when provided', () => {
    const result = generateViewMode({
      entityType: 'node',
      viewModeName: 'card',
      label: 'Card',
      description: 'A card display'
    });

    const parsed = yaml.load(result);
    expect(parsed.description).toBe('A card display');
  });

  test('throws for unknown entity type', () => {
    expect(() => generateViewMode({
      entityType: 'unknown',
      viewModeName: 'test',
      label: 'Test'
    })).toThrow('Unknown entity type: unknown');
  });
});

describe('View Mode I/O', () => {
  let tmpDir;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'dcm-viewmode-'));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true });
  });

  test('parseViewModes reads all view modes from directory', async () => {
    // Write test view mode files
    const nodeTeaser = yaml.dump({
      langcode: 'en',
      status: true,
      dependencies: { module: ['node'] },
      id: 'node.teaser',
      label: 'Teaser',
      description: '',
      targetEntityType: 'node',
      cache: true
    });

    const mediaComponent = yaml.dump({
      langcode: 'en',
      status: true,
      dependencies: { module: ['media'] },
      id: 'media.component',
      label: 'Component',
      description: '',
      targetEntityType: 'media',
      cache: true
    });

    await writeFile(join(tmpDir, 'core.entity_view_mode.node.teaser.yml'), nodeTeaser);
    await writeFile(join(tmpDir, 'core.entity_view_mode.media.component.yml'), mediaComponent);
    // Add a non-view-mode file to ensure it's ignored
    await writeFile(join(tmpDir, 'node.type.page.yml'), 'id: page');

    const result = await parseViewModes(tmpDir);
    expect(result).toHaveLength(2);

    const nodeResult = result.find(v => v.viewModeName === 'teaser');
    expect(nodeResult.entityType).toBe('node');
    expect(nodeResult.label).toBe('Teaser');

    const mediaResult = result.find(v => v.viewModeName === 'component');
    expect(mediaResult.entityType).toBe('media');
    expect(mediaResult.label).toBe('Component');
  });

  test('parseViewModes returns empty array for non-existent directory', async () => {
    const result = await parseViewModes('/nonexistent/path');
    expect(result).toEqual([]);
  });

  test('viewModeExists checks file existence', async () => {
    const content = yaml.dump({ id: 'node.teaser', label: 'Teaser' });
    await writeFile(join(tmpDir, 'core.entity_view_mode.node.teaser.yml'), content);

    expect(viewModeExists(tmpDir, 'node', 'teaser')).toBe(true);
    expect(viewModeExists(tmpDir, 'node', 'full')).toBe(false);
  });

  test('writeViewMode creates config file', async () => {
    const yamlContent = generateViewMode({
      entityType: 'node',
      viewModeName: 'card',
      label: 'Card'
    });

    await writeViewMode(tmpDir, 'node', 'card', yamlContent);

    expect(existsSync(join(tmpDir, 'core.entity_view_mode.node.card.yml'))).toBe(true);
  });

  test('deleteViewMode removes config file', async () => {
    const content = yaml.dump({ id: 'node.teaser', label: 'Teaser' });
    await writeFile(join(tmpDir, 'core.entity_view_mode.node.teaser.yml'), content);

    const result = await deleteViewMode(tmpDir, 'node', 'teaser');
    expect(result).toBe(true);
    expect(existsSync(join(tmpDir, 'core.entity_view_mode.node.teaser.yml'))).toBe(false);
  });

  test('deleteViewMode returns false for non-existent file', async () => {
    const result = await deleteViewMode(tmpDir, 'node', 'nonexistent');
    expect(result).toBe(false);
  });
});
