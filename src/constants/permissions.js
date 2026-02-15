/**
 * Permission Constants
 * Defines permission patterns for each entity type.
 * {bundle} is replaced with the actual bundle machine name.
 */

/**
 * Node content type permissions
 */
export const NODE_PERMISSIONS = [
  { key: 'create {bundle} content', label: 'Create new content', short: 'create' },
  { key: 'edit own {bundle} content', label: 'Edit own content', short: 'edit_own' },
  { key: 'edit any {bundle} content', label: 'Edit any content', short: 'edit_any' },
  { key: 'delete own {bundle} content', label: 'Delete own content', short: 'delete_own' },
  { key: 'delete any {bundle} content', label: 'Delete any content', short: 'delete_any' },
  { key: 'view {bundle} revisions', label: 'View revisions', short: 'view_revisions' },
  { key: 'revert {bundle} revisions', label: 'Revert revisions', short: 'revert_revisions' },
  { key: 'delete {bundle} revisions', label: 'Delete revisions', short: 'delete_revisions' }
];

/**
 * Media type permissions
 */
export const MEDIA_PERMISSIONS = [
  { key: 'create {bundle} media', label: 'Create new media', short: 'create' },
  { key: 'edit own {bundle} media', label: 'Edit own media', short: 'edit_own' },
  { key: 'edit any {bundle} media', label: 'Edit any media', short: 'edit_any' },
  { key: 'delete own {bundle} media', label: 'Delete own media', short: 'delete_own' },
  { key: 'delete any {bundle} media', label: 'Delete any media', short: 'delete_any' },
  { key: 'view any {bundle} media revisions', label: 'View media revisions', short: 'view_revisions' },
  { key: 'revert any {bundle} media revisions', label: 'Revert media revisions', short: 'revert_revisions' },
  { key: 'delete any {bundle} media revisions', label: 'Delete media revisions', short: 'delete_revisions' }
];

/**
 * Taxonomy term permissions
 */
export const TAXONOMY_PERMISSIONS = [
  { key: 'create terms in {bundle}', label: 'Create terms', short: 'create' },
  { key: 'edit terms in {bundle}', label: 'Edit terms', short: 'edit' },
  { key: 'delete terms in {bundle}', label: 'Delete terms', short: 'delete' },
  { key: 'view term revisions in {bundle}', label: 'View term revisions', short: 'view_revisions' },
  { key: 'revert term revisions in {bundle}', label: 'Revert term revisions', short: 'revert_revisions' },
  { key: 'delete term revisions in {bundle}', label: 'Delete term revisions', short: 'delete_revisions' }
];

/**
 * Block content type permissions
 */
export const BLOCK_CONTENT_PERMISSIONS = [
  { key: 'create {bundle} block content', label: 'Create content block', short: 'create' },
  { key: 'edit any {bundle} block content', label: 'Edit content block', short: 'edit' },
  { key: 'delete any {bundle} block content', label: 'Delete content block', short: 'delete' },
  { key: 'view any {bundle} block content history', label: 'View history', short: 'view_history' },
  { key: 'revert any {bundle} block content revisions', label: 'Revert revisions', short: 'revert_revisions' },
  { key: 'delete any {bundle} block content revisions', label: 'Delete revisions', short: 'delete_revisions' }
];

/**
 * Map entity types to their permission templates
 */
export const PERMISSIONS_BY_ENTITY_TYPE = {
  node: NODE_PERMISSIONS,
  media: MEDIA_PERMISSIONS,
  taxonomy_term: TAXONOMY_PERMISSIONS,
  block_content: BLOCK_CONTENT_PERMISSIONS
};

/**
 * Get permission templates for an entity type
 * @param {string} entityType - Entity type
 * @returns {object[]} - Permission templates
 */
export function getPermissionTemplates(entityType) {
  return PERMISSIONS_BY_ENTITY_TYPE[entityType] || [];
}

/**
 * Get permissions for a specific bundle
 * @param {string} entityType - Entity type
 * @param {string} bundle - Bundle machine name
 * @returns {object[]} - Permissions with {bundle} replaced
 */
export function getPermissionsForBundle(entityType, bundle) {
  const templates = getPermissionTemplates(entityType);
  return templates.map(perm => ({
    key: perm.key.replace('{bundle}', bundle),
    label: perm.label,
    short: perm.short
  }));
}

/**
 * Get a human-readable label for a permission
 * @param {string} entityType - Entity type
 * @param {string} permissionKey - Full permission key
 * @returns {string|null} - Label or null if not found
 */
export function getPermissionLabel(entityType, permissionKey) {
  const templates = getPermissionTemplates(entityType);

  for (const template of templates) {
    // Create a regex from the template key
    const pattern = template.key.replace('{bundle}', '([a-z0-9_]+)');
    const regex = new RegExp(`^${pattern}$`);

    if (regex.test(permissionKey)) {
      return template.label;
    }
  }

  return null;
}

/**
 * Parse a permission key to extract entity type and bundle
 * @param {string} permission - Permission key
 * @returns {object|null} - { entityType, bundle, short } or null
 */
export function parsePermissionKey(permission) {
  // Try each entity type's patterns
  for (const [entityType, templates] of Object.entries(PERMISSIONS_BY_ENTITY_TYPE)) {
    for (const template of templates) {
      const pattern = template.key.replace('{bundle}', '([a-z0-9_]+)');
      const regex = new RegExp(`^${pattern}$`);
      const match = permission.match(regex);

      if (match) {
        return {
          entityType,
          bundle: match[1],
          short: template.short,
          label: template.label
        };
      }
    }
  }

  return null;
}

/**
 * Generate a permission key from short form
 * @param {string} entityType - Entity type
 * @param {string} bundle - Bundle machine name
 * @param {string} short - Short permission name (e.g., 'create', 'edit_own')
 * @returns {string|null} - Full permission key or null
 */
export function generatePermissionKey(entityType, bundle, short) {
  const templates = getPermissionTemplates(entityType);
  const template = templates.find(t => t.short === short);

  if (!template) {
    return null;
  }

  return template.key.replace('{bundle}', bundle);
}

/**
 * Get all short permission names for an entity type
 * @param {string} entityType - Entity type
 * @returns {string[]} - Array of short names
 */
export function getShortPermissionNames(entityType) {
  const templates = getPermissionTemplates(entityType);
  return templates.map(t => t.short);
}

/**
 * Check if a permission belongs to a specific bundle
 * @param {string} permission - Permission key
 * @param {string} entityType - Entity type
 * @param {string} bundle - Bundle machine name
 * @returns {boolean}
 */
export function isPermissionForBundle(permission, entityType, bundle) {
  const permissions = getPermissionsForBundle(entityType, bundle);
  return permissions.some(p => p.key === permission);
}

/**
 * Filter permissions to only those for a specific entity type and bundle
 * @param {string[]} permissions - Array of permission keys
 * @param {string} entityType - Entity type
 * @param {string} bundle - Bundle machine name
 * @returns {string[]} - Filtered permissions
 */
export function filterBundlePermissions(permissions, entityType, bundle) {
  const bundlePermissions = getPermissionsForBundle(entityType, bundle);
  const bundlePermissionKeys = new Set(bundlePermissions.map(p => p.key));
  return permissions.filter(p => bundlePermissionKeys.has(p));
}

/**
 * Group permissions by entity type and bundle
 * @param {string[]} permissions - Array of permission keys
 * @returns {object} - Grouped permissions { entityType: { bundle: [permissions] } }
 */
export function groupPermissionsByBundle(permissions) {
  const grouped = {};

  for (const permission of permissions) {
    const parsed = parsePermissionKey(permission);
    if (parsed) {
      if (!grouped[parsed.entityType]) {
        grouped[parsed.entityType] = {};
      }
      if (!grouped[parsed.entityType][parsed.bundle]) {
        grouped[parsed.entityType][parsed.bundle] = [];
      }
      grouped[parsed.entityType][parsed.bundle].push({
        key: permission,
        short: parsed.short,
        label: parsed.label
      });
    }
  }

  return grouped;
}
