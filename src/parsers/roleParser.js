/**
 * Role Parser
 * Pure functions for parsing role configuration files.
 */

import { groupPermissionsByBundle, filterBundlePermissions, GLOBAL_BUCKET_KEY } from '../constants/permissions.js';
import { generateMachineName } from '../utils/slug.js';

/**
 * Get the filename for a role config
 * @param {string} roleId - Role machine name
 * @returns {string} - Filename
 */
export function getRoleFilename(roleId) {
  return `user.role.${roleId}.yml`;
}

/**
 * Extract role ID from filename
 * @param {string} filename - File name
 * @returns {string|null} - Role ID or null
 */
export function extractRoleIdFromFilename(filename) {
  const match = filename.match(/^user\.role\.([a-z0-9_]+)\.yml$/);
  return match ? match[1] : null;
}

/**
 * Check if a filename is a role config file
 * @param {string} filename - File name
 * @returns {boolean}
 */
export function isRoleFile(filename) {
  return /^user\.role\.[a-z0-9_]+\.yml$/.test(filename);
}

/**
 * Parse role configuration
 * @param {object} config - Parsed YAML config
 * @returns {object|null} - Parsed role or null
 */
export function parseRole(config) {
  if (!config || !config.id) {
    return null;
  }

  // Preserve dependencies as-is from the config (Drupal handles dependency calculations)
  const dependencies = config.dependencies ? { ...config.dependencies } : {};

  // Ensure permissions is always an array (YAML might parse empty as null or object)
  let permissions = [];
  if (Array.isArray(config.permissions)) {
    permissions = config.permissions;
  }

  return {
    id: config.id,
    label: config.label || config.id,
    weight: config.weight ?? 0,
    isAdmin: config.is_admin ?? false,
    permissions,
    dependencies
  };
}

/**
 * Generate machine name from label for roles (max 32 chars)
 * @param {string} label - Human-readable label
 * @returns {string} - Machine name
 */
export function generateRoleMachineName(label) {
  return generateMachineName(label).substring(0, 32);
}

/**
 * Validate role machine name
 * @param {string} name - Machine name
 * @param {string[]} existingRoles - List of existing role IDs
 * @returns {true|string} - True if valid, error message otherwise
 */
export function validateRoleMachineName(name, existingRoles = []) {
  if (!name || typeof name !== 'string') {
    return 'Role machine name is required';
  }

  if (!/^[a-z][a-z0-9_]*$/.test(name)) {
    return 'Machine name must start with a letter and contain only lowercase letters, numbers, and underscores';
  }

  if (name.length > 32) {
    return 'Machine name must be 32 characters or less';
  }

  if (existingRoles.includes(name)) {
    return `Role "${name}" already exists`;
  }

  // Reserved role names
  const reserved = ['anonymous', 'authenticated', 'administrator'];
  if (reserved.includes(name)) {
    return `"${name}" is a reserved role name`;
  }

  return true;
}

/**
 * Get permissions for a specific bundle from role
 * @param {object} role - Parsed role object
 * @param {string} entityType - Entity type
 * @param {string} bundle - Bundle machine name
 * @returns {string[]} - Permissions for bundle
 */
export function getRolePermissionsForBundle(role, entityType, bundle) {
  if (!role || !role.permissions) {
    return [];
  }

  return filterBundlePermissions(role.permissions, entityType, bundle);
}

/**
 * Get per-bundle content permissions grouped by entity type and bundle.
 * The reserved `_global` bucket (non-bundle permissions such as
 * `access content`) is excluded — callers can treat every key as a real
 * bundle. Global permissions surface via getRoleOtherPermissions instead.
 * @param {object} role - Parsed role object
 * @returns {object} - Grouped permissions { entityType: { bundle: [...] } }
 */
export function getRoleContentPermissions(role) {
  if (!role || !role.permissions) {
    return {};
  }

  const grouped = groupPermissionsByBundle(role.permissions);
  const bundleOnly = {};

  for (const entityType of Object.keys(grouped)) {
    for (const bundle of Object.keys(grouped[entityType])) {
      if (bundle === GLOBAL_BUCKET_KEY) continue;
      if (!bundleOnly[entityType]) {
        bundleOnly[entityType] = {};
      }
      bundleOnly[entityType][bundle] = grouped[entityType][bundle];
    }
  }

  return bundleOnly;
}

/**
 * Get non-content permissions (system, workflow, global, etc.)
 * Global (non-bundle) permissions are reported here, not under content.
 * @param {object} role - Parsed role object
 * @returns {string[]} - Other permissions
 */
export function getRoleOtherPermissions(role) {
  if (!role || !role.permissions) {
    return [];
  }

  const grouped = getRoleContentPermissions(role);
  const contentPermissions = new Set();

  for (const entityType of Object.keys(grouped)) {
    for (const bundle of Object.keys(grouped[entityType])) {
      for (const perm of grouped[entityType][bundle]) {
        contentPermissions.add(perm.key);
      }
    }
  }

  return role.permissions.filter(p => !contentPermissions.has(p));
}

/**
 * Add permissions to role
 * @param {object} role - Parsed role object
 * @param {string[]} permissions - Permissions to add
 * @returns {object} - Updated role
 */
export function addPermissionsToRole(role, permissions) {
  // Ensure we're working with arrays
  const currentPerms = Array.isArray(role.permissions) ? role.permissions : [];
  const newPerms = Array.isArray(permissions) ? permissions : [];

  const currentPermissions = new Set(currentPerms);

  for (const perm of newPerms) {
    currentPermissions.add(perm);
  }

  return {
    ...role,
    permissions: Array.from(currentPermissions).sort()
  };
}

/**
 * Remove permissions from role
 * @param {object} role - Parsed role object
 * @param {string[]} permissions - Permissions to remove
 * @returns {object} - Updated role
 */
export function removePermissionsFromRole(role, permissions) {
  // Ensure we're working with arrays
  const currentPerms = Array.isArray(role.permissions) ? role.permissions : [];
  const permsToRemove = Array.isArray(permissions) ? permissions : [];

  const toRemove = new Set(permsToRemove);

  return {
    ...role,
    permissions: currentPerms.filter(p => !toRemove.has(p))
  };
}

/**
 * Set permissions for a specific bundle (replaces existing)
 * @param {object} role - Parsed role object
 * @param {string} entityType - Entity type
 * @param {string} bundle - Bundle machine name
 * @param {string[]} permissions - New permissions for bundle
 * @returns {object} - Updated role
 */
export function setRoleBundlePermissions(role, entityType, bundle, permissions) {
  // Remove existing permissions for this bundle
  const existingBundlePerms = filterBundlePermissions(role.permissions || [], entityType, bundle);
  const updated = removePermissionsFromRole(role, existingBundlePerms);

  // Add new permissions
  return addPermissionsToRole(updated, permissions);
}

/**
 * Create a summary of role for display
 * @param {object} role - Parsed role object
 * @returns {object} - Summary
 */
export function getRoleSummary(role) {
  const contentPerms = getRoleContentPermissions(role);
  const otherPerms = getRoleOtherPermissions(role);

  let bundleCount = 0;
  for (const entityType of Object.keys(contentPerms)) {
    bundleCount += Object.keys(contentPerms[entityType]).length;
  }

  return {
    id: role.id,
    label: role.label,
    isAdmin: role.isAdmin,
    totalPermissions: role.permissions?.length || 0,
    contentPermissions: role.permissions?.length - otherPerms.length || 0,
    otherPermissions: otherPerms.length,
    bundlesWithPermissions: bundleCount
  };
}
