/**
 * Search API Parser - PURE functions
 * Parse Search API server / index / view YAML configuration and build the
 * indexable property tree for a bundle.
 * No file I/O - receives parsed YAML objects (and the parsed project model) as input.
 */

/**
 * Filename prefixes
 */
export const SEARCH_SERVER_PREFIX = 'search_api.server.';
export const SEARCH_INDEX_PREFIX = 'search_api.index.';
export const VIEW_PREFIX = 'views.view.';

/**
 * Check if a filename is a Search API server config file
 * @param {string} filename
 * @returns {boolean}
 */
export function isSearchServerFile(filename) {
  return filename.startsWith(SEARCH_SERVER_PREFIX) && filename.endsWith('.yml');
}

/**
 * Check if a filename is a Search API index config file
 * @param {string} filename
 * @returns {boolean}
 */
export function isSearchIndexFile(filename) {
  return filename.startsWith(SEARCH_INDEX_PREFIX) && filename.endsWith('.yml');
}

/**
 * Filter filenames to Search API server files
 * @param {string[]} files
 * @returns {string[]}
 */
export function filterSearchServerFiles(files) {
  return files.filter(isSearchServerFile);
}

/**
 * Filter filenames to Search API index files
 * @param {string[]} files
 * @returns {string[]}
 */
export function filterSearchIndexFiles(files) {
  return files.filter(isSearchIndexFile);
}

/**
 * Filter filenames to views config files
 * @param {string[]} files
 * @returns {string[]}
 */
export function filterViewFiles(files) {
  return files.filter(f => f.startsWith(VIEW_PREFIX) && f.endsWith('.yml'));
}

/**
 * Get the index id a server-bound view targets, if any.
 * Search API views set `base_table: search_api_index_<id>` or
 * `base_field: search_api_id`.
 * @param {object} config - Parsed views.view YAML object
 * @returns {string|null} - The index id, or null if not a search view
 */
export function getViewSearchIndexId(config) {
  if (!config) return null;
  const baseTable = config.base_table || '';
  if (baseTable.startsWith('search_api_index_')) {
    return baseTable.slice('search_api_index_'.length);
  }
  return null;
}

/**
 * Determine whether a parsed views config is bound to a Search API index.
 * @param {object} config - Parsed views.view YAML object
 * @returns {boolean}
 */
export function isSearchBoundView(config) {
  if (!config) return false;
  if (getViewSearchIndexId(config)) return true;
  // Fallback: views whose base_field references the search index id.
  return config.base_field === 'search_api_id';
}

/**
 * Parse a Search API server config object.
 * @param {object} config - Parsed YAML object
 * @returns {object} - { id, label, status, backend, backendConfig }
 */
export function parseSearchServer(config) {
  if (!config) return null;
  return {
    id: config.id || '',
    label: config.name || config.label || '',
    status: config.status !== undefined ? config.status : true,
    backend: config.backend || '',
    backendConfig: config.backend_config || {}
  };
}

/**
 * Parse the datasource_settings map of a Search API index into an array.
 * Keys look like `entity:node`; each carries bundles.selected + languages.selected.
 * @param {object} datasourceSettings
 * @returns {Array<{datasourceId, entityType, bundles, defaultBundles, languages}>}
 */
function parseDatasources(datasourceSettings) {
  const result = [];
  for (const [datasourceId, settings] of Object.entries(datasourceSettings || {})) {
    const entityType = datasourceId.startsWith('entity:')
      ? datasourceId.slice('entity:'.length)
      : datasourceId;
    const bundlesCfg = settings?.bundles || {};
    const languagesCfg = settings?.languages || {};
    result.push({
      datasourceId,
      entityType,
      bundles: Array.isArray(bundlesCfg.selected) ? bundlesCfg.selected : [],
      // `default: true` means "all bundles except selected"; surface it for clarity.
      bundlesAreExclusions: bundlesCfg.default === true,
      languages: Array.isArray(languagesCfg.selected) ? languagesCfg.selected : [],
      languagesAreExclusions: languagesCfg.default === true
    });
  }
  return result;
}

/**
 * Parse the field_settings map of a Search API index into an array.
 * @param {object} fieldSettings - map of field key → { label, datasource_id, property_path, type }
 * @returns {Array<{name, label, datasourceId, propertyPath, type, boost}>}
 */
function parseFieldSettings(fieldSettings) {
  const result = [];
  for (const [name, settings] of Object.entries(fieldSettings || {})) {
    result.push({
      name,
      label: settings?.label || name,
      datasourceId: settings?.datasource_id || null,
      propertyPath: settings?.property_path || '',
      type: settings?.type || '',
      boost: settings?.boost !== undefined ? settings.boost : null
    });
  }
  return result;
}

/**
 * Parse a Search API index config object.
 * @param {object} config - Parsed YAML object
 * @returns {object} - Normalized index info
 */
export function parseSearchIndex(config) {
  if (!config) return null;

  const fields = parseFieldSettings(config.field_settings);
  const datasources = parseDatasources(config.datasource_settings);
  const processors = Object.entries(config.processor_settings || {}).map(
    ([id, settings]) => ({ id, settings: settings || {} })
  );

  // tracker_settings is keyed by tracker plugin id (usually `default`).
  const trackerKeys = Object.keys(config.tracker_settings || {});
  const tracker = trackerKeys.length > 0 ? trackerKeys[0] : null;

  return {
    id: config.id || '',
    label: config.name || config.label || '',
    status: config.status !== undefined ? config.status : true,
    server: config.server || null,
    datasources,
    fields,
    fieldCount: fields.length,
    processors,
    tracker,
    bundles: datasources.flatMap(d => d.bundles),
    languages: Array.from(new Set(datasources.flatMap(d => d.languages)))
  };
}

/**
 * Parse a Search API bound view into displays + their search-relevant settings.
 * @param {object} config - Parsed views.view YAML object
 * @returns {object|null} - { id, label, indexId, displays: [...] } or null if not search-bound
 */
export function parseSearchView(config) {
  if (!isSearchBoundView(config)) return null;

  const indexId = getViewSearchIndexId(config);
  const displays = [];

  for (const [displayId, display] of Object.entries(config.display || {})) {
    const opts = display?.display_options || {};

    // Exposed filters: only filters explicitly flagged `exposed: true`.
    // Drupal can populate `expose.identifier` on non-exposed filters, so the
    // `exposed` flag is the authoritative signal.
    const exposedFilters = Object.entries(opts.filters || {})
      .filter(([, f]) => f && f.exposed === true)
      .map(([key, f]) => ({
        id: f.id || key,
        field: f.field || key,
        identifier: f.expose?.identifier || (f.id || key),
        label: f.expose?.label || ''
      }));

    // Row view modes: row.options.view_modes['entity:<type>'][<bundle>]
    const rowViewModes = [];
    const viewModes = opts.row?.options?.view_modes || {};
    for (const [datasourceId, perBundle] of Object.entries(viewModes)) {
      for (const [bundle, mode] of Object.entries(perBundle || {})) {
        rowViewModes.push({ datasourceId, bundle, viewMode: mode });
      }
    }

    displays.push({
      displayId,
      displayPlugin: display.display_plugin || '',
      title: display.display_title || display.id || displayId,
      path: opts.path || null,
      rowPlugin: opts.row?.type || null,
      exposedFilters,
      rowViewModes
    });
  }

  return {
    id: config.id || '',
    label: config.label || config.id || '',
    indexId,
    displays
  };
}

/**
 * Map a Drupal field type to a suggested Search API field type.
 * @param {string} fieldType - Drupal field type
 * @returns {string} - One of: text, string, integer, boolean, date
 */
export function suggestSearchType(fieldType) {
  switch (fieldType) {
    case 'text_long':
    case 'text_with_summary':
    case 'text':
      return 'text';
    case 'string':
    case 'string_long':
    case 'list_string':
    case 'email':
    case 'link':
      return 'string';
    case 'integer':
    case 'list_integer':
      return 'integer';
    case 'boolean':
      return 'boolean';
    case 'datetime':
    case 'daterange':
      return 'date';
    case 'entity_reference':
    case 'entity_reference_revisions':
      // Suggested indexed value is the referenced entity's target id.
      return 'integer';
    default:
      return 'string';
  }
}

/**
 * Field types that carry formatted (processed) text, eligible for `:processed`.
 */
const PROCESSED_TEXT_TYPES = new Set(['text_long', 'text_with_summary', 'text']);

/**
 * Text-family field types treated as fulltext-indexable content by default.
 * Covers plain text, textarea, and formatted (rich) text. Used to restrict the
 * indexable tree to searchable text unless the caller opts into all field types.
 */
const TEXT_FIELD_TYPES = new Set([
  'string',
  'string_long',
  'text',
  'text_long',
  'text_with_summary'
]);

/**
 * Resolve the actual set of indexed bundles for a parsed datasource, applying
 * Drupal's negation semantics.
 *
 * Drupal `datasource_settings[...]['bundles']` carries `{ default, selected }`:
 *   - `default: false` → ONLY `selected` bundles are indexed (allow-list).
 *   - `default: true`  → ALL bundles of the entity type EXCEPT `selected`
 *     are indexed (deny-list; empty `selected` ⇒ every bundle).
 *
 * @param {object} datasource - Parsed datasource (entityType, bundles, bundlesAreExclusions)
 * @param {object} entities - Project entities model (entities[entityType][bundleId])
 * @returns {string[]} - The resolved indexed bundle ids
 */
export function resolveDatasourceBundles(datasource, entities) {
  if (!datasource) return [];
  const selected = Array.isArray(datasource.bundles) ? datasource.bundles : [];
  if (!datasource.bundlesAreExclusions) {
    return selected;
  }
  const all = Object.keys(entities?.[datasource.entityType] || {});
  // No entity model for this type → can't expand "all"; fall back to selected.
  if (all.length === 0) {
    return selected;
  }
  const excluded = new Set(selected);
  return all.filter(bundle => !excluded.has(bundle));
}

/**
 * Resolve the target entity type for an entity-reference style field.
 * Mirrors findEntityReferenceFieldsTargeting in commands/list.js.
 * @param {object} field - Parsed field (with .type and .settings)
 * @returns {string} - Target entity type
 */
function resolveTargetEntityType(field) {
  if (field.type === 'entity_reference_revisions') {
    return 'paragraph';
  }
  let targetType = field.settings?.target_type;
  if (!targetType && field.settings?.handler) {
    const match = field.settings.handler.match(/^default:(.+)$/);
    if (match) targetType = match[1];
  }
  return targetType || 'node';
}

/**
 * Resolve the target bundles for an entity-reference style field.
 * @param {object} field - Parsed field (with .settings)
 * @param {object} entities - Project entities model
 * @param {string} targetEntityType
 * @returns {string[]} - Target bundle ids (falls back to all bundles of the type)
 */
function resolveTargetBundles(field, entities, targetEntityType) {
  const configured = field.settings?.handler_settings?.target_bundles;
  if (configured && Object.keys(configured).length > 0) {
    return Object.keys(configured);
  }
  // No explicit restriction → every bundle of the target type is reachable.
  return Object.keys(entities?.[targetEntityType] || {});
}

/**
 * Build the Search API indexable property tree for a bundle.
 *
 * Emits one leaf entry per indexable property path, traversing `:entity:`
 * hops through entity_reference / entity_reference_revisions fields up to
 * `maxDepth`, and offering `:processed` for formatted-text fields.
 *
 * By default only text-family fields (string/textarea/formatted text) are
 * emitted as leaves, since those are what fulltext search indexes. Pass
 * `{ includeAllTypes: true }` to emit every field type. Reference fields are
 * always traversed to reach nested text, regardless of mode. `layout_section`
 * (Layout Builder structure) is never indexable content and is excluded in
 * both modes.
 *
 * @param {object} entities - Parsed project entities model (project.entities)
 * @param {string} entityType - Starting entity type
 * @param {string} bundle - Starting bundle
 * @param {number} maxDepth - Maximum reference hops (default 2)
 * @param {object} [opts] - { includeAllTypes }
 * @param {boolean} [opts.includeAllTypes=false] - Emit all field types, not just text
 * @returns {Array<{propertyPath, label, drupalType, searchType}>}
 */
export function buildIndexableTree(
  entities,
  entityType,
  bundle,
  maxDepth = 2,
  { includeAllTypes = false } = {}
) {
  const results = [];

  /**
   * @param {string} et - current entity type
   * @param {string} b - current bundle
   * @param {string} pathPrefix - accumulated property path prefix
   * @param {string} labelPrefix - accumulated human label prefix
   * @param {number} depth - remaining reference hops
   * @param {string[]} visited - (entityType:bundle) on the current recursion path
   */
  function walk(et, b, pathPrefix, labelPrefix, depth, visited) {
    const bundleObj = entities?.[et]?.[b];
    if (!bundleObj) return;

    const fields = bundleObj.fields || {};
    const fieldNames = Object.keys(fields).sort();

    for (const fieldName of fieldNames) {
      const field = fields[fieldName];
      const path = pathPrefix ? `${pathPrefix}${fieldName}` : fieldName;
      const label = labelPrefix
        ? `${labelPrefix} › ${field.label || fieldName}`
        : (field.label || fieldName);

      // layout_section is a Layout Builder structure, not searchable content.
      // Never emit it as a leaf — but also never recurse into it.
      if (field.type === 'layout_section') {
        continue;
      }

      // Emit the field as a leaf unless restricted mode filters out its type.
      // Restricted mode keeps only text-family fields; :processed rows derive
      // from PROCESSED_TEXT_TYPES (a subset of the text family) and so survive.
      if (includeAllTypes || TEXT_FIELD_TYPES.has(field.type)) {
        results.push({
          propertyPath: path,
          label,
          drupalType: field.type || '',
          searchType: suggestSearchType(field.type)
        });

        // Formatted-text fields can also be indexed as processed (rendered) text.
        if (PROCESSED_TEXT_TYPES.has(field.type)) {
          results.push({
            propertyPath: `${path}:processed`,
            label: `${label} (processed)`,
            drupalType: field.type || '',
            searchType: 'text'
          });
        }
      }

      // Reference fields are always traversed (even in restricted mode) so that
      // nested text on the referenced bundle is reachable.
      const isReference =
        field.type === 'entity_reference' || field.type === 'entity_reference_revisions';
      if (isReference && depth > 0) {
        const targetEntityType = resolveTargetEntityType(field);
        const targetBundles = resolveTargetBundles(field, entities, targetEntityType);

        for (const targetBundle of targetBundles) {
          const key = `${targetEntityType}:${targetBundle}`;
          // Cycle guard on the current path only, so a bundle reused on a
          // different branch still gets traversed.
          if (visited.includes(key)) continue;

          walk(
            targetEntityType,
            targetBundle,
            `${path}:entity:`,
            label,
            depth - 1,
            [...visited, key]
          );
        }
      }
    }
  }

  walk(entityType, bundle, '', '', maxDepth, [`${entityType}:${bundle}`]);
  return results;
}
