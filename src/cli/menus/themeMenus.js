/**
 * Theme & Components Menu Handlers
 * Handles theme browsing and component listing actions.
 */

import { search, select, confirm } from '@inquirer/prompts';
import chalk from 'chalk';

import { syncProject } from '../../commands/sync.js';
import { loadProject } from '../../commands/project.js';
import { createTable } from '../../commands/list.js';
import { getComponentSubdirectories, createComponentOverride } from '../../io/componentWriter.js';

/**
 * Get all components across all themes as a flat array with theme context
 * @param {object} project - Project object with theme data
 * @returns {object[]} - Array of component objects with theme info
 */
function getAllComponents(project) {
  if (!project.theme?.themes) return [];

  const components = [];
  for (const theme of project.theme.themes) {
    for (const comp of Object.values(theme.components || {})) {
      components.push({
        ...comp,
        theme_machine_name: theme.machine_name,
        id: `${theme.machine_name}:${comp.machine_name}`
      });
    }
  }
  return components;
}

/**
 * Print theme summary header
 * @param {object} project - Project object
 */
function printThemeSummary(project) {
  if (!project.theme?.themes?.length) {
    console.log(chalk.yellow('No theme configured. Edit project to set an active theme.'));
    return false;
  }

  const activeTheme = project.theme.activeTheme;
  const baseThemes = project.theme.themes
    .slice(1)
    .map(t => `${t.name} (${t.machine_name})`)
    .join(' → ');

  console.log();
  console.log(chalk.cyan(`Active Theme: ${activeTheme}`));
  if (baseThemes) {
    console.log(chalk.cyan(`Base Theme(s): ${baseThemes}`));
  }
  console.log();
  return true;
}

/**
 * List all components across all themes
 * @param {object} project - Project object
 */
function handleListComponents(project) {
  if (!printThemeSummary(project)) return;

  const components = getAllComponents(project);

  if (components.length === 0) {
    console.log(chalk.yellow('No components found.'));
    return;
  }

  const table = createTable(
    [
      { header: 'ID', minWidth: 20, getValue: c => c.id },
      { header: 'Name', minWidth: 15, getValue: c => c.name },
      { header: 'Description', minWidth: 30, getValue: c => c.description || '' },
      { header: 'Overrides', minWidth: 15, getValue: c => c.replaces || '' }
    ],
    components
  );

  console.log(table);
  console.log();
  console.log(chalk.cyan(`Total: ${components.length} components`));
  console.log();
}

/**
 * List custom components (active theme, not overriding)
 * @param {object} project - Project object
 */
function handleListCustomComponents(project) {
  if (!printThemeSummary(project)) return;

  const activeTheme = project.theme.themes[0];
  if (!activeTheme?.components) {
    console.log(chalk.yellow('No components found in active theme.'));
    return;
  }

  const custom = Object.values(activeTheme.components)
    .filter(c => !c.replaces)
    .map(c => ({
      ...c,
      id: `${activeTheme.machine_name}:${c.machine_name}`
    }));

  if (custom.length === 0) {
    console.log(chalk.yellow('No custom components found (all components are overrides).'));
    return;
  }

  const table = createTable(
    [
      { header: 'ID', minWidth: 20, getValue: c => c.id },
      { header: 'Name', minWidth: 15, getValue: c => c.name },
      { header: 'Description', minWidth: 30, getValue: c => c.description || '' }
    ],
    custom
  );

  console.log(table);
  console.log();
  console.log(chalk.cyan(`Total: ${custom.length} custom components`));
  console.log();
}

/**
 * List overridden components (active theme, with replaces)
 * @param {object} project - Project object
 */
function handleListOverriddenComponents(project) {
  if (!printThemeSummary(project)) return;

  const activeTheme = project.theme.themes[0];
  if (!activeTheme?.components) {
    console.log(chalk.yellow('No components found in active theme.'));
    return;
  }

  const overridden = Object.values(activeTheme.components)
    .filter(c => c.replaces)
    .map(c => ({
      ...c,
      id: `${activeTheme.machine_name}:${c.machine_name}`
    }));

  if (overridden.length === 0) {
    console.log(chalk.yellow('No overridden components found.'));
    return;
  }

  const table = createTable(
    [
      { header: 'ID', minWidth: 20, getValue: c => c.id },
      { header: 'Name', minWidth: 15, getValue: c => c.name },
      { header: 'Description', minWidth: 30, getValue: c => c.description || '' },
      { header: 'Overrides', minWidth: 15, getValue: c => c.replaces || '' }
    ],
    overridden
  );

  console.log(table);
  console.log();
  console.log(chalk.cyan(`Total: ${overridden.length} overridden components`));
  console.log();
}

/**
 * Handle override component action
 * @param {object} project - Project object
 * @returns {Promise<object>} - Updated project
 */
async function handleOverrideComponent(project) {
  if (!project.theme?.themes?.length) {
    console.log(chalk.yellow('No theme configured.'));
    return project;
  }

  const activeTheme = project.theme.themes[0];
  const activeThemeOverrides = new Set(
    Object.values(activeTheme.components || {})
      .filter(c => c.replaces)
      .map(c => c.replaces)
  );

  // Collect all overridable components from base themes (not already overridden)
  const overridable = [];
  for (const theme of project.theme.themes.slice(1)) {
    for (const comp of Object.values(theme.components || {})) {
      const compId = `${theme.machine_name}:${comp.machine_name}`;
      if (!activeThemeOverrides.has(compId)) {
        overridable.push({
          id: compId,
          name: comp.name,
          machine_name: comp.machine_name,
          description: comp.description || '',
          component_config_path: comp.component_config_path,
          theme_machine_name: theme.machine_name
        });
      }
    }
  }

  if (overridable.length === 0) {
    console.log(chalk.yellow('No components available to override (all base theme components are already overridden).'));
    return project;
  }

  // Searchable component selection
  const selectedId = await search({
    message: 'Select component to override:',
    source: async (input) => {
      const term = (input || '').toLowerCase();
      return overridable
        .filter(c =>
          c.id.toLowerCase().includes(term) ||
          c.name.toLowerCase().includes(term) ||
          c.description.toLowerCase().includes(term)
        )
        .map(c => ({
          value: c.id,
          name: `${c.id} - ${c.name}`,
          description: c.description
        }));
    }
  });

  const selected = overridable.find(c => c.id === selectedId);

  // Ask whether to copy CSS and twig
  const copyFiles = await confirm({
    message: 'Copy CSS and twig files from the source component?',
    default: true
  });

  // Check for component subdirectories
  const subdirs = await getComponentSubdirectories(activeTheme.directory);
  let subdirectory = selected.machine_name;

  if (subdirs.length > 0) {
    subdirectory = await select({
      message: 'Select component subdirectory:',
      choices: subdirs.map(d => ({ value: d, name: d }))
    });
  }

  // Create the override
  const { directory: componentDir, files: createdFiles } = await createComponentOverride({
    activeThemeDir: activeTheme.directory,
    subdirectory,
    machineName: selected.machine_name,
    sourceConfigPath: selected.component_config_path,
    replacesId: selectedId,
    copyFiles
  });

  console.log();
  console.log(chalk.green(`Component override created: ${componentDir}`));
  console.log(chalk.cyan('Files created:'));
  for (const file of createdFiles) {
    console.log(chalk.white(`  ${file}`));
  }
  console.log();
  console.log(chalk.cyan('Syncing project...'));

  // Re-sync to pick up new component
  try {
    const result = await syncProject(project);
    project = await loadProject(project.slug);
    console.log(chalk.green('Sync complete!'));
    if (result.componentsFound > 0) {
      console.log(chalk.cyan(`Found ${result.componentsFound} theme components`));
    }
  } catch (error) {
    console.log(chalk.yellow(`Sync warning: ${error.message}`));
  }

  return project;
}

/**
 * Theme & Components submenu
 * @param {object} project - Project object
 * @returns {Promise<object>} - Updated project
 */
export async function handleThemeMenu(project) {
  printThemeSummary(project);

  const choices = [
    { value: 'sync-components', name: 'Sync components' },
    { value: 'list-components', name: 'List components' },
    { value: 'list-custom', name: 'List custom components' },
    { value: 'list-overridden', name: 'List overridden components' },
    { value: 'override-component', name: 'Override a component' },
    { value: 'back', name: 'Back' }
  ];

  while (true) {
    try {
      const action = await search({
        message: `${project.name} - Theme & Components:`,
        source: async (input) => {
          const searchTerm = (input || '').toLowerCase();
          return choices.filter(c =>
            c.name.toLowerCase().includes(searchTerm) ||
            c.value.toLowerCase().includes(searchTerm)
          );
        }
      });

      switch (action) {
        case 'sync-components':
          console.log(chalk.cyan('Syncing configuration...'));
          try {
            const result = await syncProject(project);
            project = await loadProject(project.slug);
            console.log(chalk.green('Sync complete!'));
            console.log(chalk.cyan(`Found ${result.bundlesFound} bundles and ${result.fieldsFound} fields`));
            if (result.componentsFound > 0) {
              console.log(chalk.cyan(`Found ${result.componentsFound} theme components`));
            }
          } catch (error) {
            console.log(chalk.red(`Sync failed: ${error.message}`));
          }
          break;
        case 'list-components':
          handleListComponents(project);
          break;
        case 'list-custom':
          handleListCustomComponents(project);
          break;
        case 'list-overridden':
          handleListOverriddenComponents(project);
          break;
        case 'override-component':
          project = await handleOverrideComponent(project);
          break;
        case 'back':
          return project;
      }
    } catch (error) {
      if (error.name === 'ExitPromptError') {
        return project;
      }
      console.log(chalk.red(`Error: ${error.message}`));
    }
  }
}
