/**
 * Role Commands Tests
 * Tests for pure functions in role.js
 */

import {
  getRoleChoices,
  getPermissionChoices,
  parseShortPermissions
} from '../src/commands/role.js';

describe('Role Commands', () => {
  describe('getRoleChoices', () => {
    test('returns empty array for no roles', () => {
      expect(getRoleChoices([])).toEqual([]);
    });

    test('transforms roles to choices', () => {
      const roles = [
        { id: 'editor', label: 'Content Editor', isAdmin: false },
        { id: 'admin', label: 'Administrator', isAdmin: true }
      ];

      const result = getRoleChoices(roles);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ value: 'editor', name: 'Content Editor' });
      expect(result[1]).toEqual({ value: 'admin', name: 'Administrator (admin)' });
    });

    test('adds (admin) suffix for admin roles', () => {
      const roles = [{ id: 'super', label: 'Super Admin', isAdmin: true }];

      const result = getRoleChoices(roles);

      expect(result[0].name).toBe('Super Admin (admin)');
    });

    test('does not add suffix for non-admin roles', () => {
      const roles = [{ id: 'user', label: 'Basic User', isAdmin: false }];

      const result = getRoleChoices(roles);

      expect(result[0].name).toBe('Basic User');
    });
  });

  describe('getPermissionChoices', () => {
    test('returns permission choices for node bundle', () => {
      const result = getPermissionChoices('node', 'article', []);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0]).toHaveProperty('value');
      expect(result[0]).toHaveProperty('name');
      expect(result[0]).toHaveProperty('checked');
    });

    test('marks current permissions as checked', () => {
      const currentPermissions = ['create article content', 'edit own article content'];

      const result = getPermissionChoices('node', 'article', currentPermissions);

      const createPerm = result.find(p => p.value === 'create article content');
      const editOwnPerm = result.find(p => p.value === 'edit own article content');
      const deleteAnyPerm = result.find(p => p.value === 'delete any article content');

      expect(createPerm.checked).toBe(true);
      expect(editOwnPerm.checked).toBe(true);
      expect(deleteAnyPerm.checked).toBe(false);
    });

    test('works with empty current permissions', () => {
      const result = getPermissionChoices('node', 'article');

      expect(result.every(p => p.checked === false)).toBe(true);
    });

    test('returns choices for media bundles', () => {
      const result = getPermissionChoices('media', 'image', []);

      expect(result.length).toBeGreaterThan(0);
      const createPerm = result.find(p => p.value.includes('create'));
      expect(createPerm).toBeDefined();
    });

    test('returns choices for taxonomy bundles', () => {
      const result = getPermissionChoices('taxonomy_term', 'tags', []);

      expect(result.length).toBeGreaterThan(0);
      const createPerm = result.find(p => p.value.includes('create'));
      expect(createPerm).toBeDefined();
    });
  });

  describe('parseShortPermissions', () => {
    test('parses "all" to all bundle permissions', () => {
      const result = parseShortPermissions('node', 'article', ['all']);

      expect(result).toContain('create article content');
      expect(result).toContain('edit own article content');
      expect(result).toContain('edit any article content');
      expect(result).toContain('delete own article content');
      expect(result).toContain('delete any article content');
    });

    test('parses single short name', () => {
      const result = parseShortPermissions('node', 'article', ['create']);

      expect(result).toEqual(['create article content']);
    });

    test('parses multiple short names', () => {
      const result = parseShortPermissions('node', 'article', ['create', 'edit_own', 'delete_own']);

      expect(result).toContain('create article content');
      expect(result).toContain('edit own article content');
      expect(result).toContain('delete own article content');
      expect(result).not.toContain('edit any article content');
    });

    test('ignores invalid short names', () => {
      const result = parseShortPermissions('node', 'article', ['create', 'invalid_perm']);

      expect(result).toEqual(['create article content']);
    });

    test('works with media entity type', () => {
      const result = parseShortPermissions('media', 'image', ['create', 'edit_own']);

      expect(result).toContain('create image media');
      expect(result).toContain('edit own image media');
    });

    test('works with taxonomy_term entity type', () => {
      const result = parseShortPermissions('taxonomy_term', 'tags', ['create', 'edit']);

      expect(result).toContain('create terms in tags');
      expect(result).toContain('edit terms in tags');
    });

    test('returns empty array for empty input', () => {
      const result = parseShortPermissions('node', 'article', []);

      expect(result).toEqual([]);
    });
  });
});
