/**
 * Tests for component override generator and writer
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { mkdtemp, mkdir, writeFile, readFile, rm, readdir } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { existsSync } from 'fs';
import { generateOverrideComponentYml, generateComponentYml } from '../src/generators/componentGenerator.js';
import { getComponentSubdirectories, createComponentOverride, updateComponentYml, createNewComponent } from '../src/io/componentWriter.js';
import yaml from 'js-yaml';

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

describe('generateComponentYml', () => {
  it('should generate full component YAML', () => {
    const config = {
      $schema: 'https://example.com/schema.json',
      name: 'Card',
      status: 'stable',
      description: 'A card component',
      props: {
        type: 'object',
        properties: {
          title: { type: 'string', title: 'Title' },
          is_active: { type: 'boolean', title: 'Active' }
        }
      },
      slots: {
        content: { title: 'Content', description: 'Card content' }
      }
    };

    const result = generateComponentYml(config);
    expect(result).toContain('$schema:');
    expect(result).toContain('name: Card');
    expect(result).toContain('status: stable');
    expect(result).toContain('description: A card component');
    expect(result).toContain('props:');
    expect(result).toContain('title:');
    expect(result).toContain('slots:');
    expect(result).toContain('content:');
  });

  it('should preserve replaces field', () => {
    const config = {
      name: 'Card',
      replaces: 'base:card'
    };

    const result = generateComponentYml(config);
    expect(result).toContain('replaces: base:card');
  });

  it('should omit empty fields', () => {
    const config = { name: 'Simple' };

    const result = generateComponentYml(config);
    expect(result).toContain('name: Simple');
    expect(result).not.toContain('props:');
    expect(result).not.toContain('slots:');
    expect(result).not.toContain('replaces:');
  });

  it('should handle nullable type arrays', () => {
    const config = {
      name: 'Test',
      props: {
        type: 'object',
        properties: {
          title: { type: ['string', 'null'], title: 'Title' }
        }
      }
    };

    const result = generateComponentYml(config);
    const parsed = yaml.load(result);
    expect(parsed.props.properties.title.type).toEqual(['string', 'null']);
  });

  it('should handle nested object properties', () => {
    const config = {
      name: 'Complex',
      props: {
        type: 'object',
        properties: {
          image: {
            type: 'object',
            title: 'Image',
            properties: {
              url: { type: 'string', title: 'URL' },
              alt: { type: 'string', title: 'Alt' }
            }
          }
        }
      }
    };

    const result = generateComponentYml(config);
    const parsed = yaml.load(result);
    expect(parsed.props.properties.image.properties.url.type).toBe('string');
    expect(parsed.props.properties.image.properties.alt.type).toBe('string');
  });

  it('should handle array with object items', () => {
    const config = {
      name: 'List',
      props: {
        type: 'object',
        properties: {
          links: {
            type: 'array',
            title: 'Links',
            items: {
              type: 'object',
              properties: {
                text: { type: 'string' },
                url: { type: 'string' }
              }
            }
          }
        }
      }
    };

    const result = generateComponentYml(config);
    const parsed = yaml.load(result);
    expect(parsed.props.properties.links.items.properties.text.type).toBe('string');
  });

  it('should handle enum values', () => {
    const config = {
      name: 'Themed',
      props: {
        type: 'object',
        properties: {
          theme: {
            type: 'string',
            title: 'Theme',
            enum: ['light', 'dark']
          }
        }
      }
    };

    const result = generateComponentYml(config);
    const parsed = yaml.load(result);
    expect(parsed.props.properties.theme.enum).toEqual(['light', 'dark']);
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

  it('should create override with empty files when copyFiles false', async () => {
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

describe('updateComponentYml', () => {
  let tmpDir;
  let ymlPath;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'comp-update-'));
    ymlPath = join(tmpDir, 'test.component.yml');
    await writeFile(ymlPath, `name: Test
status: stable
props:
  type: object
  properties:
    title:
      type: string
      title: Title
`);
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true });
  });

  it('should write updated config to file', async () => {
    const config = {
      name: 'Test',
      status: 'stable',
      props: {
        type: 'object',
        properties: {
          title: { type: 'string', title: 'Title' },
          theme: { type: 'string', title: 'Theme', enum: ['light', 'dark'] }
        }
      }
    };

    await updateComponentYml(ymlPath, config);

    const content = await readFile(ymlPath, 'utf-8');
    const parsed = yaml.load(content);
    expect(parsed.props.properties.theme.enum).toEqual(['light', 'dark']);
    expect(parsed.props.properties.title.type).toBe('string');
  });

  it('should add slots to a component without slots', async () => {
    const config = {
      name: 'Test',
      status: 'stable',
      props: {
        type: 'object',
        properties: {
          title: { type: 'string', title: 'Title' }
        }
      },
      slots: {
        content: { title: 'Content', description: 'Main content area' }
      }
    };

    await updateComponentYml(ymlPath, config);

    const content = await readFile(ymlPath, 'utf-8');
    const parsed = yaml.load(content);
    expect(parsed.slots.content.title).toBe('Content');
  });

  it('should handle nullable types', async () => {
    const config = {
      name: 'Test',
      props: {
        type: 'object',
        properties: {
          subtitle: { type: ['string', 'null'], title: 'Subtitle' }
        }
      }
    };

    await updateComponentYml(ymlPath, config);

    const content = await readFile(ymlPath, 'utf-8');
    const parsed = yaml.load(content);
    expect(parsed.props.properties.subtitle.type).toEqual(['string', 'null']);
  });
});

describe('createNewComponent', () => {
  let tmpDir;
  let activeThemeDir;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'comp-create-'));
    activeThemeDir = join(tmpDir, 'active_theme');
    await mkdir(join(activeThemeDir, 'components', '01-atoms'), { recursive: true });
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true });
  });

  it('should create component directory with yml, twig, and css', async () => {
    const { directory, files } = await createNewComponent({
      activeThemeDir,
      subdirectory: '01-atoms',
      machineName: 'my_card',
      config: {
        name: 'My Card',
        status: 'stable',
        description: 'A custom card'
      }
    });

    expect(existsSync(directory)).toBe(true);
    expect(files).toHaveLength(3);
    expect(files.some(f => f.endsWith('my_card.component.yml'))).toBe(true);
    expect(files.some(f => f.endsWith('my_card.twig'))).toBe(true);
    expect(files.some(f => f.endsWith('my_card.css'))).toBe(true);

    const ymlContent = await readFile(join(directory, 'my_card.component.yml'), 'utf-8');
    const parsed = yaml.load(ymlContent);
    expect(parsed.name).toBe('My Card');
    expect(parsed.description).toBe('A custom card');
    expect(parsed.status).toBe('stable');
  });

  it('should create component with props and slots', async () => {
    const { directory } = await createNewComponent({
      activeThemeDir,
      subdirectory: '01-atoms',
      machineName: 'badge',
      config: {
        name: 'Badge',
        status: 'stable',
        description: 'A badge component',
        props: {
          type: 'object',
          properties: {
            label: { type: 'string', title: 'Label' },
            theme: { type: 'string', title: 'Theme', enum: ['light', 'dark'] }
          }
        },
        slots: {
          content: { title: 'Content', description: 'Badge content' }
        }
      }
    });

    const ymlContent = await readFile(join(directory, 'badge.component.yml'), 'utf-8');
    const parsed = yaml.load(ymlContent);
    expect(parsed.props.properties.label.type).toBe('string');
    expect(parsed.props.properties.theme.enum).toEqual(['light', 'dark']);
    expect(parsed.slots.content.title).toBe('Content');
  });

  it('should create component with empty props', async () => {
    const { directory } = await createNewComponent({
      activeThemeDir,
      subdirectory: '01-atoms',
      machineName: 'spacer',
      config: {
        name: 'Spacer',
        status: 'stable',
        description: 'A spacer component'
      }
    });

    const ymlContent = await readFile(join(directory, 'spacer.component.yml'), 'utf-8');
    const parsed = yaml.load(ymlContent);
    expect(parsed.name).toBe('Spacer');
    expect(parsed.props).toBeUndefined();
    expect(parsed.slots).toBeUndefined();
  });

  it('should create empty twig and css files', async () => {
    const { directory } = await createNewComponent({
      activeThemeDir,
      subdirectory: '01-atoms',
      machineName: 'divider',
      config: { name: 'Divider', status: 'stable', description: '' }
    });

    const twigContent = await readFile(join(directory, 'divider.twig'), 'utf-8');
    expect(twigContent).toBe('');

    const cssContent = await readFile(join(directory, 'divider.css'), 'utf-8');
    expect(cssContent).toBe('');
  });
});
