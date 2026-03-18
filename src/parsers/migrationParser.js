/**
 * Migration Parser - PURE functions
 * Parse migration YAML structures into normalized objects.
 * No file I/O - receives parsed config objects as input.
 */

/**
 * Filter migration files from a file list
 * @param {string[]} files - Array of filenames
 * @returns {string[]} - Matching migration filenames
 */
export function filterMigrationFiles(files) {
  return files.filter(f =>
    f.startsWith('migrate_plus.migration.') &&
    !f.startsWith('migrate_plus.migration_group.') &&
    f.endsWith('.yml')
  );
}

/**
 * Filter migration group files from a file list
 * @param {string[]} files - Array of filenames
 * @returns {string[]} - Matching migration group filenames
 */
export function filterMigrationGroupFiles(files) {
  return files.filter(f =>
    f.startsWith('migrate_plus.migration_group.') &&
    f.endsWith('.yml')
  );
}

/**
 * Extract migration ID from filename
 * @param {string} filename - e.g. 'migrate_plus.migration.atsb_publication.yml'
 * @returns {string|null} - Migration ID or null
 */
export function extractMigrationIdFromFilename(filename) {
  const prefix = 'migrate_plus.migration.';
  const suffix = '.yml';
  if (filename.startsWith(prefix) && filename.endsWith(suffix)) {
    return filename.slice(prefix.length, -suffix.length);
  }
  return null;
}

/**
 * Extract migration group ID from filename
 * @param {string} filename - e.g. 'migrate_plus.migration_group.atsb.yml'
 * @returns {string|null} - Group ID or null
 */
export function extractGroupIdFromFilename(filename) {
  const prefix = 'migrate_plus.migration_group.';
  const suffix = '.yml';
  if (filename.startsWith(prefix) && filename.endsWith(suffix)) {
    return filename.slice(prefix.length, -suffix.length);
  }
  return null;
}

/**
 * Parse a migration group YAML object
 * @param {object} config - Parsed YAML config
 * @returns {object} - Parsed migration group
 */
export function parseMigrationGroup(config) {
  if (!config) return null;

  return {
    id: config.id || '',
    label: config.label || '',
    description: config.description || '',
    sourceType: config.source_type || '',
    sharedConfiguration: config.shared_configuration || null
  };
}

/**
 * Parse destination plugin string to extract entity type
 * e.g. 'entity:node' → { entityType: 'node' }
 * e.g. 'entity:taxonomy_term' → { entityType: 'taxonomy_term' }
 * @param {string} pluginStr - Destination plugin string
 * @returns {object} - { entityType } or { entityType: null }
 */
export function parseDestinationPlugin(pluginStr) {
  if (!pluginStr || typeof pluginStr !== 'string') {
    return { entityType: null };
  }

  if (pluginStr.startsWith('entity:')) {
    return { entityType: pluginStr.slice('entity:'.length) };
  }

  return { entityType: null };
}

/**
 * Normalize process mappings from migration config.
 * Handles three forms:
 * 1. Direct: `tid: term_id` → { target: 'tid', source: 'term_id', plugin: null }
 * 2. Single plugin: `{ plugin: 'default_value', default_value: 1 }` → { target, source, plugin, pluginConfig }
 * 3. Plugin chain (array): [{ plugin: ... }, { plugin: ... }] → first plugin used
 * @param {object} process - Raw process object from migration config
 * @returns {object[]} - Normalized array of { target, source, plugin, pluginConfig }
 */
export function normalizeProcessMappings(process) {
  if (!process || typeof process !== 'object') return [];

  const mappings = [];

  for (const [target, value] of Object.entries(process)) {
    if (typeof value === 'string') {
      // Direct mapping: target: source
      mappings.push({
        target,
        source: value,
        plugin: null,
        pluginConfig: null
      });
    } else if (Array.isArray(value)) {
      // Plugin chain
      const firstPlugin = value[0];
      if (firstPlugin && typeof firstPlugin === 'object') {
        const { plugin, source: src, ...rest } = firstPlugin;
        mappings.push({
          target,
          source: src || null,
          plugin: plugin || null,
          pluginConfig: Object.keys(rest).length > 0 ? rest : null
        });
      } else {
        mappings.push({
          target,
          source: null,
          plugin: null,
          pluginConfig: null
        });
      }
    } else if (typeof value === 'object' && value !== null) {
      // Single plugin
      const { plugin, source: src, ...rest } = value;
      mappings.push({
        target,
        source: src || null,
        plugin: plugin || null,
        pluginConfig: Object.keys(rest).length > 0 ? rest : null
      });
    }
  }

  return mappings;
}

/**
 * Parse a migration YAML object
 * @param {object} config - Parsed YAML config
 * @returns {object|null} - Parsed migration or null
 */
export function parseMigration(config) {
  if (!config) return null;

  const source = config.source || {};
  const destination = config.destination || {};
  const deps = config.migration_dependencies || {};
  const destParsed = parseDestinationPlugin(destination.plugin);

  // Normalize source IDs
  let ids = null;
  if (source.ids) {
    ids = source.ids;
  }

  // Normalize dependencies
  let required = [];
  let optional = [];

  if (Array.isArray(deps.required)) {
    required = deps.required;
  } else if (deps.required && typeof deps.required === 'object') {
    required = Object.keys(deps.required);
  }

  if (Array.isArray(deps.optional)) {
    optional = deps.optional;
  } else if (deps.optional && typeof deps.optional === 'object') {
    optional = Object.keys(deps.optional);
  }

  return {
    id: config.id || '',
    label: config.label || '',
    migrationGroup: config.migration_group || '',
    migrationTags: config.migration_tags || [],
    source: {
      plugin: source.plugin || '',
      entityType: source.entity_type || '',
      bundle: source.bundle || '',
      key: source.key || '',
      ids,
      constants: source.constants || null
    },
    process: normalizeProcessMappings(config.process),
    destination: {
      plugin: destination.plugin || '',
      entityType: destParsed.entityType,
      defaultBundle: destination.default_bundle || ''
    },
    dependencies: { required, optional }
  };
}
