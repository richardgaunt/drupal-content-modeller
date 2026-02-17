/**
 * Report Generator - Pure functions for generating Markdown reports
 */

import { getBaseFields } from '../constants/baseFields.js';

/**
 * Entity type to admin path mapping (for fields page)
 */
const ENTITY_PATHS = {
  node: '/admin/structure/types/manage/{bundle}/fields',
  paragraph: '/admin/structure/paragraphs_type/{bundle}',
  taxonomy_term: '/admin/structure/taxonomy/manage/{bundle}',
  block_content: '/admin/structure/block-content/manage/{bundle}',
  media: '/admin/structure/media/manage/{bundle}'
};

/**
 * Admin URLs for each entity type
 */
const ADMIN_URLS = {
  node: [
    { name: 'Edit Form', path: '/admin/structure/types/manage/{bundle}' },
    { name: 'Manage Fields', path: '/admin/structure/types/manage/{bundle}/fields' },
    { name: 'Manage Form Display', path: '/admin/structure/types/manage/{bundle}/form-display' },
    { name: 'Manage Display', path: '/admin/structure/types/manage/{bundle}/display' },
    { name: 'Manage Permissions', path: '/admin/structure/types/manage/{bundle}/permissions' }
  ],
  paragraph: [
    { name: 'Edit Form', path: '/admin/structure/paragraphs_type/{bundle}' },
    { name: 'Manage Fields', path: '/admin/structure/paragraphs_type/{bundle}/fields' },
    { name: 'Manage Form Display', path: '/admin/structure/paragraphs_type/{bundle}/form-display' },
    { name: 'Manage Display', path: '/admin/structure/paragraphs_type/{bundle}/display' }
  ],
  taxonomy_term: [
    { name: 'Edit Form', path: '/admin/structure/taxonomy/manage/{bundle}' },
    { name: 'Manage Fields', path: '/admin/structure/taxonomy/manage/{bundle}/overview/fields' },
    { name: 'Manage Form Display', path: '/admin/structure/taxonomy/manage/{bundle}/overview/form-display' },
    { name: 'Manage Display', path: '/admin/structure/taxonomy/manage/{bundle}/overview/display' },
    { name: 'Manage Permissions', path: '/admin/structure/taxonomy/manage/{bundle}/overview/permissions' }
  ],
  block_content: [
    { name: 'Edit Form', path: '/admin/structure/block-content/manage/{bundle}' },
    { name: 'Manage Fields', path: '/admin/structure/block-content/manage/{bundle}/fields' },
    { name: 'Manage Form Display', path: '/admin/structure/block-content/manage/{bundle}/form-display' },
    { name: 'Manage Display', path: '/admin/structure/block-content/manage/{bundle}/display' },
    { name: 'Manage Permissions', path: '/admin/structure/block-content/manage/{bundle}/permissions' }
  ],
  media: [
    { name: 'Edit Form', path: '/admin/structure/media/manage/{bundle}' },
    { name: 'Manage Fields', path: '/admin/structure/media/manage/{bundle}/fields' },
    { name: 'Manage Form Display', path: '/admin/structure/media/manage/{bundle}/form-display' },
    { name: 'Manage Display', path: '/admin/structure/media/manage/{bundle}/display' },
    { name: 'Manage Permissions', path: '/admin/structure/media/manage/{bundle}/permissions' }
  ]
};

/**
 * Entity type labels
 */
const ENTITY_TYPE_LABELS = {
  node: 'Content Types',
  media: 'Media Types',
  paragraph: 'Paragraph Types',
  taxonomy_term: 'Vocabularies',
  block_content: 'Block Types'
};

/**
 * Order for displaying entity types
 */
const ENTITY_ORDER = ['node', 'media', 'paragraph', 'taxonomy_term', 'block_content'];

/**
 * Get the admin path for an entity bundle
 * @param {string} entityType - Entity type
 * @param {string} bundle - Bundle machine name
 * @returns {string} - Admin path
 */
export function getEntityAdminPath(entityType, bundle) {
  const pattern = ENTITY_PATHS[entityType] || '';
  return pattern.replace('{bundle}', bundle);
}

/**
 * Get the admin path for a field on a bundle
 * @param {string} entityType - Entity type
 * @param {string} bundle - Bundle machine name
 * @param {string} fieldName - Field machine name
 * @returns {string} - Field admin path
 */
export function getFieldAdminPath(entityType, bundle, fieldName) {
  const basePath = getEntityAdminPath(entityType, bundle);
  return `${basePath}/${entityType}.${bundle}.${fieldName}`;
}

/**
 * Get all admin URLs for a bundle
 * @param {string} entityType - Entity type
 * @param {string} bundle - Bundle machine name
 * @returns {object[]} - Array of {name, path} objects
 */
export function getBundleAdminUrls(entityType, bundle) {
  const urls = ADMIN_URLS[entityType] || [];
  return urls.map(url => ({
    name: url.name,
    path: url.path.replace('{bundle}', bundle)
  }));
}

/**
 * Format cardinality for display
 * @param {number} value - Cardinality value
 * @returns {string} - Formatted string
 */
export function formatCardinality(value) {
  return value === -1 ? 'Unlimited' : String(value);
}

/**
 * Get additional info about a field based on its type
 * @param {object} field - Field object
 * @returns {string} - Additional info string
 */
export function getFieldOtherInfo(field) {
  const parts = [];

  if (field.type === 'entity_reference' || field.type === 'entity_reference_revisions') {
    const bundles = field.settings?.handler_settings?.target_bundles;
    if (bundles) {
      const bundleList = Object.keys(bundles);
      if (bundleList.length > 0) {
        parts.push(`References: ${bundleList.join(', ')}`);
      }
    }
  }

  if (field.type === 'list_string' || field.type === 'list_integer') {
    const values = field.settings?.allowed_values;
    if (values && Array.isArray(values) && values.length > 0) {
      const optionsList = values.map(v => `${v.value}::${v.label}`).join('<br>');
      parts.push(optionsList);
    }
  }

  if (field.type === 'string' && field.settings?.max_length) {
    parts.push(`Max: ${field.settings.max_length}`);
  }

  return parts.join('; ') || '-';
}

/**
 * Get entity type label
 * @param {string} entityType - Entity type
 * @returns {string} - Human-readable label
 */
export function getEntityTypeLabel(entityType) {
  return ENTITY_TYPE_LABELS[entityType] || entityType;
}

/**
 * Generate a markdown anchor from heading text (Obsidian-compatible)
 * Obsidian auto-generates anchors by lowercasing and replacing non-alphanumeric with hyphens
 * @param {string} label - Label text
 * @param {string} entityType - Entity type
 * @returns {string} - Anchor string
 */
export function generateAnchor(label, entityType) {
  // Match Obsidian's anchor generation: full heading text, lowercased, non-alphanumeric to hyphens
  const headingText = `${label} (${entityType})`;
  return headingText.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

/**
 * Generate a report for a single bundle
 * @param {object} bundle - Bundle object
 * @param {string} entityType - Entity type
 * @param {string} baseUrl - Base URL for links
 * @param {object} options - Options
 * @param {object} [options.baseFieldOverrides] - Base field override data keyed by field name
 * @returns {string} - Markdown content
 */
export function generateBundleReport(bundle, entityType, baseUrl = '', options = {}) {
  const adminUrls = getBundleAdminUrls(entityType, bundle.id);
  const baseFieldOverrides = options.baseFieldOverrides || {};

  let md = `### ${bundle.label || bundle.id} (${entityType})\n\n`;
  md += `${bundle.description || '_No description_'}\n\n`;

  // Admin links
  md += `**Admin Links:**\n`;
  for (const url of adminUrls) {
    const fullUrl = baseUrl ? `${baseUrl}${url.path}` : url.path;
    md += `- [${url.name}](${fullUrl})\n`;
  }
  md += `\n`;

  // Base Fields section
  const baseFieldsConfig = getBaseFields(entityType);
  const baseFieldNames = Object.keys(baseFieldsConfig);

  if (baseFieldNames.length > 0) {
    md += `#### Base Fields\n\n`;
    md += '| Field Name | Machine Name | Field Type | Widget |\n';
    md += '|------------|--------------|------------|--------|\n';

    for (const fieldName of baseFieldNames) {
      const config = baseFieldsConfig[fieldName];
      const override = baseFieldOverrides[fieldName];
      const label = override?.label || config.label;

      md += `| ${label} `;
      md += `| \`${fieldName}\` `;
      md += `| ${config.type} `;
      md += `| ${config.widget} |\n`;
    }

    md += '\n';
  }

  // Custom Fields section
  md += `#### Fields\n\n`;

  const fields = Object.values(bundle.fields || {});

  if (fields.length === 0) {
    md += '_No custom fields_\n\n';
    return md;
  }

  md += '| Field Name | Machine Name | Field Type | Description | Cardinality | Required | Other | URL |\n';
  md += '|------------|--------------|------------|-------------|-------------|----------|-------|-----|\n';

  // Sort fields by label
  const sortedFields = [...fields].sort((a, b) =>
    (a.label || '').localeCompare(b.label || '')
  );

  for (const field of sortedFields) {
    const fieldPath = getFieldAdminPath(entityType, bundle.id, field.name);
    const fieldUrl = baseUrl ? `${baseUrl}${fieldPath}` : fieldPath;

    md += `| ${field.label || field.name} `;
    md += `| \`${field.name}\` `;
    md += `| ${field.type} `;
    md += `| ${field.description || '-'} `;
    md += `| ${formatCardinality(field.cardinality || 1)} `;
    md += `| ${field.required ? 'Yes' : 'No'} `;
    md += `| ${getFieldOtherInfo(field)} `;
    md += `| [Edit](${fieldUrl}) |\n`;
  }

  md += '\n';
  return md;
}

/**
 * Generate a report for a single entity type
 * @param {object} project - Project object
 * @param {string} entityType - Entity type
 * @param {string} baseUrl - Base URL for links
 * @returns {string} - Markdown content
 */
export function generateEntityTypeReport(project, entityType, baseUrl = '') {
  const bundles = project.entities[entityType] || {};

  let md = `# ${getEntityTypeLabel(entityType)} Report\n\n`;
  md += `**Project:** ${project.name}\n\n`;
  md += `---\n\n`;

  const bundleList = Object.values(bundles);

  if (bundleList.length === 0) {
    md += `_No ${getEntityTypeLabel(entityType).toLowerCase()} found._\n`;
    return md;
  }

  // Sort bundles by label
  const sortedBundles = [...bundleList].sort((a, b) =>
    (a.label || '').localeCompare(b.label || '')
  );

  for (const bundle of sortedBundles) {
    md += generateBundleReport(bundle, entityType, baseUrl);
  }

  return md;
}

/**
 * Generate a full project report with table of contents
 * @param {object} project - Project object
 * @param {string} baseUrl - Base URL for links
 * @returns {string} - Markdown content
 */
export function generateProjectReport(project, baseUrl = '') {
  const displayUrl = baseUrl || project.baseUrl || '_Not set_';

  let md = `# Project: ${project.name}\n\n`;
  md += `**URL:** ${displayUrl}\n\n`;
  md += `---\n\n`;
  md += `## Table of Contents\n\n`;

  // Generate TOC
  for (const entityType of ENTITY_ORDER) {
    const bundles = project.entities[entityType] || {};
    const bundleList = Object.values(bundles);

    if (bundleList.length === 0) continue;

    // Sort bundles by label
    const sortedBundles = [...bundleList].sort((a, b) =>
      (a.label || '').localeCompare(b.label || '')
    );

    md += `### ${getEntityTypeLabel(entityType)}\n\n`;
    for (const bundle of sortedBundles) {
      const anchor = generateAnchor(bundle.label || bundle.id, entityType);
      md += `- [${bundle.label || bundle.id}](#${anchor})\n`;
    }
    md += '\n';
  }

  md += `---\n\n`;

  // Generate full content
  for (const entityType of ENTITY_ORDER) {
    const bundles = project.entities[entityType] || {};
    const bundleList = Object.values(bundles);

    if (bundleList.length === 0) continue;

    // Sort bundles by label
    const sortedBundles = [...bundleList].sort((a, b) =>
      (a.label || '').localeCompare(b.label || '')
    );

    md += `## ${getEntityTypeLabel(entityType)}\n\n`;

    for (const bundle of sortedBundles) {
      md += generateBundleReport(bundle, entityType, baseUrl);
    }
  }

  return md;
}
