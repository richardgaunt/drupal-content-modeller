/**
 * Central Entity Types Registry
 * Single source of truth for all entity type configuration patterns,
 * labels, modules, and admin paths.
 */

/**
 * Entity type definitions
 */
export const ENTITY_TYPES = {
  node: {
    bundlePrefix: 'node.type.',
    fieldStoragePrefix: 'field.storage.node.',
    fieldInstancePrefix: 'field.field.node.',
    fieldPrefix: 'field_n_',
    module: 'node',
    label: 'Content Types',
    singularLabel: 'content type',
    overviewPage: 'Admin > Structure > Content types',
    adminPath: '/admin/structure/types/manage/{bundle}/fields',
    adminUrls: [
      { name: 'Edit Form', path: '/admin/structure/types/manage/{bundle}' },
      { name: 'Manage Fields', path: '/admin/structure/types/manage/{bundle}/fields' },
      { name: 'Manage Form Display', path: '/admin/structure/types/manage/{bundle}/form-display' },
      { name: 'Manage Display', path: '/admin/structure/types/manage/{bundle}/display' },
      { name: 'Manage Permissions', path: '/admin/structure/types/manage/{bundle}/permissions' }
    ]
  },
  media: {
    bundlePrefix: 'media.type.',
    fieldStoragePrefix: 'field.storage.media.',
    fieldInstancePrefix: 'field.field.media.',
    fieldPrefix: 'field_m_',
    module: 'media',
    label: 'Media Types',
    singularLabel: 'media type',
    overviewPage: 'Admin > Structure > Media types',
    adminPath: '/admin/structure/media/manage/{bundle}',
    adminUrls: [
      { name: 'Edit Form', path: '/admin/structure/media/manage/{bundle}' },
      { name: 'Manage Fields', path: '/admin/structure/media/manage/{bundle}/fields' },
      { name: 'Manage Form Display', path: '/admin/structure/media/manage/{bundle}/form-display' },
      { name: 'Manage Display', path: '/admin/structure/media/manage/{bundle}/display' },
      { name: 'Manage Permissions', path: '/admin/structure/media/manage/{bundle}/permissions' }
    ]
  },
  paragraph: {
    bundlePrefix: 'paragraphs.paragraphs_type.',
    fieldStoragePrefix: 'field.storage.paragraph.',
    fieldInstancePrefix: 'field.field.paragraph.',
    fieldPrefix: 'field_p_',
    module: 'paragraphs',
    label: 'Paragraph Types',
    singularLabel: 'paragraph type',
    overviewPage: 'Admin > Structure > Paragraph types',
    adminPath: '/admin/structure/paragraphs_type/{bundle}',
    adminUrls: [
      { name: 'Edit Form', path: '/admin/structure/paragraphs_type/{bundle}' },
      { name: 'Manage Fields', path: '/admin/structure/paragraphs_type/{bundle}/fields' },
      { name: 'Manage Form Display', path: '/admin/structure/paragraphs_type/{bundle}/form-display' },
      { name: 'Manage Display', path: '/admin/structure/paragraphs_type/{bundle}/display' }
    ]
  },
  taxonomy_term: {
    bundlePrefix: 'taxonomy.vocabulary.',
    fieldStoragePrefix: 'field.storage.taxonomy_term.',
    fieldInstancePrefix: 'field.field.taxonomy_term.',
    fieldPrefix: 'field_t_',
    module: 'taxonomy',
    label: 'Vocabularies',
    singularLabel: 'vocabulary',
    overviewPage: 'Admin > Structure > Taxonomy',
    adminPath: '/admin/structure/taxonomy/manage/{bundle}',
    adminUrls: [
      { name: 'Edit Form', path: '/admin/structure/taxonomy/manage/{bundle}' },
      { name: 'Manage Fields', path: '/admin/structure/taxonomy/manage/{bundle}/overview/fields' },
      { name: 'Manage Form Display', path: '/admin/structure/taxonomy/manage/{bundle}/overview/form-display' },
      { name: 'Manage Display', path: '/admin/structure/taxonomy/manage/{bundle}/overview/display' },
      { name: 'Manage Permissions', path: '/admin/structure/taxonomy/manage/{bundle}/overview/permissions' }
    ]
  },
  block_content: {
    bundlePrefix: 'block_content.type.',
    fieldStoragePrefix: 'field.storage.block_content.',
    fieldInstancePrefix: 'field.field.block_content.',
    fieldPrefix: 'field_b_',
    module: 'block_content',
    label: 'Block Types',
    singularLabel: 'block type',
    overviewPage: 'Admin > Structure > Block types',
    adminPath: '/admin/structure/block-content/manage/{bundle}',
    adminUrls: [
      { name: 'Edit Form', path: '/admin/structure/block-content/manage/{bundle}' },
      { name: 'Manage Fields', path: '/admin/structure/block-content/manage/{bundle}/fields' },
      { name: 'Manage Form Display', path: '/admin/structure/block-content/manage/{bundle}/form-display' },
      { name: 'Manage Display', path: '/admin/structure/block-content/manage/{bundle}/display' },
      { name: 'Manage Permissions', path: '/admin/structure/block-content/manage/{bundle}/permissions' }
    ]
  }
};

/**
 * Standard display order for entity types
 */
export const ENTITY_ORDER = ['node', 'media', 'paragraph', 'taxonomy_term', 'block_content'];

/**
 * Get the bundle config name (e.g., 'node.type.page')
 */
export function getBundleConfigName(entityType, bundle) {
  const type = ENTITY_TYPES[entityType];
  if (!type) {
    throw new Error(`Unknown entity type: ${entityType}`);
  }
  return `${type.bundlePrefix}${bundle}`;
}

/**
 * Get the entity type's module for dependency declarations
 */
export function getEntityModule(entityType) {
  return ENTITY_TYPES[entityType]?.module;
}

/**
 * Get the plural label for an entity type (e.g., 'Content Types')
 */
export function getEntityTypeLabel(entityType) {
  return ENTITY_TYPES[entityType]?.label || entityType;
}

/**
 * Get the singular label for an entity type (e.g., 'content type')
 */
export function getEntityTypeSingularLabel(entityType) {
  return ENTITY_TYPES[entityType]?.singularLabel || entityType;
}

/**
 * Get the overview page description (e.g., 'Admin > Structure > Content types')
 */
export function getEntityOverviewPage(entityType) {
  return ENTITY_TYPES[entityType]?.overviewPage || 'Admin panel';
}

/**
 * Get the field name prefix for an entity type (e.g., 'field_n_')
 */
export function getFieldPrefix(entityType) {
  return ENTITY_TYPES[entityType]?.fieldPrefix || 'field_';
}

/**
 * Get the admin path for an entity bundle's fields page
 */
export function getEntityAdminPath(entityType, bundle) {
  const type = ENTITY_TYPES[entityType];
  if (!type) return '';
  return type.adminPath.replace('{bundle}', bundle);
}

/**
 * Get all admin URLs for a bundle
 */
export function getBundleAdminUrls(entityType, bundle) {
  const type = ENTITY_TYPES[entityType];
  if (!type) return [];
  return type.adminUrls.map(url => ({
    name: url.name,
    path: url.path.replace('{bundle}', bundle)
  }));
}
