/**
 * Tests for component override generator and writer
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { mkdtemp, mkdir, writeFile, readFile, rm, readdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { existsSync } from 'fs';
import { generateOverrideComponentYml } from '../src/generators/componentGenerator.js';
import { getComponentSubdirectories, createComponentOverride } from '../src/io/componentWriter.js';

// --- Pure generator tests ---

describe('generateOverrideComponentYml', () => {
  it('should generate YAML with replaces field', () => {
    const sourceConfig = {
      name: 'Table',
      status: 'stable',
      description: 'Table component',
      props: {
        type: 'object',
        properties: {
          theme: { type: 'string', enum: ['light', 'dark'] }
        }
      }
    };

    const result = generateOverrideComponentYml(sourceConfig, 'civictheme:table');
    expect(result).toContain("replaces: civictheme:table");
    expect(result).toContain('name: Table');
    expect(result).toContain('status: stable');
    expect(result).toContain('description: Table component');
    expect(result).toContain('props:');
  });

  it('should include slots when present', () => {
    const sourceConfig = {
      name: 'Card',
      slots: {
        content: { title: 'Content', description: 'Card content' }
      }
    };

    const result = generateOverrideComponentYml(sourceConfig, 'base:card');
    expect(result).toContain('slots:');
    expect(result).toContain('content:');
  });

  it('should omit props and slots when not present', () => {
    const sourceConfig = {
      name: 'Simple'
    };

    const result = generateOverrideComponentYml(sourceConfig, 'base:simple');
    expect(result).not.toContain('props:');
    expect(result).not.toContain('slots:');
    expect(result).toContain('name: Simple');
    expect(result).toContain("replaces: base:simple");
  });

  it('should include $schema', () => {
    const result = generateOverrideComponentYml({ name: 'Test' }, 'base:test');
    expect(result).toContain('$schema:');
    expect(result).toContain('metadata.schema.json');
  });
});

// --- I/O tests ---

describe('getComponentSubdirectories', () => {
  let tmpDir;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'comp-subdirs-'));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true });
  });

  it('should return subdirectory names', async () => {
    const componentsDir = join(tmpDir, 'components');
    await mkdir(join(componentsDir, '00-base'), { recursive: true });
    await mkdir(join(componentsDir, '01-atoms'), { recursive: true });
    await mkdir(join(componentsDir, '02-molecules'), { recursive: true });

    const result = await getComponentSubdirectories(tmpDir);
    expect(result).toEqual(['00-base', '01-atoms', '02-molecules']);
  });

  it('should return empty array when no components directory', async () => {
    const result = await getComponentSubdirectories(tmpDir);
    expect(result).toEqual([]);
  });
});

describe('createComponentOverride', () => {
  let tmpDir;
  let activeThemeDir;
  let sourceDir;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'comp-override-'));
    activeThemeDir = join(tmpDir, 'active_theme');
    sourceDir = join(tmpDir, 'base_theme', 'components', '01-atoms', 'table');

    await mkdir(join(activeThemeDir, 'components', '01-atoms'), { recursive: true });
    await mkdir(sourceDir, { recursive: true });

    // Create source component files
    await writeFile(join(sourceDir, 'table.component.yml'), `
name: Table
status: stable
description: Table component
props:
  type: object
  properties:
    theme:
      type: string
`);
    await writeFile(join(sourceDir, 'table.twig'), '<table>{{ content }}</table>');
    await writeFile(join(sourceDir, 'table.css'), '.table { border: 1px solid; }');
    await writeFile(join(sourceDir, 'table.js'), '// table js');
    await writeFile(join(sourceDir, 'table.scss'), '.table { border: 1px solid; }');
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true });
  });

  it('should create override with copied files', async () => {
    const { directory, files } = await createComponentOverride({
      activeThemeDir,
      subdirectory: '01-atoms',
      machineName: 'table',
      sourceConfigPath: join(sourceDir, 'table.component.yml'),
      replacesId: 'civictheme:table',
      copyFiles: true
    });

    expect(existsSync(directory)).toBe(true);

    // Check component.yml was generated with replaces
    const ymlContent = await readFile(join(directory, 'table.component.yml'), 'utf-8');
    expect(ymlContent).toContain("replaces: civictheme:table");
    expect(ymlContent).toContain('name: Table');
    expect(ymlContent).toContain('props:');

    // Check twig and css were copied
    const twigContent = await readFile(join(directory, 'table.twig'), 'utf-8');
    expect(twigContent).toContain('<table>');

    const cssContent = await readFile(join(directory, 'table.css'), 'utf-8');
    expect(cssContent).toContain('.table');

    // All source files should be copied (except .component.yml which is regenerated)
    const dirFiles = await readdir(directory);
    expect(dirFiles).toContain('table.js');
    expect(dirFiles).toContain('table.scss');
    expect(dirFiles).toContain('table.twig');
    expect(dirFiles).toContain('table.css');
    expect(dirFiles).toContain('table.component.yml');

    // Check returned files list (yml + 4 copied files)
    expect(files).toHaveLength(5);
    expect(files.some(f => f.endsWith('table.component.yml'))).toBe(true);
    expect(files.some(f => f.endsWith('table.twig'))).toBe(true);
    expect(files.some(f => f.endsWith('table.css'))).toBe(true);
    expect(files.some(f => f.endsWith('table.js'))).toBe(true);
    expect(files.some(f => f.endsWith('table.scss'))).toBe(true);
  });

  it('should create override with empty files when copyFiles is false', async () => {
    const { directory, files } = await createComponentOverride({
      activeThemeDir,
      subdirectory: '01-atoms',
      machineName: 'table',
      sourceConfigPath: join(sourceDir, 'table.component.yml'),
      replacesId: 'civictheme:table',
      copyFiles: false
    });

    // Check component.yml was generated
    const ymlContent = await readFile(join(directory, 'table.component.yml'), 'utf-8');
    expect(ymlContent).toContain("replaces: civictheme:table");

    // Check twig and css are empty
    const twigContent = await readFile(join(directory, 'table.twig'), 'utf-8');
    expect(twigContent).toBe('');

    const cssContent = await readFile(join(directory, 'table.css'), 'utf-8');
    expect(cssContent).toBe('');

    // Check returned files list
    expect(files).toHaveLength(3);
  });
});
