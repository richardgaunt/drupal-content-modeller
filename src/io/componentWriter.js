/**
 * Component Writer - I/O functions for creating component override directories.
 */

import { readdir, readFile, writeFile, mkdir, copyFile } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import yaml from 'js-yaml';
import { generateOverrideComponentYml, generateComponentYml } from '../generators/componentGenerator.js';

/**
 * Get the subdirectory names under a theme's components/ directory.
 * Returns directories like ['00-base', '01-atoms', '02-molecules', '03-organisms'].
 * @param {string} themeDir - Path to the theme directory
 * @returns {Promise<string[]>} - Array of subdirectory names
 */
export async function getComponentSubdirectories(themeDir) {
  const componentsDir = join(themeDir, 'components');

  if (!existsSync(componentsDir)) {
    return [];
  }

  const entries = await readdir(componentsDir, { withFileTypes: true });
  return entries
    .filter(e => e.isDirectory() && !e.name.startsWith('.'))
    .map(e => e.name)
    .sort();
}

/**
 * Create a component override in the active theme.
 * @param {object} options
 * @param {string} options.activeThemeDir - Path to the active theme directory
 * @param {string} options.subdirectory - Component subdirectory (e.g. "01-atoms")
 * @param {string} options.machineName - Component machine name (e.g. "table")
 * @param {string} options.sourceConfigPath - Path to the source component.yml
 * @param {string} options.replacesId - Override ID (e.g. "civictheme:table")
 * @param {boolean} options.copyFiles - Whether to copy CSS and twig from source
 * @returns {Promise<{directory: string, files: string[]}>} - Created directory path and list of created file paths
 */
export async function createComponentOverride(options) {
  const { activeThemeDir, subdirectory, machineName, sourceConfigPath, replacesId, copyFiles } = options;

  const componentDir = join(activeThemeDir, 'components', subdirectory, machineName);
  const sourceDir = dirname(sourceConfigPath);

  // Create the component directory
  await mkdir(componentDir, { recursive: true });

  // Read and parse the source component.yml to get props/slots
  const sourceContent = await readFile(sourceConfigPath, 'utf-8');
  const sourceConfig = yaml.load(sourceContent);

  // Generate and write the new component.yml with replaces
  const newYml = generateOverrideComponentYml(sourceConfig, replacesId);
  const ymlPath = join(componentDir, `${machineName}.component.yml`);
  await writeFile(ymlPath, newYml, 'utf-8');
  const createdFiles = [ymlPath];

  if (copyFiles) {
    // Copy all files from source directory (except the component.yml which we regenerate)
    const sourceFiles = await readdir(sourceDir);

    for (const file of sourceFiles) {
      if (file.endsWith('.component.yml')) continue;
      const destPath = join(componentDir, file);
      await copyFile(join(sourceDir, file), destPath);
      createdFiles.push(destPath);
    }
  } else {
    // Create empty .twig and .css files
    const twigPath = join(componentDir, `${machineName}.twig`);
    const cssPath = join(componentDir, `${machineName}.css`);
    await writeFile(twigPath, '', 'utf-8');
    await writeFile(cssPath, '', 'utf-8');
    createdFiles.push(twigPath, cssPath);
  }

  return { directory: componentDir, files: createdFiles };
}

/**
 * Read, update, and write back a component.yml file.
 * @param {string} componentYmlPath - Absolute path to the component.yml file
 * @param {object} updatedConfig - Updated config to write (full config object)
 * @returns {Promise<void>}
 */
export async function updateComponentYml(componentYmlPath, updatedConfig) {
  const ymlContent = generateComponentYml(updatedConfig);
  await writeFile(componentYmlPath, ymlContent, 'utf-8');
}

/**
 * Create a new custom component in the active theme.
 * @param {object} options
 * @param {string} options.activeThemeDir - Path to the active theme directory
 * @param {string} options.subdirectory - Component subdirectory (e.g. "01-atoms")
 * @param {string} options.machineName - Component machine name
 * @param {object} options.config - Component config object (name, description, props, slots)
 * @param {string} [options.sourceDir] - Source component directory to copy assets from
 * @param {string} [options.sourceMachineName] - Source component machine name (for renaming files)
 * @returns {Promise<{directory: string, files: string[]}>} - Created directory path and list of created file paths
 */
export async function createNewComponent(options) {
  const { activeThemeDir, subdirectory, machineName, config, sourceDir, sourceMachineName } = options;

  const componentDir = join(activeThemeDir, 'components', subdirectory, machineName);
  await mkdir(componentDir, { recursive: true });

  const ymlPath = join(componentDir, `${machineName}.component.yml`);
  await writeFile(ymlPath, generateComponentYml(config), 'utf-8');
  const createdFiles = [ymlPath];

  if (sourceDir && sourceMachineName) {
    // Copy assets from source, renaming basename to new machine name
    const sourceFiles = await readdir(sourceDir);

    for (const file of sourceFiles) {
      if (file.endsWith('.component.yml')) continue;
      const newFileName = file.replace(sourceMachineName, machineName);
      const destPath = join(componentDir, newFileName);
      await copyFile(join(sourceDir, file), destPath);
      createdFiles.push(destPath);
    }
  } else {
    // Create empty starter files
    const twigPath = join(componentDir, `${machineName}.twig`);
    await writeFile(twigPath, '', 'utf-8');
    const cssPath = join(componentDir, `${machineName}.css`);
    await writeFile(cssPath, '', 'utf-8');
    createdFiles.push(twigPath, cssPath);
  }

  return { directory: componentDir, files: createdFiles };
}
