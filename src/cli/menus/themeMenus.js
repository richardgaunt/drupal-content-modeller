/**
 * Theme & Components Menu Handlers
 * Handles theme browsing and component listing actions.
 */

import { search, select, confirm, input, checkbox } from '@inquirer/prompts';
import chalk from 'chalk';

import { syncProject } from '../../commands/sync.js';
import { loadProject } from '../../commands/project.js';
import { createTable } from '../../commands/list.js';
import { getComponentSubdirectories, createComponentOverride, updateComponentYml, createNewComponent } from '../../io/componentWriter.js';
import { readComponentDetail } from '../../io/componentReader.js';
import { generateMachineName, validateMachineName } from '../../utils/slug.js';
import { writeViewMode, viewModeExists, deleteViewMode } from '../../io/configReader.js';
import { generateViewMode } from '../../generators/viewModeGenerator.js';
import { ENTITY_ORDER, getEntityTypeLabel, getEntityTypeSingularLabel } from '../../constants/entityTypes.js';
import { getBundleThemeSuggestions, getFieldThemeSuggestions } from '../../utils/themeSuggestions.js';
import { checkDrushAvailable, drushGetThemePreprocesses } from '../../commands/drush.js';
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
 * Handle "Create custom component" action.
 * @param {object} project - Project object
 * @returns {Promise<object>} - Updated project
 */
async function handleCreateComponent(project) {
  if (!project.theme?.themes?.length) {
    console.log(chalk.yellow('No theme configured.'));
    return project;
  }

  const activeTheme = project.theme.themes[0];

  // Component name and machine name
  const name = await input({ message: 'Name of component:' });
  const suggestedName = generateMachineName(name);
  const machineName = await input({
    message: 'Machine name:',
    default: suggestedName,
    validate: (value) => {
      if (!isValidPropName(value)) return 'Must be snake_case (lowercase letters, numbers, underscores, starting with a letter)';
      // Check if component already exists in active theme
      if (activeTheme.components?.[value]) return 'A component with this name already exists in the active theme';
      return true;
    }
  });
  const description = await input({ message: 'Description:' });

  const SDC_SCHEMA = 'https://git.drupalcode.org/project/drupal/-/raw/HEAD/core/assets/schemas/v1/metadata.schema.json';
  let config = {
    $schema: SDC_SCHEMA,
    name,
    status: 'stable',
    description
  };

  // Base on another component?
  const baseOnExisting = await confirm({
    message: 'Base this on another component\'s properties?',
    default: false
  });

  if (baseOnExisting) {
    const allComponents = getAllComponents(project);
    if (allComponents.length === 0) {
      console.log(chalk.yellow('No existing components to base on.'));
    } else {
      const selectedId = await search({
        message: 'Select component to base on:',
        source: async (searchInput) => {
          const term = (searchInput || '').toLowerCase();
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
      if (selected) {
        const detail = await readComponentDetail(selected.component_config_path);
        if (detail.props) config.props = detail.props;
        if (detail.slots) config.slots = detail.slots;
        console.log(chalk.cyan(`Copied props and slots from ${selected.id}`));

        // Ask about copying assets
        if (detail.assets && detail.assets.length > 0) {
          const copyAssets = await confirm({
            message: 'Copy assets (twig, css, js, etc.) from the source component?',
            default: true
          });

          if (copyAssets) {
            config._sourceDir = detail.directory;
            config._sourceMachineName = detail.machine_name;
          }
        }
      }
    }
  }

  // Select which props to keep
  if (config.props?.properties && Object.keys(config.props.properties).length > 0) {
    const propChoices = Object.entries(config.props.properties).map(([key, prop]) => ({
      value: key,
      name: `${prop.title || key} (${key})`,
      checked: true
    }));

    const propsToKeep = await checkbox({
      message: 'Select props to include:',
      choices: propChoices
    });

    const allPropKeys = Object.keys(config.props.properties);
    for (const key of allPropKeys) {
      if (!propsToKeep.includes(key)) {
        config.props = removePropFromSchema(config.props, key);
      }
    }
  }

  // Select which slots to keep
  if (config.slots && Object.keys(config.slots).length > 0) {
    const slotChoices = Object.entries(config.slots).map(([key, slot]) => ({
      value: key,
      name: `${slot.title || key} (${key})`,
      checked: true
    }));

    const slotsToKeep = await checkbox({
      message: 'Select slots to include:',
      choices: slotChoices
    });

    const allSlotKeys = Object.keys(config.slots);
    for (const key of allSlotKeys) {
      if (!slotsToKeep.includes(key)) {
        config.slots = removeSlotFromSchema(config.slots, key);
      }
    }
  }

  // Add props
  const wantAdd = await confirm({ message: 'Do you want to add properties?', default: false });
  if (wantAdd) {
    let addMore = true;
    while (addMore) {
      const existingNames = getExistingNames({ props: config.props, slots: config.slots });
      const { machineName: propName, ...propDef } = await promptForPropDefinition(existingNames);
      config.props = addPropToSchema(config.props, propName, propDef);
      console.log(chalk.green(`Prop "${propName}" added.`));
      addMore = await confirm({ message: 'Add another property?', default: false });
    }
  }

  // Select subdirectory
  const subdirs = await getComponentSubdirectories(activeTheme.directory);
  let subdirectory = machineName;

  if (subdirs.length > 0) {
    subdirectory = await select({
      message: 'Select component subdirectory:',
      choices: subdirs.map(d => ({ value: d, name: d }))
    });
  }

  // Extract source info (set during "base on" flow) and remove from config
  const sourceDir = config._sourceDir;
  const sourceMachineName = config._sourceMachineName;
  delete config._sourceDir;
  delete config._sourceMachineName;

  // Create the component
  const { directory: componentDir, files: createdFiles } = await createNewComponent({
    activeThemeDir: activeTheme.directory,
    subdirectory,
    machineName,
    config,
    sourceDir,
    sourceMachineName
  });

  console.log();
  console.log(chalk.green(`Component created: ${componentDir}`));
  console.log(chalk.cyan('Files created:'));
  for (const file of createdFiles) {
    console.log(chalk.white(`  ${file}`));
  }
  console.log();

  // Re-sync
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
 * List all entity view modes
 * @param {object} project - Project object
 */
function handleListViewModes(project) {
  const viewModes = project.viewModes || [];

  if (viewModes.length === 0) {
    console.log(chalk.yellow('No entity view modes found. Run sync first.'));
    return;
  }

  // Sort by entity type then label
  const sorted = [...viewModes].sort((a, b) => {
    const typeOrder = ENTITY_ORDER.indexOf(a.entityType) - ENTITY_ORDER.indexOf(b.entityType);
    if (typeOrder !== 0) return typeOrder;
    return (a.label || '').localeCompare(b.label || '');
  });

  const table = createTable(
    [
      { header: 'Entity Type', minWidth: 15, getValue: v => getEntityTypeLabel(v.entityType) },
      { header: 'Name', minWidth: 20, getValue: v => v.label },
      { header: 'Machine Name', minWidth: 25, getValue: v => v.viewModeName }
    ],
    sorted
  );

  console.log();
  console.log(table);
  console.log();
  console.log(chalk.cyan(`Total: ${viewModes.length} view modes`));
  console.log();
}

/**
 * List view modes filtered by a selected entity type
 * @param {object} project - Project object
 */
async function handleListViewModesByEntityType(project) {
  const viewModes = project.viewModes || [];

  if (viewModes.length === 0) {
    console.log(chalk.yellow('No entity view modes found. Run sync first.'));
    return;
  }

  // Only show entity types that have view modes
  const typesWithModes = ENTITY_ORDER.filter(et =>
    viewModes.some(v => v.entityType === et)
  );

  if (typesWithModes.length === 0) {
    console.log(chalk.yellow('No entity view modes found.'));
    return;
  }

  const entityType = await select({
    message: 'Select entity type:',
    choices: typesWithModes.map(et => {
      const count = viewModes.filter(v => v.entityType === et).length;
      return {
        value: et,
        name: `${getEntityTypeLabel(et)} (${count})`
      };
    })
  });

  const filtered = viewModes
    .filter(v => v.entityType === entityType)
    .sort((a, b) => (a.label || '').localeCompare(b.label || ''));

  const table = createTable(
    [
      { header: 'Name', minWidth: 20, getValue: v => v.label },
      { header: 'Machine Name', minWidth: 25, getValue: v => v.viewModeName }
    ],
    filtered
  );

  console.log();
  console.log(chalk.cyan(`${getEntityTypeLabel(entityType)} View Modes:`));
  console.log(table);
  console.log();
  console.log(chalk.cyan(`Total: ${filtered.length} view modes`));
  console.log();
}

/**
 * Add a new entity view mode
 * @param {object} project - Project object
 * @returns {Promise<object>} - Updated project
 */
async function handleAddViewMode(project) {
  // Select entity type
  const entityType = await select({
    message: 'Select entity type:',
    choices: ENTITY_ORDER.map(et => ({
      value: et,
      name: getEntityTypeLabel(et)
    }))
  });

  // Get label
  const label = await input({
    message: `${getEntityTypeSingularLabel(entityType)} view mode label:`,
    validate: (value) => value.trim() ? true : 'Label is required'
  });

  // Get machine name
  const suggestedName = generateMachineName(label);
  const viewModeName = await input({
    message: 'Machine name:',
    default: suggestedName,
    validate: (value) => {
      if (!validateMachineName(value)) return 'Must be lowercase letters, numbers, and underscores';
      if (viewModeExists(project.configDirectory, entityType, value)) {
        return 'A view mode with this name already exists';
      }
      return true;
    }
  });

  const description = await input({ message: 'Description (optional):' });

  // Generate and write
  const yamlContent = generateViewMode({
    entityType,
    viewModeName,
    label,
    description
  });

  await writeViewMode(project.configDirectory, entityType, viewModeName, yamlContent);

  console.log();
  console.log(chalk.green(`View mode "${label}" created for ${getEntityTypeSingularLabel(entityType)}.`));
  console.log(chalk.cyan(`File: core.entity_view_mode.${entityType}.${viewModeName}.yml`));
  console.log();

  // Re-sync
  try {
    const result = await syncProject(project);
    project = await loadProject(project.slug);
    console.log(chalk.green('Sync complete!'));
  } catch (error) {
    console.log(chalk.yellow(`Sync warning: ${error.message}`));
  }

  return project;
}

/**
 * Remove an entity view mode
 * @param {object} project - Project object
 * @returns {Promise<object>} - Updated project
 */
async function handleRemoveViewMode(project) {
  const viewModes = project.viewModes || [];

  if (viewModes.length === 0) {
    console.log(chalk.yellow('No entity view modes found.'));
    return project;
  }

  // Sort for display
  const sorted = [...viewModes].sort((a, b) => {
    const typeOrder = ENTITY_ORDER.indexOf(a.entityType) - ENTITY_ORDER.indexOf(b.entityType);
    if (typeOrder !== 0) return typeOrder;
    return (a.label || '').localeCompare(b.label || '');
  });

  const selectedId = await search({
    message: 'Select view mode to remove:',
    source: async (searchInput) => {
      const term = (searchInput || '').toLowerCase();
      return sorted
        .filter(v =>
          v.label.toLowerCase().includes(term) ||
          v.viewModeName.toLowerCase().includes(term) ||
          v.entityType.toLowerCase().includes(term)
        )
        .map(v => ({
          value: v.id,
          name: `${getEntityTypeLabel(v.entityType)} - ${v.label} (${v.viewModeName})`
        }));
    }
  });

  const selected = sorted.find(v => v.id === selectedId);
  if (!selected) return project;

  const shouldRemove = await confirm({
    message: `Remove view mode "${selected.label}" (${selected.entityType}.${selected.viewModeName})?`,
    default: false
  });

  if (!shouldRemove) return project;

  const deleted = await deleteViewMode(project.configDirectory, selected.entityType, selected.viewModeName);

  if (deleted) {
    console.log();
    console.log(chalk.green(`View mode "${selected.label}" removed.`));
    console.log();

    // Re-sync
    try {
      const result = await syncProject(project);
      project = await loadProject(project.slug);
      console.log(chalk.green('Sync complete!'));
    } catch (error) {
      console.log(chalk.yellow(`Sync warning: ${error.message}`));
    }
  } else {
    console.log(chalk.red('Could not delete view mode file.'));
  }

  return project;
}

/**
 * Helper to select an entity type that has bundles
 * @param {object} project - Project object
 * @param {string} message - Prompt message
 * @returns {Promise<string|null>} - Selected entity type or null
 */
async function selectEntityTypeWithBundles(project, message) {
  if (!project.entities) {
    console.log(chalk.yellow('No entities found. Run sync first.'));
    return null;
  }

  const typesWithBundles = ENTITY_ORDER.filter(et =>
    project.entities[et] && Object.keys(project.entities[et]).length > 0
  );

  if (typesWithBundles.length === 0) {
    console.log(chalk.yellow('No bundles found. Run sync first.'));
    return null;
  }

  return select({
    message,
    choices: typesWithBundles.map(et => ({
      value: et,
      name: getEntityTypeLabel(et)
    }))
  });
}

/**
 * Helper to select a bundle for a given entity type
 * @param {object} project - Project object
 * @param {string} entityType - Entity type
 * @returns {Promise<string>} - Selected bundle machine name
 */
async function selectBundle(project, entityType) {
  const bundles = Object.values(project.entities[entityType]);
  return search({
    message: `Select ${getEntityTypeSingularLabel(entityType)}:`,
    source: async (input) => {
      const term = (input || '').toLowerCase();
      return bundles
        .filter(b =>
          b.id.toLowerCase().includes(term) ||
          b.label.toLowerCase().includes(term)
        )
        .map(b => ({
          value: b.id,
          name: `${b.label} (${b.id})`
        }));
    }
  });
}

/**
 * Get the active theme machine name from the project
 * @param {object} project - Project object
 * @returns {string} - Theme machine name or 'mytheme' as fallback
 */
function getActiveThemeName(project) {
  return project.theme?.themes?.[0]?.machine_name || 'mytheme';
}

/**
 * Print theme suggestions as preprocess function names
 * @param {string[]} suggestions - Array of theme suggestion strings
 * @param {string} themeName - Active theme machine name
 */
function printThemeSuggestions(suggestions, themeName) {
  console.log();
  console.log(chalk.cyan('Preprocess functions (lowest to highest priority):'));
  console.log();
  for (const suggestion of suggestions) {
    const twig = suggestion.replace(/__/g, '--') + '.html.twig';
    console.log(chalk.white(`  ${themeName}_preprocess_${suggestion}()`));
    console.log(chalk.gray(`  ${twig}`));
    console.log();
  }
}

/**
 * Handle "List theme suggestions for bundle"
 * @param {object} project - Project object
 */
async function handleBundleThemeSuggestions(project) {
  const entityType = await selectEntityTypeWithBundles(project, 'Select entity type:');
  if (!entityType) return;

  const bundle = await selectBundle(project, entityType);

  // Optionally select view mode
  const viewModes = (project.viewModes || []).filter(v => v.entityType === entityType);
  let viewMode = null;

  if (viewModes.length > 0) {
    const viewModeChoices = [
      { value: '__none__', name: 'Default (no view mode)' },
      ...viewModes.map(v => ({
        value: v.viewModeName,
        name: `${v.label} (${v.viewModeName})`
      }))
    ];

    const selected = await select({
      message: 'Select view mode:',
      choices: viewModeChoices
    });

    if (selected !== '__none__') {
      viewMode = selected;
    }
  }

  const suggestions = getBundleThemeSuggestions(entityType, bundle, viewMode);
  const themeName = getActiveThemeName(project);

  const bundleData = project.entities[entityType][bundle];
  console.log();
  console.log(chalk.cyan(`Bundle: ${bundleData.label} (${entityType}.${bundle})`));
  if (viewMode) {
    console.log(chalk.cyan(`View Mode: ${viewMode}`));
  }

  printThemeSuggestions(suggestions, themeName);
}

/**
 * Handle "List theme suggestions for field"
 * @param {object} project - Project object
 */
async function handleFieldThemeSuggestions(project) {
  const entityType = await selectEntityTypeWithBundles(project, 'Select entity type:');
  if (!entityType) return;

  const bundle = await selectBundle(project, entityType);

  const bundleData = project.entities[entityType][bundle];
  const fields = Object.values(bundleData.fields || {});

  if (fields.length === 0) {
    console.log(chalk.yellow('No fields found for this bundle.'));
    return;
  }

  const fieldName = await search({
    message: 'Select field:',
    source: async (input) => {
      const term = (input || '').toLowerCase();
      return fields
        .filter(f =>
          f.name.toLowerCase().includes(term) ||
          f.label.toLowerCase().includes(term)
        )
        .map(f => ({
          value: f.name,
          name: `${f.label} (${f.name}) [${f.type}]`
        }));
    }
  });

  const field = fields.find(f => f.name === fieldName);
  const suggestions = getFieldThemeSuggestions(entityType, bundle, field.name, field.type);
  const themeName = getActiveThemeName(project);

  console.log();
  console.log(chalk.cyan(`Field: ${field.label} (${field.name})`));
  console.log(chalk.cyan(`Type: ${field.type}`));
  console.log(chalk.cyan(`Bundle: ${entityType}.${bundle}`));

  printThemeSuggestions(suggestions, themeName);
}

/**
 * Handle live theme preprocesses from Drupal via drush
 * @param {object} project - Project object
 */
async function handleThemePreprocesses(project) {
  const drushCheck = await checkDrushAvailable(project);
  if (!drushCheck.available) {
    console.log(chalk.yellow(drushCheck.message));
    return;
  }

  const mode = await select({
    message: 'View preprocesses for:',
    choices: [
      { value: 'entity', name: 'Entity type / bundle / view mode' },
      { value: 'field', name: 'Field' },
      { value: 'all', name: 'All entity types' }
    ]
  });

  let entityType = null;
  let bundle = null;
  let viewMode = null;
  let fieldName = null;

  if (mode === 'entity' || mode === 'field') {
    const entityTypes = Object.keys(project.entities || {}).filter(
      type => Object.keys(project.entities[type]).length > 0
    );

    if (entityTypes.length === 0) {
      console.log(chalk.yellow('No entities found. Sync the project first.'));
      return;
    }

    entityType = await select({
      message: 'Select entity type:',
      choices: entityTypes.map(type => ({
        value: type,
        name: `${getEntityTypeLabel(type)} (${Object.keys(project.entities[type]).length} bundles)`
      }))
    });

    if (mode === 'entity') {
      const bundles = Object.values(project.entities[entityType] || {});
      const bundleChoices = [
        { value: '__all__', name: 'All bundles' },
        ...bundles
          .sort((a, b) => (a.label || '').localeCompare(b.label || ''))
          .map(b => ({ value: b.id, name: b.label || b.id }))
      ];

      const selectedBundle = await select({
        message: 'Select bundle:',
        choices: bundleChoices
      });
      if (selectedBundle !== '__all__') bundle = selectedBundle;

      // View mode selection
      const viewModes = (project.viewModes || []).filter(v => v.entityType === entityType);
      if (viewModes.length > 0) {
        const vmChoices = [
          { value: '__all__', name: 'All view modes' },
          ...viewModes.map(v => ({ value: v.viewModeName, name: v.label || v.viewModeName }))
        ];
        const selectedVm = await select({
          message: 'Select view mode:',
          choices: vmChoices
        });
        if (selectedVm !== '__all__') viewMode = selectedVm;
      }
    } else {
      // Field mode — pick bundle then field
      const bundles = Object.values(project.entities[entityType] || {});
      const selectedBundle = await select({
        message: 'Select bundle:',
        choices: bundles
          .sort((a, b) => (a.label || '').localeCompare(b.label || ''))
          .map(b => ({ value: b.id, name: b.label || b.id }))
      });

      const bundleObj = project.entities[entityType][selectedBundle];
      const fields = Object.values(bundleObj.fields || {});
      if (fields.length === 0) {
        console.log(chalk.yellow('No fields found for this bundle.'));
        return;
      }

      fieldName = await search({
        message: 'Select field:',
        source: async (input) => {
          const term = (input || '').toLowerCase();
          return fields
            .filter(f =>
              f.name.toLowerCase().includes(term) ||
              (f.label || '').toLowerCase().includes(term)
            )
            .map(f => ({
              value: f.name,
              name: `${f.label || f.name} (${f.name}) [${f.type}]`
            }));
        }
      });
    }
  }

  console.log(chalk.cyan('Querying Drupal theme registry...'));
  const result = await drushGetThemePreprocesses(project);

  if (!result.success) {
    console.log(chalk.red(result.message));
    return;
  }

  // Filter the data
  let filtered = result.data;

  if (fieldName) {
    const fieldData = filtered.field;
    if (fieldData) {
      const narrowed = { field: { base: fieldData.base, variants: {} } };
      for (const [hook, funcs] of Object.entries(fieldData.variants)) {
        if (hook.includes(`__${fieldName}`)) {
          narrowed.field.variants[hook] = funcs;
        }
      }
      filtered = narrowed;
    } else {
      filtered = {};
    }
  } else if (entityType) {
    const entry = filtered[entityType];
    if (entry) {
      const narrowed = { [entityType]: { base: entry.base, variants: {} } };
      for (const [hook, funcs] of Object.entries(entry.variants)) {
        if (bundle && !hook.includes(`__${bundle}`)) continue;
        if (viewMode && !hook.includes(`__${viewMode}`)) continue;
        narrowed[entityType].variants[hook] = funcs;
      }
      filtered = narrowed;
    } else {
      filtered = {};
    }
  }

  // Print results
  console.log();
  for (const [type, entry] of Object.entries(filtered)) {
    console.log(chalk.cyan(`=== ${type} ===`));
    console.log();

    if (entry.base.length > 0) {
      console.log(chalk.white(`  ${type}:`));
      for (const func of entry.base) {
        console.log(chalk.gray(`    - ${func}`));
      }
      console.log();
    }

    for (const [hook, funcs] of Object.entries(entry.variants)) {
      console.log(chalk.white(`  ${hook}:`));
      for (const func of funcs) {
        console.log(chalk.gray(`    - ${func}`));
      }
      console.log();
    }
  }

  if (Object.keys(filtered).length === 0) {
    console.log(chalk.yellow('No preprocess functions found for the selected filters.'));
  }
}

/**
 * Theme & Components submenu
 * @param {object} project - Project object
 * @returns {Promise<object>} - Updated project
 */
export async function handleThemeMenu(project) {
  printThemeSummary(project);

  const choices = [
    { value: 'edit-component', name: 'Edit component (add/remove props & slots)' },
    { value: 'create-component', name: 'Create custom component' },
    { value: 'override-component', name: 'Override a component' },
    { value: 'sync-components', name: 'Sync components' },
    { value: 'inspect-component', name: 'Inspect component (props & slots)' },
    { value: 'list-components', name: 'List components' },
    { value: 'list-custom', name: 'List custom components' },
    { value: 'list-overridden', name: 'List overridden components' },
    { value: 'list-view-modes', name: 'List entity view modes' },
    { value: 'list-view-modes-by-type', name: 'List view modes by entity type' },
    { value: 'add-view-mode', name: 'Add entity view mode' },
    { value: 'remove-view-mode', name: 'Remove entity view mode' },
    { value: 'bundle-suggestions', name: 'List theme suggestions for bundle' },
    { value: 'field-suggestions', name: 'List theme suggestions for field' },
    { value: 'theme-preprocesses', name: 'List live preprocess functions (drush)' },
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

      if (action === 'back') return project;

      try {
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
          case 'create-component':
            project = await handleCreateComponent(project);
            break;
          case 'edit-component':
            project = await handleEditComponent(project);
            break;
          case 'override-component':
            project = await handleOverrideComponent(project);
            break;
          case 'list-view-modes':
            handleListViewModes(project);
            break;
          case 'list-view-modes-by-type':
            await handleListViewModesByEntityType(project);
            break;
          case 'add-view-mode':
            project = await handleAddViewMode(project);
            break;
          case 'remove-view-mode':
            project = await handleRemoveViewMode(project);
            break;
          case 'bundle-suggestions':
            await handleBundleThemeSuggestions(project);
            break;
          case 'field-suggestions':
            await handleFieldThemeSuggestions(project);
            break;
          case 'theme-preprocesses':
            await handleThemePreprocesses(project);
            break;
        }
      } catch (innerError) {
        if (innerError.name === 'ExitPromptError') {
          // Ctrl-C in a sub-handler returns to theme menu
          continue;
        }
        console.log(chalk.red(`Error: ${innerError.message}`));
      }
    } catch (error) {
      if (error.name === 'ExitPromptError') {
        // Ctrl-C on the theme menu itself returns to project menu
        return project;
      }
      console.log(chalk.red(`Error: ${error.message}`));
    }
  }
}
