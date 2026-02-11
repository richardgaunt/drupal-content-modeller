/**
 * List commands
 * Functions for listing entity types and fields.
 */

/**
 * Entity type display names
 */
const ENTITY_TYPE_LABELS = {
  node: 'Node Types',
  media: 'Media Types',
  paragraph: 'Paragraph Types',
  taxonomy_term: 'Taxonomy Vocabularies'
};

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

/**
 * Format cardinality for display
 * @param {number} cardinality - Field cardinality
 * @returns {string} - "Single", "Unlimited", or the number
 */
export function formatCardinality(cardinality) {
  if (cardinality === 1) {
    return 'Single';
  }
  if (cardinality === -1) {
    return 'Unlimited';
  }
  return String(cardinality);
}

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
        label: ENTITY_TYPE_LABELS[entityType],
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
 * Format entity type table for display
 * @param {string} entityType - Entity type key
 * @param {object} group - Group object with label and bundles
 * @returns {string} - Formatted table string
 */
export function formatEntityTypeTable(entityType, group) {
  if (!group || !group.bundles || group.bundles.length === 0) {
    return '';
  }

  const lines = [];
  lines.push(`${group.label} (${group.bundles.length})`);

  // Calculate column widths
  const labelWidth = Math.max(20, ...group.bundles.map(b => b.label.length)) + 2;
  const nameWidth = Math.max(20, ...group.bundles.map(b => b.id.length)) + 2;
  const fieldWidth = 8;

  // Header
  const header = [
    padRight('Label', labelWidth),
    padRight('Machine Name', nameWidth),
    padRight('Fields', fieldWidth)
  ].join(' | ');

  const separator = [
    '-'.repeat(labelWidth),
    '-'.repeat(nameWidth),
    '-'.repeat(fieldWidth)
  ].join('-+-');

  lines.push(header);
  lines.push(separator);

  // Rows
  for (const bundle of group.bundles) {
    const row = [
      padRight(bundle.label, labelWidth),
      padRight(bundle.id, nameWidth),
      padRight(String(bundle.fieldCount), fieldWidth)
    ].join(' | ');
    lines.push(row);
  }

  lines.push('');
  return lines.join('\n');
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

  const lines = [];

  // Calculate column widths
  const labelWidth = Math.max(15, ...fields.map(f => f.label.length)) + 2;
  const nameWidth = Math.max(15, ...fields.map(f => f.name.length)) + 2;
  const typeWidth = Math.max(15, ...fields.map(f => f.type.length)) + 2;
  const bundlesWidth = Math.max(20, ...fields.map(f => f.bundles.join(', ').length)) + 2;

  // Header
  const header = [
    padRight('Label', labelWidth),
    padRight('Machine Name', nameWidth),
    padRight('Type', typeWidth),
    padRight('Used In Bundles', bundlesWidth)
  ].join(' | ');

  const separator = [
    '-'.repeat(labelWidth),
    '-'.repeat(nameWidth),
    '-'.repeat(typeWidth),
    '-'.repeat(bundlesWidth)
  ].join('-+-');

  lines.push(header);
  lines.push(separator);

  // Rows
  for (const field of fields) {
    const row = [
      padRight(field.label, labelWidth),
      padRight(field.name, nameWidth),
      padRight(field.type, typeWidth),
      padRight(field.bundles.join(', '), bundlesWidth)
    ].join(' | ');
    lines.push(row);
  }

  return lines.join('\n');
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

  const lines = [];

  // Calculate column widths
  const labelWidth = Math.max(15, ...fields.map(f => f.label.length)) + 2;
  const nameWidth = Math.max(15, ...fields.map(f => f.name.length)) + 2;
  const typeWidth = Math.max(15, ...fields.map(f => f.type.length)) + 2;
  const requiredWidth = 10;
  const cardinalityWidth = 12;

  // Header
  const header = [
    padRight('Label', labelWidth),
    padRight('Machine Name', nameWidth),
    padRight('Type', typeWidth),
    padRight('Required', requiredWidth),
    padRight('Cardinality', cardinalityWidth)
  ].join(' | ');

  const separator = [
    '-'.repeat(labelWidth),
    '-'.repeat(nameWidth),
    '-'.repeat(typeWidth),
    '-'.repeat(requiredWidth),
    '-'.repeat(cardinalityWidth)
  ].join('-+-');

  lines.push(header);
  lines.push(separator);

  // Rows
  for (const field of fields) {
    const row = [
      padRight(field.label, labelWidth),
      padRight(field.name, nameWidth),
      padRight(field.type, typeWidth),
      padRight(formatRequired(field.required), requiredWidth),
      padRight(formatCardinality(field.cardinality), cardinalityWidth)
    ].join(' | ');
    lines.push(row);
  }

  return lines.join('\n');
}

/**
 * Pad string to the right
 * @param {string} str - String to pad
 * @param {number} width - Target width
 * @returns {string} - Padded string
 */
function padRight(str, width) {
  return str.padEnd(width);
}
