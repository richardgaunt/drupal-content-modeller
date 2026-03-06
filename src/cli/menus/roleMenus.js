/**
 * Role Menu Handlers
 * Handles role management menu actions.
 */

import { select, input, checkbox } from '@inquirer/prompts';
import chalk from 'chalk';
import { selectWithBack, BACK } from '../selectWithBack.js';

import {
  listRoles,
  loadRole,
  createRole,
  deleteRole,
  saveRole,
  getRoleChoices,
  getPermissionChoices,
  getRoleContentPermissions,
  getRoleOtherPermissions,
  generateRoleMachineName,
  validateRoleMachineName
} from '../../commands/role.js';
import {
  addPermissionsToRole,
  removePermissionsFromRole,
  setRoleBundlePermissions,
  getRoleSummary
} from '../../parsers/roleParser.js';
import { getPermissionsForBundle } from '../../constants/permissions.js';

/**
 * Role management menu choices
 */
const ROLE_MENU_CHOICES = [
  { value: 'list', name: 'List roles' },
  { value: 'view', name: 'View role details' },
  { value: 'create', name: 'Create role' },
  { value: 'edit-permissions', name: 'Edit role permissions' },
  { value: 'delete', name: 'Delete role' },
  { value: 'back', name: 'Back' }
];

/**
 * Handle manage roles action
 * @param {object} project - The current project
 * @returns {Promise<void>}
 */
export async function handleManageRoles(project) {
  while (true) {
    try {
      const action = await selectWithBack({
        message: 'Role Management',
        choices: ROLE_MENU_CHOICES
      });

      if (action === BACK) {
        return;
      }

      switch (action) {
        case 'list':
          await handleListRoles(project);
          break;
        case 'view':
          await handleViewRole(project);
          break;
        case 'create':
          await handleCreateRole(project);
          break;
        case 'edit-permissions':
          await handleEditRolePermissions(project);
          break;
        case 'delete':
          await handleDeleteRole(project);
          break;
        case 'back':
          return;
      }
    } catch (error) {
      if (error.name === 'ExitPromptError') {
        return;
      }
      console.log(chalk.red(`Error: ${error.message}`));
    }
  }
}

/**
 * Handle list roles action
 * @param {object} project - The current project
 * @returns {Promise<void>}
 */
export async function handleListRoles(project) {
  try {
    const roles = await listRoles(project);

    if (roles.length === 0) {
      console.log(chalk.yellow('No custom roles found.'));
      return;
    }

    console.log();
    console.log(chalk.cyan(`Roles in "${project.name}"`));
    console.log();

    for (const role of roles) {
      const summary = getRoleSummary(role);
      const adminBadge = role.isAdmin ? chalk.red(' [admin]') : '';
      console.log(`  ${chalk.bold(role.label)}${adminBadge} (${role.id})`);
      console.log(`    Permissions: ${summary.totalPermissions} total (${summary.contentPermissions} content, ${summary.otherPermissions} other)`);
    }

    console.log();
    console.log(`Total: ${roles.length} role(s)`);
    console.log();
  } catch (error) {
    console.log(chalk.red(`Error listing roles: ${error.message}`));
  }
}

/**
 * Handle view role action
 * @param {object} project - The current project
 * @returns {Promise<void>}
 */
export async function handleViewRole(project) {
  try {
    const roles = await listRoles(project);

    if (roles.length === 0) {
      console.log(chalk.yellow('No custom roles found.'));
      return;
    }

    const choices = getRoleChoices(roles);
    const roleId = await selectWithBack({
      message: 'Select role:',
      choices
    });

    if (roleId === BACK) {
      return;
    }

    const role = await loadRole(project, roleId);
    if (!role) {
      console.log(chalk.red(`Role not found: ${roleId}`));
      return;
    }

    const summary = getRoleSummary(role);
    const contentPerms = getRoleContentPermissions(role);
    const otherPerms = getRoleOtherPermissions(role);

    console.log();
    console.log(chalk.cyan(`Role: ${role.label} (${role.id})`));
    console.log();

    if (role.isAdmin) {
      console.log(chalk.red('  This is an admin role - has all permissions'));
    }

    console.log(`  Weight: ${role.weight}`);
    console.log(`  Total permissions: ${summary.totalPermissions}`);
    console.log();

    // Show content permissions by entity type
    if (Object.keys(contentPerms).length > 0) {
      console.log(chalk.cyan('  Content Permissions:'));
      for (const [entityType, bundles] of Object.entries(contentPerms)) {
        for (const [bundle, perms] of Object.entries(bundles)) {
          const permList = perms.map(p => p.short).join(', ');
          console.log(`    ${entityType} > ${bundle}: ${permList}`);
        }
      }
      console.log();
    }

    // Show other permissions
    if (otherPerms.length > 0) {
      console.log(chalk.cyan('  Other Permissions:'));
      for (const perm of otherPerms.slice(0, 10)) {
        console.log(`    - ${perm}`);
      }
      if (otherPerms.length > 10) {
        console.log(`    ... and ${otherPerms.length - 10} more`);
      }
      console.log();
    }
  } catch (error) {
    if (error.name === 'ExitPromptError') {
      return;
    }
    console.log(chalk.red(`Error: ${error.message}`));
  }
}

/**
 * Handle create role action
 * @param {object} project - The current project
 * @returns {Promise<void>}
 */
export async function handleCreateRole(project) {
  try {
    const label = await input({
      message: 'Role label?',
      validate: (value) => {
        if (!value || value.trim().length === 0) {
          return 'Label is required';
        }
        return true;
      }
    });

    const suggestedId = generateRoleMachineName(label);
    const roles = await listRoles(project);
    const existingIds = roles.map(r => r.id);

    const id = await input({
      message: 'Machine name?',
      default: suggestedId,
      validate: (value) => validateRoleMachineName(value, existingIds)
    });

    const isAdmin = await select({
      message: 'Is this an admin role?',
      choices: [
        { value: false, name: 'No' },
        { value: true, name: 'Yes (has all permissions)' }
      ]
    });

    const role = await createRole(project, { label: label.trim(), id, isAdmin });

    console.log();
    console.log(chalk.green(`Role "${role.label}" created successfully!`));
    console.log(chalk.cyan(`Machine name: ${role.id}`));
    console.log();
  } catch (error) {
    if (error.name === 'ExitPromptError') {
      return;
    }
    console.log(chalk.red(`Error: ${error.message}`));
  }
}

/**
 * Handle edit role permissions action
 * @param {object} project - The current project
 * @returns {Promise<void>}
 */
export async function handleEditRolePermissions(project) {
  // Initial role selection outside the loop
  let roles;
  let role;

  try {
    roles = await listRoles(project);

    if (roles.length === 0) {
      console.log(chalk.yellow('No custom roles found.'));
      return;
    }

    const choices = getRoleChoices(roles);
    const roleId = await selectWithBack({
      message: 'Select role:',
      choices
    });

    if (roleId === BACK) {
      return;
    }

    role = await loadRole(project, roleId);
    if (!role) {
      console.log(chalk.red(`Role not found: ${roleId}`));
      return;
    }
  } catch (error) {
    if (error.name === 'ExitPromptError') {
      return;
    }
    console.log(chalk.red(`Error: ${error.message}`));
    return;
  }

  // Show permission editing submenu - errors here stay in the loop
  while (true) {
    try {
      const action = await selectWithBack({
        message: `Permissions for ${role.label}`,
        choices: [
          { value: 'add-bundle', name: 'Add permissions for a bundle' },
          { value: 'add-all-bundles', name: 'Add permissions for all bundles' },
          { value: 'remove-bundle', name: 'Remove permissions for a bundle' },
          { value: 'add-custom', name: 'Add custom permission' },
          { value: 'remove-custom', name: 'Remove a permission' },
          { value: 'view', name: 'View current permissions' },
          { value: 'back', name: 'Back' }
        ]
      });

      if (action === BACK || action === 'back') {
        return;
      }

      switch (action) {
        case 'add-bundle': {
          const result = await handleAddBundlePermissions(project, role);
          if (result) {
            role = result;
          }
          break;
        }

        case 'add-all-bundles': {
          const result = await handleAddAllBundlesPermissions(project, role);
          if (result) {
            role = result;
          }
          break;
        }

        case 'remove-bundle': {
          const result = await handleRemoveBundlePermissions(project, role);
          if (result) {
            role = result;
          }
          break;
        }

        case 'add-custom': {
          const perm = await input({
            message: 'Permission string:',
            validate: (value) => {
              if (!value || value.trim().length === 0) {
                return 'Permission is required';
              }
              return true;
            }
          });

          role = addPermissionsToRole(role, [perm.trim()]);
          await saveRole(project, role);
          console.log(chalk.green('Permission added.'));
          break;
        }

        case 'remove-custom': {
          if (!role.permissions || role.permissions.length === 0) {
            console.log(chalk.yellow('No permissions to remove.'));
            break;
          }

          const permToRemove = await selectWithBack({
            message: 'Select permission to remove:',
            choices: role.permissions.map(p => ({ value: p, name: p }))
          });

          if (permToRemove !== BACK) {
            role = removePermissionsFromRole(role, [permToRemove]);
            await saveRole(project, role);
            console.log(chalk.green('Permission removed.'));
          }
          break;
        }

        case 'view': {
          const summary = getRoleSummary(role);
          console.log();
          console.log(chalk.cyan(`Permissions for ${role.label}: ${summary.totalPermissions} total`));
          for (const perm of role.permissions || []) {
            console.log(`  - ${perm}`);
          }
          console.log();
          break;
        }
      }
    } catch (error) {
      if (error.name === 'ExitPromptError') {
        return;
      }
      console.log(chalk.red(`Error: ${error.message}`));
      // Continue the loop - stay in the role's permission menu
    }
  }
}

/**
 * Handle adding bundle permissions to a role
 * @param {object} project - The current project
 * @param {object} role - Role object
 * @returns {Promise<object|null>} - Updated role or null
 */
export async function handleAddBundlePermissions(project, role) {
  try {
    // Select entity type
    const entityTypes = Object.keys(project.entities || {}).filter(
      type => type !== 'paragraph' && Object.keys(project.entities[type]).length > 0
    );

    if (entityTypes.length === 0) {
      console.log(chalk.yellow('No entities found. Sync the project first.'));
      return null;
    }

    const entityChoices = entityTypes.map(type => ({
      value: type,
      name: `${type} (${Object.keys(project.entities[type]).length} bundles)`
    }));

    const entityType = await selectWithBack({
      message: 'Select entity type:',
      choices: entityChoices
    });

    if (entityType === BACK) {
      return null;
    }

    // Select bundle
    const bundles = project.entities[entityType];
    const bundleEntries = Object.entries(bundles)
      .sort(([, a], [, b]) => (a.label || '').localeCompare(b.label || ''))
      .map(([id, bundle]) => ({
        value: id,
        name: `${bundle.label || id} (${id})`
      }));

    const selectedBundle = await selectWithBack({
      message: 'Select bundle:',
      choices: bundleEntries
    });

    if (selectedBundle === BACK) {
      return null;
    }

    // Get permissions for this bundle
    const permChoices = getPermissionChoices(entityType, selectedBundle, role.permissions);

    if (permChoices.length === 0) {
      console.log(chalk.yellow('No permissions available for this bundle.'));
      return null;
    }

    const selectedPerms = await checkbox({
      message: 'Select permissions:',
      choices: permChoices
    });

    if (selectedPerms.length === 0) {
      return null;
    }

    const updated = setRoleBundlePermissions(role, entityType, selectedBundle, selectedPerms);
    await saveRole(project, updated);
    console.log(chalk.green(`Set ${selectedPerms.length} permission(s) for ${entityType} > ${selectedBundle}.`));
    return updated;
  } catch (error) {
    if (error.name === 'ExitPromptError') {
      return null;
    }
    throw error;
  }
}

/**
 * Handle adding permissions for all bundles of an entity type
 * @param {object} project - The current project
 * @param {object} role - Role object
 * @returns {Promise<object|null>} - Updated role or null
 */
export async function handleAddAllBundlesPermissions(project, role) {
  try {
    // Select entity type
    const entityTypes = Object.keys(project.entities || {}).filter(
      type => type !== 'paragraph' && Object.keys(project.entities[type]).length > 0
    );

    if (entityTypes.length === 0) {
      console.log(chalk.yellow('No entities found. Sync the project first.'));
      return null;
    }

    const entityChoices = entityTypes.map(type => ({
      value: type,
      name: `${type} (${Object.keys(project.entities[type]).length} bundles)`
    }));

    const entityType = await selectWithBack({
      message: 'Select entity type:',
      choices: entityChoices
    });

    if (entityType === BACK) {
      return null;
    }

    // Get all bundles for this entity type
    const bundles = Object.keys(project.entities[entityType]);

    if (bundles.length === 0) {
      console.log(chalk.yellow('No bundles found for this entity type.'));
      return null;
    }

    // Get permission templates for this entity type (use first bundle as template)
    const permTemplates = getPermissionsForBundle(entityType, bundles[0]);

    if (permTemplates.length === 0) {
      console.log(chalk.yellow('No permissions available for this entity type.'));
      return null;
    }

    // Let user select which permission types to apply
    const permChoices = permTemplates.map(p => ({
      value: p.short,
      name: p.label,
      checked: false
    }));

    console.log();
    console.log(chalk.cyan(`Select permissions to add for all ${bundles.length} ${entityType} bundles:`));

    const selectedShorts = await checkbox({
      message: 'Select permission types:',
      choices: permChoices
    });

    if (selectedShorts.length === 0) {
      return null;
    }

    // Generate all permissions for all bundles
    const allPermissions = [];
    for (const bundle of bundles) {
      const bundlePerms = getPermissionsForBundle(entityType, bundle);
      for (const perm of bundlePerms) {
        if (selectedShorts.includes(perm.short)) {
          allPermissions.push(perm.key);
        }
      }
    }

    // Add all permissions to role
    const updated = addPermissionsToRole(role, allPermissions);
    await saveRole(project, updated);

    console.log(chalk.green(`Added ${allPermissions.length} permission(s) across ${bundles.length} ${entityType} bundles.`));
    return updated;
  } catch (error) {
    if (error.name === 'ExitPromptError') {
      return null;
    }
    throw error;
  }
}

/**
 * Handle removing bundle permissions from a role
 * @param {object} project - The current project
 * @param {object} role - Role object
 * @returns {Promise<object|null>} - Updated role or null
 */
export async function handleRemoveBundlePermissions(project, role) {
  try {
    const contentPerms = getRoleContentPermissions(role);

    if (Object.keys(contentPerms).length === 0) {
      console.log(chalk.yellow('No bundle permissions to remove.'));
      return null;
    }

    // Build choices from current content permissions
    const bundleChoices = [];
    for (const [entityType, bundles] of Object.entries(contentPerms)) {
      for (const [bundle, perms] of Object.entries(bundles)) {
        bundleChoices.push({
          value: `${entityType}:${bundle}`,
          name: `${entityType} > ${bundle} (${perms.length} permissions)`
        });
      }
    }

    const selected = await selectWithBack({
      message: 'Select bundle to remove permissions from:',
      choices: bundleChoices
    });

    if (selected === BACK) {
      return null;
    }

    const [entityType, bundle] = selected.split(':');

    const confirm = await selectWithBack({
      message: `Remove all permissions for ${entityType} > ${bundle}?`,
      choices: [
        { value: false, name: 'No, cancel' },
        { value: true, name: 'Yes, remove' }
      ]
    });

    if (confirm === BACK || !confirm) {
      return null;
    }

    const bundlePerms = getPermissionsForBundle(entityType, bundle).map(p => p.key);
    const updated = removePermissionsFromRole(role, bundlePerms);
    await saveRole(project, updated);
    console.log(chalk.green(`Removed permissions for ${entityType} > ${bundle}.`));
    return updated;
  } catch (error) {
    if (error.name === 'ExitPromptError') {
      return null;
    }
    throw error;
  }
}

/**
 * Handle delete role action
 * @param {object} project - The current project
 * @returns {Promise<void>}
 */
export async function handleDeleteRole(project) {
  try {
    const roles = await listRoles(project);

    if (roles.length === 0) {
      console.log(chalk.yellow('No custom roles found.'));
      return;
    }

    const choices = getRoleChoices(roles);
    const roleId = await selectWithBack({
      message: 'Select role to delete:',
      choices
    });

    if (roleId === BACK) {
      return;
    }

    const role = roles.find(r => r.id === roleId);

    const confirm = await selectWithBack({
      message: `Delete role "${role.label}"? This cannot be undone.`,
      choices: [
        { value: false, name: 'No, cancel' },
        { value: true, name: 'Yes, delete' }
      ]
    });

    if (confirm === BACK || !confirm) {
      return;
    }

    await deleteRole(project, roleId);
    console.log(chalk.green(`Role "${role.label}" deleted.`));
  } catch (error) {
    if (error.name === 'ExitPromptError') {
      return;
    }
    console.log(chalk.red(`Error: ${error.message}`));
  }
}
