/**
 * Role Commands - Orchestration layer
 * Combines I/O with pure functions for role operations.
 */

import {
  readRole,
  roleExists,
  listRoleFiles,
  readAllRoles,
  writeRole,
  deleteRoleFile
} from '../io/configReader.js';
import {
  generateRole,
  createRole as createRoleObject
} from '../generators/roleGenerator.js';
import {
  generateRoleMachineName,
  validateRoleMachineName,
  getRolePermissionsForBundle,
  getRoleContentPermissions,
  getRoleOtherPermissions,
  addPermissionsToRole,
  removePermissionsFromRole,
  setRoleBundlePermissions,
  getRoleSummary
} from '../parsers/roleParser.js';
import {
  getPermissionsForBundle,
  generatePermissionKey
} from '../constants/permissions.js';

/**
 * Load a role from project
 * @param {object} project - Project object
 * @param {string} roleId - Role machine name
 * @returns {Promise<object|null>} - Role or null
 */
export async function loadRole(project, roleId) {
  return readRole(project.configDirectory, roleId);
}

/**
 * Check if role exists in project
 * @param {object} project - Project object
 * @param {string} roleId - Role machine name
 * @returns {boolean}
 */
export function hasRole(project, roleId) {
  return roleExists(project.configDirectory, roleId);
}

/**
 * List all roles in project
 * @param {object} project - Project object
 * @returns {Promise<object[]>} - Array of roles
 */
export async function listRoles(project) {
  return readAllRoles(project.configDirectory);
}

/**
 * List role IDs in project
 * @param {object} project - Project object
 * @returns {Promise<string[]>} - Array of role IDs
 */
export async function listRoleIds(project) {
  return listRoleFiles(project.configDirectory);
}

/**
 * Create a new role
 * @param {object} project - Project object
 * @param {object} options - Role options
 * @param {string} options.label - Human-readable label
 * @param {string} options.id - Machine name (optional, generated from label)
 * @param {boolean} options.isAdmin - Is admin role
 * @param {number} options.weight - Role weight
 * @returns {Promise<object>} - Created role
 */
export async function createRole(project, options) {
  const { label, isAdmin = false, weight = 0 } = options;

  // Generate ID if not provided
  const id = options.id || generateRoleMachineName(label);

  // Validate ID
  const existingRoles = await listRoleIds(project);
  const validation = validateRoleMachineName(id, existingRoles);
  if (validation !== true) {
    throw new Error(validation);
  }

  // Create role object
  const role = createRoleObject({ id, label, isAdmin, weight });

  // Generate and save YAML
  const yaml = generateRole(role, project);
  await writeRole(project.configDirectory, id, yaml);

  return role;
}

/**
 * Save role to project
 * @param {object} project - Project object
 * @param {object} role - Role object
 * @returns {Promise<void>}
 */
export async function saveRole(project, role) {
  const yaml = generateRole(role, project);
  await writeRole(project.configDirectory, role.id, yaml);
}

/**
 * Delete a role
 * @param {object} project - Project object
 * @param {string} roleId - Role machine name
 * @returns {Promise<boolean>} - True if deleted
 */
export async function deleteRole(project, roleId) {
  return deleteRoleFile(project.configDirectory, roleId);
}

/**
 * Update role label
 * @param {object} project - Project object
 * @param {string} roleId - Role machine name
 * @param {string} newLabel - New label
 * @returns {Promise<object>} - Updated role
 */
export async function updateRoleLabel(project, roleId, newLabel) {
  const role = await loadRole(project, roleId);
  if (!role) {
    throw new Error(`Role not found: ${roleId}`);
  }

  role.label = newLabel;
  await saveRole(project, role);
  return role;
}

/**
 * Add permissions to role
 * @param {object} project - Project object
 * @param {string} roleId - Role machine name
 * @param {string[]} permissions - Permissions to add
 * @returns {Promise<object>} - Updated role
 */
export async function addRolePermissions(project, roleId, permissions) {
  const role = await loadRole(project, roleId);
  if (!role) {
    throw new Error(`Role not found: ${roleId}`);
  }

  const updated = addPermissionsToRole(role, permissions);
  await saveRole(project, updated);
  return updated;
}

/**
 * Remove permissions from role
 * @param {object} project - Project object
 * @param {string} roleId - Role machine name
 * @param {string[]} permissions - Permissions to remove
 * @returns {Promise<object>} - Updated role
 */
export async function removeRolePermissions(project, roleId, permissions) {
  const role = await loadRole(project, roleId);
  if (!role) {
    throw new Error(`Role not found: ${roleId}`);
  }

  const updated = removePermissionsFromRole(role, permissions);
  await saveRole(project, updated);
  return updated;
}

/**
 * Set permissions for a specific bundle
 * @param {object} project - Project object
 * @param {string} roleId - Role machine name
 * @param {string} entityType - Entity type
 * @param {string} bundle - Bundle machine name
 * @param {string[]} permissions - Full permission keys
 * @returns {Promise<object>} - Updated role
 */
export async function setRoleBundlePermissionsCmd(project, roleId, entityType, bundle, permissions) {
  const role = await loadRole(project, roleId);
  if (!role) {
    throw new Error(`Role not found: ${roleId}`);
  }

  const updated = setRoleBundlePermissions(role, entityType, bundle, permissions);
  await saveRole(project, updated);
  return updated;
}

/**
 * Add all permissions for a bundle to role
 * @param {object} project - Project object
 * @param {string} roleId - Role machine name
 * @param {string} entityType - Entity type
 * @param {string} bundle - Bundle machine name
 * @returns {Promise<object>} - Updated role
 */
export async function addAllBundlePermissions(project, roleId, entityType, bundle) {
  const bundlePerms = getPermissionsForBundle(entityType, bundle);
  const permissionKeys = bundlePerms.map(p => p.key);
  return addRolePermissions(project, roleId, permissionKeys);
}

/**
 * Remove all permissions for a bundle from role
 * @param {object} project - Project object
 * @param {string} roleId - Role machine name
 * @param {string} entityType - Entity type
 * @param {string} bundle - Bundle machine name
 * @returns {Promise<object>} - Updated role
 */
export async function removeAllBundlePermissions(project, roleId, entityType, bundle) {
  const bundlePerms = getPermissionsForBundle(entityType, bundle);
  const permissionKeys = bundlePerms.map(p => p.key);
  return removeRolePermissions(project, roleId, permissionKeys);
}

/**
 * Get current permissions for a bundle
 * @param {object} project - Project object
 * @param {string} roleId - Role machine name
 * @param {string} entityType - Entity type
 * @param {string} bundle - Bundle machine name
 * @returns {Promise<string[]>} - Current permissions
 */
export async function getRoleBundlePermissions(project, roleId, entityType, bundle) {
  const role = await loadRole(project, roleId);
  if (!role) {
    return [];
  }

  return getRolePermissionsForBundle(role, entityType, bundle);
}

/**
 * Get role summary for display
 * @param {object} project - Project object
 * @param {string} roleId - Role machine name
 * @returns {Promise<object>} - Role summary
 */
export async function getRoleSummaryCmd(project, roleId) {
  const role = await loadRole(project, roleId);
  if (!role) {
    throw new Error(`Role not found: ${roleId}`);
  }

  return getRoleSummary(role);
}

/**
 * Get choices for role selection
 * @param {object[]} roles - Array of roles
 * @returns {object[]} - Choices for prompts
 */
export function getRoleChoices(roles) {
  return roles.map(role => ({
    value: role.id,
    name: `${role.label}${role.isAdmin ? ' (admin)' : ''}`
  }));
}

/**
 * Get permission choices for a bundle
 * @param {string} entityType - Entity type
 * @param {string} bundle - Bundle machine name
 * @param {string[]} currentPermissions - Currently enabled permissions
 * @returns {object[]} - Choices for multi-select
 */
export function getPermissionChoices(entityType, bundle, currentPermissions = []) {
  const bundlePerms = getPermissionsForBundle(entityType, bundle);
  const currentSet = new Set(currentPermissions);

  return bundlePerms.map(perm => ({
    value: perm.key,
    name: perm.label,
    checked: currentSet.has(perm.key)
  }));
}

/**
 * Parse short permission names to full keys
 * @param {string} entityType - Entity type
 * @param {string} bundle - Bundle machine name
 * @param {string[]} shortNames - Short permission names or 'all'
 * @returns {string[]} - Full permission keys
 */
export function parseShortPermissions(entityType, bundle, shortNames) {
  if (shortNames.includes('all')) {
    return getPermissionsForBundle(entityType, bundle).map(p => p.key);
  }

  const keys = [];
  for (const short of shortNames) {
    const key = generatePermissionKey(entityType, bundle, short);
    if (key) {
      keys.push(key);
    }
  }
  return keys;
}

// Re-export useful functions from parsers
export {
  generateRoleMachineName,
  validateRoleMachineName,
  getRoleContentPermissions,
  getRoleOtherPermissions,
  getRoleSummary
};
