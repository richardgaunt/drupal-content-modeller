/**
 * Role Generator
 * Pure functions for generating role configuration YAML.
 */

import { dump as yamlDump } from 'js-yaml';
import { parsePermissionKey } from '../constants/permissions.js';

/**
 * Entity type to config prefix mapping
 */
const ENTITY_CONFIG_PREFIX = {
  node: 'node.type',
  media: 'media.type',
  paragraph: 'paragraphs.paragraphs_type',
  taxonomy_term: 'taxonomy.vocabulary',
  block_content: 'block_content.type'
};

/**
 * Entity type to module mapping
 */
const ENTITY_MODULE = {
  node: 'node',
  media: 'media',
  taxonomy_term: 'taxonomy',
  block_content: 'block_content'
};

/**
 * Calculate config dependencies from permissions
 * @param {string[]} permissions - Role permissions
 * @param {object} _project - Project with entities (reserved for future use)
 * @returns {string[]} - Config dependencies
 */
export function calculateConfigDependencies(permissions, _project) {
  const configDeps = new Set();

  for (const permission of permissions) {
    const parsed = parsePermissionKey(permission);
    if (parsed) {
      const prefix = ENTITY_CONFIG_PREFIX[parsed.entityType];
      if (prefix) {
        configDeps.add(`${prefix}.${parsed.bundle}`);
      }
    }
  }

  return Array.from(configDeps).sort();
}

/**
 * Calculate module dependencies from permissions
 * @param {string[]} permissions - Role permissions
 * @returns {string[]} - Module dependencies
 */
export function calculateModuleDependencies(permissions) {
  const moduleDeps = new Set();

  for (const permission of permissions) {
    const parsed = parsePermissionKey(permission);
    if (parsed) {
      const module = ENTITY_MODULE[parsed.entityType];
      if (module) {
        moduleDeps.add(module);
      }
    }

    // Check for content moderation permissions
    if (permission.includes('use ') && permission.includes(' transition')) {
      moduleDeps.add('content_moderation');
    }

    // Check for path permissions
    if (permission.includes('url alias')) {
      moduleDeps.add('path');
    }

    // Check for linkit permissions
    if (permission.includes('linkit')) {
      moduleDeps.add('linkit');
    }
  }

  return Array.from(moduleDeps).sort();
}

/**
 * Generate role dependencies (for new roles only)
 * @param {string[]} permissions - Role permissions
 * @param {object} project - Project with entities
 * @returns {object} - Dependencies object
 */
export function generateRoleDependencies(permissions, project) {
  const configDeps = calculateConfigDependencies(permissions, project);
  const moduleDeps = calculateModuleDependencies(permissions);

  const deps = {};

  if (configDeps.length > 0) {
    deps.config = configDeps;
  }

  if (moduleDeps.length > 0) {
    deps.module = moduleDeps;
  }

  return deps;
}

/**
 * Create a new role object
 * @param {object} options - Role options
 * @param {string} options.id - Machine name
 * @param {string} options.label - Human-readable label
 * @param {boolean} options.isAdmin - Is admin role
 * @param {number} options.weight - Role weight
 * @returns {object} - New role object
 */
export function createRole(options) {
  const { id, label, isAdmin = false, weight = 0 } = options;

  return {
    id,
    label: label || id,
    weight,
    isAdmin,
    permissions: [],
    dependencies: {}
  };
}

/**
 * Generate role YAML configuration
 * @param {object} role - Role object
 * @param {object} project - Project with entities (optional)
 * @param {object} options - Generation options
 * @param {boolean} options.preserveDependencies - Preserve existing dependencies (default: true)
 * @returns {string} - YAML string
 */
export function generateRole(role, project = null, options = {}) {
  const { preserveDependencies = true } = options;

  const config = {
    langcode: 'en',
    status: true
  };

  // For existing roles, preserve dependencies as-is (Drupal will handle calculations)
  // For new roles, calculate dependencies
  let deps;
  if (preserveDependencies && role.dependencies && Object.keys(role.dependencies).length > 0) {
    deps = role.dependencies;
  } else {
    const perms = Array.isArray(role.permissions) ? role.permissions : [];
    deps = generateRoleDependencies(perms, project);
  }

  if (Object.keys(deps).length > 0) {
    config.dependencies = deps;
  }

  config.id = role.id;
  config.label = role.label;
  config.weight = role.weight ?? 0;
  config.is_admin = role.isAdmin ?? false;

  // Sort permissions alphabetically (ensure it's an array)
  const perms = Array.isArray(role.permissions) ? role.permissions : [];
  config.permissions = [...perms].sort();

  return yamlDump(config, {
    indent: 2,
    lineWidth: -1,
    noRefs: true,
    sortKeys: false,
    quotingType: "'",
    forceQuotes: false
  });
}

/**
 * Generate permissions string for display
 * @param {string[]} permissions - Permission keys
 * @returns {string} - Formatted string
 */
export function formatPermissionsForDisplay(permissions) {
  if (!permissions || permissions.length === 0) {
    return 'No permissions';
  }

  return permissions.map(p => `  - ${p}`).join('\n');
}

/**
 * Merge two roles, keeping the first role's metadata but combining permissions
 * @param {object} role1 - First role (base)
 * @param {object} role2 - Second role (to merge in)
 * @returns {object} - Merged role
 */
export function mergeRolePermissions(role1, role2) {
  const allPermissions = new Set([
    ...(role1.permissions || []),
    ...(role2.permissions || [])
  ]);

  return {
    ...role1,
    permissions: Array.from(allPermissions).sort()
  };
}

/**
 * Clone a role with a new ID
 * @param {object} role - Role to clone
 * @param {string} newId - New role ID
 * @param {string} newLabel - New role label
 * @returns {object} - Cloned role
 */
export function cloneRole(role, newId, newLabel) {
  return {
    id: newId,
    label: newLabel || newId,
    weight: role.weight,
    isAdmin: role.isAdmin,
    permissions: [...(role.permissions || [])],
    dependencies: { ...role.dependencies }
  };
}
