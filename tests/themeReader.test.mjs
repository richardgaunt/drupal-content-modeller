/**
 * Tests for theme parser and theme reader
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { mkdtemp, mkdir, writeFile, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import { parseThemeInfo } from '../src/parsers/themeParser.js';
import { readThemeDirectory, findThemeDirectory, resolveThemeChain } from '../src/io/themeReader.js';

// --- Pure parser tests ---

describe('parseThemeInfo', () => {
  it('should parse name and base theme', () => {
    const yaml = `
name: My Custom Theme
type: theme
base theme: civictheme
core_version_requirement: ^10
`;
    const result = parseThemeInfo(yaml);
    expect(result.name).toBe('My Custom Theme');
    expect(result.baseTheme).toBe('civictheme');
  });

  it('should return null baseTheme when not present', () => {
    const yaml = `
name: Starter Kit
type: theme
core_version_requirement: ^10
`;
    const result = parseThemeInfo(yaml);
    expect(result.name).toBe('Starter Kit');
    expect(result.baseTheme).toBeNull();
  });

  it('should handle missing name', () => {
    const yaml = `
type: theme
base theme: classy
`;
    const result = parseThemeInfo(yaml);
    expect(result.name).toBeNull();
    expect(result.baseTheme).toBe('classy');
  });

  it('should handle invalid YAML', () => {
    const result = parseThemeInfo('');
    expect(result.name).toBeNull();
    expect(result.baseTheme).toBeNull();
  });
});

// --- I/O tests with temp filesystem ---

describe('readThemeDirectory', () => {
  let tmpDir;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'theme-test-'));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true });
  });

  it('should read theme info from a directory', async () => {
    await writeFile(join(tmpDir, 'my_theme.info.yml'), `
name: My Theme
type: theme
base theme: civictheme
`);

    const result = await readThemeDirectory(tmpDir);
    expect(result.machineName).toBe('my_theme');
    expect(result.name).toBe('My Theme');
    expect(result.baseTheme).toBe('civictheme');
    expect(result.directory).toBe(tmpDir);
  });

  it('should throw if no info.yml found', async () => {
    await expect(readThemeDirectory(tmpDir)).rejects.toThrow('No *.info.yml file found');
  });

  it('should use machine name as fallback when name is missing', async () => {
    await writeFile(join(tmpDir, 'fallback_theme.info.yml'), `
type: theme
`);

    const result = await readThemeDirectory(tmpDir);
    expect(result.name).toBe('fallback_theme');
  });
});

describe('findThemeDirectory', () => {
  let tmpDir;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'theme-find-'));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true });
  });

  it('should find a base theme in the themes directory tree', async () => {
    // Create: tmpDir/themes/custom/subtheme/ and tmpDir/themes/contrib/basetheme/
    const subThemeDir = join(tmpDir, 'themes', 'custom', 'subtheme');
    const baseThemeDir = join(tmpDir, 'themes', 'contrib', 'basetheme');

    await mkdir(subThemeDir, { recursive: true });
    await mkdir(baseThemeDir, { recursive: true });

    await writeFile(join(subThemeDir, 'subtheme.info.yml'), `
name: Sub Theme
type: theme
base theme: basetheme
`);
    await writeFile(join(baseThemeDir, 'basetheme.info.yml'), `
name: Base Theme
type: theme
`);

    const result = await findThemeDirectory(subThemeDir, 'basetheme');
    expect(result).toBe(baseThemeDir);
  });

  it('should return null when base theme is not found', async () => {
    const subThemeDir = join(tmpDir, 'themes', 'custom', 'subtheme');
    await mkdir(subThemeDir, { recursive: true });
    await writeFile(join(subThemeDir, 'subtheme.info.yml'), 'name: Sub\ntype: theme\n');

    const result = await findThemeDirectory(subThemeDir, 'nonexistent');
    expect(result).toBeNull();
  });
});

describe('resolveThemeChain', () => {
  let tmpDir;

  beforeEach(async () => {
    tmpDir = await mkdtemp(join(tmpdir(), 'theme-chain-'));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true });
  });

  it('should resolve a 3-level theme chain', async () => {
    const subDir = join(tmpDir, 'themes', 'custom', 'my_subtheme');
    const parentDir = join(tmpDir, 'themes', 'contrib', 'civictheme');
    const grandparentDir = join(tmpDir, 'themes', 'contrib', 'starterkit');

    await mkdir(subDir, { recursive: true });
    await mkdir(parentDir, { recursive: true });
    await mkdir(grandparentDir, { recursive: true });

    await writeFile(join(subDir, 'my_subtheme.info.yml'), `
name: My Sub Theme
type: theme
base theme: civictheme
`);
    await writeFile(join(parentDir, 'civictheme.info.yml'), `
name: CivicTheme
type: theme
base theme: starterkit
`);
    await writeFile(join(grandparentDir, 'starterkit.info.yml'), `
name: Starter Kit
type: theme
`);

    const result = await resolveThemeChain(subDir);

    expect(result.activeTheme).toBe('my_subtheme');
    expect(result.themes).toHaveLength(3);
    expect(result.themes[0].machine_name).toBe('my_subtheme');
    expect(result.themes[0].name).toBe('My Sub Theme');
    expect(result.themes[1].machine_name).toBe('civictheme');
    expect(result.themes[1].name).toBe('CivicTheme');
    expect(result.themes[2].machine_name).toBe('starterkit');
    expect(result.themes[2].name).toBe('Starter Kit');
  });

  it('should handle a single theme with no base', async () => {
    const themeDir = join(tmpDir, 'themes', 'custom', 'standalone');
    await mkdir(themeDir, { recursive: true });

    await writeFile(join(themeDir, 'standalone.info.yml'), `
name: Standalone Theme
type: theme
`);

    const result = await resolveThemeChain(themeDir);

    expect(result.activeTheme).toBe('standalone');
    expect(result.themes).toHaveLength(1);
    expect(result.themes[0].machine_name).toBe('standalone');
  });

  it('should stop gracefully when base theme directory is not found', async () => {
    const subDir = join(tmpDir, 'themes', 'custom', 'my_theme');
    await mkdir(subDir, { recursive: true });

    await writeFile(join(subDir, 'my_theme.info.yml'), `
name: My Theme
type: theme
base theme: missing_theme
`);

    const result = await resolveThemeChain(subDir);

    expect(result.activeTheme).toBe('my_theme');
    expect(result.themes).toHaveLength(1);
  });
});
