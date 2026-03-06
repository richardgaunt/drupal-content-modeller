/**
 * Role Commands
 */

import chalk from 'chalk';
import { loadProject } from '../../commands/project.js';
import {
  listRoles,
  loadRole,
  createRole,
  deleteRole,
  addRolePermissions,
  removeRolePermissions,
  setRoleBundlePermissionsCmd,
  parseShortPermissions
} from '../../commands/role.js';
import {
  getPermissionsForBundle,
  groupPermissionsByBundle
} from '../../constants/permissions.js';
import {
  output,
  handleError,
  logSuccess,
  isValidEntityType,
  VALID_ENTITY_TYPES,
  autoSyncProject,
  runSyncIfRequested
} from '../cliUtils.js';

/**
 * Create a new role
 */
export async function cmdRoleCreate(options) {
  try {
    if (!options.project) {
      throw new Error('--project is required');
    }
    if (!options.label) {
      throw new Error('--label is required');
    }

    const project = await loadProject(options.project);
    const role = await createRole(project, {
      label: options.label,
      id: options.name,
      isAdmin: options.isAdmin || false
    });
    logSuccess(options.project);

    if (options.json) {
      output(role, true);
    } else {
      console.log(chalk.green(`Role "${role.label}" created with ID: ${role.id}`));
    }

    await runSyncIfRequested(project, options);
  } catch (error) {
    handleError(error);
  }
}

/**
 * List all roles
 */
export async function cmdRoleList(options) {
  try {
    if (!options.project) {
      throw new Error('--project is required');
    }

    const project = await loadProject(options.project);
    const roles = await listRoles(project);

    if (options.json) {
      output(roles, true);
    } else {
      if (roles.length === 0) {
        console.log('No roles found.');
      } else {
        console.log(chalk.bold('Roles:'));
        for (const role of roles) {
          const adminBadge = role.isAdmin ? chalk.yellow(' (admin)') : '';
          const permCount = role.permissions?.length || 0;
          console.log(`  ${role.label}${adminBadge} [${role.id}] - ${permCount} permissions`);
        }
      }
    }
  } catch (error) {
    handleError(error);
  }
}

/**
 * View role details
 */
export async function cmdRoleView(options) {
  try {
    if (!options.project) {
      throw new Error('--project is required');
    }
    if (!options.role) {
      throw new Error('--role is required');
    }

    const project = await loadProject(options.project);
    const role = await loadRole(project, options.role);

    if (!role) {
      throw new Error(`Role not found: ${options.role}`);
    }

    if (options.json) {
      output(role, true);
    } else {
      console.log(chalk.bold(`Role: ${role.label}`));
      console.log(`  ID: ${role.id}`);
      console.log(`  Admin: ${role.isAdmin ? 'Yes' : 'No'}`);
      console.log(`  Weight: ${role.weight}`);
      console.log(`  Permissions: ${role.permissions?.length || 0}`);

      if (role.permissions && role.permissions.length > 0) {
        const grouped = groupPermissionsByBundle(role.permissions);
        const otherPerms = role.permissions.filter(p => {
          for (const entityType of Object.keys(grouped)) {
            for (const bundle of Object.keys(grouped[entityType])) {
              if (grouped[entityType][bundle].some(bp => bp.key === p)) {
                return false;
              }
            }
          }
          return true;
        });

        console.log('\n' + chalk.bold('Content Permissions:'));
        for (const [entityType, bundles] of Object.entries(grouped)) {
          for (const [bundle, perms] of Object.entries(bundles)) {
            console.log(`  ${entityType} > ${bundle}:`);
            for (const perm of perms) {
              console.log(`    - ${perm.label}`);
            }
          }
        }

        if (otherPerms.length > 0) {
          console.log('\n' + chalk.bold('Other Permissions:'));
          for (const perm of otherPerms) {
            console.log(`  - ${perm}`);
          }
        }
      }
    }
  } catch (error) {
    handleError(error);
  }
}

/**
 * Delete a role
 */
export async function cmdRoleDelete(options) {
  try {
    if (!options.project) {
      throw new Error('--project is required');
    }
    if (!options.role) {
      throw new Error('--role is required');
    }

    const project = await loadProject(options.project);
    const deleted = await deleteRole(project, options.role);

    if (!deleted) {
      throw new Error(`Role not found: ${options.role}`);
    }

    logSuccess(options.project);
    await autoSyncProject(project);

    if (options.json) {
      output({ deleted: true, role: options.role }, true);
    } else {
      console.log(chalk.green(`Role "${options.role}" deleted.`));
    }
  } catch (error) {
    handleError(error);
  }
}

/**
 * Add permissions to role
 */
export async function cmdRoleAddPermission(options) {
  try {
    if (!options.project) {
      throw new Error('--project is required');
    }
    if (!options.role) {
      throw new Error('--role is required');
    }
    if (!options.entityType) {
      throw new Error('--entity-type is required');
    }
    if (!isValidEntityType(options.entityType)) {
      throw new Error(`Invalid entity type. Must be one of: ${VALID_ENTITY_TYPES.join(', ')}`);
    }
    if (!options.bundle) {
      throw new Error('--bundle is required');
    }
    if (!options.permissions) {
      throw new Error('--permissions is required');
    }

    const project = await loadProject(options.project);

    // Parse permissions (can be short names or 'all')
    const shortNames = options.permissions.split(',').map(p => p.trim());
    const permissions = parseShortPermissions(options.entityType, options.bundle, shortNames);

    if (permissions.length === 0) {
      throw new Error('No valid permissions specified');
    }

    const role = await addRolePermissions(project, options.role, permissions);
    logSuccess(options.project);

    if (options.json) {
      output({ role: role.id, added: permissions }, true);
    } else {
      console.log(chalk.green(`Added ${permissions.length} permission(s) to role "${role.label}"`));
      for (const perm of permissions) {
        console.log(`  + ${perm}`);
      }
    }

    await runSyncIfRequested(project, options);
  } catch (error) {
    handleError(error);
  }
}

/**
 * Remove permissions from role
 */
export async function cmdRoleRemovePermission(options) {
  try {
    if (!options.project) {
      throw new Error('--project is required');
    }
    if (!options.role) {
      throw new Error('--role is required');
    }
    if (!options.permissions) {
      throw new Error('--permissions is required');
    }

    const project = await loadProject(options.project);

    // Parse permissions (full permission keys)
    const permissions = options.permissions.split(',').map(p => p.trim());

    const role = await removeRolePermissions(project, options.role, permissions);
    logSuccess(options.project);

    if (options.json) {
      output({ role: role.id, removed: permissions }, true);
    } else {
      console.log(chalk.green(`Removed ${permissions.length} permission(s) from role "${role.label}"`));
      for (const perm of permissions) {
        console.log(`  - ${perm}`);
      }
    }

    await runSyncIfRequested(project, options);
  } catch (error) {
    handleError(error);
  }
}

/**
 * Set permissions for a bundle (replaces existing)
 */
export async function cmdRoleSetPermissions(options) {
  try {
    if (!options.project) {
      throw new Error('--project is required');
    }
    if (!options.role) {
      throw new Error('--role is required');
    }
    if (!options.entityType) {
      throw new Error('--entity-type is required');
    }
    if (!isValidEntityType(options.entityType)) {
      throw new Error(`Invalid entity type. Must be one of: ${VALID_ENTITY_TYPES.join(', ')}`);
    }
    if (!options.bundle) {
      throw new Error('--bundle is required');
    }
    if (!options.permissions) {
      throw new Error('--permissions is required (use "none" to remove all)');
    }

    const project = await loadProject(options.project);

    let permissions = [];
    if (options.permissions !== 'none') {
      const shortNames = options.permissions.split(',').map(p => p.trim());
      permissions = parseShortPermissions(options.entityType, options.bundle, shortNames);
    }

    const role = await setRoleBundlePermissionsCmd(
      project,
      options.role,
      options.entityType,
      options.bundle,
      permissions
    );
    logSuccess(options.project);

    if (options.json) {
      output({ role: role.id, entityType: options.entityType, bundle: options.bundle, permissions }, true);
    } else {
      if (permissions.length === 0) {
        console.log(chalk.green(`Removed all ${options.entityType} > ${options.bundle} permissions from role "${role.label}"`));
      } else {
        console.log(chalk.green(`Set ${permissions.length} permission(s) for ${options.entityType} > ${options.bundle} on role "${role.label}"`));
        for (const perm of permissions) {
          console.log(`  = ${perm}`);
        }
      }
    }

    await runSyncIfRequested(project, options);
  } catch (error) {
    handleError(error);
  }
}

/**
 * List available permissions for a bundle
 */
export async function cmdRoleListPermissions(options) {
  try {
    if (!options.entityType) {
      throw new Error('--entity-type is required');
    }
    if (!isValidEntityType(options.entityType)) {
      throw new Error(`Invalid entity type. Must be one of: ${VALID_ENTITY_TYPES.join(', ')}`);
    }
    if (!options.bundle) {
      throw new Error('--bundle is required');
    }

    const permissions = getPermissionsForBundle(options.entityType, options.bundle);

    if (options.json) {
      output(permissions, true);
    } else {
      console.log(chalk.bold(`Permissions for ${options.entityType} > ${options.bundle}:`));
      for (const perm of permissions) {
        console.log(`  ${perm.short} - ${perm.label}`);
        console.log(`    Key: ${perm.key}`);
      }
    }
  } catch (error) {
    handleError(error);
  }
}
