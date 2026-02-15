/**
 * Story Generator - Pure functions for generating story/ticket markdown
 */

import { formatCardinality, getFieldOtherInfo } from './reportGenerator.js';

/**
 * Entity type labels for display
 */
const ENTITY_TYPE_LABELS = {
  node: 'content type',
  media: 'media type',
  paragraph: 'paragraph type',
  taxonomy_term: 'vocabulary',
  block_content: 'block type'
};

/**
 * Entity type overview page descriptions
 */
const ENTITY_OVERVIEW_PAGES = {
  node: 'Admin > Structure > Content types',
  media: 'Admin > Structure > Media types',
  paragraph: 'Admin > Structure > Paragraph types',
  taxonomy_term: 'Admin > Structure > Taxonomy',
  block_content: 'Admin > Structure > Block types'
};

/**
 * Get entity type label
 * @param {string} entityType - Entity type
 * @returns {string} - Human-readable label
 */
export function getEntityTypeLabel(entityType) {
  return ENTITY_TYPE_LABELS[entityType] || entityType;
}

/**
 * Get entity overview page description
 * @param {string} entityType - Entity type
 * @returns {string} - Overview page path
 */
export function getEntityOverviewPage(entityType) {
  return ENTITY_OVERVIEW_PAGES[entityType] || 'Admin panel';
}

/**
 * Generate story title
 * @param {string} bundleLabel - Bundle label
 * @param {string} entityType - Entity type
 * @returns {string} - Story title
 */
export function generateStoryTitle(bundleLabel, entityType) {
  return `Create ${bundleLabel} ${getEntityTypeLabel(entityType)}`;
}

/**
 * Generate user story section
 * @param {string} bundleLabel - Bundle label
 * @param {string} entityType - Entity type
 * @param {string} purpose - Purpose of the content type
 * @returns {string} - User story markdown
 */
export function generateUserStory(bundleLabel, entityType, purpose) {
  const typeLabel = getEntityTypeLabel(entityType);
  return `## User Story

As a Site Owner
I want a ${typeLabel} called \`${bundleLabel}\` on my new site
So that I can ${purpose || '[describe the purpose]'}
`;
}

/**
 * Generate AC1 - Bundle exists
 * @param {string} bundleLabel - Bundle label
 * @param {string} entityType - Entity type
 * @returns {string} - AC1 markdown
 */
export function generateAC1BundleExists(bundleLabel, entityType) {
  const overviewPage = getEntityOverviewPage(entityType);
  return `**AC 1 - ${bundleLabel} ${getEntityTypeLabel(entityType)} exists**

GIVEN I am a site administrator
WHEN I go to ${overviewPage}
THEN I see \`${bundleLabel}\`
`;
}

/**
 * Generate fields table
 * @param {object[]} fields - Array of field objects
 * @returns {string} - Markdown table
 */
export function generateFieldsTable(fields) {
  if (!fields || fields.length === 0) {
    return '_No fields defined_\n';
  }

  let md = '| Field Name | Machine Name | Field Type | Description | Cardinality | Required | Other |\n';
  md += '|------------|--------------|------------|-------------|-------------|----------|-------|\n';

  for (const field of fields) {
    const otherInfo = getFieldOtherInfo(field);
    md += `| ${field.label || field.name} `;
    md += `| \`${field.name}\` `;
    md += `| ${field.type} `;
    md += `| ${field.description || '-'} `;
    md += `| ${formatCardinality(field.cardinality || 1)} `;
    md += `| ${field.required ? 'Yes' : 'No'} `;
    md += `| ${otherInfo} |\n`;
  }

  return md;
}

/**
 * Generate AC2 - Fields
 * @param {string} bundleLabel - Bundle label
 * @param {object[]} fields - Array of field objects
 * @returns {string} - AC2 markdown
 */
export function generateAC2Fields(bundleLabel, fields) {
  return `**AC 2 - ${bundleLabel} has the following fields**

GIVEN I am a content author
WHEN I create new content of the type \`${bundleLabel}\`
THEN the following fields are available

${generateFieldsTable(fields)}`;
}

/**
 * Generate permissions table
 * @param {object} permissions - Permissions matrix { roleId: { permShort: boolean } }
 * @param {object} roleLabels - Role ID to label mapping
 * @returns {string} - Markdown table
 */
export function generatePermissionsTable(permissions, roleLabels = {}) {
  if (!permissions || Object.keys(permissions).length === 0) {
    return '_No permissions defined_\n';
  }

  const roles = Object.keys(permissions);
  const roleHeaders = roles.map(r => roleLabels[r] || r);

  // Permission labels
  const permissionLabels = {
    create: 'Create new content',
    edit_own: 'Edit own content',
    edit_any: 'Edit any content',
    delete_own: 'Delete own content',
    delete_any: 'Delete any content',
    view_revisions: 'View revisions',
    revert_revisions: 'Revert revisions',
    delete_revisions: 'Delete revisions'
  };

  // Build header row
  let md = '| Permission |';
  for (const header of roleHeaders) {
    md += ` **${header}** |`;
  }
  md += '\n';

  // Build separator row
  md += '|------------|';
  for (let i = 0; i < roles.length; i++) {
    md += '----------|';
  }
  md += '\n';

  // Get all permission keys from first role
  const firstRole = permissions[roles[0]];
  const permKeys = Object.keys(firstRole || {});

  // Build data rows
  for (const permKey of permKeys) {
    const label = permissionLabels[permKey] || permKey;
    md += `| **${label}** |`;

    for (const role of roles) {
      const value = permissions[role]?.[permKey];
      let display = 'No';
      if (value === true) display = 'Yes';
      else if (value === 'n/a' || value === null) display = 'N/A';
      md += ` ${display} |`;
    }
    md += '\n';
  }

  return md;
}

/**
 * Generate AC3 - Permissions
 * @param {string} bundleLabel - Bundle label
 * @param {object} permissions - Permissions matrix
 * @param {object} roleLabels - Role labels
 * @returns {string} - AC3 markdown
 */
export function generateAC3Permissions(bundleLabel, permissions, roleLabels = {}) {
  return `**AC 3 - Permissions**

GIVEN I'm an Administrator
WHEN I review permissions for content of the type \`${bundleLabel}\`
THEN the following permissions are needed:

${generatePermissionsTable(permissions, roleLabels)}
*Note: Publish permissions are workflow transitions and need to be configured via the editorial workflow.*
`;
}

/**
 * Generate full story markdown
 * @param {object} story - Story data object
 * @returns {string} - Complete story markdown
 */
export function generateFullStory(story) {
  const { entityType, bundle, purpose, fields, permissions, roleLabels } = story;

  let md = `# ${generateStoryTitle(bundle.label, entityType)}\n\n`;

  md += generateUserStory(bundle.label, entityType, purpose);
  md += '\n---\n\n';
  md += '## Acceptance Criteria\n\n';
  md += generateAC1BundleExists(bundle.label, entityType);
  md += '\n';
  md += generateAC2Fields(bundle.label, fields);
  md += '\n';

  if (permissions && Object.keys(permissions).length > 0) {
    md += generateAC3Permissions(bundle.label, permissions, roleLabels);
  }

  return md;
}

/**
 * Create a new empty story structure
 * @param {string} entityType - Entity type
 * @param {string} label - Bundle label
 * @param {string} machineName - Bundle machine name
 * @returns {object} - New story object
 */
export function createEmptyStory(entityType, label, machineName) {
  return {
    version: 1,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    status: 'draft',
    entityType,
    bundle: {
      label,
      machineName,
      description: ''
    },
    purpose: '',
    fields: [],
    permissions: {},
    roleLabels: {},
    exports: []
  };
}

/**
 * Update story timestamp
 * @param {object} story - Story object
 * @returns {object} - Updated story
 */
export function updateStoryTimestamp(story) {
  return {
    ...story,
    updatedAt: new Date().toISOString()
  };
}
