/**
 * Component Reader - I/O functions
 * Discover and read Drupal Single Directory Component (SDC) files from the filesystem.
 */

import { readdir, readFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join, basename, dirname } from 'path';
import { parseComponentYml, getComponentMachineName } from '../parsers/componentParser.js';

/**
 * Recursively find all *.component.yml files under a directory
 * @param {string} dir - Directory to search
 * @param {number} maxDepth - Maximum recursion depth
 * @returns {Promise<string[]>} - Array of absolute paths to component.yml files
 */
async function findComponentFilesRecursive(dir, maxDepth = 6) {
  if (maxDepth < 0 || !existsSync(dir)) return [];

  const results = [];

  try {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isFile() && entry.name.endsWith('.component.yml')) {
        results.push(join(dir, entry.name));
      } else if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
        const nested = await findComponentFilesRecursive(join(dir, entry.name), maxDepth - 1);
        results.push(...nested);
      }
    }
  } catch {
    // Permission errors etc - skip
  }

  return results;
}

/**
 * Find all *.component.yml files in a theme's components directory
 * @param {string} themeDir - Path to the theme directory
 * @returns {Promise<string[]>} - Array of absolute paths to component.yml files
 */
export async function findComponentFiles(themeDir) {
  const componentsDir = join(themeDir, 'components');

  if (!existsSync(componentsDir)) {
    return [];
  }

  return findComponentFilesRecursive(componentsDir);
}

/**
 * Read a single component.yml file and return structured metadata
 * @param {string} componentYmlPath - Absolute path to a *.component.yml file
 * @returns {Promise<object>} - Component metadata
 */
export async function readComponent(componentYmlPath) {
  const filename = basename(componentYmlPath);
  const machineName = getComponentMachineName(filename);
  const componentDir = dirname(componentYmlPath);

  const content = await readFile(componentYmlPath, 'utf-8');
  const parsed = parseComponentYml(content);

  const templatePath = join(componentDir, `${machineName}.twig`);
  const templateExists = existsSync(templatePath);

  return {
    name: parsed.name || machineName,
    machine_name: machineName,
    description: parsed.description || null,
    component_config_path: componentYmlPath,
    component_template: templateExists ? templatePath : null,
    replaces: parsed.replaces || null
  };
}

/**
 * Read full detail of a component including props, slots, and asset files.
 * @param {string} componentYmlPath - Absolute path to a *.component.yml file
 * @returns {Promise<object>} - Full component detail
 */
export async function readComponentDetail(componentYmlPath) {
  const filename = basename(componentYmlPath);
  const machineName = getComponentMachineName(filename);
  const componentDir = dirname(componentYmlPath);

  const content = await readFile(componentYmlPath, 'utf-8');
  const parsed = parseComponentYml(content);

  // List all files in the component directory
  let assets = [];
  try {
    const entries = await readdir(componentDir);
    assets = entries.filter(f => !f.endsWith('.component.yml')).sort();
  } catch {
    // skip
  }

  return {
    name: parsed.name || machineName,
    machine_name: machineName,
    description: parsed.description || null,
    status: parsed.status || null,
    component_config_path: componentYmlPath,
    directory: componentDir,
    replaces: parsed.replaces || null,
    props: parsed.props || null,
    slots: parsed.slots || null,
    assets
  };
}

/**
 * Discover all components in a theme directory
 * @param {string} themeDir - Path to the theme directory
 * @returns {Promise<object>} - Components keyed by machine name
 */
export async function discoverThemeComponents(themeDir) {
  const componentFiles = await findComponentFiles(themeDir);
  const components = {};

  for (const filePath of componentFiles) {
    const component = await readComponent(filePath);
    components[component.machine_name] = component;
  }

  return components;
}
