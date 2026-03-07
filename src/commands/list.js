/**
 * List commands
 * Functions for listing entity types and fields.
 */

import { getEntityTypeLabel } from '../constants/entityTypes.js';
import { formatCardinality } from '../utils/slug.js';

/**
 * Format a date for display
 * @param {string} isoString - ISO date string
 * @returns {string} - Human-readable date
 */
export function formatLastSync(isoString) {
  if (!isoString) {
    return 'Never';
  }

  const date = new Date(isoString);
  const options = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  };

  return date.toLocaleString('en-US', options);
}

// Re-export for backward compatibility
export { formatCardinality };

/**
 * Format required for display
 * @param {boolean} required - Whether field is required
 * @returns {string} - "Yes" or "No"
 */
export function formatRequired(required) {
  return required ? 'Yes' : 'No';
}

/**
 * Group bundles by entity type
 * @param {object} entities - Project entities object
 * @returns {object} - Grouped bundles with counts
 */
export function groupBundlesByEntityType(entities) {
  if (!entities) {
    return {};
  }

  const groups = {};
  const entityTypes = ['node', 'media', 'paragraph', 'taxonomy_term'];

  for (const entityType of entityTypes) {
    const bundles = entities[entityType];
    if (bundles && Object.keys(bundles).length > 0) {
      // Sort bundles alphabetically by label
      const sortedBundles = Object.entries(bundles)
        .map(([id, bundle]) => ({
          id,
          label: bundle.label || id,
          description: bundle.description || '',
          fieldCount: bundle.fields ? Object.keys(bundle.fields).length : 0
        }))
        .sort((a, b) => a.label.localeCompare(b.label));

      groups[entityType] = {
        label: getEntityTypeLabel(entityType),
        bundles: sortedBundles
      };
    }
  }

  return groups;
}

/**
 * Get bundle summary for a project
 * @param {object} project - Project object
 * @returns {object} - Summary with bundleCount, entityTypeCount, lastSync
 */
export function getBundleSummary(project) {
  if (!project.lastSync || !project.entities) {
    return {
      synced: false,
      bundleCount: 0,
      entityTypeCount: 0,
      lastSync: null
    };
  }

  const groups = groupBundlesByEntityType(project.entities);
  const entityTypeCount = Object.keys(groups).length;
  let bundleCount = 0;

  for (const group of Object.values(groups)) {
    bundleCount += group.bundles.length;
  }

  return {
    synced: true,
    bundleCount,
    entityTypeCount,
    lastSync: project.lastSync
  };
}

/**
 * Create a formatted text table from column definitions and row data.
 * @param {object[]} columns - Column definitions: { header, minWidth, getValue }
 * @param {object[]} rows - Data rows
 * @returns {string} - Formatted table string
 */
export function createTable(columns, rows) {
  // Calculate column widths from header and data
  const widths = columns.map(col => {
    const dataMax = rows.length > 0
      ? Math.max(...rows.map(row => String(col.getValue(row)).length))
      : 0;
    return Math.max(col.minWidth || 15, col.header.length, dataMax) + 2;
  });

  const header = columns.map((col, i) => col.header.padEnd(widths[i])).join(' | ');
  const separator = widths.map(w => '-'.repeat(w)).join('-+-');
  const dataRows = rows.map(row =>
    columns.map((col, i) => String(col.getValue(row)).padEnd(widths[i])).join(' | ')
  );

  return [header, separator, ...dataRows].join('\n');
}

/**
 * Format entity type table for display
 * @param {string} entityType - Entity type key
 * @param {object} group - Group object with label and bundles
 * @returns {string} - Formatted table string
 */
export function formatEntityTypeTable(entityType, group) {
  if (!group || !group.bundles || group.bundles.length === 0) {
    return '';
  }

  const table = createTable(
    [
      { header: 'Label', minWidth: 20, getValue: b => b.label },
      { header: 'Machine Name', minWidth: 20, getValue: b => b.id },
      { header: 'Fields', minWidth: 6, getValue: b => String(b.fieldCount) }
    ],
    group.bundles
  );

  return `${group.label} (${group.bundles.length})\n${table}\n`;
}

/**
 * Get all fields for an entity type, aggregated across bundles
 * @param {object} entities - Project entities object
 * @param {string} entityType - Entity type key
 * @returns {object[]} - Array of field objects with bundle usage
 */
export function getFieldsForEntityType(entities, entityType) {
  if (!entities || !entities[entityType]) {
    return [];
  }

  const bundles = entities[entityType];
  const fieldMap = new Map();

  for (const [bundleId, bundle] of Object.entries(bundles)) {
    if (!bundle.fields) continue;

    for (const [fieldName, field] of Object.entries(bundle.fields)) {
      if (fieldMap.has(fieldName)) {
        fieldMap.get(fieldName).bundles.push(bundleId);
      } else {
        fieldMap.set(fieldName, {
          name: fieldName,
          label: field.label || fieldName,
          type: field.type || '',
          bundles: [bundleId]
        });
      }
    }
  }

  // Convert to array and sort by label
  return Array.from(fieldMap.values())
    .sort((a, b) => a.label.localeCompare(b.label));
}

/**
 * Get fields for a specific bundle
 * @param {object} entities - Project entities object
 * @param {string} entityType - Entity type key
 * @param {string} bundleId - Bundle ID
 * @returns {object[]} - Array of field objects
 */
export function getFieldsForBundle(entities, entityType, bundleId) {
  if (!entities || !entities[entityType] || !entities[entityType][bundleId]) {
    return [];
  }

  const bundle = entities[entityType][bundleId];
  if (!bundle.fields) {
    return [];
  }

  return Object.entries(bundle.fields)
    .map(([fieldName, field]) => ({
      name: fieldName,
      label: field.label || fieldName,
      type: field.type || '',
      required: field.required || false,
      cardinality: field.cardinality || 1
    }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

/**
 * Format fields table for entity type display
 * @param {object[]} fields - Array of field objects
 * @returns {string} - Formatted table string
 */
export function formatEntityFieldsTable(fields) {
  if (!fields || fields.length === 0) {
    return 'No fields found.';
  }

  return createTable(
    [
      { header: 'Label', getValue: f => f.label },
      { header: 'Machine Name', getValue: f => f.name },
      { header: 'Type', getValue: f => f.type },
      { header: 'Used In Bundles', minWidth: 20, getValue: f => f.bundles.join(', ') }
    ],
    fields
  );
}

/**
 * Format fields table for bundle display
 * @param {object[]} fields - Array of field objects
 * @returns {string} - Formatted table string
 */
export function formatBundleFieldsTable(fields) {
  if (!fields || fields.length === 0) {
    return 'No fields found.';
  }

  return createTable(
    [
      { header: 'Label', getValue: f => f.label },
      { header: 'Machine Name', getValue: f => f.name },
      { header: 'Type', getValue: f => f.type },
      { header: 'Required', minWidth: 8, getValue: f => formatRequired(f.required) },
      { header: 'Cardinality', minWidth: 10, getValue: f => formatCardinality(f.cardinality) }
    ],
    fields
  );
}

/**
 * Find all entity reference fields that target a specific entity type
 * @param {object} project - Project with entities
 * @param {string} targetEntityType - Entity type being targeted (e.g. 'paragraph')
 * @returns {object[]} - Array of matching field info objects
 */
export function findEntityReferenceFieldsTargeting(project, targetEntityType) {
  const results = [];

  for (const [entityType, bundles] of Object.entries(project.entities || {})) {
    for (const [bundleId, bundle] of Object.entries(bundles)) {
      for (const [fieldName, field] of Object.entries(bundle.fields || {})) {
        if (field.type !== 'entity_reference' && field.type !== 'entity_reference_revisions') continue;

        let fieldTargetType;
        if (field.type === 'entity_reference_revisions') {
          fieldTargetType = 'paragraph';
        } else {
          fieldTargetType = field.settings?.target_type;
          if (!fieldTargetType && field.settings?.handler) {
            const match = field.settings.handler.match(/^default:(.+)$/);
            if (match) fieldTargetType = match[1];
          }
          fieldTargetType = fieldTargetType || 'node';
        }

        if (fieldTargetType !== targetEntityType) continue;

        const currentTargetBundles = field.settings?.handler_settings?.target_bundles
          ? Object.keys(field.settings.handler_settings.target_bundles)
          : [];

        results.push({
          entityType,
          bundleId,
          bundleLabel: bundle.label || bundleId,
          fieldName,
          fieldLabel: field.label || fieldName,
          fieldType: field.type,
          currentTargetBundles
        });
      }
    }
  }

  return results;
}
