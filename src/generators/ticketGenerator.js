/**
 * Ticket Generator - Pure functions for generating QA tickets from content model data
 */

import {
  getEntityTypeSingularLabel,
  getBundleAdminUrls
} from '../constants/entityTypes.js';
import { getBaseFields } from '../constants/baseFields.js';
import { getPermissionTemplates, getPermissionsForBundle } from '../constants/permissions.js';
import { formatCardinality } from '../utils/slug.js';
import {
  getFieldOtherInfo,
  formatWidgetLabel
} from './reportGenerator.js';

/**
 * Ticket dependency order for entity types.
 * Taxonomy and media first (they are referenced by others),
 * then paragraphs, then nodes, then block_content.
 */
const TICKET_ENTITY_ORDER = [
  'taxonomy_term',
  'media',
  'paragraph',
  'node',
  'block_content'
];

/**
 * Key base fields that QA should verify per entity type.
 * Excludes internal fields like uid, path, promote, sticky, etc.
 */
const TICKET_BASE_FIELDS = {
  node: ['title'],
  media: ['name'],
  paragraph: [],
  taxonomy_term: ['name', 'description'],
  block_content: ['info']
};

/**
 * Get the "add new entity" path for an entity type and bundle.
 * @param {string} entityType - Entity type
 * @param {string} bundle - Bundle machine name
 * @returns {string|null} - Add path or null if not applicable
 */
function getEntityAddPath(entityType, bundle) {
  const paths = {
    node: `/node/add/${bundle}`,
    media: `/media/add/${bundle}`,
    taxonomy_term: `/admin/structure/taxonomy/manage/${bundle}/add`,
    block_content: `/block/add/${bundle}`
  };
  return paths[entityType] || null;
}

/**
 * Build a dependency graph for all bundles in a project.
 * Maps each bundle key to the set of bundle keys it references.
 * @param {object} project - Project object with entities
 * @returns {Map<string, Set<string>>} - Map of bundleKey → Set of dependency keys
 */
export function buildDependencyGraph(project) {
  const deps = new Map();
  const allBundleKeys = new Set();

  // Collect all bundle keys
  for (const entityType of TICKET_ENTITY_ORDER) {
    const bundles = project.entities[entityType] || {};
    for (const bundleId of Object.keys(bundles)) {
      allBundleKeys.add(`${entityType}:${bundleId}`);
    }
  }

  // Build dependency edges
  for (const entityType of TICKET_ENTITY_ORDER) {
    const bundles = project.entities[entityType] || {};
    for (const [bundleId, bundle] of Object.entries(bundles)) {
      const key = `${entityType}:${bundleId}`;
      const refSet = new Set();

      for (const field of Object.values(bundle.fields || {})) {
        if (field.type !== 'entity_reference' && field.type !== 'entity_reference_revisions') {
          continue;
        }

        const targetBundles = field.settings?.handler_settings?.target_bundles;
        if (!targetBundles || typeof targetBundles !== 'object') continue;

        const targetType = field.type === 'entity_reference_revisions'
          ? 'paragraph'
          : (field.settings?.target_type || field.settings?.handler?.split(':')[1] || 'node');

        for (const targetBundle of Object.keys(targetBundles)) {
          const depKey = `${targetType}:${targetBundle}`;
          if (allBundleKeys.has(depKey) && depKey !== key) {
            refSet.add(depKey);
          }
        }
      }

      deps.set(key, refSet);
    }
  }

  return deps;
}

/**
 * Sort bundles by entity type order, then by dependency within each type.
 * @param {object} project - Project object with entities
 * @returns {Array<{entityType: string, bundleId: string}>} - Ordered bundle list
 */
export function sortBundlesByDependency(project) {
  const result = [];

  for (const entityType of TICKET_ENTITY_ORDER) {
    const bundles = project.entities[entityType] || {};
    const bundleList = Object.entries(bundles)
      .map(([id, b]) => ({ id, label: b.label || id }))
      .sort((a, b) => a.label.localeCompare(b.label));

    for (const bundle of bundleList) {
      result.push({ entityType, bundleId: bundle.id });
    }
  }

  return result;
}

/**
 * Find the first non-admin role that has create permission for a bundle.
 * @param {object[]} roles - Array of role objects
 * @param {string} entityType - Entity type
 * @param {string} bundleId - Bundle machine name
 * @returns {string} - Role label or 'administrator'
 */
function findCreateRole(roles, entityType, bundleId) {
  const bundlePermissions = getPermissionsForBundle(entityType, bundleId);
  const createPerm = bundlePermissions.find(p => p.key.includes('create'));

  if (!createPerm || !roles || roles.length === 0) {
    return 'administrator';
  }

  for (const role of roles) {
    if (role.isAdmin) continue;
    const permSet = new Set(role.permissions || []);
    if (permSet.has(createPerm.key)) {
      return role.label || role.id;
    }
  }

  return 'administrator';
}

/**
 * Generate permissions table markdown for a ticket.
 * @param {object[]} roles - Array of role objects
 * @param {string} entityType - Entity type
 * @param {string} bundleId - Bundle machine name
 * @returns {string} - Markdown table or empty string
 */
function generateTicketPermissionsTable(roles, entityType, bundleId) {
  const templates = getPermissionTemplates(entityType);
  if (templates.length === 0 || !roles || roles.length === 0) {
    return '';
  }

  const bundlePermissions = getPermissionsForBundle(entityType, bundleId);
  const headers = templates.map(t => t.label);

  let md = `| Role | ${headers.join(' | ')} |\n`;
  md += `|------${headers.map(() => '|------').join('')}|\n`;

  for (const role of roles) {
    const permSet = new Set(role.permissions || []);
    const cells = bundlePermissions.map(p =>
      role.isAdmin || permSet.has(p.key) ? 'Yes' : 'No'
    );
    md += `| ${role.label || role.id} | ${cells.join(' | ')} |\n`;
  }

  return md;
}

/**
 * Generate a single QA ticket for a bundle.
 * @param {object} bundle - Bundle object with fields
 * @param {string} entityType - Entity type
 * @param {number} ticketNumber - Ticket number (1-indexed)
 * @param {string} baseUrl - Base URL for admin links
 * @param {object} options - Additional options
 * @param {object[]} options.roles - Array of role objects
 * @param {object|null} options.formDisplay - Parsed form display data
 * @param {Array} options.dependencies - Array of {ticketNumber, label, entityType, filename}
 * @returns {string} - Markdown ticket content
 */
export function generateBundleTicket(bundle, entityType, ticketNumber, baseUrl = '', options = {}) {
  const singularLabel = getEntityTypeSingularLabel(entityType);
  const adminUrls = getBundleAdminUrls(entityType, bundle.id);
  const formDisplayFields = options.formDisplay?.fields || [];
  const roles = options.roles || [];
  const dependencies = options.dependencies || [];
  const paddedNum = String(ticketNumber).padStart(3, '0');

  let md = `# ${paddedNum} - Create ${bundle.label} ${singularLabel}\n\n`;

  // AC - Create entity type
  const editFormUrl = adminUrls.find(u => u.name === 'Edit Form');
  const editFormLink = editFormUrl
    ? (baseUrl ? `${baseUrl}${editFormUrl.path}` : editFormUrl.path)
    : '';

  md += `## AC - Create entity type\n\n`;
  md += `Given I am an administrator\n`;
  md += `When I go to [${bundle.label} configuration](${editFormLink})\n`;
  md += `Then the ${singularLabel} "${bundle.label}" exists and is configured\n\n`;

  // AC - Fields are configured
  const fields = Object.values(bundle.fields || {});
  const ticketBaseFieldNames = TICKET_BASE_FIELDS[entityType] || [];
  const allBaseFields = getBaseFields(entityType);

  if (fields.length > 0 || ticketBaseFieldNames.length > 0) {
    const createRole = findCreateRole(roles, entityType, bundle.id);
    const addPath = getEntityAddPath(entityType, bundle.id);
    const addUrl = addPath ? (baseUrl ? `${baseUrl}${addPath}` : addPath) : null;

    md += `## AC - Fields are configured as follows\n\n`;
    md += `Given I am a ${createRole}\n`;
    if (addUrl) {
      md += `When I add a ${singularLabel} ([Add new ${bundle.label}](${addUrl}))\n\n`;
    } else {
      md += `When I edit a ${singularLabel}\n\n`;
    }
    md += `Then I can see the following fields:\n\n`;

    md += `| Check | Field Name | Machine Name | Field Type | Widget | Description | Cardinality | Required | Other |\n`;
    md += `|-------|------------|--------------|------------|--------|-------------|-------------|----------|-------|\n`;

    // Key base fields first
    for (const fieldName of ticketBaseFieldNames) {
      const config = allBaseFields[fieldName];
      if (!config) continue;
      const widget = formatWidgetLabel(config.type, config.widget);

      md += `| <input type="checkbox"> `;
      md += `| ${config.label} `;
      md += `| \`${fieldName}\` `;
      md += `| ${config.type} `;
      md += `| ${widget} `;
      md += `| - `;
      md += `| Single `;
      md += `| Yes `;
      md += `| - |\n`;
    }

    // Custom fields
    const sortedFields = [...fields].sort((a, b) =>
      (a.label || '').localeCompare(b.label || '')
    );

    for (const field of sortedFields) {
      const formField = formDisplayFields.find(f => f.name === field.name);
      const widget = formatWidgetLabel(field.type, formField?.type || null);

      md += `| <input type="checkbox"> `;
      md += `| ${field.label || field.name} `;
      md += `| \`${field.name}\` `;
      md += `| ${field.type} `;
      md += `| ${widget} `;
      md += `| ${field.description || '-'} `;
      md += `| ${formatCardinality(field.cardinality || 1)} `;
      md += `| ${field.required ? 'Yes' : 'No'} `;
      md += `| ${getFieldOtherInfo(field)} |\n`;
    }

    md += `\n`;
  }

  // AC - Permissions
  const permTable = generateTicketPermissionsTable(roles, entityType, bundle.id);
  if (permTable) {
    md += `## AC - Permissions are configured to the following\n\n`;
    md += `The following ${singularLabel} permissions are configured as follows:\n\n`;
    md += permTable;
    md += `\n`;
  }

  // Dependencies
  if (dependencies.length > 0) {
    md += `## Dependencies\n\n`;
    for (const dep of dependencies) {
      md += `- [${dep.filename}](${dep.filename})\n`;
    }
    md += `\n`;
  }

  return md;
}

/**
 * Generate all tickets for a project.
 * @param {object} project - Project object
 * @param {string} baseUrl - Base URL for admin links
 * @param {object} options - Options (roles, formDisplays)
 * @returns {Array<{filename: string, content: string, entityType: string, bundleId: string}>}
 */
export function generateAllTickets(project, baseUrl = '', options = {}) {
  const orderedBundles = sortBundlesByDependency(project);
  const depGraph = buildDependencyGraph(project);
  const roles = options.roles || [];
  const allFormDisplays = options.formDisplays || {};

  // Build a map of bundleKey → ticket info for cross-referencing
  const ticketMap = new Map();
  orderedBundles.forEach((entry, index) => {
    const bundleKey = `${entry.entityType}:${entry.bundleId}`;
    const bundle = project.entities[entry.entityType][entry.bundleId];
    const singularLabel = getEntityTypeSingularLabel(entry.entityType);
    const paddedNum = String(index + 1).padStart(3, '0');
    const filename = `${paddedNum} - Create ${bundle.label} ${singularLabel}.md`;
    ticketMap.set(bundleKey, {
      ticketNumber: index + 1,
      label: bundle.label,
      entityType: entry.entityType,
      filename
    });
  });

  // Generate each ticket
  const tickets = [];

  for (const [index, entry] of orderedBundles.entries()) {
    const { entityType, bundleId } = entry;
    const bundle = project.entities[entityType][bundleId];
    const bundleKey = `${entityType}:${bundleId}`;
    const ticketInfo = ticketMap.get(bundleKey);

    // Resolve dependencies for this bundle
    const depKeys = depGraph.get(bundleKey) || new Set();
    const dependencies = [...depKeys]
      .map(key => ticketMap.get(key))
      .filter(Boolean)
      .sort((a, b) => a.ticketNumber - b.ticketNumber);

    const formDisplay = allFormDisplays[entityType]?.[bundleId] || null;

    const content = generateBundleTicket(bundle, entityType, index + 1, baseUrl, {
      roles,
      formDisplay,
      dependencies
    });

    tickets.push({
      filename: ticketInfo.filename,
      content,
      entityType,
      bundleId
    });
  }

  return tickets;
}

/**
 * Entity type choices for the template.
 */
const ENTITY_TYPE_LABELS = {
  node: 'content type',
  media: 'media type',
  paragraph: 'paragraph type',
  taxonomy_term: 'vocabulary',
  block_content: 'block type'
};

/**
 * Generate a blank ticket template for humans to fill out.
 * @param {string} entityType - Entity type (defaults to 'node')
 * @param {object} [options] - Optional bundle info
 * @param {string} [options.label] - Bundle label (e.g. "Article")
 * @param {string} [options.machineName] - Bundle machine name (e.g. "article")
 * @param {number} [options.ticketNumber] - Ticket number
 * @param {string} [options.baseUrl] - Base URL for admin links
 * @returns {string} - Markdown template
 */
export function generateTicketTemplate(entityType = 'node', options = {}) {
  const singularLabel = ENTITY_TYPE_LABELS[entityType] || 'content type';
  const baseFieldNames = TICKET_BASE_FIELDS[entityType] || [];
  const allBaseFields = getBaseFields(entityType);
  const label = options.label || '<Label>';
  const machineName = options.machineName || '<machine_name>';
  const ticketNum = options.ticketNumber ? String(options.ticketNumber).padStart(3, '0') : '<number>';
  const baseUrl = options.baseUrl || '';
  const addPath = getEntityAddPath(entityType, machineName);

  // Resolve admin URL
  let adminUrl = '<admin_url>';
  if (machineName !== '<machine_name>') {
    const adminUrls = getBundleAdminUrls(entityType, machineName);
    const editForm = adminUrls.find(u => u.name === 'Edit Form');
    if (editForm) {
      adminUrl = baseUrl ? `${baseUrl}${editForm.path}` : editForm.path;
    }
  }

  let md = `# ${ticketNum} - Create ${label} ${singularLabel}\n\n`;

  // Instructions (only when no bundle specified)
  if (!options.label) {
    md += `<!-- INSTRUCTIONS:\n`;
    md += `  Fill in the sections below. Fields marked with * are used by the\n`;
    md += `  /drupal-content-modeller--create-ticket skill to auto-fill defaults.\n`;
    md += `\n`;
    md += `  Required:\n`;
    md += `    - Title (replace <Label> above with the bundle label)\n`;
    md += `    - Entity type: ${entityType}\n`;
    md += `    - At least one field row with a Field Name and Field Type\n`;
    md += `\n`;
    md += `  Optional (will be auto-filled if missing):\n`;
    md += `    - Machine Name (derived from Field Name)\n`;
    md += `    - Widget (default for the field type)\n`;
    md += `    - Cardinality (defaults to Single)\n`;
    md += `    - Required (defaults to No)\n`;
    md += `-->\n\n`;
  }

  // Metadata comment
  md += `<!-- entity_type: ${entityType} -->\n`;
  if (machineName !== '<machine_name>') {
    md += `<!-- bundle: ${machineName} -->\n`;
  }
  md += `\n`;

  // AC - Create entity type
  md += `## AC - Create entity type\n\n`;
  md += `Given I am an administrator\n`;
  md += `When I go to [${label} configuration](${adminUrl})\n`;
  md += `Then the ${singularLabel} "${label}" exists and is configured\n\n`;

  // AC - Fields
  md += `## AC - Fields are configured as follows\n\n`;
  md += `Given I am a <role>\n`;
  if (addPath) {
    const fullAddUrl = baseUrl ? `${baseUrl}${addPath}` : addPath;
    md += `When I add a ${singularLabel} ([Add new ${label}](${fullAddUrl}))\n\n`;
  } else {
    md += `When I edit a ${singularLabel}\n\n`;
  }
  md += `Then I can see the following fields:\n\n`;

  md += `| Check | Field Name | Machine Name | Field Type | Widget | Description | Cardinality | Required | Other |\n`;
  md += `|-------|------------|--------------|------------|--------|-------------|-------------|----------|-------|\n`;

  // Pre-fill base fields
  for (const fieldName of baseFieldNames) {
    const config = allBaseFields[fieldName];
    if (!config) continue;
    md += `| <input type="checkbox"> | ${config.label} | \`${fieldName}\` | ${config.type} | | - | Single | Yes | - |\n`;
  }

  // Empty rows for human to fill
  for (let i = 0; i < 5; i++) {
    md += `| <input type="checkbox"> | | | | | | | | |\n`;
  }

  md += `\n`;

  // AC - Permissions
  md += `## AC - Permissions are configured to the following\n\n`;
  md += `The following ${singularLabel} permissions are configured as follows:\n\n`;
  md += `| Role | Create | Edit own | Edit any | Delete own | Delete any |\n`;
  md += `|------|--------|----------|----------|------------|------------|\n`;
  md += `| | | | | | |\n`;
  md += `| | | | | | |\n`;

  md += `\n`;

  // Dependencies
  md += `## Dependencies\n\n`;
  md += `<!-- List any bundles that must exist before this one -->\n\n`;

  return md;
}

/**
 * Generate templates for all entity types.
 * @returns {Array<{filename: string, content: string}>}
 */
export function generateAllTemplates() {
  return Object.entries(ENTITY_TYPE_LABELS).map(([entityType, label]) => ({
    filename: `template-${label.replace(/\s+/g, '-')}.md`,
    content: generateTicketTemplate(entityType)
  }));
}
