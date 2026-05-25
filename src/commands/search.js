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
import { buildIndexableTree } from '../parsers/searchParser.js';

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
  return parseSearchIndexes(project.configDirectory);
}

/**
 * Get a single Search API index by id.
 * @param {object} project - Project with configDirectory
 * @param {string} indexId
 * @returns {Promise<object|null>}
 */
export async function getSearchIndex(project, indexId) {
  return parseSingleSearchIndex(project.configDirectory, indexId);
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
 * @returns {object[]} - Indexable property entries (empty if .entities absent)
 */
export function getIndexableProperties(project, entityType, bundle, depth = 2) {
  return buildIndexableTree(project.entities || {}, entityType, bundle, depth);
}

/**
 * Gather all Search API sources needed to build a report.
 * @param {object} project - Project with configDirectory
 * @returns {Promise<{servers, indexes, views}>}
 */
export async function gatherSearchSources(project) {
  const [servers, indexes, views] = await Promise.all([
    parseSearchServers(project.configDirectory),
    parseSearchIndexes(project.configDirectory),
    parseSearchBoundViews(project.configDirectory)
  ]);
  return { servers, indexes, views };
}
