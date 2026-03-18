/**
 * Migration Report Generator - Pure functions for generating migration reports
 * Transforms parsed migration data into Markdown and structured JSON.
 */

import { formatCardinality } from '../utils/slug.js';

/**
 * Look up field info from project entities for a given destination field
 * @param {string} fieldName - Field machine name (e.g. 'field_n_description')
 * @param {string} entityType - Destination entity type (e.g. 'node')
 * @param {string} bundleId - Destination bundle (e.g. 'publication')
 * @param {object} project - Project object with entities
 * @returns {object|null} - Field info { type, cardinality, label } or null
 */
export function lookupFieldInfo(fieldName, entityType, bundleId, project) {
  if (!project?.entities || !entityType || !bundleId) return null;

  const bundle = project.entities[entityType]?.[bundleId];
  if (!bundle?.fields) return null;

  const field = bundle.fields[fieldName];
  if (!field) return null;

  return {
    type: field.type || '',
    cardinality: field.cardinality || 1,
    label: field.label || fieldName
  };
}

/**
 * Enrich process mappings with destination field info from project entities
 * @param {object[]} processMappings - Normalized process mappings
 * @param {string} entityType - Destination entity type
 * @param {string} bundleId - Destination bundle
 * @param {object} project - Project object
 * @returns {object[]} - Enriched process mappings with fieldType, fieldCardinality
 */
export function enrichProcessWithFieldInfo(processMappings, entityType, bundleId, project) {
  return processMappings.map(mapping => {
    // Strip sub-property (e.g. 'field_n_description/value' → 'field_n_description')
    const baseField = mapping.target.split('/')[0];
    const fieldInfo = lookupFieldInfo(baseField, entityType, bundleId, project);

    return {
      ...mapping,
      fieldType: fieldInfo?.type || null,
      fieldCardinality: fieldInfo?.cardinality ?? null,
      fieldLabel: fieldInfo?.label || null
    };
  });
}

/**
 * Generate structured data for a single migration
 * @param {object} migration - Parsed migration object
 * @param {object[]} groups - Array of parsed migration groups
 * @param {object} project - Project object
 * @returns {object} - Structured migration data
 */
export function generateSingleMigrationReportData(migration, groups, project) {
  const group = groups.find(g => g.id === migration.migrationGroup) || null;
  const enrichedProcess = enrichProcessWithFieldInfo(
    migration.process,
    migration.destination.entityType,
    migration.destination.defaultBundle,
    project
  );

  return {
    id: migration.id,
    label: migration.label,
    group: group ? { id: group.id, label: group.label } : null,
    migrationTags: migration.migrationTags,
    source: migration.source,
    destination: migration.destination,
    process: enrichedProcess,
    dependencies: migration.dependencies
  };
}

/**
 * Generate structured data for all migrations
 * @param {object[]} migrations - Array of parsed migrations
 * @param {object[]} groups - Array of parsed migration groups
 * @param {object} project - Project object
 * @returns {object} - Full migration report data
 */
export function generateMigrationReportData(migrations, groups, project) {
  return {
    project: project.name,
    groups: groups.map(g => ({
      id: g.id,
      label: g.label,
      description: g.description,
      sourceType: g.sourceType
    })),
    migrations: migrations.map(m =>
      generateSingleMigrationReportData(m, groups, project)
    )
  };
}

/**
 * Generate Markdown for a single migration
 * @param {object} migration - Parsed migration object
 * @param {object[]} groups - Array of parsed migration groups
 * @param {object} project - Project object
 * @returns {string} - Markdown content
 */
export function generateSingleMigrationReport(migration, groups, project) {
  const group = groups.find(g => g.id === migration.migrationGroup);
  const enrichedProcess = enrichProcessWithFieldInfo(
    migration.process,
    migration.destination.entityType,
    migration.destination.defaultBundle,
    project
  );

  let md = `# Migration: ${migration.label}\n\n`;
  md += `**ID:** \`${migration.id}\`\n`;
  if (group) {
    md += `**Group:** ${group.label} (\`${group.id}\`)\n`;
  }
  if (migration.migrationTags.length > 0) {
    md += `**Tags:** ${migration.migrationTags.map(t => `\`${t}\``).join(', ')}\n`;
  }
  md += '\n';

  // Source
  md += `## Source\n\n`;
  md += `- **Plugin:** \`${migration.source.plugin}\`\n`;
  if (migration.source.entityType) {
    md += `- **Entity Type:** ${migration.source.entityType}\n`;
  }
  if (migration.source.bundle) {
    md += `- **Bundle:** ${migration.source.bundle}\n`;
  }
  if (migration.source.key) {
    md += `- **Key:** ${migration.source.key}\n`;
  }
  md += '\n';

  // Destination
  md += `## Destination\n\n`;
  md += `- **Plugin:** \`${migration.destination.plugin}\`\n`;
  if (migration.destination.defaultBundle) {
    md += `- **Default Bundle:** ${migration.destination.defaultBundle}\n`;
  }
  md += '\n';

  // Field Mappings
  md += generateProcessTable(enrichedProcess);

  // Dependencies
  md += generateDependenciesSection(migration.dependencies);

  return md;
}

/**
 * Generate Markdown for all migrations
 * @param {object[]} migrations - Array of parsed migrations
 * @param {object[]} groups - Array of parsed migration groups
 * @param {object} project - Project object
 * @returns {string} - Markdown content
 */
export function generateMigrationReport(migrations, groups, project) {
  let md = `# Migration Report: ${project.name}\n\n`;

  // Migration Groups table
  if (groups.length > 0) {
    md += `## Migration Groups\n\n`;
    md += `| Name | Machine Name | Description |\n`;
    md += `|------|-------------|-------------|\n`;
    for (const group of groups) {
      md += `| ${group.label} | \`${group.id}\` | ${group.description || '-'} |\n`;
    }
    md += '\n';
  }

  // Table of Contents
  md += `## Migrations (${migrations.length})\n\n`;

  // Group migrations by group
  const byGroup = new Map();
  for (const m of migrations) {
    const groupId = m.migrationGroup || '_ungrouped';
    if (!byGroup.has(groupId)) byGroup.set(groupId, []);
    byGroup.get(groupId).push(m);
  }

  for (const [groupId, groupMigrations] of byGroup) {
    const group = groups.find(g => g.id === groupId);
    const groupLabel = group ? group.label : 'Ungrouped';
    md += `### ${groupLabel}\n\n`;

    // Sort migrations by ID within group
    const sorted = [...groupMigrations].sort((a, b) => a.id.localeCompare(b.id));

    for (const migration of sorted) {
      const enrichedProcess = enrichProcessWithFieldInfo(
        migration.process,
        migration.destination.entityType,
        migration.destination.defaultBundle,
        project
      );

      md += `#### ${migration.label} (\`${migration.id}\`)\n\n`;

      // Source / Destination summary
      const srcParts = [migration.source.plugin];
      if (migration.source.entityType) srcParts.push(migration.source.entityType);
      if (migration.source.bundle) srcParts.push(migration.source.bundle);

      md += `- **Source:** \`${srcParts.join(' / ')}\`\n`;
      md += `- **Destination:** \`${migration.destination.plugin}\``;
      if (migration.destination.defaultBundle) {
        md += ` → ${migration.destination.defaultBundle}`;
      }
      md += '\n\n';

      // Field Mappings
      md += generateProcessTable(enrichedProcess);

      // Dependencies
      md += generateDependenciesSection(migration.dependencies);
    }
  }

  return md;
}

/**
 * Generate Markdown table for process mappings
 * @param {object[]} process - Enriched process mappings
 * @returns {string} - Markdown table
 */
function generateProcessTable(process) {
  if (!process || process.length === 0) return '';

  let md = `**Field Mappings**\n\n`;
  md += `| Target Field | Source | Plugin | Field Type | Cardinality |\n`;
  md += `|-------------|--------|--------|------------|-------------|\n`;

  for (const mapping of process) {
    const source = mapping.source || '-';
    const plugin = mapping.plugin || '-';
    const fieldType = mapping.fieldType || '-';
    const cardinality = mapping.fieldCardinality != null
      ? formatCardinality(mapping.fieldCardinality)
      : '-';

    md += `| \`${mapping.target}\` | ${source} | ${plugin} | ${fieldType} | ${cardinality} |\n`;
  }

  md += '\n';
  return md;
}

/**
 * Generate Markdown section for dependencies
 * @param {object} dependencies - { required: [], optional: [] }
 * @returns {string} - Markdown content
 */
function generateDependenciesSection(dependencies) {
  if (!dependencies) return '';

  const { required, optional } = dependencies;
  if ((!required || required.length === 0) && (!optional || optional.length === 0)) {
    return '';
  }

  let md = `**Dependencies**\n\n`;

  if (required && required.length > 0) {
    md += `- Required: ${required.map(d => `\`${d}\``).join(', ')}\n`;
  }
  if (optional && optional.length > 0) {
    md += `- Optional: ${optional.map(d => `\`${d}\``).join(', ')}\n`;
  }

  md += '\n';
  return md;
}
