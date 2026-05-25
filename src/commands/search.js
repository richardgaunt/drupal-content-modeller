/**
 * Search API commands — orchestration.
 * Loads a project's config directory and surfaces Search API servers, indexes,
 * indexed fields, search-bound views, and the indexable property tree for a
 * bundle. Read-only introspection (Phase 1) — no YAML is written here.
 */

import {
  parseSearchServers,
  parseSearchIndexes,
  parseSingleSearchIndex,
  parseSearchBoundViews
} from '../io/configReader.js';
import { buildIndexableTree, resolveDatasourceBundles } from '../parsers/searchParser.js';
import { autoSyncProject } from '../cli/cliUtils.js';

/**
 * Annotate a parsed index with the actual indexed bundle set, applying Drupal's
 * negation semantics against the project's entity model.
 *
 * Adds `resolvedBundles` to each datasource and recomputes the index-level
 * `bundles` to be the unique union of resolved bundles across datasources.
 * When the project has no entity model (e.g. unsynced), each datasource falls
 * back to its `selected` list — the previous behavior.
 *
 * @param {object} index - Parsed index (from parseSearchIndex)
 * @param {object} entities - Project entities model (may be undefined)
 * @returns {object} - The same index object, mutated with resolved bundles
 */
function annotateResolvedBundles(index, entities) {
  if (!index) return index;
  const union = new Set();
  for (const ds of index.datasources || []) {
    const resolved = resolveDatasourceBundles(ds, entities || {});
    ds.resolvedBundles = resolved;
    for (const bundle of resolved) union.add(bundle);
  }
  index.bundles = Array.from(union);
  return index;
}

/**
 * List Search API servers for a project.
 * @param {object} project - Project with configDirectory
 * @returns {Promise<object[]>}
 */
export async function listSearchServers(project) {
  return parseSearchServers(project.configDirectory);
}

/**
 * List Search API indexes for a project.
 * @param {object} project - Project with configDirectory
 * @returns {Promise<object[]>}
 */
export async function listSearchIndexes(project) {
  await autoSyncProject(project);
  const indexes = await parseSearchIndexes(project.configDirectory);
  for (const index of indexes) {
    annotateResolvedBundles(index, project.entities);
  }
  return indexes;
}

/**
 * Get a single Search API index by id.
 * @param {object} project - Project with configDirectory
 * @param {string} indexId
 * @returns {Promise<object|null>}
 */
export async function getSearchIndex(project, indexId) {
  await autoSyncProject(project);
  const index = await parseSingleSearchIndex(project.configDirectory, indexId);
  return annotateResolvedBundles(index, project.entities);
}

/**
 * List search-bound views for a project, optionally filtered to one index.
 * @param {object} project - Project with configDirectory
 * @param {string} [indexId] - Restrict to views bound to this index
 * @returns {Promise<object[]>}
 */
export async function listSearchViews(project, indexId = null) {
  const views = await parseSearchBoundViews(project.configDirectory);
  if (!indexId) return views;
  return views.filter(v => v.indexId === indexId);
}

/**
 * Build the indexable property tree for a bundle.
 * Operates on the parsed project model (project.entities), not raw YAML.
 * The CLI handler syncs the project first; when .entities is absent
 * (e.g. an unsynced project) this returns an empty tree rather than throwing.
 * @param {object} project - Project model; .entities is optional
 * @param {string} entityType
 * @param {string} bundle
 * @param {number} depth - Maximum reference hops (default 2)
 * @param {object} [opts] - { includeAllTypes }
 * @param {boolean} [opts.includeAllTypes=false] - Emit all field types, not just text
 * @returns {object[]} - Indexable property entries (empty if .entities absent)
 */
export function getIndexableProperties(project, entityType, bundle, depth = 2, opts = {}) {
  return buildIndexableTree(project.entities || {}, entityType, bundle, depth, opts);
}

/**
 * Gather all Search API sources needed to build a report.
 * @param {object} project - Project with configDirectory
 * @returns {Promise<{servers, indexes, views}>}
 */
export async function gatherSearchSources(project) {
  await autoSyncProject(project);
  const [servers, indexes, views] = await Promise.all([
    parseSearchServers(project.configDirectory),
    parseSearchIndexes(project.configDirectory),
    parseSearchBoundViews(project.configDirectory)
  ]);
  for (const index of indexes) {
    annotateResolvedBundles(index, project.entities);
  }
  return { servers, indexes, views };
}
