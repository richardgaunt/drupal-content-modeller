/**
 * Search API Report Generator — PURE functions.
 * Produces a structured snapshot of a project's Search API configuration
 * (servers, indexes, indexed fields, processors, search-bound views) plus a
 * Markdown rendering. Mirrors permissionReport.js (data builder + formatter).
 */

/**
 * Build the structured search report data.
 * @param {object} project - Synced project (slug, baseUrl)
 * @param {object} sources - { servers, indexes, views }
 * @param {object} opts - { baseUrl }
 * @returns {object} - Report data
 */
export function generateSearchReportData(project, sources, opts = {}) {
  const { servers = [], indexes = [], views = [] } = sources || {};
  const baseUrl = opts.baseUrl || '';

  // Group search-bound views by the index they target.
  const viewsByIndex = {};
  for (const view of views) {
    const key = view.indexId || '_unbound';
    if (!viewsByIndex[key]) viewsByIndex[key] = [];
    viewsByIndex[key].push(view);
  }

  const indexData = indexes.map(index => ({
    id: index.id,
    label: index.label,
    status: index.status,
    server: index.server,
    tracker: index.tracker,
    fieldCount: index.fieldCount,
    datasources: index.datasources,
    bundles: index.bundles,
    languages: index.languages,
    fields: index.fields,
    processors: index.processors,
    views: viewsByIndex[index.id] || []
  }));

  return {
    project: project.slug,
    baseUrl,
    generatedAt: new Date().toISOString(),
    servers,
    indexes: indexData,
    views,
    summary: {
      serverCount: servers.length,
      indexCount: indexes.length,
      viewCount: views.length
    }
  };
}

function fmtBool(value) {
  return value ? 'enabled' : 'disabled';
}

/**
 * Render the search report data as Markdown.
 * @param {object} data - Output of generateSearchReportData
 * @returns {string} - Markdown document
 */
export function formatSearchReportMarkdown(data) {
  const baseUrl = data.baseUrl || '';
  const searchAdminPath = '/admin/config/search/search-api';
  const lines = [];
  lines.push(`# Search API Configuration Report`);
  lines.push('');
  lines.push(`- Project: \`${data.project}\``);
  lines.push(`- Generated: ${data.generatedAt}`);
  lines.push(`- Servers: ${data.summary.serverCount}`);
  lines.push(`- Indexes: ${data.summary.indexCount}`);
  lines.push(`- Search views: ${data.summary.viewCount}`);
  lines.push('');

  // Servers
  lines.push(`## Servers`);
  lines.push('');
  if (baseUrl) {
    lines.push(`Manage Search API: ${baseUrl}${searchAdminPath}`);
    lines.push('');
  }
  if (data.servers.length === 0) {
    lines.push('_No Search API servers defined._');
    lines.push('');
  } else {
    lines.push(`| Server | Machine Name | Backend | Status |`);
    lines.push(`|--------|--------------|---------|--------|`);
    for (const s of data.servers) {
      lines.push(`| ${s.label} | \`${s.id}\` | ${s.backend || '_none_'} | ${fmtBool(s.status)} |`);
    }
    lines.push('');
  }

  // Indexes
  lines.push(`## Indexes`);
  lines.push('');
  if (data.indexes.length === 0) {
    lines.push('_No Search API indexes defined._');
    lines.push('');
  }

  for (const index of data.indexes) {
    lines.push(`### ${index.label} (\`${index.id}\`)`);
    lines.push(`- Status: ${fmtBool(index.status)}`);
    lines.push(`- Server: ${index.server ? `\`${index.server}\`` : '_none_'}`);
    lines.push(`- Tracker: ${index.tracker ? `\`${index.tracker}\`` : '_none_'}`);
    lines.push(`- Indexed fields: ${index.fieldCount}`);
    if (baseUrl) {
      lines.push(`- Admin: ${baseUrl}${searchAdminPath}/index/${index.id}`);
    }
    lines.push('');

    // Datasources
    if (index.datasources.length > 0) {
      lines.push(`#### Datasources`);
      lines.push('');
      lines.push(`| Datasource | Bundles | Languages |`);
      lines.push(`|------------|---------|-----------|`);
      for (const ds of index.datasources) {
        const bundles = ds.bundles.length
          ? `${ds.bundles.join(', ')}${ds.bundlesAreExclusions ? ' (excluded)' : ''}`
          : (ds.bundlesAreExclusions ? 'all' : '_none_');
        const langs = ds.languages.length ? ds.languages.join(', ') : '_all_';
        lines.push(`| \`${ds.datasourceId}\` | ${bundles} | ${langs} |`);
      }
      lines.push('');
    }

    // Fields
    lines.push(`#### Indexed Fields`);
    lines.push('');
    if (index.fields.length === 0) {
      lines.push('_No fields indexed._');
      lines.push('');
    } else {
      lines.push(`| Field | Label | Property Path | Type |`);
      lines.push(`|-------|-------|---------------|------|`);
      for (const f of index.fields) {
        lines.push(`| \`${f.name}\` | ${f.label} | \`${f.propertyPath}\` | ${f.type} |`);
      }
      lines.push('');
    }

    // Processors
    if (index.processors.length > 0) {
      lines.push(`#### Processors`);
      lines.push('');
      for (const p of index.processors) {
        lines.push(`- \`${p.id}\``);
      }
      lines.push('');
    }

    // Views bound to this index
    if (index.views.length > 0) {
      lines.push(`#### Search Views`);
      lines.push('');
      for (const v of index.views) {
        lines.push(`- **${v.label}** (\`${v.id}\`)`);
        for (const d of v.displays) {
          const path = d.path ? ` — path: \`/${d.path}\`` : '';
          lines.push(`  - ${d.displayId} (${d.displayPlugin})${path}`);
          if (d.exposedFilters.length > 0) {
            lines.push(`    - Exposed filters: ${d.exposedFilters.map(f => f.identifier).join(', ')}`);
          }
          if (d.rowViewModes.length > 0) {
            const vm = d.rowViewModes.map(r => `${r.bundle}=${r.viewMode}`).join(', ');
            lines.push(`    - Row view modes: ${vm}`);
          }
        }
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}
