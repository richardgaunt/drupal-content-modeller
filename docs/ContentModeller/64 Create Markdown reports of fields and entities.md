# 64 Create Markdown Reports of Fields and Entities

## Goal
Generate Markdown documentation reports for entity types and full project content models.

## Dependencies
- 31 Sync Configuration (need entity/field data)
- 40 CLI Interface
- 63 Create Edit Project (need base_url)

## Requirements

### Menu Options
When a project is loaded, add menu options:
- "Generate report for entity type"
- "Generate report for project"

### Entity Type Report Template
```markdown
# Entity Report

### {{ Bundle }} ({{ entity_type }})

Link: {{ entity_link }}

{{ description }}

### Fields

| Field Name | Machine Name | Field Type | Description | Cardinality | Required | Other | URL |
```

`Other` column contains type-specific details (e.g., target bundles for entity references).

### Entity Link Patterns
- Node: `/admin/structure/types/manage/{{ bundle }}/fields`
- Paragraph: `/admin/structure/paragraphs_type/{{ bundle }}`
- Taxonomy: `/admin/structure/taxonomy/manage/{{ bundle }}`
- Block Content: `/admin/structure/block-content/manage/{{ bundle }}`
- Media: `/admin/structure/media/manage/{{ bundle }}`

### Project Report Template
```markdown
# Project: {{ project name }}

URL: {{ url }}

## Table of Contents

1. Node:
   a. {{ Bundle A }}
   b. {{ Bundle B }}
2. Media
   a. {{ Bundle A }}
...
```

Table of contents links to entity sections in the same document.

### URL Prompt
When generating a report, ask whether to use project base URL or provide a different URL.

---

## Implementation Plan

### Part 1: Create Report Generator Module

**New file: `src/generators/reportGenerator.js`**

```javascript
import yaml from 'js-yaml';

// Entity type to admin path mapping
const ENTITY_PATHS = {
  node: '/admin/structure/types/manage/{bundle}/fields',
  paragraph: '/admin/structure/paragraphs_type/{bundle}',
  taxonomy_term: '/admin/structure/taxonomy/manage/{bundle}',
  block_content: '/admin/structure/block-content/manage/{bundle}',
  media: '/admin/structure/media/manage/{bundle}'
};

export function getEntityAdminPath(entityType, bundle) {
  const pattern = ENTITY_PATHS[entityType] || '';
  return pattern.replace('{bundle}', bundle);
}

export function getFieldAdminPath(entityType, bundle, fieldName) {
  const basePath = getEntityAdminPath(entityType, bundle);
  return `${basePath}/${fieldName}`;
}

export function formatCardinality(value) {
  return value === -1 ? 'Unlimited' : String(value);
}

export function getFieldOtherInfo(field) {
  const parts = [];

  if (field.type === 'entity_reference' || field.type === 'entity_reference_revisions') {
    const bundles = field.settings?.handler_settings?.target_bundles;
    if (bundles) {
      parts.push(`References: ${Object.keys(bundles).join(', ')}`);
    }
  }

  if (field.type === 'list_string' || field.type === 'list_integer') {
    const values = field.settings?.allowed_values;
    if (values && Array.isArray(values)) {
      parts.push(`Options: ${values.length}`);
    }
  }

  if (field.type === 'string' && field.settings?.max_length) {
    parts.push(`Max: ${field.settings.max_length}`);
  }

  return parts.join('; ') || '-';
}

export function generateBundleReport(bundle, entityType, baseUrl = '') {
  const adminPath = getEntityAdminPath(entityType, bundle.id);
  const entityLink = baseUrl ? `${baseUrl}${adminPath}` : adminPath;

  let md = `### ${bundle.label} (${entityType})\n\n`;
  md += `Link: ${entityLink}\n\n`;
  md += `${bundle.description || 'No description'}\n\n`;
  md += `#### Fields\n\n`;

  const fields = Object.values(bundle.fields || {});

  if (fields.length === 0) {
    md += '_No custom fields_\n\n';
    return md;
  }

  md += '| Field Name | Machine Name | Field Type | Description | Cardinality | Required | Other | URL |\n';
  md += '|------------|--------------|------------|-------------|-------------|----------|-------|-----|\n';

  for (const field of fields) {
    const fieldPath = getFieldAdminPath(entityType, bundle.id, field.name);
    const fieldUrl = baseUrl ? `${baseUrl}${fieldPath}` : fieldPath;

    md += `| ${field.label} `;
    md += `| ${field.name} `;
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

export function generateEntityTypeReport(project, entityType, baseUrl = '') {
  const bundles = project.entities[entityType] || {};

  let md = `# ${getEntityTypeLabel(entityType)} Report\n\n`;
  md += `Generated from: ${project.name}\n\n`;

  for (const bundle of Object.values(bundles)) {
    md += generateBundleReport(bundle, entityType, baseUrl);
  }

  return md;
}

export function generateProjectReport(project, baseUrl = '') {
  let md = `# Project: ${project.name}\n\n`;
  md += `URL: ${baseUrl || project.baseUrl || 'Not set'}\n\n`;
  md += `---\n\n`;
  md += `## Table of Contents\n\n`;

  const entityOrder = ['node', 'media', 'paragraph', 'taxonomy_term', 'block_content'];

  // Generate TOC
  for (const entityType of entityOrder) {
    const bundles = project.entities[entityType] || {};
    const bundleList = Object.values(bundles);

    if (bundleList.length === 0) continue;

    md += `### ${getEntityTypeLabel(entityType)}\n\n`;
    for (const bundle of bundleList) {
      const anchor = generateAnchor(bundle.label, entityType);
      md += `- [${bundle.label}](#${anchor})\n`;
    }
    md += '\n';
  }

  md += `---\n\n`;

  // Generate full content
  for (const entityType of entityOrder) {
    const bundles = project.entities[entityType] || {};
    for (const bundle of Object.values(bundles)) {
      md += generateBundleReport(bundle, entityType, baseUrl);
    }
  }

  return md;
}

function getEntityTypeLabel(entityType) {
  const labels = {
    node: 'Content Types',
    media: 'Media Types',
    paragraph: 'Paragraph Types',
    taxonomy_term: 'Vocabularies',
    block_content: 'Block Types'
  };
  return labels[entityType] || entityType;
}

function generateAnchor(label, entityType) {
  return `${label.toLowerCase().replace(/\s+/g, '-')}-${entityType}`;
}
```

### Part 2: Add Report Commands

**Update `src/commands/index.js`** - Export new report module

**New file: `src/commands/report.js`**

```javascript
import { generateEntityTypeReport, generateProjectReport } from '../generators/reportGenerator.js';
import { writeFile } from '../io/fileSystem.js';
import path from 'path';

export async function createEntityReport(project, entityType, outputPath, baseUrl) {
  const content = generateEntityTypeReport(project, entityType, baseUrl);
  await writeFile(outputPath, content);
  return outputPath;
}

export async function createProjectReport(project, outputPath, baseUrl) {
  const content = generateProjectReport(project, baseUrl);
  await writeFile(outputPath, content);
  return outputPath;
}
```

### Part 3: Add Menu Options

**Update `src/cli/menus.js`**

Add to project menu choices:
```javascript
{ name: 'Generate report for entity type', value: 'report-entity' },
{ name: 'Generate report for project', value: 'report-project' },
```

Add case handlers:
```javascript
case 'report-entity': {
  const entityType = await promptEntityType();
  const useProjectUrl = await confirm({
    message: `Use project base URL (${project.baseUrl || 'not set'})?`,
    default: true
  });

  let baseUrl = project.baseUrl || '';
  if (!useProjectUrl) {
    baseUrl = await promptBaseUrl();
  }

  const filename = `${project.slug}-${entityType}-report.md`;
  const outputPath = path.join(process.cwd(), filename);
  await createEntityReport(project, entityType, outputPath, baseUrl);
  console.log(chalk.green(`Report saved to: ${outputPath}`));
  break;
}

case 'report-project': {
  const useProjectUrl = await confirm({
    message: `Use project base URL (${project.baseUrl || 'not set'})?`,
    default: true
  });

  let baseUrl = project.baseUrl || '';
  if (!useProjectUrl) {
    baseUrl = await promptBaseUrl();
  }

  const filename = `${project.slug}-content-model.md`;
  const outputPath = path.join(process.cwd(), filename);
  await createProjectReport(project, outputPath, baseUrl);
  console.log(chalk.green(`Report saved to: ${outputPath}`));
  break;
}
```

### Part 4: Add File Write Helper

**Update `src/io/fileSystem.js`**

```javascript
export async function writeFile(filePath, content) {
  await fs.writeFile(filePath, content, 'utf8');
}
```

---

## Acceptance Criteria

- [ ] "Generate report for entity type" menu option available
- [ ] "Generate report for project" menu option available
- [ ] Entity type report includes all bundles with fields table
- [ ] Project report includes table of contents with anchor links
- [ ] Field table shows: name, machine name, type, description, cardinality, required, other, URL
- [ ] "Other" column shows target bundles for entity_reference fields
- [ ] Admin URLs are generated correctly for each entity type
- [ ] Prompt asks whether to use project URL or custom URL
- [ ] Reports saved to current working directory

## Tests

Test file: `tests/report-generator.test.js`

### Unit Tests
- [ ] `getEntityAdminPath returns correct path for node`
- [ ] `getEntityAdminPath returns correct path for paragraph`
- [ ] `getEntityAdminPath returns correct path for media`
- [ ] `formatCardinality returns "Unlimited" for -1`
- [ ] `getFieldOtherInfo includes target bundles for entity_reference`
- [ ] `generateBundleReport includes all fields`
- [ ] `generateProjectReport includes table of contents`
- [ ] `generateAnchor creates valid markdown anchors`
