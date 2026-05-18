/**
 * Permission + Workflow Report Generator — PURE functions.
 * Produces a role-centric permissions matrix plus a content-moderation
 * workflow section, scoped to project / entity type / bundle.
 */

import {
  getPermissionsForBundle,
  getPermissionTemplates,
  getGlobalPermissionTemplates
} from '../constants/permissions.js';
import { ENTITY_ORDER, getEntityTypeLabel, getBundleAdminUrls } from '../constants/entityTypes.js';

/**
 * Resolve which entity types / bundles are in scope.
 * @returns {Array<{entityType:string, bundles:string[]}>}
 */
function resolveScope(project, { scope, entityType, bundle }) {
  const entities = project.entities || {};
  const orderedTypes = ENTITY_ORDER.filter(t => entities[t] && Object.keys(entities[t]).length > 0);

  if (scope === 'bundle') {
    if (!entityType || !bundle) {
      throw new Error("resolveScope: scope 'bundle' requires both entityType and bundle");
    }
    return [{ entityType, bundles: [bundle] }];
  }
  if (scope === 'entity') {
    if (!entityType) {
      throw new Error("resolveScope: scope 'entity' requires entityType");
    }
    return [{ entityType, bundles: Object.keys(entities[entityType] || {}).sort() }];
  }
  return orderedTypes.map(t => ({ entityType: t, bundles: Object.keys(entities[t]).sort() }));
}

/**
 * Build the capability map for one role against a bundle's permission set.
 */
function bundleCapabilities(role, entityType, bundleId) {
  const templates = getPermissionTemplates(entityType);
  const bundlePerms = getPermissionsForBundle(entityType, bundleId);
  const permSet = new Set(role.permissions || []);
  const capabilities = {};
  const permissionKeys = [];

  for (const tmpl of templates) {
    const full = bundlePerms.find(p => p.short === tmpl.short);
    const has = role.isAdmin || (full ? permSet.has(full.key) : false);
    capabilities[tmpl.short] = has;
    if (has && full) permissionKeys.push(full.key);
  }
  return { capabilities, permissionKeys };
}

/**
 * Global perms a role holds for an entity type.
 */
function roleGlobalPerms(role, entityType) {
  const templates = getGlobalPermissionTemplates(entityType);
  if (templates.length === 0) return [];
  const permSet = new Set(role.permissions || []);
  return templates
    .filter(t => role.isAdmin || permSet.has(t.key))
    .map(t => ({ key: t.key, short: t.short, label: t.label, module: t.module }));
}

/**
 * Extract `use <workflow> transition <transition>` perms per role.
 */
function transitionPermissionsForWorkflow(workflow, roles) {
  return workflow.transitions.map(tr => {
    const key = `use ${workflow.id} transition ${tr.id}`;
    const matched = roles
      .filter(r => r.isAdmin || (r.permissions || []).includes(key))
      .map(r => ({ role: r.id, label: r.label || r.id }));
    return { transition: tr.id, label: tr.label, permissionKey: key, roles: matched };
  });
}

/**
 * Filter workflows to those bound to any in-scope bundle.
 * Transition permissions are resolved against the supplied roles.
 */
function scopedWorkflows(workflows, scoped, roles) {
  const inScope = new Set();
  for (const { entityType, bundles } of scoped) {
    for (const b of bundles) inScope.add(`${entityType}:${b}`);
  }
  return (workflows || [])
    .map(wf => {
      const boundBundles = [];
      for (const [et, bs] of Object.entries(wf.entityTypes || {})) {
        for (const b of bs) {
          if (inScope.has(`${et}:${b}`)) boundBundles.push({ entityType: et, bundle: b });
        }
      }
      return { wf, boundBundles };
    })
    .filter(x => x.boundBundles.length > 0)
    .map(({ wf, boundBundles }) => ({
      id: wf.id,
      label: wf.label,
      type: wf.type,
      defaultModerationState: wf.defaultModerationState,
      states: wf.states,
      transitions: wf.transitions.map(t => ({ id: t.id, label: t.label, from: t.from, to: t.to })),
      boundBundles,
      transitionPermissions: transitionPermissionsForWorkflow(wf, roles)
    }));
}

/**
 * Generate the structured permission + workflow report.
 * @param {object} project - Synced project
 * @param {object[]} roles - Parsed roles
 * @param {object[]} workflows - Parsed workflows
 * @param {object} opts - { scope:'project'|'entity'|'bundle', entityType, bundle, baseUrl }
 * @returns {object} - Report data
 */
export function generatePermissionReportData(project, roles, workflows, opts = {}) {
  const { scope = 'project', baseUrl = '' } = opts;
  const scoped = resolveScope(project, opts);
  const rolesList = roles || [];

  const entityTypes = scoped.map(({ entityType, bundles }) => {
    const builtBundles = bundles.map(bundleId => {
      const bundleMeta = (project.entities[entityType] || {})[bundleId] || {};
      const adminUrls = getBundleAdminUrls(entityType, bundleId);
      const permUrl = adminUrls.find(u => /permission/i.test(u.name) || /permission/i.test(u.path));
      return {
        id: bundleId,
        label: bundleMeta.label || bundleId,
        adminPermissionsUrl: permUrl
          ? (baseUrl ? `${baseUrl}${permUrl.path}` : permUrl.path)
          : null,
        roles: rolesList.map(role => {
          const { capabilities, permissionKeys } = bundleCapabilities(role, entityType, bundleId);
          return {
            role: role.id,
            label: role.label || role.id,
            isAdmin: role.isAdmin || false,
            capabilities,
            permissionKeys
          };
        })
      };
    });

    const globalPermissions = rolesList
      .map(role => ({ role: role.id, label: role.label || role.id, perms: roleGlobalPerms(role, entityType) }))
      .filter(g => g.perms.length > 0);

    return { entityType, label: getEntityTypeLabel(entityType), bundles: builtBundles, globalPermissions };
  });

  // Workflows: filter + attach transition perms (resolved against all roles).
  const wfList = scopedWorkflows(workflows, scoped, rolesList);

  return {
    scope,
    project: project.slug,
    generatedAt: new Date().toISOString(),
    entityTypes,
    workflows: wfList,
    summary: buildSummary(entityTypes)
  };
}

/**
 * Render the report data as Markdown.
 * @param {object} data - Output of generatePermissionReportData
 * @returns {string} - Markdown document
 */
export function formatPermissionReportMarkdown(data) {
  const lines = [];
  lines.push(`# Permissions & Workflow Report`);
  lines.push('');
  lines.push(`- Project: \`${data.project}\``);
  lines.push(`- Scope: \`${data.scope}\``);
  lines.push(`- Generated: ${data.generatedAt}`);
  lines.push('');

  for (const et of data.entityTypes) {
    lines.push(`## ${et.label}`);
    lines.push('');

    if (et.bundles.length === 0) {
      lines.push('_No bundles defined for this entity type._');
      lines.push('');
    }

    for (const bundle of et.bundles) {
      lines.push(`### ${bundle.label} (\`${bundle.id}\`)`);
      if (bundle.adminPermissionsUrl) {
        lines.push(`Manage permissions: ${bundle.adminPermissionsUrl}`);
      }
      lines.push('');
      if (bundle.roles.length === 0) {
        lines.push('_No roles defined._');
      } else {
        const caps = Object.keys(bundle.roles[0].capabilities);
        lines.push(`| Role | ${caps.join(' | ')} |`);
        lines.push(`|------${caps.map(() => '|------').join('')}|`);
        for (const r of bundle.roles) {
          const cells = caps.map(c => (r.capabilities[c] ? 'Yes' : 'No'));
          lines.push(`| ${r.label} | ${cells.join(' | ')} |`);
        }
      }
      lines.push('');
    }

    if (et.globalPermissions.length > 0) {
      lines.push(`#### Global Permissions`);
      lines.push('');
      lines.push(`| Role | Permission | Module |`);
      lines.push(`|------|------------|--------|`);
      for (const g of et.globalPermissions) {
        for (const p of g.perms) {
          lines.push(`| ${g.label} | ${p.label} (\`${p.key}\`) | ${p.module} |`);
        }
      }
      lines.push('');
    }
  }

  if (data.workflows.length > 0) {
    lines.push(`## Workflows`);
    lines.push('');
    for (const wf of data.workflows) {
      lines.push(`### ${wf.label} (\`${wf.id}\`)`);
      lines.push(`- Type: ${wf.type}`);
      lines.push(`- Default state: ${wf.defaultModerationState}`);
      lines.push(`- States: ${wf.states.map(s => s.label).join(', ')}`);
      lines.push(`- Bound bundles: ${wf.boundBundles.map(b => `${b.entityType}:${b.bundle}`).join(', ')}`);
      lines.push('');
      lines.push(`| Transition | From → To | Roles |`);
      lines.push(`|------------|-----------|-------|`);
      for (const tp of wf.transitionPermissions) {
        const tr = wf.transitions.find(t => t.id === tp.transition);
        const flow = tr ? `${tr.from.join(', ')} → ${tr.to}` : '';
        const rolesTxt = tp.roles.length ? tp.roles.map(r => r.label).join(', ') : '_none_';
        lines.push(`| ${tp.label} | ${flow} | ${rolesTxt} |`);
      }
      lines.push('');
    }
  }

  lines.push(`## Suggestion Summary`);
  lines.push('');
  for (const [et, s] of Object.entries(data.summary)) {
    lines.push(`### ${et}`);
    lines.push(`- Dominant capabilities: ${s.dominantCapabilities.join(', ') || '_none_'}`);
    for (const [role, caps] of Object.entries(s.byRole)) {
      lines.push(`- ${role}: ${caps.join(', ')}`);
    }
    lines.push(`- Precedent bundles: ${s.precedentBundles.join(', ') || '_none_'}`);
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Modal-pattern summary per entity type — the hook the suggestion skill reads.
 */
function buildSummary(entityTypes) {
  const summary = {};
  for (const et of entityTypes) {
    const byRole = {};
    const capCount = {};
    for (const bundle of et.bundles) {
      for (const r of bundle.roles) {
        if (r.isAdmin) continue;
        const caps = Object.entries(r.capabilities).filter(([, v]) => v).map(([k]) => k);
        if (caps.length === 0) continue;
        byRole[r.role] = Array.from(new Set([...(byRole[r.role] || []), ...caps]));
        for (const c of caps) capCount[c] = (capCount[c] || 0) + 1;
      }
    }
    const dominantCapabilities = Object.entries(capCount)
      .sort((a, b) => b[1] - a[1])
      .map(([c]) => c);
    summary[et.entityType] = {
      dominantCapabilities,
      byRole,
      precedentBundles: et.bundles.map(b => b.id)
    };
  }
  return summary;
}
