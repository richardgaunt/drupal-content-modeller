/**
 * Theme & Components Menu Handlers
 * Handles theme browsing and component listing actions.
 */

import { search, select, confirm, input } from '@inquirer/prompts';
import chalk from 'chalk';

import { syncProject } from '../../commands/sync.js';
import { loadProject } from '../../commands/project.js';
import { createTable } from '../../commands/list.js';
import { getComponentSubdirectories, createComponentOverride, updateComponentYml } from '../../io/componentWriter.js';
import { readComponentDetail } from '../../io/componentReader.js';
import { generateMachineName } from '../../utils/slug.js';
import {
  PROP_TYPES,
  isValidPropName,
  buildPropSchema,
  addPropToSchema,
  removePropFromSchema,
  addSlotToSchema,
  removeSlotFromSchema
} from '../../utils/propSchema.js';

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
 * Format a prop type for display
 * @param {*} type - Type value (string, array, or undefined)
 * @returns {string}
 */
function formatPropType(type) {
  if (!type) return '-';
  if (Array.isArray(type)) return type.join(' | ');
  return String(type);
}

/**
 * Flatten nested object properties into a displayable list of props.
 * @param {object} properties - The properties object from a component's props
 * @param {string} prefix - Dot-notation prefix for nested props
 * @returns {object[]} - Flat array of prop row objects
 */
function flattenProps(properties, prefix = '') {
  if (!properties || typeof properties !== 'object') return [];

  const rows = [];
  for (const [key, prop] of Object.entries(properties)) {
    const fullName = prefix ? `${prefix}.${key}` : key;
    const extra = [];

    if (prop.enum) {
      extra.push(`Allowed: ${prop.enum.join(', ')}`);
    }
    if (prop.default !== undefined) {
      extra.push(`Default: ${prop.default}`);
    }
    if (prop.items) {
      const itemType = prop.items.type || 'mixed';
      extra.push(`Items: ${itemType}`);
    }

    rows.push({
      name: prop.title || key,
      machine_name: fullName,
      type: formatPropType(prop.type),
      description: prop.description || '',
      extra: extra.join('; ')
    });

    // Recurse into nested object properties
    if (prop.properties) {
      rows.push(...flattenProps(prop.properties, fullName));
    }
    // Recurse into array item object properties
    if (prop.items?.properties) {
      rows.push(...flattenProps(prop.items.properties, `${fullName}[]`));
    }
  }

  return rows;
}

/**
 * Handle "List props and slots of component"
 * @param {object} project - Project object
 */
async function handleInspectComponent(project) {
  if (!project.theme?.themes?.length) {
    console.log(chalk.yellow('No theme configured.'));
    return;
  }

  const allComponents = getAllComponents(project);
  if (allComponents.length === 0) {
    console.log(chalk.yellow('No components found.'));
    return;
  }

  const selectedId = await search({
    message: 'Select component to inspect:',
    source: async (input) => {
      const term = (input || '').toLowerCase();
      return allComponents
        .filter(c =>
          c.id.toLowerCase().includes(term) ||
          c.name.toLowerCase().includes(term)
        )
        .map(c => ({
          value: c.id,
          name: `${c.id} - ${c.name}`,
          description: c.description || ''
        }));
    }
  });

  const selected = allComponents.find(c => c.id === selectedId);
  if (!selected) return;

  // Read full detail from the component.yml file
  const detail = await readComponentDetail(selected.component_config_path);

  // Header
  console.log();
  console.log(chalk.cyan(`Component: ${detail.name} (${detail.machine_name})`));
  if (detail.description) {
    console.log(chalk.white(`Description: ${detail.description}`));
  }
  if (detail.status) {
    console.log(chalk.white(`Status: ${detail.status}`));
  }
  if (detail.replaces) {
    console.log(chalk.white(`Overrides: ${detail.replaces}`));
  }
  console.log(chalk.white(`Path: ${detail.directory}`));
  console.log();

  // Assets
  if (detail.assets.length > 0) {
    console.log(chalk.cyan('Assets:'));
    for (const asset of detail.assets) {
      console.log(chalk.white(`  ${asset}`));
    }
    console.log();
  }

  // Props
  if (detail.props?.properties) {
    const propRows = flattenProps(detail.props.properties);

    if (propRows.length > 0) {
      console.log(chalk.cyan('Props:'));
      const propsTable = createTable(
        [
          { header: 'Name', minWidth: 15, getValue: r => r.name },
          { header: 'Machine Name', minWidth: 20, getValue: r => r.machine_name },
          { header: 'Type', minWidth: 10, getValue: r => r.type },
          { header: 'Description', minWidth: 25, getValue: r => r.description },
          { header: 'Options', minWidth: 15, getValue: r => r.extra }
        ],
        propRows
      );
      console.log(propsTable);
      console.log();
    }
  } else {
    console.log(chalk.yellow('No props defined.'));
    console.log();
  }

  // Slots
  if (detail.slots) {
    const slotRows = Object.entries(detail.slots).map(([key, slot]) => ({
      name: slot.title || key,
      machine_name: key,
      description: slot.description || ''
    }));

    if (slotRows.length > 0) {
      console.log(chalk.cyan('Slots:'));
      const slotsOutput = createTable(
        [
          { header: 'Name', minWidth: 15, getValue: r => r.name },
          { header: 'Machine Name', minWidth: 20, getValue: r => r.machine_name },
          { header: 'Description', minWidth: 30, getValue: r => r.description }
        ],
        slotRows
      );
      console.log(slotsOutput);
      console.log();
    }
  } else {
    console.log(chalk.yellow('No slots defined.'));
    console.log();
  }
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
 * Prompt for object properties (recursive).
 * @param {string[]} existingNames - Already-used names at this level
 * @returns {Promise<object>} - Properties map
 */
async function promptForObjectProperties(existingNames = []) {
  console.log(chalk.cyan('Add properties to object:'));
  const properties = {};
  let addMore = true;

  while (addMore) {
    const allUsed = [...existingNames, ...Object.keys(properties)];
    const { machineName, ...propDef } = await promptForPropDefinition(allUsed);
    properties[machineName] = propDef;
    addMore = await confirm({ message: 'Add another property?', default: false });
  }

  return properties;
}

/**
 * Prompt for a single prop definition (recursive for object/array types).
 * @param {string[]} existingNames - Names already in use
 * @returns {Promise<object>} - { machineName, ...propSchema }
 */
async function promptForPropDefinition(existingNames = []) {
  const title = await input({ message: 'Property label:' });
  const suggestedName = generateMachineName(title);
  const machineName = await input({
    message: 'Machine name:',
    default: suggestedName,
    validate: (value) => {
      if (!isValidPropName(value)) return 'Must be snake_case (lowercase letters, numbers, underscores, starting with a letter)';
      if (existingNames.includes(value)) return 'A prop/slot with this name already exists';
      return true;
    }
  });
  const description = await input({ message: 'Description:' });
  const type = await select({
    message: 'Type:',
    choices: PROP_TYPES.map(t => ({ value: t, name: t }))
  });
  const required = await confirm({ message: 'Is this prop required?', default: false });

  let items, properties, enumValues, defaultValue;

  if (type === 'array') {
    const itemType = await select({
      message: 'Array item type:',
      choices: PROP_TYPES.filter(t => t !== 'array').map(t => ({ value: t, name: t }))
    });

    if (itemType === 'object') {
      const objProps = await promptForObjectProperties();
      items = { type: 'object', properties: objProps };
    } else {
      items = { type: itemType };
    }
  }

  if (type === 'object') {
    const wantProperties = await confirm({ message: 'Do you want to add properties?', default: false });
    if (wantProperties) {
      properties = await promptForObjectProperties();
    }
  }

  if (['string', 'integer'].includes(type)) {
    const hasEnum = await confirm({ message: 'Restrict to specific values (enum)?', default: false });
    if (hasEnum) {
      const values = await input({ message: 'Allowed values (comma-separated):' });
      enumValues = values.split(',').map(v => v.trim()).filter(Boolean);
      if (type === 'integer') {
        enumValues = enumValues.map(v => parseInt(v, 10)).filter(v => !isNaN(v));
      }
    }
  }

  const wantsDefault = await confirm({ message: 'Set a default value?', default: false });
  if (wantsDefault) {
    const rawDefault = await input({ message: 'Default value:' });
    if (type === 'boolean') {
      defaultValue = rawDefault.toLowerCase() === 'true';
    } else if (type === 'integer') {
      defaultValue = parseInt(rawDefault, 10);
    } else if (type === 'number') {
      defaultValue = parseFloat(rawDefault);
    } else {
      defaultValue = rawDefault;
    }
  }

  const propSchema = buildPropSchema({ type, title, description, required, enumValues, defaultValue, items, properties });
  return { machineName, ...propSchema };
}

/**
 * Print the twig file path hint after a component modification.
 * @param {object} detail - Component detail object
 */
function printTwigHint(detail) {
  if (detail.component_config_path) {
    const twigPath = detail.component_config_path.replace('.component.yml', '.twig');
    const assets = detail.assets || [];
    const hasTwig = assets.some(a => a.endsWith('.twig'));

    if (hasTwig) {
      console.log(chalk.yellow(`Update the template: ${twigPath}`));
    } else {
      console.log(chalk.yellow(`No twig template found. Create one at: ${twigPath}`));
    }
  }
}

/**
 * Get all existing prop and slot names for a component.
 * @param {object} detail - Component detail from readComponentDetail
 * @returns {string[]} - Array of existing names
 */
function getExistingNames(detail) {
  const names = [];
  if (detail.props?.properties) {
    names.push(...Object.keys(detail.props.properties));
  }
  if (detail.slots) {
    names.push(...Object.keys(detail.slots));
  }
  return names;
}

/**
 * Handle "Edit component" action - add/remove props and slots.
 * @param {object} project - Project object
 * @returns {Promise<object>} - Updated project
 */
async function handleEditComponent(project) {
  if (!project.theme?.themes?.length) {
    console.log(chalk.yellow('No theme configured.'));
    return project;
  }

  const allComponents = getAllComponents(project);
  if (allComponents.length === 0) {
    console.log(chalk.yellow('No components found.'));
    return project;
  }

  // Filter out components that have been overridden (show originals only, not duplicates)
  const activeTheme = project.theme.themes[0];
  const overriddenIds = new Set(
    Object.values(activeTheme.components || {})
      .filter(c => c.replaces)
      .map(c => c.replaces)
  );

  const editableComponents = allComponents.filter(c => !overriddenIds.has(c.id));

  const selectedId = await search({
    message: 'Select component to edit:',
    source: async (searchInput) => {
      const term = (searchInput || '').toLowerCase();
      return editableComponents
        .filter(c =>
          c.id.toLowerCase().includes(term) ||
          c.name.toLowerCase().includes(term)
        )
        .map(c => ({
          value: c.id,
          name: `${c.id} - ${c.name}`,
          description: c.description || ''
        }));
    }
  });

  let selected = editableComponents.find(c => c.id === selectedId);
  if (!selected) return project;

  // Check if this is a base theme component and editableBaseTheme is false
  const isBaseThemeComponent = selected.theme_machine_name !== activeTheme.machine_name;
  if (isBaseThemeComponent && !project.editableBaseTheme) {
    const shouldOverride = await confirm({
      message: 'This is a base theme component. Override it in your active theme first?',
      default: true
    });

    if (!shouldOverride) return project;

    // Run the override flow
    const copyFiles = await confirm({
      message: 'Copy files from the source component?',
      default: true
    });

    const subdirs = await getComponentSubdirectories(activeTheme.directory);
    let subdirectory = selected.machine_name;

    if (subdirs.length > 0) {
      subdirectory = await select({
        message: 'Select component subdirectory:',
        choices: subdirs.map(d => ({ value: d, name: d }))
      });
    }

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

    // Use the newly created override as the target
    const updatedActiveTheme = project.theme.themes[0];
    const overrideComp = Object.values(updatedActiveTheme.components || {})
      .find(c => c.machine_name === selected.machine_name && c.replaces);

    if (!overrideComp) {
      console.log(chalk.red('Could not find the new override component after sync.'));
      return project;
    }

    selected = {
      ...overrideComp,
      theme_machine_name: updatedActiveTheme.machine_name,
      id: `${updatedActiveTheme.machine_name}:${overrideComp.machine_name}`
    };
  }

  // Load full detail
  let detail = await readComponentDetail(selected.component_config_path);

  // Edit loop
  while (true) {
    // Show current state
    console.log();
    console.log(chalk.cyan(`Editing: ${detail.name} (${selected.id})`));
    console.log(chalk.white(`Path: ${detail.directory}`));

    const propCount = detail.props?.properties ? Object.keys(detail.props.properties).length : 0;
    const slotCount = detail.slots ? Object.keys(detail.slots).length : 0;
    console.log(chalk.white(`Props: ${propCount}, Slots: ${slotCount}`));
    console.log();

    const action = await select({
      message: 'What would you like to do?',
      choices: [
        { value: 'add-prop', name: 'Add a prop' },
        { value: 'add-slot', name: 'Add a slot' },
        { value: 'remove', name: 'Remove a prop/slot' },
        { value: 'back', name: 'Back' }
      ]
    });

    if (action === 'back') break;

    if (action === 'add-prop') {
      const existingNames = getExistingNames(detail);
      const { machineName, ...propDef } = await promptForPropDefinition(existingNames);

      // Read the raw config, update, and write back
      const { readFile: readF } = await import('fs/promises');
      const { default: yaml } = await import('js-yaml');
      const rawContent = await readF(selected.component_config_path, 'utf-8');
      const config = yaml.load(rawContent);

      config.props = addPropToSchema(config.props, machineName, propDef);
      await updateComponentYml(selected.component_config_path, config);

      detail = await readComponentDetail(selected.component_config_path);
      console.log();
      console.log(chalk.green(`Prop "${machineName}" added.`));
      printTwigHint(detail);
      console.log();
    }

    if (action === 'add-slot') {
      const existingNames = getExistingNames(detail);

      const slotTitle = await input({ message: 'Slot label:' });
      const suggestedName = generateMachineName(slotTitle);
      const slotMachineName = await input({
        message: 'Machine name:',
        default: suggestedName,
        validate: (value) => {
          if (!isValidPropName(value)) return 'Must be snake_case (lowercase letters, numbers, underscores, starting with a letter)';
          if (existingNames.includes(value)) return 'A prop/slot with this name already exists';
          return true;
        }
      });
      const slotDescription = await input({ message: 'Description:' });

      const { readFile: readF } = await import('fs/promises');
      const { default: yaml } = await import('js-yaml');
      const rawContent = await readF(selected.component_config_path, 'utf-8');
      const config = yaml.load(rawContent);

      config.slots = addSlotToSchema(config.slots, slotMachineName, {
        title: slotTitle,
        description: slotDescription
      });
      await updateComponentYml(selected.component_config_path, config);

      detail = await readComponentDetail(selected.component_config_path);
      console.log();
      console.log(chalk.green(`Slot "${slotMachineName}" added.`));
      printTwigHint(detail);
      console.log();
    }

    if (action === 'remove') {
      const removeChoices = [];

      if (detail.props?.properties) {
        for (const [key, prop] of Object.entries(detail.props.properties)) {
          removeChoices.push({
            value: `prop:${key}`,
            name: `[Prop] ${prop.title || key} (${key})`
          });
        }
      }

      if (detail.slots) {
        for (const [key, slot] of Object.entries(detail.slots)) {
          removeChoices.push({
            value: `slot:${key}`,
            name: `[Slot] ${slot.title || key} (${key})`
          });
        }
      }

      if (removeChoices.length === 0) {
        console.log(chalk.yellow('No props or slots to remove.'));
        continue;
      }

      const toRemove = await search({
        message: 'Select prop/slot to remove:',
        source: async (searchInput) => {
          const term = (searchInput || '').toLowerCase();
          return removeChoices.filter(c => c.name.toLowerCase().includes(term));
        }
      });

      const [kind, name] = toRemove.split(':');

      const shouldRemove = await confirm({
        message: `Remove ${kind} "${name}"?`,
        default: false
      });

      if (!shouldRemove) continue;

      const { readFile: readF } = await import('fs/promises');
      const { default: yaml } = await import('js-yaml');
      const rawContent = await readF(selected.component_config_path, 'utf-8');
      const config = yaml.load(rawContent);

      if (kind === 'prop') {
        config.props = removePropFromSchema(config.props, name);
      } else {
        config.slots = removeSlotFromSchema(config.slots, name);
      }

      await updateComponentYml(selected.component_config_path, config);

      detail = await readComponentDetail(selected.component_config_path);
      console.log();
      console.log(chalk.green(`${kind === 'prop' ? 'Prop' : 'Slot'} "${name}" removed.`));
      printTwigHint(detail);
      console.log();
    }
  }

  // Re-sync after edits
  try {
    const result = await syncProject(project);
    project = await loadProject(project.slug);
    if (result.componentsFound > 0) {
      console.log(chalk.cyan(`Synced: ${result.componentsFound} theme components`));
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
    { value: 'inspect-component', name: 'Inspect component (props & slots)' },
    { value: 'edit-component', name: 'Edit component (add/remove props & slots)' },
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
        case 'inspect-component':
          await handleInspectComponent(project);
          break;
        case 'edit-component':
          project = await handleEditComponent(project);
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
