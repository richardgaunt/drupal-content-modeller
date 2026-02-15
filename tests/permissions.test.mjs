/**
 * Tests for permission constants
 */

import {
  NODE_PERMISSIONS,
  MEDIA_PERMISSIONS,
  TAXONOMY_PERMISSIONS,
  BLOCK_CONTENT_PERMISSIONS,
  getPermissionTemplates,
  getPermissionsForBundle,
  getPermissionLabel,
  parsePermissionKey,
  generatePermissionKey,
  getShortPermissionNames,
  isPermissionForBundle,
  filterBundlePermissions,
  groupPermissionsByBundle
} from '../src/constants/permissions.js';

describe('Permission Constants', () => {
  describe('NODE_PERMISSIONS', () => {
    it('contains 8 permissions', () => {
      expect(NODE_PERMISSIONS.length).toBe(8);
    });

    it('has create permission', () => {
      const create = NODE_PERMISSIONS.find(p => p.short === 'create');
      expect(create).toBeDefined();
      expect(create.key).toBe('create {bundle} content');
    });

    it('has edit own permission', () => {
      const editOwn = NODE_PERMISSIONS.find(p => p.short === 'edit_own');
      expect(editOwn).toBeDefined();
      expect(editOwn.key).toBe('edit own {bundle} content');
    });

    it('has all CRUD permissions', () => {
      const shorts = NODE_PERMISSIONS.map(p => p.short);
      expect(shorts).toContain('create');
      expect(shorts).toContain('edit_own');
      expect(shorts).toContain('edit_any');
      expect(shorts).toContain('delete_own');
      expect(shorts).toContain('delete_any');
    });

    it('has revision permissions', () => {
      const shorts = NODE_PERMISSIONS.map(p => p.short);
      expect(shorts).toContain('view_revisions');
      expect(shorts).toContain('revert_revisions');
      expect(shorts).toContain('delete_revisions');
    });
  });

  describe('MEDIA_PERMISSIONS', () => {
    it('contains 8 permissions', () => {
      expect(MEDIA_PERMISSIONS.length).toBe(8);
    });

    it('has media-specific permission pattern', () => {
      const create = MEDIA_PERMISSIONS.find(p => p.short === 'create');
      expect(create.key).toBe('create {bundle} media');
    });
  });

  describe('TAXONOMY_PERMISSIONS', () => {
    it('contains 6 permissions', () => {
      expect(TAXONOMY_PERMISSIONS.length).toBe(6);
    });

    it('has taxonomy-specific permission pattern', () => {
      const create = TAXONOMY_PERMISSIONS.find(p => p.short === 'create');
      expect(create.key).toBe('create terms in {bundle}');
    });
  });

  describe('BLOCK_CONTENT_PERMISSIONS', () => {
    it('contains 6 permissions', () => {
      expect(BLOCK_CONTENT_PERMISSIONS.length).toBe(6);
    });

    it('has block content-specific permission pattern', () => {
      const create = BLOCK_CONTENT_PERMISSIONS.find(p => p.short === 'create');
      expect(create.key).toBe('create {bundle} block content');
    });
  });
});

describe('getPermissionTemplates', () => {
  it('returns node permissions', () => {
    const templates = getPermissionTemplates('node');
    expect(templates).toBe(NODE_PERMISSIONS);
  });

  it('returns media permissions', () => {
    const templates = getPermissionTemplates('media');
    expect(templates).toBe(MEDIA_PERMISSIONS);
  });

  it('returns empty array for unknown type', () => {
    const templates = getPermissionTemplates('unknown');
    expect(templates).toEqual([]);
  });

  it('returns empty array for paragraph', () => {
    const templates = getPermissionTemplates('paragraph');
    expect(templates).toEqual([]);
  });
});

describe('getPermissionsForBundle', () => {
  it('returns permissions with bundle replaced', () => {
    const perms = getPermissionsForBundle('node', 'article');
    expect(perms.length).toBe(8);
    expect(perms[0].key).toBe('create article content');
    expect(perms[0].short).toBe('create');
  });

  it('works for media', () => {
    const perms = getPermissionsForBundle('media', 'image');
    expect(perms.find(p => p.key === 'create image media')).toBeDefined();
  });

  it('works for taxonomy', () => {
    const perms = getPermissionsForBundle('taxonomy_term', 'tags');
    expect(perms.find(p => p.key === 'create terms in tags')).toBeDefined();
  });

  it('returns empty for unknown entity type', () => {
    const perms = getPermissionsForBundle('unknown', 'test');
    expect(perms).toEqual([]);
  });
});

describe('getPermissionLabel', () => {
  it('returns label for node permission', () => {
    const label = getPermissionLabel('node', 'create article content');
    expect(label).toBe('Create new content');
  });

  it('returns label for edit any', () => {
    const label = getPermissionLabel('node', 'edit any page content');
    expect(label).toBe('Edit any content');
  });

  it('returns null for unknown permission', () => {
    const label = getPermissionLabel('node', 'unknown permission');
    expect(label).toBeNull();
  });

  it('works for media permissions', () => {
    const label = getPermissionLabel('media', 'delete own image media');
    expect(label).toBe('Delete own media');
  });
});

describe('parsePermissionKey', () => {
  it('parses node create permission', () => {
    const parsed = parsePermissionKey('create article content');
    expect(parsed).not.toBeNull();
    expect(parsed.entityType).toBe('node');
    expect(parsed.bundle).toBe('article');
    expect(parsed.short).toBe('create');
  });

  it('parses node edit any permission', () => {
    const parsed = parsePermissionKey('edit any page content');
    expect(parsed.entityType).toBe('node');
    expect(parsed.bundle).toBe('page');
    expect(parsed.short).toBe('edit_any');
  });

  it('parses media permission', () => {
    const parsed = parsePermissionKey('create image media');
    expect(parsed.entityType).toBe('media');
    expect(parsed.bundle).toBe('image');
  });

  it('parses taxonomy permission', () => {
    const parsed = parsePermissionKey('create terms in tags');
    expect(parsed.entityType).toBe('taxonomy_term');
    expect(parsed.bundle).toBe('tags');
  });

  it('parses block_content permission', () => {
    const parsed = parsePermissionKey('create basic block content');
    expect(parsed.entityType).toBe('block_content');
    expect(parsed.bundle).toBe('basic');
  });

  it('returns null for unknown permission', () => {
    const parsed = parsePermissionKey('unknown permission format');
    expect(parsed).toBeNull();
  });
});

describe('generatePermissionKey', () => {
  it('generates node create permission', () => {
    const key = generatePermissionKey('node', 'article', 'create');
    expect(key).toBe('create article content');
  });

  it('generates node edit_any permission', () => {
    const key = generatePermissionKey('node', 'page', 'edit_any');
    expect(key).toBe('edit any page content');
  });

  it('generates media permission', () => {
    const key = generatePermissionKey('media', 'image', 'delete_own');
    expect(key).toBe('delete own image media');
  });

  it('generates taxonomy permission', () => {
    const key = generatePermissionKey('taxonomy_term', 'tags', 'edit');
    expect(key).toBe('edit terms in tags');
  });

  it('returns null for unknown short name', () => {
    const key = generatePermissionKey('node', 'article', 'unknown');
    expect(key).toBeNull();
  });
});

describe('getShortPermissionNames', () => {
  it('returns short names for node', () => {
    const shorts = getShortPermissionNames('node');
    expect(shorts).toContain('create');
    expect(shorts).toContain('edit_own');
    expect(shorts).toContain('delete_any');
    expect(shorts.length).toBe(8);
  });

  it('returns short names for taxonomy', () => {
    const shorts = getShortPermissionNames('taxonomy_term');
    expect(shorts).toContain('create');
    expect(shorts).toContain('edit');
    expect(shorts).toContain('delete');
    expect(shorts.length).toBe(6);
  });

  it('returns empty for unknown type', () => {
    const shorts = getShortPermissionNames('unknown');
    expect(shorts).toEqual([]);
  });
});

describe('isPermissionForBundle', () => {
  it('returns true for matching permission', () => {
    expect(isPermissionForBundle('create article content', 'node', 'article')).toBe(true);
  });

  it('returns false for different bundle', () => {
    expect(isPermissionForBundle('create article content', 'node', 'page')).toBe(false);
  });

  it('returns false for different entity type', () => {
    expect(isPermissionForBundle('create article content', 'media', 'article')).toBe(false);
  });
});

describe('filterBundlePermissions', () => {
  it('filters permissions for bundle', () => {
    const allPerms = [
      'create article content',
      'edit any article content',
      'create page content',
      'access content'
    ];
    const filtered = filterBundlePermissions(allPerms, 'node', 'article');
    expect(filtered).toEqual(['create article content', 'edit any article content']);
  });

  it('returns empty for no matches', () => {
    const filtered = filterBundlePermissions(['access content'], 'node', 'article');
    expect(filtered).toEqual([]);
  });
});

describe('groupPermissionsByBundle', () => {
  it('groups permissions correctly', () => {
    const perms = [
      'create article content',
      'edit any article content',
      'create page content',
      'create image media'
    ];
    const grouped = groupPermissionsByBundle(perms);

    expect(grouped.node).toBeDefined();
    expect(grouped.node.article).toBeDefined();
    expect(grouped.node.article.length).toBe(2);
    expect(grouped.node.page.length).toBe(1);
    expect(grouped.media.image.length).toBe(1);
  });

  it('returns empty object for empty array', () => {
    const grouped = groupPermissionsByBundle([]);
    expect(grouped).toEqual({});
  });

  it('ignores non-content permissions', () => {
    const perms = ['access content', 'view published content'];
    const grouped = groupPermissionsByBundle(perms);
    expect(grouped).toEqual({});
  });
});
