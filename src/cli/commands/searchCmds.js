/**
 * Search API Commands
 * Read-only introspection of a project's Search API configuration:
 * servers, indexes, indexed fields, search-bound views, and the indexable
 * property tree for a bundle. Also the `report search` Markdown report.
 */

import chalk from 'chalk';
import { join } from 'path';
import { loadProject } from '../../commands/project.js';
import {
  listSearchServers,
  listSearchIndexes,
  getSearchIndex,
  listSearchViews,
  getIndexableProperties,
  gatherSearchSources
} from '../../commands/search.js';
import { createSearchReport } from '../../commands/report.js';
import { generateSearchReportData, formatSearchReportMarkdown } from '../../generators/searchReport.js';
import { createTable } from '../../commands/list.js';
import { getReportsDir } from '../../io/fileSystem.js';
import {
  output,
  handleError,
  isValidEntityType,
  VALID_ENTITY_TYPES,
  autoSyncProject
} from '../cliUtils.js';

function requireProject(options) {
  if (!options.project) {
    throw new Error('--project is required');
  }
}

function fmtStatus(status) {
  return status ? 'enabled' : 'disabled';
}

/**
 * dcm search server list
 */
export async function cmdSearchServerList(options) {
  try {
    requireProject(options);
    const project = await loadProject(options.project);
    const servers = await listSearchServers(project);

    if (options.json) {
      output(servers, true);
      return;
    }

    if (servers.length === 0) {
      console.log(chalk.yellow('No Search API servers found.'));
      return;
    }

    const table = createTable(
      [
        { header: 'ID', minWidth: 16, getValue: s => s.id },
        { header: 'Label', minWidth: 20, getValue: s => s.label },
        { header: 'Backend', minWidth: 14, getValue: s => s.backend || '-' },
        { header: 'Status', minWidth: 8, getValue: s => fmtStatus(s.status) }
      ],
      servers
    );
    console.log();
    console.log(chalk.cyan(`Search API Servers (${servers.length}):`));
    console.log(table);
  } catch (error) {
    handleError(error);
  }
}

/**
 * dcm search index list
 */
export async function cmdSearchIndexList(options) {
  try {
    requireProject(options);
    const project = await loadProject(options.project);
    const indexes = await listSearchIndexes(project);

    if (options.json) {
      output(indexes, true);
      return;
    }

    if (indexes.length === 0) {
      console.log(chalk.yellow('No Search API indexes found.'));
      return;
    }

    const table = createTable(
      [
        { header: 'ID', minWidth: 16, getValue: i => i.id },
        { header: 'Label', minWidth: 18, getValue: i => i.label },
        { header: 'Server', minWidth: 14, getValue: i => i.server || '-' },
        { header: 'Status', minWidth: 8, getValue: i => fmtStatus(i.status) },
        { header: 'Bundles', minWidth: 16, getValue: i => i.bundles.join(', ') || '-' },
        { header: 'Languages', minWidth: 12, getValue: i => i.languages.join(', ') || 'all' },
        { header: 'Fields', minWidth: 6, getValue: i => String(i.fieldCount) },
        { header: 'Tracker', minWidth: 10, getValue: i => i.tracker || '-' }
      ],
      indexes
    );
    console.log();
    console.log(chalk.cyan(`Search API Indexes (${indexes.length}):`));
    console.log(table);
  } catch (error) {
    handleError(error);
  }
}

/**
 * dcm search index show
 */
export async function cmdSearchIndexShow(options) {
  try {
    requireProject(options);
    if (!options.index) {
      throw new Error('--index is required');
    }
    const project = await loadProject(options.project);
    const index = await getSearchIndex(project, options.index);

    if (!index) {
      throw new Error(`Search index "${options.index}" not found`);
    }

    if (options.json) {
      output(index, true);
      return;
    }

    console.log();
    console.log(chalk.cyan(`Index: ${index.label} (${index.id})`));
    console.log(`  Status:  ${fmtStatus(index.status)}`);
    console.log(`  Server:  ${index.server || '-'}`);
    console.log(`  Tracker: ${index.tracker || '-'}`);
    console.log();

    console.log(chalk.bold('Datasources:'));
    if (index.datasources.length === 0) {
      console.log('  (none)');
    } else {
      for (const ds of index.datasources) {
        const resolved = ds.resolvedBundles || ds.bundles;
        let bundles;
        if (ds.bundlesAreExclusions) {
          // Deny-list: show the resolved (actually-indexed) set, noting the
          // exclusion. Empty selected ⇒ every bundle of the type.
          bundles = ds.bundles.length
            ? `${resolved.join(', ') || '(none)'} (all except ${ds.bundles.join(', ')})`
            : 'all';
        } else {
          bundles = resolved.length ? resolved.join(', ') : 'none';
        }
        const langs = ds.languages.length
          ? (ds.languagesAreExclusions ? `all except ${ds.languages.join(', ')}` : ds.languages.join(', '))
          : 'all';
        console.log(`  ${ds.datasourceId}  bundles: ${bundles}  languages: ${langs}`);
      }
    }
    console.log();

    console.log(chalk.bold('Fields:'));
    if (index.fields.length === 0) {
      console.log('  (none)');
    } else {
      const table = createTable(
        [
          { header: 'Name', minWidth: 16, getValue: f => f.name },
          { header: 'Label', minWidth: 18, getValue: f => f.label },
          { header: 'Property Path', minWidth: 24, getValue: f => f.propertyPath },
          { header: 'Type', minWidth: 10, getValue: f => f.type }
        ],
        index.fields
      );
      console.log(table);
    }
    console.log();

    console.log(chalk.bold('Processors:'));
    if (index.processors.length === 0) {
      console.log('  (none)');
    } else {
      for (const p of index.processors) {
        console.log(`  ${p.id}`);
      }
    }
    console.log();
  } catch (error) {
    handleError(error);
  }
}

/**
 * dcm search index fields
 */
export async function cmdSearchIndexFields(options) {
  try {
    requireProject(options);
    if (!options.index) {
      throw new Error('--index is required');
    }
    const project = await loadProject(options.project);
    const index = await getSearchIndex(project, options.index);

    if (!index) {
      throw new Error(`Search index "${options.index}" not found`);
    }

    if (options.json) {
      output(index.fields, true);
      return;
    }

    if (index.fields.length === 0) {
      console.log(chalk.yellow('No fields indexed.'));
      return;
    }

    const table = createTable(
      [
        { header: 'Name', minWidth: 16, getValue: f => f.name },
        { header: 'Label', minWidth: 18, getValue: f => f.label },
        { header: 'Property Path', minWidth: 24, getValue: f => f.propertyPath },
        { header: 'Type', minWidth: 10, getValue: f => f.type }
      ],
      index.fields
    );
    console.log();
    console.log(chalk.cyan(`Indexed fields for "${index.id}" (${index.fields.length}):`));
    console.log(table);
  } catch (error) {
    handleError(error);
  }
}

/**
 * dcm search view list
 */
export async function cmdSearchViewList(options) {
  try {
    requireProject(options);
    const project = await loadProject(options.project);
    const views = await listSearchViews(project, options.index || null);

    // Flatten one row per display.
    const rows = [];
    for (const view of views) {
      for (const d of view.displays) {
        rows.push({
          viewId: view.id,
          indexId: view.indexId || '-',
          displayId: d.displayId,
          displayPlugin: d.displayPlugin,
          path: d.path || '-',
          exposedFilters: d.exposedFilters.map(f => f.identifier).join(', ') || '-',
          rowViewModes: d.rowViewModes.map(r => `${r.bundle}=${r.viewMode}`).join(', ') || '-'
        });
      }
    }

    if (options.json) {
      output(views, true);
      return;
    }

    if (rows.length === 0) {
      console.log(chalk.yellow('No search-bound views found.'));
      return;
    }

    const table = createTable(
      [
        { header: 'View', minWidth: 16, getValue: r => r.viewId },
        { header: 'Index', minWidth: 14, getValue: r => r.indexId },
        { header: 'Display', minWidth: 12, getValue: r => r.displayId },
        { header: 'Path', minWidth: 14, getValue: r => r.path },
        { header: 'Exposed Filters', minWidth: 18, getValue: r => r.exposedFilters },
        { header: 'Row View Modes', minWidth: 18, getValue: r => r.rowViewModes }
      ],
      rows
    );
    console.log();
    console.log(chalk.cyan(`Search Views (${rows.length} display(s)):`));
    console.log(table);
  } catch (error) {
    handleError(error);
  }
}

/**
 * dcm search indexable
 */
export async function cmdSearchIndexable(options) {
  try {
    requireProject(options);
    const entityType = options.entityType;
    if (!entityType) {
      throw new Error('--entity-type is required');
    }
    if (!isValidEntityType(entityType)) {
      throw new Error(`Invalid entity type. Must be one of: ${VALID_ENTITY_TYPES.join(', ')}`);
    }
    if (!options.bundle) {
      throw new Error('--bundle is required');
    }

    const project = await loadProject(options.project);
    await autoSyncProject(project);

    if (!project.entities) {
      throw new Error('Project has not been synced. Run "dcm project sync" first.');
    }
    if (!project.entities[entityType] || !project.entities[entityType][options.bundle]) {
      throw new Error(`Bundle "${options.bundle}" not found in ${entityType}`);
    }

    const depth = options.depth !== undefined ? parseInt(options.depth, 10) : 2;
    if (Number.isNaN(depth) || depth < 0) {
      throw new Error('--depth must be a non-negative integer');
    }

    const includeAllTypes = Boolean(options.all);
    const properties = getIndexableProperties(
      project,
      entityType,
      options.bundle,
      depth,
      { includeAllTypes }
    );

    if (options.json) {
      output(properties, true);
      return;
    }

    if (properties.length === 0) {
      console.log(chalk.yellow('No indexable properties found.'));
      return;
    }

    const table = createTable(
      [
        { header: 'Property Path', minWidth: 32, getValue: p => p.propertyPath },
        { header: 'Label', minWidth: 24, getValue: p => p.label },
        { header: 'Drupal Type', minWidth: 16, getValue: p => p.drupalType },
        { header: 'Search Type', minWidth: 12, getValue: p => p.searchType }
      ],
      properties
    );
    const restriction = includeAllTypes
      ? ''
      : ' (text fields only; use --all for every field)';
    console.log();
    console.log(chalk.cyan(
      `Indexable properties for ${entityType}:${options.bundle} (depth ${depth}, ${properties.length})${restriction}:`
    ));
    console.log(table);
  } catch (error) {
    handleError(error);
  }
}

/**
 * dcm report search
 */
export async function cmdReportSearch(options) {
  try {
    requireProject(options);
    const project = await loadProject(options.project);

    const baseUrl = options.baseUrl || project.baseUrl || '';
    const sources = await gatherSearchSources(project);
    const opts = { baseUrl };

    if (options.json) {
      const data = generateSearchReportData(project, sources, opts);
      output(data, true);
      return;
    }

    if (options.output === '-') {
      const data = generateSearchReportData(project, sources, opts);
      console.log(formatSearchReportMarkdown(data));
      return;
    }

    const outputPath = options.output
      || join(getReportsDir(project.slug), `${project.slug}-search-report.md`);
    await createSearchReport(project, sources, opts, outputPath);
    console.log(chalk.green(`Search report saved to: ${outputPath}`));
  } catch (error) {
    handleError(error);
  }
}
