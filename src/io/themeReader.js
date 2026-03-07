/**
 * Theme Reader - I/O functions
 * Discover and read Drupal theme info.yml files from the filesystem.
 */

import { readdir, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join, basename, dirname } from 'path';
import { parseThemeInfo } from '../parsers/themeParser.js';
import { discoverThemeComponents } from './componentReader.js';

/**
 * Find the *.info.yml file in a theme directory and return its filename
 * @param {string} themeDir - Path to the theme directory
 * @returns {Promise<string|null>} - The info.yml filename, or null if not found
 */
async function findInfoYml(themeDir) {
  const files = await readdir(themeDir);
  return files.find(f => f.endsWith('.info.yml')) || null;
}

/**
 * Read a theme directory and extract theme metadata
 * @param {string} themeDir - Path to the theme directory
 * @returns {Promise<object>} - { machineName, name, baseTheme, directory }
 * @throws {Error} - If no info.yml found in the directory
 */
export async function readThemeDirectory(themeDir) {
  const infoFile = await findInfoYml(themeDir);

  if (!infoFile) {
    throw new Error(`No *.info.yml file found in: ${themeDir}`);
  }

  const machineName = infoFile.replace('.info.yml', '');
  const content = await readFile(join(themeDir, infoFile), 'utf-8');
  const { name, baseTheme } = parseThemeInfo(content);

  return {
    machineName,
    name: name || machineName,
    baseTheme,
    directory: themeDir
  };
}

/**
 * Find the "themes" ancestor directory from a given theme path.
 * Walks up looking for a directory named "themes".
 * @param {string} themeDir - Path to a theme directory
 * @returns {string|null} - Path to the "themes" directory, or null
 */
function findThemesRoot(themeDir) {
  let current = dirname(themeDir);
  // Walk up at most 10 levels to prevent infinite loops
  for (let i = 0; i < 10; i++) {
    if (basename(current) === 'themes') {
      return current;
    }
    const parent = dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return null;
}

/**
 * Recursively search a directory tree for a file matching the given name
 * @param {string} dir - Directory to search
 * @param {string} filename - Filename to find
 * @param {number} maxDepth - Maximum depth to search
 * @returns {Promise<string|null>} - Path to the directory containing the file, or null
 */
async function findFileRecursive(dir, filename, maxDepth = 4) {
  if (maxDepth < 0 || !existsSync(dir)) return null;

  try {
    const entries = await readdir(dir, { withFileTypes: true });

    // Check if the file exists in this directory
    if (entries.some(e => e.isFile() && e.name === filename)) {
      return dir;
    }

    // Search subdirectories
    for (const entry of entries) {
      if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        const result = await findFileRecursive(join(dir, entry.name), filename, maxDepth - 1);
        if (result) return result;
      }
    }
  } catch {
    // Permission errors etc - skip
  }

  return null;
}

/**
 * Find a theme directory by machine name, searching from the themes root
 * @param {string} subThemeDir - Path to the sub-theme directory (used to find themes root)
 * @param {string} themeMachineName - Machine name of the theme to find
 * @returns {Promise<string|null>} - Path to the theme directory, or null
 */
export async function findThemeDirectory(subThemeDir, themeMachineName) {
  const themesRoot = findThemesRoot(subThemeDir);

  if (!themesRoot) {
    // Fall back: search from the docroot (parent of themes dir)
    const docroot = dirname(subThemeDir);
    return findFileRecursive(docroot, `${themeMachineName}.info.yml`, 5);
  }

  // First search within the themes directory
  const result = await findFileRecursive(themesRoot, `${themeMachineName}.info.yml`);
  if (result) return result;

  // Also check core themes (sibling to docroot or within docroot)
  const docroot = dirname(themesRoot);
  const coreThemesDir = join(docroot, 'core', 'themes');
  if (existsSync(coreThemesDir)) {
    return findFileRecursive(coreThemesDir, `${themeMachineName}.info.yml`);
  }

  return null;
}

/**
 * Resolve the full theme chain from a sub-theme directory.
 * Walks up through base themes to build the complete hierarchy.
 * @param {string} themeDir - Path to the sub-theme directory
 * @returns {Promise<object>} - { activeTheme, themes[] } where themes is ordered sub → parent → grandparent
 */
export async function resolveThemeChain(themeDir) {
  const themes = [];
  let currentDir = themeDir;
  const visited = new Set();

  while (currentDir) {
    const themeInfo = await readThemeDirectory(currentDir);
    const components = await discoverThemeComponents(currentDir);
    themes.push({
      name: themeInfo.name,
      machine_name: themeInfo.machineName,
      directory: themeInfo.directory,
      components
    });

    // Prevent circular references
    if (visited.has(themeInfo.machineName)) break;
    visited.add(themeInfo.machineName);

    if (!themeInfo.baseTheme) break;

    // Find the base theme directory
    const baseDir = await findThemeDirectory(currentDir, themeInfo.baseTheme);
    if (!baseDir) {
      // Can't find base theme - stop the chain but don't error
      break;
    }

    currentDir = baseDir;
  }

  return {
    activeTheme: themes.length > 0 ? themes[0].machine_name : null,
    themes
  };
}
