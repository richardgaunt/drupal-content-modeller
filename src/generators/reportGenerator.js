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
import { findFieldParentGroup } from '../parsers/formDisplayParser.js';

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
 * Generate structured form display data for a bundle report
 * @param {object|null} formDisplay - Parsed form display data
 * @returns {object|null} - Form display report data or null
 */
export function generateFormDisplayData(formDisplay) {
  if (!formDisplay) {
    return null;
  }

  const groups = (formDisplay.groups || []).map(group => ({
    name: group.name,
    label: group.label,
    parentName: group.parentName || '',
    weight: group.weight ?? 0,
    formatType: group.formatType || 'fieldset',
    formatSettings: group.formatSettings || {},
    children: group.children || []
  }));

  const fields = (formDisplay.fields || []).map(field => ({
    name: field.name,
    widget: field.type || null,
    weight: field.weight ?? 0,
    group: findFieldParentGroup(field.name, groups) || null,
    widgetSettings: field.settings && Object.keys(field.settings).length > 0 ? field.settings : null
  }));

  return {
    groups,
    fields,
    hidden: formDisplay.hidden || []
  };
}

/**
 * Generate structured data for a single bundle
 * @param {object} bundle - Bundle object
 * @param {string} entityType - Entity type
 * @param {string} baseUrl - Base URL for links
 * @param {object} options - Options
 * @param {object} [options.baseFieldOverrides] - Base field override data keyed by field name
 * @param {object[]} [options.roles] - Array of role objects for permissions
 * @param {object} [options.formDisplay] - Parsed form display data for the bundle
 * @returns {object} - Structured bundle data
 */
export function generateBundleReportData(bundle, entityType, baseUrl = '', options = {}) {
  const adminUrls = getBundleAdminUrls(entityType, bundle.id);
  const baseFieldOverrides = options.baseFieldOverrides || {};
  const baseFieldsConfig = getBaseFields(entityType);
  const formDisplayFields = options.formDisplay?.fields || [];

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
      const formField = formDisplayFields.find(f => f.name === field.name);
      return {
        name: field.name,
        label: field.label || field.name,
        type: field.type,
        widget: formField?.type || null,
        description: field.description || '',
        cardinality: field.cardinality || 1,
        required: !!field.required,
        other: other === '-' ? null : other,
        settings: field.settings || {}
      };
    }),
    permissions: generateBundlePermissionsData(options.roles || [], entityType, bundle.id),
    formDisplay: generateFormDisplayData(options.formDisplay || null)
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

  const formDisplays = options.formDisplays || {};

  return {
    entityType,
    label: getEntityTypeLabel(entityType),
    bundles: sortedBundles.map(b => generateBundleReportData(b, entityType, baseUrl, {
      ...options,
      formDisplay: formDisplays[b.id] || null
    }))
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
  const allFormDisplays = options.formDisplays || {};

  return {
    project: project.name,
    baseUrl: resolvedBaseUrl,
    theme: generateThemeReportData(project, resolvedBaseUrl || ''),
    entityTypes: ENTITY_ORDER
      .filter(et => Object.keys(project.entities[et] || {}).length > 0)
      .map(et => generateEntityTypeReportData(project, et, resolvedBaseUrl || '', {
        ...options,
        formDisplays: allFormDisplays[et] || {}
      }))
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
 * @param {object} [options.formDisplay] - Parsed form display data for the bundle
 * @returns {string} - Markdown content
 */
export function generateBundleReport(bundle, entityType, baseUrl = '', options = {}) {
  const adminUrls = getBundleAdminUrls(entityType, bundle.id);
  const baseFieldOverrides = options.baseFieldOverrides || {};
  const formDisplayFields = options.formDisplay?.fields || [];

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

  md += '| Check | Field Name | Machine Name | Field Type | Widget | Description | Cardinality | Required | Other | URL |\n';
  md += '|-------|------------|--------------|------------|--------|-------------|-------------|----------|-------|-----|\n';

  // Sort fields by label
  const sortedFields = [...fields].sort((a, b) =>
    (a.label || '').localeCompare(b.label || '')
  );

  for (const field of sortedFields) {
    const fieldPath = getFieldAdminPath(entityType, bundle.id, field.name);
    const fieldUrl = baseUrl ? `${baseUrl}${fieldPath}` : fieldPath;
    const formField = formDisplayFields.find(f => f.name === field.name);
    const widget = formField?.type || '-';

    md += `| <input type="checkbox"> `;
    md += `| ${field.label || field.name} `;
    md += `| \`${field.name}\` `;
    md += `| ${field.type} `;
    md += `| ${widget} `;
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
  const formDisplays = options.formDisplays || {};

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
    md += generateBundleReport(bundle, entityType, baseUrl, {
      ...options,
      formDisplay: formDisplays[bundle.id] || null
    });
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
 * Generate Markdown for the theme section of a project report
 * @param {object} project - Project object
 * @param {string} baseUrl - Base URL for links
 * @returns {string} - Markdown content or empty string if no theme
 */
export function generateThemeSection(project, baseUrl = '') {
  if (!project.theme?.themes?.length) return '';

  const activeTheme = project.theme.themes[0];
  const baseThemes = project.theme.themes.slice(1);

  let md = `## Theme\n\n`;
  md += `Active theme: ${activeTheme.name} (${activeTheme.machine_name})\n\n`;

  if (baseThemes.length > 0) {
    md += `Base Themes:\n`;
    for (const theme of baseThemes) {
      md += `- ${theme.name} (${theme.machine_name})\n`;
    }
    md += `\n`;
  }

  if (baseUrl) {
    md += `**Admin Links:**\n`;
    md += `- [Theme Settings](${baseUrl}/admin/appearance)\n`;
    md += `- [${activeTheme.name} settings](${baseUrl}/admin/appearance/settings/${activeTheme.machine_name})\n`;
    md += `\n`;
  }

  // All components across all themes
  const allComponents = [];
  for (const theme of project.theme.themes) {
    for (const comp of Object.values(theme.components || {})) {
      allComponents.push({
        id: `${theme.machine_name}:${comp.machine_name}`,
        name: comp.name,
        description: comp.description || '',
        replaces: comp.replaces || ''
      });
    }
  }

  if (allComponents.length > 0) {
    md += `### Components\n\n`;
    md += `| ID | Name | Description | Overrides |\n`;
    md += `|----|------|-------------|-----------|\n`;
    for (const comp of allComponents) {
      md += `| ${comp.id} | ${comp.name} | ${comp.description} | ${comp.replaces} |\n`;
    }
    md += `\n`;
  }

  // Overridden components (active theme only, with replaces)
  const overridden = Object.values(activeTheme.components || {})
    .filter(c => c.replaces);

  if (overridden.length > 0) {
    md += `### Overridden Components\n\n`;
    md += `| ID | Name | Description | Overrides |\n`;
    md += `|----|------|-------------|-----------|\n`;
    for (const comp of overridden) {
      md += `| ${activeTheme.machine_name}:${comp.machine_name} | ${comp.name} | ${comp.description || ''} | ${comp.replaces} |\n`;
    }
    md += `\n`;
  }

  // Custom components (active theme only, without replaces)
  const custom = Object.values(activeTheme.components || {})
    .filter(c => !c.replaces);

  if (custom.length > 0) {
    md += `### Custom Components\n\n`;
    md += `| ID | Name | Description |\n`;
    md += `|----|------|-------------|\n`;
    for (const comp of custom) {
      md += `| ${activeTheme.machine_name}:${comp.machine_name} | ${comp.name} | ${comp.description || ''} |\n`;
    }
    md += `\n`;
  }

  return md;
}

/**
 * Generate structured theme data for a project report
 * @param {object} project - Project object
 * @param {string} baseUrl - Base URL for links
 * @returns {object|null} - Structured theme data or null if no theme
 */
export function generateThemeReportData(project, baseUrl = '') {
  if (!project.theme?.themes?.length) return null;

  const activeTheme = project.theme.themes[0];
  const baseThemes = project.theme.themes.slice(1);

  const allComponents = [];
  for (const theme of project.theme.themes) {
    for (const comp of Object.values(theme.components || {})) {
      allComponents.push({
        id: `${theme.machine_name}:${comp.machine_name}`,
        name: comp.name,
        description: comp.description || '',
        replaces: comp.replaces || null
      });
    }
  }

  const overriddenComponents = Object.values(activeTheme.components || {})
    .filter(c => c.replaces)
    .map(c => ({
      id: `${activeTheme.machine_name}:${c.machine_name}`,
      name: c.name,
      description: c.description || '',
      replaces: c.replaces
    }));

  const customComponents = Object.values(activeTheme.components || {})
    .filter(c => !c.replaces)
    .map(c => ({
      id: `${activeTheme.machine_name}:${c.machine_name}`,
      name: c.name,
      description: c.description || ''
    }));

  const adminLinks = baseUrl ? [
    { name: 'Theme Settings', url: `${baseUrl}/admin/appearance` },
    { name: `${activeTheme.name} settings`, url: `${baseUrl}/admin/appearance/settings/${activeTheme.machine_name}` }
  ] : [];

  return {
    activeTheme: {
      name: activeTheme.name,
      machine_name: activeTheme.machine_name
    },
    baseThemes: baseThemes.map(t => ({
      name: t.name,
      machine_name: t.machine_name
    })),
    adminLinks,
    components: allComponents,
    overriddenComponents,
    customComponents
  };
}

/**
 * Generate a full project report with table of contents
 * @param {object} project - Project object
 * @param {string} baseUrl - Base URL for links
 * @param {object} options - Options (e.g., roles)
 * @returns {string} - Markdown content
 */
export function generateProjectReport(project, baseUrl = '', options = {}) {
  const allFormDisplays = options.formDisplays || {};
  const displayUrl = baseUrl || project.baseUrl || '_Not set_';

  const resolvedBaseUrl = baseUrl || project.baseUrl || '';
  const hasTheme = project.theme?.themes?.length > 0;

  let md = `# Project: ${project.name}\n\n`;
  md += `**URL:** ${displayUrl}\n\n`;
  md += `---\n\n`;

  md += `## Table of Contents\n\n`;

  // Theme link in TOC
  if (hasTheme) {
    md += `- [Theme & Components](#theme)\n\n`;
  }

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

  // Theme section after TOC
  md += generateThemeSection(project, resolvedBaseUrl);

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

    const entityFormDisplays = allFormDisplays[entityType] || {};
    for (const bundle of sortedBundles) {
      md += generateBundleReport(bundle, entityType, baseUrl, {
        ...options,
        formDisplay: entityFormDisplays[bundle.id] || null
      });
    }
  }

  return md;
}
