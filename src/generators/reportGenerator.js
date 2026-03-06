/**
 * Report Generator - Pure functions for generating Markdown reports
 */

import { getBaseFields } from '../constants/baseFields.js';
import { getPermissionTemplates, getPermissionsForBundle } from '../constants/permissions.js';
import {
  ENTITY_ORDER,
  getEntityTypeLabel,
  getEntityAdminPath,
  getBundleAdminUrls
} from '../constants/entityTypes.js';
import { formatCardinality } from '../utils/slug.js';

// Re-export for backward compatibility
export { getEntityTypeLabel, getEntityAdminPath, getBundleAdminUrls, formatCardinality };

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
        const targetType = field.type === 'entity_reference_revisions'
          ? 'paragraph'
          : (field.settings?.target_type || field.settings?.handler?.split(':')[1] || 'node');
        parts.push(`References: ${bundleList.map(b => `${b}(${targetType})`).join(', ')}`);
      }
    }
  }

  if (field.type === 'datetime' || field.type === 'daterange') {
    const datetimeType = field.settings?.datetime_type;
    parts.push(datetimeType === 'datetime' ? 'Date and time' : 'Date only');
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
 * Generate a Markdown permissions table for a bundle
 * @param {object[]} roles - Array of role objects
 * @param {string} entityType - Entity type
 * @param {string} bundleId - Bundle machine name
 * @returns {string} - Markdown table or empty string
 */
export function generateBundlePermissionsTable(roles, entityType, bundleId) {
  const templates = getPermissionTemplates(entityType);
  if (templates.length === 0 || !roles || roles.length === 0) {
    return '';
  }

  const bundlePermissions = getPermissionsForBundle(entityType, bundleId);
  const headers = templates.map(t => t.label);

  let md = `#### Permissions\n\n`;
  md += `| Role | ${headers.join(' | ')} |\n`;
  md += `|------${headers.map(() => '|------').join('')}|\n`;

  for (const role of roles) {
    const permSet = new Set(role.permissions || []);
    const cells = bundlePermissions.map(p =>
      role.isAdmin || permSet.has(p.key) ? 'Yes' : 'No'
    );
    md += `| ${role.label || role.id} | ${cells.join(' | ')} |\n`;
  }

  md += '\n';
  return md;
}

/**
 * Generate structured permissions data for a bundle
 * @param {object[]} roles - Array of role objects
 * @param {string} entityType - Entity type
 * @param {string} bundleId - Bundle machine name
 * @returns {object[]} - Array of role permission objects
 */
export function generateBundlePermissionsData(roles, entityType, bundleId) {
  const templates = getPermissionTemplates(entityType);
  if (templates.length === 0 || !roles || roles.length === 0) {
    return [];
  }

  const bundlePermissions = getPermissionsForBundle(entityType, bundleId);

  return roles.map(role => {
    const permSet = new Set(role.permissions || []);
    const matchedPermissions = role.isAdmin
      ? bundlePermissions.map(p => p.key)
      : bundlePermissions.filter(p => permSet.has(p.key)).map(p => p.key);

    return {
      role: role.id,
      label: role.label || role.id,
      isAdmin: role.isAdmin || false,
      permissions: matchedPermissions
    };
  });
}

/**
 * Generate structured data for a single bundle
 * @param {object} bundle - Bundle object
 * @param {string} entityType - Entity type
 * @param {string} baseUrl - Base URL for links
 * @param {object} options - Options
 * @param {object} [options.baseFieldOverrides] - Base field override data keyed by field name
 * @param {object[]} [options.roles] - Array of role objects for permissions
 * @returns {object} - Structured bundle data
 */
export function generateBundleReportData(bundle, entityType, baseUrl = '', options = {}) {
  const adminUrls = getBundleAdminUrls(entityType, bundle.id);
  const baseFieldOverrides = options.baseFieldOverrides || {};
  const baseFieldsConfig = getBaseFields(entityType);

  const fields = Object.values(bundle.fields || {});
  const sortedFields = [...fields].sort((a, b) =>
    (a.label || '').localeCompare(b.label || '')
  );

  return {
    entityType,
    bundle: bundle.id,
    label: bundle.label || bundle.id,
    description: bundle.description || '',
    adminLinks: adminUrls.map(url => ({
      name: url.name,
      url: baseUrl ? `${baseUrl}${url.path}` : url.path
    })),
    baseFields: Object.entries(baseFieldsConfig).map(([name, config]) => ({
      name,
      label: baseFieldOverrides[name]?.label || config.label,
      type: config.type,
      widget: config.widget
    })),
    fields: sortedFields.map(field => {
      const other = getFieldOtherInfo(field);
      return {
        name: field.name,
        label: field.label || field.name,
        type: field.type,
        description: field.description || '',
        cardinality: field.cardinality || 1,
        required: !!field.required,
        other: other === '-' ? null : other,
        settings: field.settings || {}
      };
    }),
    permissions: generateBundlePermissionsData(options.roles || [], entityType, bundle.id)
  };
}

/**
 * Generate structured data for a single entity type
 * @param {object} project - Project object
 * @param {string} entityType - Entity type
 * @param {string} baseUrl - Base URL for links
 * @param {object} options - Options (e.g., roles)
 * @returns {object} - Structured entity type data
 */
export function generateEntityTypeReportData(project, entityType, baseUrl = '', options = {}) {
  const bundles = project.entities[entityType] || {};
  const bundleList = Object.values(bundles);

  const sortedBundles = [...bundleList].sort((a, b) =>
    (a.label || '').localeCompare(b.label || '')
  );

  return {
    entityType,
    label: getEntityTypeLabel(entityType),
    bundles: sortedBundles.map(b => generateBundleReportData(b, entityType, baseUrl, options))
  };
}

/**
 * Generate structured data for a full project report
 * @param {object} project - Project object
 * @param {string} baseUrl - Base URL for links
 * @param {object} options - Options (e.g., roles)
 * @returns {object} - Structured project data
 */
export function generateProjectReportData(project, baseUrl = '', options = {}) {
  const resolvedBaseUrl = baseUrl || project.baseUrl || null;

  return {
    project: project.name,
    baseUrl: resolvedBaseUrl,
    entityTypes: ENTITY_ORDER
      .filter(et => Object.keys(project.entities[et] || {}).length > 0)
      .map(et => generateEntityTypeReportData(project, et, resolvedBaseUrl || '', options))
  };
}

/**
 * Generate a report for a single bundle
 * @param {object} bundle - Bundle object
 * @param {string} entityType - Entity type
 * @param {string} baseUrl - Base URL for links
 * @param {object} options - Options
 * @param {object} [options.baseFieldOverrides] - Base field override data keyed by field name
 * @param {object[]} [options.roles] - Array of role objects for permissions
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
    if (options.roles && options.roles.length > 0) {
      md += generateBundlePermissionsTable(options.roles, entityType, bundle.id);
    }
    return md;
  }

  md += '| Check | Field Name | Machine Name | Field Type | Description | Cardinality | Required | Other | URL |\n';
  md += '|-------|------------|--------------|------------|-------------|-------------|----------|-------|-----|\n';

  // Sort fields by label
  const sortedFields = [...fields].sort((a, b) =>
    (a.label || '').localeCompare(b.label || '')
  );

  for (const field of sortedFields) {
    const fieldPath = getFieldAdminPath(entityType, bundle.id, field.name);
    const fieldUrl = baseUrl ? `${baseUrl}${fieldPath}` : fieldPath;

    md += `| <input type="checkbox"> `;
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

  if (options.roles && options.roles.length > 0) {
    md += generateBundlePermissionsTable(options.roles, entityType, bundle.id);
  }

  return md;
}

/**
 * Generate a report for a single entity type
 * @param {object} project - Project object
 * @param {string} entityType - Entity type
 * @param {string} baseUrl - Base URL for links
 * @param {object} options - Options (e.g., roles)
 * @returns {string} - Markdown content
 */
export function generateEntityTypeReport(project, entityType, baseUrl = '', options = {}) {
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
    md += generateBundleReport(bundle, entityType, baseUrl, options);
  }

  return md;
}

/**
 * Generate a report for a single bundle
 * @param {object} project - Project object
 * @param {string} entityType - Entity type
 * @param {string} bundleId - Bundle machine name
 * @param {string} baseUrl - Base URL for links
 * @param {object} options - Options
 * @param {object} [options.baseFieldOverrides] - Base field override data keyed by field name
 * @returns {string|null} - Markdown content or null if bundle not found
 */
export function generateSingleBundleReport(project, entityType, bundleId, baseUrl = '', options = {}) {
  const bundles = project.entities[entityType] || {};
  const bundle = bundles[bundleId];

  if (!bundle) {
    return null;
  }

  let md = `# ${bundle.label || bundle.id} (${entityType})\n\n`;
  md += `**Project:** ${project.name}\n`;
  md += `**Entity Type:** ${getEntityTypeLabel(entityType)}\n\n`;
  md += `---\n\n`;

  md += generateBundleReport(bundle, entityType, baseUrl, options);

  return md;
}

/**
 * Generate a full project report with table of contents
 * @param {object} project - Project object
 * @param {string} baseUrl - Base URL for links
 * @param {object} options - Options (e.g., roles)
 * @returns {string} - Markdown content
 */
export function generateProjectReport(project, baseUrl = '', options = {}) {
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
      md += generateBundleReport(bundle, entityType, baseUrl, options);
    }
  }

  return md;
}
