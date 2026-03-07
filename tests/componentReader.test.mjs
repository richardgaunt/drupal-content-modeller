/**
 * Tests for component parser and component reader
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { mkdtemp, mkdir, writeFile, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { parseComponentYml, getComponentMachineName } from '../src/parsers/componentParser.js';
import { findComponentFiles, readComponent, readComponentDetail, discoverThemeComponents } from '../src/io/componentReader.js';

// --- Pure parser tests ---

describe('parseComponentYml', () => {
  it('should parse a component with replaces', () => {
    const yaml = `
name: Table
status: stable
description: Table component for tabular data
replaces: 'civictheme:table'
props:
  type: object
  properties:
    theme:
      type: string
`;
    const result = parseComponentYml(yaml);
    expect(result.name).toBe('Table');
    expect(result.description).toBe('Table component for tabular data');
    expect(result.status).toBe('stable');
    expect(result.replaces).toBe('civictheme:table');
    expect(result.props).toBeDefined();
    expect(result.props.type).toBe('object');
  });

  it('should parse a component without replaces', () => {
    const yaml = `
name: Basic Content
status: stable
description: Component for general HTML content
props:
  type: object
slots:
  content:
    title: Content
    description: HTML content.
`;
    const result = parseComponentYml(yaml);
    expect(result.name).toBe('Basic Content');
    expect(result.replaces).toBeNull();
    expect(result.slots).toBeDefined();
    expect(result.slots.content.title).toBe('Content');
  });

  it('should handle empty/invalid YAML', () => {
    const result = parseComponentYml('');
    expect(result.name).toBeNull();
    expect(result.replaces).toBeNull();
    expect(result.props).toBeNull();
    expect(result.slots).toBeNull();
  });
});

describe('getComponentMachineName', () => {
  it('should extract machine name from filename', () => {
    expect(getComponentMachineName('table.component.yml')).toBe('table');
    expect(getComponentMachineName('basic-content.component.yml')).toBe('basic-content');
  });
});

// --- I/O tests with temp filesystem ---

describe('findComponentFiles', () => {
  let tmpDir;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'comp-find-'));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true });
  });

  it('should find component files in nested directories', async () => {
    const atomsDir = join(tmpDir, 'components', '01-atoms', 'button');
    const molDir = join(tmpDir, 'components', '02-molecules', 'card');

    await mkdir(atomsDir, { recursive: true });
    await mkdir(molDir, { recursive: true });

    await writeFile(join(atomsDir, 'button.component.yml'), 'name: Button\n');
    await writeFile(join(molDir, 'card.component.yml'), 'name: Card\n');

    const files = await findComponentFiles(tmpDir);
    expect(files).toHaveLength(2);
    expect(files.some(f => f.includes('button.component.yml'))).toBe(true);
    expect(files.some(f => f.includes('card.component.yml'))).toBe(true);
  });

  it('should return empty array when no components directory exists', async () => {
    const files = await findComponentFiles(tmpDir);
    expect(files).toEqual([]);
  });

  it('should ignore non-component yml files', async () => {
    const compDir = join(tmpDir, 'components', 'misc');
    await mkdir(compDir, { recursive: true });

    await writeFile(join(compDir, 'something.yml'), 'name: Not a component\n');
    await writeFile(join(compDir, 'table.component.yml'), 'name: Table\n');

    const files = await findComponentFiles(tmpDir);
    expect(files).toHaveLength(1);
    expect(files[0]).toContain('table.component.yml');
  });
});

describe('readComponent', () => {
  let tmpDir;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'comp-read-'));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true });
  });

  it('should read a component with template', async () => {
    await writeFile(join(tmpDir, 'table.component.yml'), `
name: Table
description: A table component
replaces: 'civictheme:table'
`);
    await writeFile(join(tmpDir, 'table.twig'), '<table></table>');

    const result = await readComponent(join(tmpDir, 'table.component.yml'));
    expect(result.name).toBe('Table');
    expect(result.machine_name).toBe('table');
    expect(result.description).toBe('A table component');
    expect(result.replaces).toBe('civictheme:table');
    expect(result.component_config_path).toBe(join(tmpDir, 'table.component.yml'));
    expect(result.component_template).toBe(join(tmpDir, 'table.twig'));
  });

  it('should handle missing template file', async () => {
    await writeFile(join(tmpDir, 'widget.component.yml'), 'name: Widget\n');

    const result = await readComponent(join(tmpDir, 'widget.component.yml'));
    expect(result.machine_name).toBe('widget');
    expect(result.component_template).toBeNull();
  });

  it('should use machine name as fallback when name is missing', async () => {
    await writeFile(join(tmpDir, 'my-comp.component.yml'), 'status: stable\n');

    const result = await readComponent(join(tmpDir, 'my-comp.component.yml'));
    expect(result.name).toBe('my-comp');
  });
});

describe('discoverThemeComponents', () => {
  let tmpDir;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'comp-discover-'));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true });
  });

  it('should discover all components keyed by machine name', async () => {
    const buttonDir = join(tmpDir, 'components', '01-atoms', 'button');
    const cardDir = join(tmpDir, 'components', '02-molecules', 'card');

    await mkdir(buttonDir, { recursive: true });
    await mkdir(cardDir, { recursive: true });

    await writeFile(join(buttonDir, 'button.component.yml'), 'name: Button\ndescription: A button\n');
    await writeFile(join(buttonDir, 'button.twig'), '<button></button>');
    await writeFile(join(cardDir, 'card.component.yml'), 'name: Card\ndescription: A card\n');
    await writeFile(join(cardDir, 'card.twig'), '<div class="card"></div>');

    const components = await discoverThemeComponents(tmpDir);

    expect(Object.keys(components)).toHaveLength(2);
    expect(components.button).toBeDefined();
    expect(components.button.name).toBe('Button');
    expect(components.button.machine_name).toBe('button');
    expect(components.button.component_template).toContain('button.twig');
    expect(components.card).toBeDefined();
    expect(components.card.name).toBe('Card');
  });

  it('should return empty object when no components directory', async () => {
    const components = await discoverThemeComponents(tmpDir);
    expect(components).toEqual({});
  });
});

describe('readComponentDetail', () => {
  let tmpDir;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'comp-detail-'));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true });
  });

  it('should return full detail including props, slots, and assets', async () => {
    await writeFile(join(tmpDir, 'card.component.yml'), `
name: Card
status: stable
description: A card component
replaces: 'base:card'
props:
  type: object
  properties:
    theme:
      type: string
      title: Theme
      description: Theme variation.
      enum:
        - light
        - dark
    title:
      type: string
      title: Title
      description: Card title.
slots:
  content:
    title: Content
    description: Card content.
`);
    await writeFile(join(tmpDir, 'card.twig'), '<div></div>');
    await writeFile(join(tmpDir, 'card.css'), '.card {}');
    await writeFile(join(tmpDir, 'card.scss'), '.card {}');
    await writeFile(join(tmpDir, 'card.js'), '// js');

    const result = await readComponentDetail(join(tmpDir, 'card.component.yml'));

    expect(result.name).toBe('Card');
    expect(result.machine_name).toBe('card');
    expect(result.description).toBe('A card component');
    expect(result.status).toBe('stable');
    expect(result.replaces).toBe('base:card');
    expect(result.directory).toBe(tmpDir);

    // Props
    expect(result.props).toBeDefined();
    expect(result.props.properties.theme.enum).toEqual(['light', 'dark']);
    expect(result.props.properties.title.type).toBe('string');

    // Slots
    expect(result.slots).toBeDefined();
    expect(result.slots.content.title).toBe('Content');

    // Assets (excludes .component.yml)
    expect(result.assets).toContain('card.twig');
    expect(result.assets).toContain('card.css');
    expect(result.assets).toContain('card.scss');
    expect(result.assets).toContain('card.js');
    expect(result.assets).not.toContain('card.component.yml');
  });

  it('should handle component with no props or slots', async () => {
    await writeFile(join(tmpDir, 'simple.component.yml'), 'name: Simple\n');

    const result = await readComponentDetail(join(tmpDir, 'simple.component.yml'));
    expect(result.name).toBe('Simple');
    expect(result.props).toBeNull();
    expect(result.slots).toBeNull();
    expect(result.assets).toEqual([]);
  });
});
