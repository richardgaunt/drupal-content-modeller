/**
 * Theme, Component, View Mode, and Theme Suggestion Commands
 */

import chalk from 'chalk';
import { loadProject } from '../../commands/project.js';
import { syncProject } from '../../commands/sync.js';
import { readComponentDetail } from '../../io/componentReader.js';
import { readThemeDirectory } from '../../io/themeReader.js';
import { writeViewMode, viewModeExists, deleteViewMode } from '../../io/configReader.js';
import { generateViewMode } from '../../generators/viewModeGenerator.js';
import { generateMachineName, validateMachineName } from '../../utils/slug.js';
import { ENTITY_ORDER, getEntityTypeLabel, getEntityTypeSingularLabel } from '../../constants/entityTypes.js';
import { getBundleThemeSuggestions, getFieldThemeSuggestions } from '../../utils/themeSuggestions.js';
import { createTable } from '../../commands/list.js';
import { checkDrushAvailable, drushGetThemePreprocesses } from '../../commands/drush.js';
import {
  output,
  handleError,
  logSuccess,
  isValidEntityType,
  VALID_ENTITY_TYPES,
  autoSyncProject
} from '../cliUtils.js';

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
 * Get theme summary info for JSON output
 * @param {object} project - Project object
 * @returns {object} - Theme summary
 */
function getThemeSummary(project) {
  if (!project.theme?.themes?.length) return null;

  return {
    activeTheme: project.theme.activeTheme,
    baseThemes: project.theme.themes.slice(1).map(t => ({
      name: t.name,
      machine_name: t.machine_name
    }))
  };
}

/**
 * Validate that a project has a theme configured
 * @param {object} project - Project object
 */
function requireTheme(project) {
  if (!project.theme?.themes?.length) {
    throw new Error('No theme configured. Edit project to set an active theme.');
  }
}

// ============================================
// Component Commands
// ============================================

/**
 * List all components across all themes
 */
export async function cmdComponentList(options) {
  try {
    if (!options.project) {
      throw new Error('--project is required');
    }

    const project = await loadProject(options.project);
    requireTheme(project);

    const components = getAllComponents(project);

    if (options.json) {
      output({
        theme: getThemeSummary(project),
        components: components.map(c => ({
          id: c.id,
          name: c.name,
          machine_name: c.machine_name,
          description: c.description || null,
          replaces: c.replaces || null,
          theme_machine_name: c.theme_machine_name
        })),
        total: components.length
      }, true);
    } else {
      if (components.length === 0) {
        console.log('No components found.');
      } else {
        const activeTheme = project.theme.activeTheme;
        const baseThemes = project.theme.themes
          .slice(1)
          .map(t => `${t.name} (${t.machine_name})`)
          .join(' \u2192 ');

        console.log();
        console.log(chalk.cyan(`Active Theme: ${activeTheme}`));
        if (baseThemes) {
          console.log(chalk.cyan(`Base Theme(s): ${baseThemes}`));
        }
        console.log();

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
      }
    }
  } catch (error) {
    handleError(error);
  }
}

/**
 * List custom components (active theme, not overriding)
 */
export async function cmdComponentListCustom(options) {
  try {
    if (!options.project) {
      throw new Error('--project is required');
    }

    const project = await loadProject(options.project);
    requireTheme(project);

    const activeTheme = project.theme.themes[0];
    const custom = Object.values(activeTheme.components || {})
      .filter(c => !c.replaces)
      .map(c => ({
        ...c,
        id: `${activeTheme.machine_name}:${c.machine_name}`
      }));

    if (options.json) {
      output({
        theme: getThemeSummary(project),
        components: custom.map(c => ({
          id: c.id,
          name: c.name,
          machine_name: c.machine_name,
          description: c.description || null
        })),
        total: custom.length
      }, true);
    } else {
      if (custom.length === 0) {
        console.log('No custom components found (all components are overrides).');
      } else {
        console.log();
        console.log(chalk.cyan(`Active Theme: ${project.theme.activeTheme}`));
        console.log();

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
      }
    }
  } catch (error) {
    handleError(error);
  }
}

/**
 * List overridden components (active theme, with replaces)
 */
export async function cmdComponentListOverridden(options) {
  try {
    if (!options.project) {
      throw new Error('--project is required');
    }

    const project = await loadProject(options.project);
    requireTheme(project);

    const activeTheme = project.theme.themes[0];
    const overridden = Object.values(activeTheme.components || {})
      .filter(c => c.replaces)
      .map(c => ({
        ...c,
        id: `${activeTheme.machine_name}:${c.machine_name}`
      }));

    if (options.json) {
      output({
        theme: getThemeSummary(project),
        components: overridden.map(c => ({
          id: c.id,
          name: c.name,
          machine_name: c.machine_name,
          description: c.description || null,
          replaces: c.replaces
        })),
        total: overridden.length
      }, true);
    } else {
      if (overridden.length === 0) {
        console.log('No overridden components found.');
      } else {
        console.log();
        console.log(chalk.cyan(`Active Theme: ${project.theme.activeTheme}`));
        console.log();

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
      }
    }
  } catch (error) {
    handleError(error);
  }
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

    const type = prop.type
      ? (Array.isArray(prop.type) ? prop.type.join(' | ') : String(prop.type))
      : '-';

    rows.push({
      name: prop.title || key,
      machine_name: fullName,
      type,
      description: prop.description || '',
      extra: extra.join('; ')
    });

    if (prop.properties) {
      rows.push(...flattenProps(prop.properties, fullName));
    }
    if (prop.items?.properties) {
      rows.push(...flattenProps(prop.items.properties, `${fullName}[]`));
    }
  }

  return rows;
}

/**
 * Inspect a component (show props & slots)
 */
export async function cmdComponentInspect(options) {
  try {
    if (!options.project) {
      throw new Error('--project is required');
    }
    if (!options.component) {
      throw new Error('--component is required (format: theme_name:component_name)');
    }

    const project = await loadProject(options.project);
    requireTheme(project);

    const allComponents = getAllComponents(project);
    const selected = allComponents.find(c => c.id === options.component);

    if (!selected) {
      throw new Error(`Component not found: ${options.component}`);
    }

    const detail = await readComponentDetail(selected.component_config_path);

    if (options.json) {
      const propRows = detail.props?.properties ? flattenProps(detail.props.properties) : [];
      const slotRows = detail.slots
        ? Object.entries(detail.slots).map(([key, slot]) => ({
            name: slot.title || key,
            machine_name: key,
            description: slot.description || ''
          }))
        : [];

      output({
        id: selected.id,
        name: detail.name,
        machine_name: detail.machine_name,
        description: detail.description || null,
        status: detail.status || null,
        replaces: detail.replaces || null,
        directory: detail.directory,
        assets: detail.assets,
        props: propRows,
        slots: slotRows
      }, true);
    } else {
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

      if (detail.assets.length > 0) {
        console.log(chalk.cyan('Assets:'));
        for (const asset of detail.assets) {
          console.log(chalk.white(`  ${asset}`));
        }
        console.log();
      }

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
  } catch (error) {
    handleError(error);
  }
}

// ============================================
// View Mode Commands
// ============================================

/**
 * List all entity view modes
 */
export async function cmdViewModeList(options) {
  try {
    if (!options.project) {
      throw new Error('--project is required');
    }

    const project = await loadProject(options.project);
    const viewModes = project.viewModes || [];

    // Optional entity type filter
    let filtered = viewModes;
    if (options.entityType) {
      if (!isValidEntityType(options.entityType)) {
        throw new Error(`Invalid entity type. Must be one of: ${VALID_ENTITY_TYPES.join(', ')}`);
      }
      filtered = viewModes.filter(v => v.entityType === options.entityType);
    }

    // Sort by entity type then label
    const sorted = [...filtered].sort((a, b) => {
      const typeOrder = ENTITY_ORDER.indexOf(a.entityType) - ENTITY_ORDER.indexOf(b.entityType);
      if (typeOrder !== 0) return typeOrder;
      return (a.label || '').localeCompare(b.label || '');
    });

    if (options.json) {
      const grouped = [];
      for (const v of sorted) {
        let group = grouped.find(g => g.entity_type === v.entityType);
        if (!group) {
          group = { entity_type: v.entityType, viewModes: [] };
          grouped.push(group);
        }
        group.viewModes.push({
          machine_name: v.viewModeName,
          label: v.label
        });
      }
      output({
        viewModes: grouped,
        total: sorted.length
      }, true);
    } else {
      if (sorted.length === 0) {
        console.log('No entity view modes found.');
      } else {
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
        console.log(chalk.cyan(`Total: ${sorted.length} view modes`));
      }
    }
  } catch (error) {
    handleError(error);
  }
}

/**
 * Create a new entity view mode
 */
export async function cmdViewModeCreate(options) {
  try {
    if (!options.project) {
      throw new Error('--project is required');
    }
    if (!options.entityType) {
      throw new Error('--entity-type is required');
    }
    if (!isValidEntityType(options.entityType)) {
      throw new Error(`Invalid entity type. Must be one of: ${VALID_ENTITY_TYPES.join(', ')}`);
    }
    if (!options.label) {
      throw new Error('--label is required');
    }

    const project = await loadProject(options.project);

    const viewModeName = options.name || generateMachineName(options.label);
    if (!validateMachineName(viewModeName)) {
      throw new Error('Machine name must be lowercase letters, numbers, and underscores');
    }

    if (viewModeExists(project.configDirectory, options.entityType, viewModeName)) {
      throw new Error(`A view mode with name "${viewModeName}" already exists for ${options.entityType}`);
    }

    const yamlContent = generateViewMode({
      entityType: options.entityType,
      viewModeName,
      label: options.label,
      description: options.description || ''
    });

    await writeViewMode(project.configDirectory, options.entityType, viewModeName, yamlContent);
    logSuccess(options.project);
    await autoSyncProject(project);

    if (options.json) {
      output({
        entityType: options.entityType,
        label: options.label,
        viewModeName,
        file: `core.entity_view_mode.${options.entityType}.${viewModeName}.yml`
      }, true);
    } else {
      console.log(chalk.green(`View mode "${options.label}" created for ${getEntityTypeSingularLabel(options.entityType)}.`));
      console.log(chalk.cyan(`File: core.entity_view_mode.${options.entityType}.${viewModeName}.yml`));
    }
  } catch (error) {
    handleError(error);
  }
}

/**
 * Delete an entity view mode
 */
export async function cmdViewModeDelete(options) {
  try {
    if (!options.project) {
      throw new Error('--project is required');
    }
    if (!options.entityType) {
      throw new Error('--entity-type is required');
    }
    if (!isValidEntityType(options.entityType)) {
      throw new Error(`Invalid entity type. Must be one of: ${VALID_ENTITY_TYPES.join(', ')}`);
    }
    if (!options.name) {
      throw new Error('--name is required (view mode machine name)');
    }

    const project = await loadProject(options.project);

    if (!viewModeExists(project.configDirectory, options.entityType, options.name)) {
      throw new Error(`View mode "${options.name}" not found for ${options.entityType}`);
    }

    const deleted = await deleteViewMode(project.configDirectory, options.entityType, options.name);

    if (!deleted) {
      throw new Error('Could not delete view mode file.');
    }

    logSuccess(options.project);
    await autoSyncProject(project);

    if (options.json) {
      output({
        deleted: true,
        entityType: options.entityType,
        viewModeName: options.name
      }, true);
    } else {
      console.log(chalk.green(`View mode "${options.name}" deleted for ${getEntityTypeSingularLabel(options.entityType)}.`));
    }
  } catch (error) {
    handleError(error);
  }
}

// ============================================
// Theme Suggestion Commands
// ============================================

/**
 * List theme suggestions for a bundle
 */
export async function cmdThemeSuggestionsBundle(options) {
  try {
    if (!options.project) {
      throw new Error('--project is required');
    }
    if (!options.entityType) {
      throw new Error('--entity-type is required');
    }
    if (!isValidEntityType(options.entityType)) {
      throw new Error(`Invalid entity type. Must be one of: ${VALID_ENTITY_TYPES.join(', ')}`);
    }
    if (!options.bundle) {
      throw new Error('--bundle is required');
    }

    const project = await loadProject(options.project);

    const suggestions = getBundleThemeSuggestions(
      options.entityType,
      options.bundle,
      options.viewMode || null
    );

    const themeName = project.theme?.themes?.[0]?.machine_name || 'mytheme';

    if (options.json) {
      output({
        entityType: options.entityType,
        bundle: options.bundle,
        viewMode: options.viewMode || null,
        themeName,
        suggestions: suggestions.map(s => ({
          suggestion: s,
          preprocessFunction: `${themeName}_preprocess_${s}()`,
          twigTemplate: s.replace(/__/g, '--') + '.html.twig'
        }))
      }, true);
    } else {
      console.log();
      console.log(chalk.cyan(`Bundle: ${options.entityType}.${options.bundle}`));
      if (options.viewMode) {
        console.log(chalk.cyan(`View Mode: ${options.viewMode}`));
      }
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
  } catch (error) {
    handleError(error);
  }
}

/**
 * List theme suggestions for a field
 */
export async function cmdThemeSuggestionsField(options) {
  try {
    if (!options.project) {
      throw new Error('--project is required');
    }
    if (!options.entityType) {
      throw new Error('--entity-type is required');
    }
    if (!isValidEntityType(options.entityType)) {
      throw new Error(`Invalid entity type. Must be one of: ${VALID_ENTITY_TYPES.join(', ')}`);
    }
    if (!options.bundle) {
      throw new Error('--bundle is required');
    }
    if (!options.fieldName) {
      throw new Error('--field-name is required');
    }
    if (!options.fieldType) {
      throw new Error('--field-type is required');
    }

    const project = await loadProject(options.project);

    const suggestions = getFieldThemeSuggestions(
      options.entityType,
      options.bundle,
      options.fieldName,
      options.fieldType
    );

    const themeName = project.theme?.themes?.[0]?.machine_name || 'mytheme';

    if (options.json) {
      output({
        entityType: options.entityType,
        bundle: options.bundle,
        fieldName: options.fieldName,
        fieldType: options.fieldType,
        themeName,
        suggestions: suggestions.map(s => ({
          suggestion: s,
          preprocessFunction: `${themeName}_preprocess_${s}()`,
          twigTemplate: s.replace(/__/g, '--') + '.html.twig'
        }))
      }, true);
    } else {
      console.log();
      console.log(chalk.cyan(`Field: ${options.fieldName} [${options.fieldType}]`));
      console.log(chalk.cyan(`Bundle: ${options.entityType}.${options.bundle}`));
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
  } catch (error) {
    handleError(error);
  }
}

// ============================================
// Theme Preprocess Commands (live from Drupal)
// ============================================

/**
 * Filter preprocess data by entity type, bundle, view mode, or field.
 * @param {object} data - Full preprocess data from drush
 * @param {object} filters - Optional filters
 * @returns {object} - Filtered data
 */
function filterPreprocessData(data, filters = {}) {
  const { entityType, bundle, viewMode, field } = filters;

  // If filtering by field, only return field data
  if (field) {
    const fieldData = data.field;
    if (!fieldData) return {};

    const filtered = { field: { base: fieldData.base, variants: {} } };
    for (const [hook, funcs] of Object.entries(fieldData.variants)) {
      if (hook.includes(`__${field}`)) {
        filtered.field.variants[hook] = funcs;
      }
    }
    return filtered;
  }

  // If no entity type filter, return everything
  if (!entityType) return data;

  const entry = data[entityType];
  if (!entry) return {};

  const filtered = { [entityType]: { base: entry.base, variants: {} } };

  for (const [hook, funcs] of Object.entries(entry.variants)) {
    if (bundle && !hook.includes(`__${bundle}`)) continue;
    if (viewMode && !hook.includes(`__${viewMode}`)) continue;
    filtered[entityType].variants[hook] = funcs;
  }

  return filtered;
}

/**
 * Format preprocess data for console output
 * @param {object} data - Preprocess data (full or filtered)
 */
function printPreprocessData(data) {
  for (const [entityType, entry] of Object.entries(data)) {
    console.log(chalk.cyan(`=== ${entityType} ===`));
    console.log();

    if (entry.base.length > 0) {
      console.log(chalk.white(`  ${entityType}:`));
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
}

/**
 * List live theme preprocess functions from a Drupal instance
 */
export async function cmdThemePreprocesses(options) {
  try {
    if (!options.project) {
      throw new Error('--project is required');
    }

    const project = await loadProject(options.project);

    const drushCheck = await checkDrushAvailable(project);
    if (!drushCheck.available) {
      throw new Error(drushCheck.message);
    }

    console.log(chalk.cyan('Querying Drupal theme registry...'));
    const result = await drushGetThemePreprocesses(project);

    if (!result.success) {
      throw new Error(result.message);
    }

    const filtered = filterPreprocessData(result.data, {
      entityType: options.entityType,
      bundle: options.bundle,
      viewMode: options.viewMode,
      field: options.field
    });

    if (options.json) {
      output(filtered, true);
    } else {
      console.log();
      printPreprocessData(filtered);
    }
  } catch (error) {
    handleError(error);
  }
}

// ============================================
// Theme Region Commands
// ============================================

/**
 * List regions for the active theme
 */
export async function cmdThemeRegions(options) {
  try {
    if (!options.project) {
      throw new Error('--project is required');
    }

    const project = await loadProject(options.project);
    requireTheme(project);

    const activeTheme = project.theme.themes[0];
    let regions = activeTheme.regions;

    // Live-read regions from the info.yml if not in saved project data
    if (!regions || Object.keys(regions).length === 0) {
      const themeInfo = await readThemeDirectory(activeTheme.directory);
      regions = themeInfo.regions;
    }

    regions = regions || {};
    const regionList = Object.entries(regions).map(([machine_name, label]) => ({
      machine_name,
      label
    }));

    if (options.json) {
      output({
        theme: {
          name: activeTheme.name,
          machine_name: activeTheme.machine_name
        },
        regions: regionList,
        total: regionList.length
      }, true);
    } else {
      console.log();
      console.log(chalk.cyan(`Active Theme: ${activeTheme.name} (${activeTheme.machine_name})`));
      console.log();

      if (regionList.length === 0) {
        console.log('No regions defined.');
      } else {
        const table = createTable(
          [
            { header: 'Machine Name', minWidth: 25, getValue: r => r.machine_name },
            { header: 'Label', minWidth: 25, getValue: r => r.label }
          ],
          regionList
        );

        console.log(table);
        console.log();
        console.log(chalk.cyan(`Total: ${regionList.length} regions`));
      }
    }
  } catch (error) {
    handleError(error);
  }
}
