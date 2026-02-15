/**
 * Tests for role generator
 */

import {
  calculateConfigDependencies,
  calculateModuleDependencies,
  generateRoleDependencies,
  createRole,
  generateRole,
  formatPermissionsForDisplay,
  mergeRolePermissions,
  cloneRole
} from '../src/generators/roleGenerator.js';

describe('Role Generator - Dependencies', () => {
  describe('calculateConfigDependencies', () => {
    it('extracts config dependencies from node permissions', () => {
      const permissions = [
        'create article content',
        'edit own article content',
        'create page content'
      ];
      const deps = calculateConfigDependencies(permissions, null);
      expect(deps).toContain('node.type.article');
      expect(deps).toContain('node.type.page');
      expect(deps.length).toBe(2);
    });

    it('extracts config dependencies from media permissions', () => {
      const permissions = ['create image media', 'delete any document media'];
      const deps = calculateConfigDependencies(permissions, null);
      expect(deps).toContain('media.type.image');
      expect(deps).toContain('media.type.document');
    });

    it('extracts config dependencies from taxonomy permissions', () => {
      const permissions = ['create terms in tags', 'delete terms in categories'];
      const deps = calculateConfigDependencies(permissions, null);
      expect(deps).toContain('taxonomy.vocabulary.tags');
      expect(deps).toContain('taxonomy.vocabulary.categories');
    });

    it('extracts config dependencies from block_content permissions', () => {
      const permissions = ['create basic block content'];
      const deps = calculateConfigDependencies(permissions, null);
      expect(deps).toContain('block_content.type.basic');
    });

    it('returns sorted unique dependencies', () => {
      const permissions = [
        'create article content',
        'edit own article content',
        'delete any article content'
      ];
      const deps = calculateConfigDependencies(permissions, null);
      expect(deps).toEqual(['node.type.article']);
    });

    it('returns empty array for non-content permissions', () => {
      const permissions = ['access content', 'administer nodes'];
      const deps = calculateConfigDependencies(permissions, null);
      expect(deps).toEqual([]);
    });
  });

  describe('calculateModuleDependencies', () => {
    it('extracts module dependencies from node permissions', () => {
      const permissions = ['create article content'];
      const deps = calculateModuleDependencies(permissions);
      expect(deps).toContain('node');
    });

    it('extracts module dependencies from media permissions', () => {
      const permissions = ['create image media'];
      const deps = calculateModuleDependencies(permissions);
      expect(deps).toContain('media');
    });

    it('extracts module dependencies from taxonomy permissions', () => {
      const permissions = ['create terms in tags'];
      const deps = calculateModuleDependencies(permissions);
      expect(deps).toContain('taxonomy');
    });

    it('extracts module dependencies from block_content permissions', () => {
      const permissions = ['create basic block content'];
      const deps = calculateModuleDependencies(permissions);
      expect(deps).toContain('block_content');
    });

    it('detects content_moderation dependency', () => {
      const permissions = ['use editorial transition publish'];
      const deps = calculateModuleDependencies(permissions);
      expect(deps).toContain('content_moderation');
    });

    it('detects path dependency', () => {
      const permissions = ['create url aliases'];
      const deps = calculateModuleDependencies(permissions);
      expect(deps).toContain('path');
    });

    it('detects linkit dependency', () => {
      const permissions = ['use linkit profiles'];
      const deps = calculateModuleDependencies(permissions);
      expect(deps).toContain('linkit');
    });

    it('returns sorted unique dependencies', () => {
      const permissions = [
        'create article content',
        'edit own page content',
        'create image media'
      ];
      const deps = calculateModuleDependencies(permissions);
      expect(deps).toEqual(['media', 'node']);
    });
  });

  describe('generateRoleDependencies', () => {
    it('generates both config and module dependencies', () => {
      const permissions = ['create article content', 'create image media'];
      const deps = generateRoleDependencies(permissions, null);

      expect(deps.config).toBeDefined();
      expect(deps.module).toBeDefined();
      expect(deps.config).toContain('node.type.article');
      expect(deps.config).toContain('media.type.image');
      expect(deps.module).toContain('node');
      expect(deps.module).toContain('media');
    });

    it('omits config key when no config dependencies', () => {
      const permissions = ['access content'];
      const deps = generateRoleDependencies(permissions, null);
      expect(deps.config).toBeUndefined();
    });

    it('omits module key when no module dependencies', () => {
      const permissions = ['access content'];
      const deps = generateRoleDependencies(permissions, null);
      expect(deps.module).toBeUndefined();
    });

    it('returns empty object for no dependencies', () => {
      const permissions = [];
      const deps = generateRoleDependencies(permissions, null);
      expect(deps).toEqual({});
    });
  });
});

describe('Role Generator - Role Creation', () => {
  describe('createRole', () => {
    it('creates role with required fields', () => {
      const role = createRole({ id: 'content_editor', label: 'Content Editor' });

      expect(role.id).toBe('content_editor');
      expect(role.label).toBe('Content Editor');
      expect(role.weight).toBe(0);
      expect(role.isAdmin).toBe(false);
      expect(role.permissions).toEqual([]);
      expect(role.dependencies).toEqual({});
    });

    it('uses id as label when label not provided', () => {
      const role = createRole({ id: 'test_role' });
      expect(role.label).toBe('test_role');
    });

    it('respects isAdmin option', () => {
      const role = createRole({ id: 'admin', label: 'Admin', isAdmin: true });
      expect(role.isAdmin).toBe(true);
    });

    it('respects weight option', () => {
      const role = createRole({ id: 'test', label: 'Test', weight: 5 });
      expect(role.weight).toBe(5);
    });
  });
});

describe('Role Generator - YAML Generation', () => {
  describe('generateRole', () => {
    it('generates valid YAML structure', () => {
      const role = {
        id: 'content_editor',
        label: 'Content Editor',
        weight: 5,
        isAdmin: false,
        permissions: ['create article content', 'edit own article content']
      };

      const yaml = generateRole(role, null);

      expect(yaml).toContain('langcode: en');
      expect(yaml).toContain('status: true');
      expect(yaml).toContain('id: content_editor');
      expect(yaml).toContain('label: Content Editor');
      expect(yaml).toContain('weight: 5');
      expect(yaml).toContain('is_admin: false');
      expect(yaml).toContain('permissions:');
    });

    it('includes dependencies when present', () => {
      const role = {
        id: 'content_editor',
        label: 'Content Editor',
        permissions: ['create article content']
      };

      const yaml = generateRole(role, null);

      expect(yaml).toContain('dependencies:');
      expect(yaml).toContain('config:');
      expect(yaml).toContain('node.type.article');
      expect(yaml).toContain('module:');
      expect(yaml).toContain('node');
    });

    it('sorts permissions alphabetically', () => {
      const role = {
        id: 'test',
        label: 'Test',
        permissions: ['z permission', 'a permission', 'm permission']
      };

      const yaml = generateRole(role, null);
      const permIndex = {
        a: yaml.indexOf('a permission'),
        m: yaml.indexOf('m permission'),
        z: yaml.indexOf('z permission')
      };

      expect(permIndex.a).toBeLessThan(permIndex.m);
      expect(permIndex.m).toBeLessThan(permIndex.z);
    });

    it('handles role with no permissions', () => {
      const role = {
        id: 'empty_role',
        label: 'Empty Role',
        permissions: []
      };

      const yaml = generateRole(role, null);
      expect(yaml).toContain('permissions: []');
    });

    it('handles admin role', () => {
      const role = {
        id: 'admin',
        label: 'Administrator',
        isAdmin: true,
        permissions: []
      };

      const yaml = generateRole(role, null);
      expect(yaml).toContain('is_admin: true');
    });

    it('preserves existing dependencies by default', () => {
      const role = {
        id: 'custom_role',
        label: 'Custom Role',
        permissions: ['create article content'],
        dependencies: {
          config: ['existing.config.dep'],
          module: ['existing_module'],
          enforced: {
            module: ['enforced_module']
          }
        }
      };

      const yaml = generateRole(role, null);
      expect(yaml).toContain('existing.config.dep');
      expect(yaml).toContain('existing_module');
      expect(yaml).toContain('enforced_module');
    });

    it('calculates dependencies for new roles without existing deps', () => {
      const role = {
        id: 'new_role',
        label: 'New Role',
        permissions: ['create article content'],
        dependencies: {}
      };

      const yaml = generateRole(role, null);
      expect(yaml).toContain('node.type.article');
      expect(yaml).toContain('node');
    });

    it('calculates dependencies when preserveDependencies is false', () => {
      const role = {
        id: 'custom_role',
        label: 'Custom Role',
        permissions: ['create article content'],
        dependencies: {
          config: ['existing.config.dep'],
          module: ['existing_module']
        }
      };

      const yaml = generateRole(role, null, { preserveDependencies: false });
      expect(yaml).toContain('node.type.article');
      expect(yaml).not.toContain('existing.config.dep');
    });
  });

  describe('formatPermissionsForDisplay', () => {
    it('formats permissions as bullet list', () => {
      const perms = ['perm1', 'perm2'];
      const formatted = formatPermissionsForDisplay(perms);
      expect(formatted).toContain('  - perm1');
      expect(formatted).toContain('  - perm2');
    });

    it('returns "No permissions" for empty array', () => {
      expect(formatPermissionsForDisplay([])).toBe('No permissions');
    });

    it('returns "No permissions" for null', () => {
      expect(formatPermissionsForDisplay(null)).toBe('No permissions');
    });
  });
});

describe('Role Generator - Role Operations', () => {
  describe('mergeRolePermissions', () => {
    it('combines permissions from both roles', () => {
      const role1 = { id: 'role1', permissions: ['perm1', 'perm2'] };
      const role2 = { id: 'role2', permissions: ['perm3', 'perm4'] };

      const merged = mergeRolePermissions(role1, role2);

      expect(merged.permissions).toContain('perm1');
      expect(merged.permissions).toContain('perm2');
      expect(merged.permissions).toContain('perm3');
      expect(merged.permissions).toContain('perm4');
    });

    it('keeps first role metadata', () => {
      const role1 = { id: 'role1', label: 'Role 1', permissions: ['perm1'] };
      const role2 = { id: 'role2', label: 'Role 2', permissions: ['perm2'] };

      const merged = mergeRolePermissions(role1, role2);

      expect(merged.id).toBe('role1');
      expect(merged.label).toBe('Role 1');
    });

    it('removes duplicates', () => {
      const role1 = { id: 'role1', permissions: ['perm1', 'perm2'] };
      const role2 = { id: 'role2', permissions: ['perm2', 'perm3'] };

      const merged = mergeRolePermissions(role1, role2);

      expect(merged.permissions.filter(p => p === 'perm2').length).toBe(1);
    });

    it('sorts permissions', () => {
      const role1 = { id: 'role1', permissions: ['z'] };
      const role2 = { id: 'role2', permissions: ['a'] };

      const merged = mergeRolePermissions(role1, role2);

      expect(merged.permissions).toEqual(['a', 'z']);
    });
  });

  describe('cloneRole', () => {
    it('creates copy with new ID', () => {
      const original = {
        id: 'original',
        label: 'Original',
        weight: 5,
        isAdmin: false,
        permissions: ['perm1', 'perm2'],
        dependencies: { module: ['node'] }
      };

      const cloned = cloneRole(original, 'cloned', 'Cloned Role');

      expect(cloned.id).toBe('cloned');
      expect(cloned.label).toBe('Cloned Role');
      expect(cloned.weight).toBe(5);
      expect(cloned.isAdmin).toBe(false);
      expect(cloned.permissions).toEqual(['perm1', 'perm2']);
    });

    it('uses new ID as label if label not provided', () => {
      const original = { id: 'original', label: 'Original', permissions: [] };
      const cloned = cloneRole(original, 'new_role');

      expect(cloned.label).toBe('new_role');
    });

    it('creates independent copy of permissions array', () => {
      const original = { id: 'original', permissions: ['perm1'] };
      const cloned = cloneRole(original, 'cloned', 'Cloned');

      cloned.permissions.push('perm2');

      expect(original.permissions).toEqual(['perm1']);
      expect(cloned.permissions).toEqual(['perm1', 'perm2']);
    });
  });
});
