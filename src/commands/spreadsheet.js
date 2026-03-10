/**
 * Spreadsheet Commands
 * Orchestration for spreadsheet import and export operations.
 */

import { join } from 'path';
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { readSpreadsheet, writeSpreadsheet } from '../io/spreadsheetIO.js';
import { parseSpreadsheet } from '../parsers/spreadsheetParser.js';
import {
  validateReportData,
  translateFieldSettings
} from './import.js';
import { createBundle, createField, bundleExists } from './create.js';
import {
  fieldStorageExists,
  getExistingFieldType,
  getStorageFilename,
  getInstanceFilename
} from '../generators/fieldGenerator.js';
import { ENTITY_TYPES, getBundleConfigName } from '../constants/entityTypes.js';
import { getPermissionsForBundle } from '../constants/permissions.js';
import { listRoleFiles } from '../io/configReader.js';
import { rm } from 'fs/promises';

/**
 * Build a full sync diff comparing spreadsheet data to existing project.
 * Identifies bundles and fields to create, keep, or delete.
 *
 * @param {object} project - Project object
 * @param {object} reportData - Parsed spreadsheet data in report format
 * @returns {object} - { toCreate[], toDelete[], toKeep[], errors[] }
 */
export function buildSyncDiff(project, reportData) {
  const toCreate = [];
  const toDelete = [];
  const toKeep = [];
  const errors = [];

  // Build set of bundles and fields from spreadsheet
  const spreadsheetBundles = new Set();
  const spreadsheetFields = new Map(); // "entityType:bundle" → Set of field names

  for (const et of reportData.entityTypes) {
    for (const bundle of et.bundles) {
      const bundleKey = `${et.entityType}:${bundle.bundle}`;
      spreadsheetBundles.add(bundleKey);

      if (!spreadsheetFields.has(bundleKey)) {
        spreadsheetFields.set(bundleKey, new Set());
      }

      for (const field of bundle.fields || []) {
        spreadsheetFields.get(bundleKey).add(field.name);
      }
    }
  }

  // Check each entity type in project
  const projectEntities = project.entities || {};

  for (const [entityType, bundles] of Object.entries(projectEntities)) {
    for (const [bundleId, bundleData] of Object.entries(bundles)) {
      const bundleKey = `${entityType}:${bundleId}`;

      if (!spreadsheetBundles.has(bundleKey)) {
        // Bundle exists in project but not spreadsheet — delete it
        toDelete.push({
          kind: 'bundle',
          entityType,
          bundle: bundleId,
          label: bundleData.label || bundleId
        });
      } else {
        // Bundle exists in both → check fields
        toKeep.push({
          kind: 'bundle',
          entityType,
          bundle: bundleId,
          label: bundleData.label || bundleId
        });

        const sheetFields = spreadsheetFields.get(bundleKey) || new Set();

        for (const fieldName of Object.keys(bundleData.fields || {})) {
          if (!sheetFields.has(fieldName)) {
            // Field exists on bundle in project but not spreadsheet → delete
            toDelete.push({
              kind: 'field',
              entityType,
              bundle: bundleId,
              fieldName,
              label: bundleData.fields[fieldName].label || fieldName
            });
          }
        }
      }
    }
  }

  // Check for new bundles and fields from spreadsheet
  for (const et of reportData.entityTypes) {
    for (const bundle of et.bundles) {
      const bundleKey = `${et.entityType}:${bundle.bundle}`;

      if (!bundleExists(project, et.entityType, bundle.bundle)) {
        toCreate.push({
          kind: 'bundle',
          entityType: et.entityType,
          bundle: bundle.bundle,
          label: bundle.label,
          description: bundle.description || ''
        });
      }

      for (const field of bundle.fields || []) {
        // Check if field already exists on this specific bundle
        const existingBundle = projectEntities[et.entityType]?.[bundle.bundle];
        const fieldExistsOnBundle = existingBundle?.fields?.[field.name];

        if (!fieldExistsOnBundle) {
          // Check for type mismatch with existing storage
          if (fieldStorageExists(project, et.entityType, field.name)) {
            const existingType = getExistingFieldType(project, et.entityType, field.name);
            if (existingType !== field.type) {
              errors.push({
                type: 'field_type_mismatch',
                entityType: et.entityType,
                bundle: bundle.bundle,
                fieldName: field.name,
                existingType,
                requestedType: field.type,
                message: `Field "${field.name}" exists as "${existingType}" but spreadsheet has "${field.type}"`
              });
              continue;
            }
          }

          toCreate.push({
            kind: 'field',
            entityType: et.entityType,
            bundle: bundle.bundle,
            fieldName: field.name,
            fieldType: field.type,
            label: field.label || field.name,
            description: field.description || '',
            required: !!field.required,
            cardinality: field.cardinality || 1,
            settings: field.settings || {}
          });
        }
      }
    }
  }

  return { toCreate, toDelete, toKeep, errors };
}

/**
 * Check if a field storage is used by any other bundle besides the ones being deleted.
 *
 * @param {object} project - Project object
 * @param {string} entityType - Entity type
 * @param {string} fieldName - Field name
 * @param {Set<string>} deletingBundles - Set of "entityType:bundle" keys being deleted
 * @returns {boolean} - True if field storage is used by other bundles
 */
export function fieldStorageUsedElsewhere(project, entityType, fieldName, deletingBundles) {
  const bundles = project.entities?.[entityType] || {};

  for (const [bundleId, bundleData] of Object.entries(bundles)) {
    const bundleKey = `${entityType}:${bundleId}`;
    if (deletingBundles.has(bundleKey)) continue;

    if (bundleData.fields?.[fieldName]) {
      return true;
    }
  }

  return false;
}

/**
 * Remove field references from a YAML config file by direct string manipulation.
 * Avoids round-tripping through yaml parse/dump which can reformat the file.
 *
 * @param {string} content - Raw YAML file content
 * @param {string} entityType - Entity type
 * @param {string} bundle - Bundle machine name
 * @param {string} fieldName - Field name to remove
 * @returns {string} - Modified YAML content
 */
export function removeFieldFromYaml(content, entityType, bundle, fieldName) {
  const depEntry = `field.field.${entityType}.${bundle}.${fieldName}`;

  // 1. Remove from dependencies.config — line like "    - field.field.node.bundle.field_name"
  const depRegex = new RegExp(`^[ \\t]*- ${depEntry.replace(/\./g, '\\.')}\\s*\\n`, 'gm');
  content = content.replace(depRegex, '');

  // 2. Remove from content section — block starting with "  field_name:" followed by indented lines
  //    Matches the field key and all following lines that are more deeply indented
  const contentBlockRegex = new RegExp(
    `^([ \\t]*)${fieldName}:\\s*\\n(?:\\1[ \\t]+.*\\n)*`,
    'gm'
  );
  content = content.replace(contentBlockRegex, '');

  // 3. Remove from hidden section — line like "  field_name: true"
  const hiddenRegex = new RegExp(`^[ \\t]*${fieldName}:\\s*true\\s*\\n`, 'gm');
  content = content.replace(hiddenRegex, '');

  // 4. Remove from field_group children — line like "        - field_name"
  //    Only within children arrays (indented with "- field_name")
  const childRegex = new RegExp(`^([ \\t]*)- ${fieldName}\\s*\\n`, 'gm');
  content = content.replace(childRegex, '');

  return content;
}

/**
 * Clean up all display configs (form and view) for a bundle when fields are deleted.
 *
 * @param {string} configDir - Path to config directory
 * @param {string} entityType - Entity type
 * @param {string} bundle - Bundle machine name
 * @param {string[]} fieldNames - Field names being deleted
 * @returns {string[]} - List of modified file names
 */
export function cleanupDisplayConfigs(configDir, entityType, bundle, fieldNames) {
  const formPattern = `core.entity_form_display.${entityType}.${bundle}.`;
  const viewPattern = `core.entity_view_display.${entityType}.${bundle}.`;
  const modifiedFiles = [];

  const allFiles = readdirSync(configDir);
  const files = allFiles.filter(f =>
    (f.startsWith(formPattern) || f.startsWith(viewPattern)) && f.endsWith('.yml')
  );

  for (const file of files) {
    const filePath = join(configDir, file);
    const original = readFileSync(filePath, 'utf8');
    let content = original;

    for (const fieldName of fieldNames) {
      content = removeFieldFromYaml(content, entityType, bundle, fieldName);
    }

    if (content !== original) {
      writeFileSync(filePath, content, 'utf8');
      modifiedFiles.push(file);
    }
  }

  return modifiedFiles;
}

/**
 * Remove bundle-specific permissions from all role config files.
 *
 * @param {string} configDir - Path to config directory
 * @param {string} entityType - Entity type
 * @param {string} bundle - Bundle machine name
 * @returns {Promise<string[]>} - List of modified role files
 */
export async function cleanupRolePermissions(configDir, entityType, bundle) {
  const roleIds = await listRoleFiles(configDir);
  const modifiedFiles = [];
  const bundlePerms = getPermissionsForBundle(entityType, bundle);

  if (bundlePerms.length === 0) return modifiedFiles;

  const permsToRemove = new Set(bundlePerms.map(p => p.key));

  for (const roleId of roleIds) {
    const filePath = join(configDir, `user.role.${roleId}.yml`);
    if (!existsSync(filePath)) continue;

    const original = readFileSync(filePath, 'utf8');
    let content = original;

    // Remove permission lines from the permissions array
    for (const perm of permsToRemove) {
      const permRegex = new RegExp(`^[ \\t]*- '${perm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'\\s*\\n`, 'gm');
      content = content.replace(permRegex, '');
    }

    if (content !== original) {
      writeFileSync(filePath, content, 'utf8');
      modifiedFiles.push(`user.role.${roleId}.yml`);
    }
  }

  return modifiedFiles;
}

/**
 * Remove all references to a bundle config from every config file in the directory.
 * Handles dependencies.config entries, entity reference target_bundles, and auto_create_bundle.
 * Skips files that belong to the bundle being deleted (they'll be deleted separately).
 *
 * @param {string} configDir - Path to config directory
 * @param {string} entityType - Entity type of the bundle being deleted
 * @param {string} bundle - Bundle machine name being deleted
 * @returns {string[]} - List of modified file names
 */
export function cleanupBundleDependencies(configDir, entityType, bundle) {
  const bundleConfigName = getBundleConfigName(entityType, bundle);
  const modifiedFiles = [];

  // Prefixes of files that belong to the bundle being deleted (skip these)
  const entityConfig = ENTITY_TYPES[entityType];
  const ownPrefixes = [
    `${entityConfig?.bundlePrefix || ''}${bundle}.`,
    `field.field.${entityType}.${bundle}.`,
    `field.storage.${entityType}.`,
    `core.entity_form_display.${entityType}.${bundle}.`,
    `core.entity_view_display.${entityType}.${bundle}.`,
    `core.base_field_override.${entityType}.${bundle}.`
  ];

  const allFiles = readdirSync(configDir);
  const ymlFiles = allFiles.filter(f => f.endsWith('.yml'));

  const depRegex = new RegExp(
    `^[ \\t]*- ${bundleConfigName.replace(/\./g, '\\.')}\\s*\\n`, 'gm'
  );

  // Entity reference specific patterns (only applied to field.field.* files)
  const targetRegex = new RegExp(
    `^[ \\t]*${bundle}: ${bundle}\\s*\\n`, 'gm'
  );
  const autoCreateRegex = new RegExp(
    `^([ \\t]*auto_create_bundle:) ${bundle}\\s*$`, 'gm'
  );

  for (const file of ymlFiles) {
    // Skip files belonging to the bundle being deleted
    if (ownPrefixes.some(p => file.startsWith(p))) continue;

    const filePath = join(configDir, file);
    const original = readFileSync(filePath, 'utf8');
    let content = original;

    // Remove bundle config from dependencies.config (applies to all config files)
    content = content.replace(depRegex, '');

    // Entity reference cleanup (only for field instance files)
    if (file.startsWith('field.field.')) {
      content = content.replace(targetRegex, '');
      content = content.replace(autoCreateRegex, "$1 ''");
    }

    if (content !== original) {
      writeFileSync(filePath, content, 'utf8');
      modifiedFiles.push(file);
    }
  }

  return modifiedFiles;
}

/**
 * Delete base field override files for a bundle.
 *
 * @param {string} configDir - Path to config directory
 * @param {string} entityType - Entity type
 * @param {string} bundle - Bundle machine name
 * @returns {Promise<string[]>} - List of deleted file names
 */
async function deleteBaseFieldOverrides(configDir, entityType, bundle) {
  const prefix = `core.base_field_override.${entityType}.${bundle}.`;
  const allFiles = readdirSync(configDir);
  const overrideFiles = allFiles.filter(f => f.startsWith(prefix) && f.endsWith('.yml'));
  const deleted = [];

  for (const file of overrideFiles) {
    await rm(join(configDir, file));
    deleted.push(file);
  }

  return deleted;
}

/**
 * Delete all config files for a bundle (bundle config, fields, displays).
 *
 * @param {object} project - Project object
 * @param {string} entityType - Entity type
 * @param {string} bundle - Bundle machine name
 * @param {Set<string>} deletingBundleKeys - Set of bundle keys being deleted
 * @returns {Promise<{deletedFiles: string[], errors: Array}>}
 */
async function deleteBundleFiles(project, entityType, bundle, deletingBundleKeys) {
  const configDir = project.configDirectory;
  const deletedFiles = [];
  const errors = [];
  const allFiles = readdirSync(configDir);

  const entityConfig = ENTITY_TYPES[entityType];
  if (!entityConfig) return { deletedFiles, errors };

  // 1. Delete bundle config file (e.g., node.type.article.yml)
  const bundleConfigFile = `${entityConfig.bundlePrefix}${bundle}.yml`;
  const bundleConfigPath = join(configDir, bundleConfigFile);
  if (existsSync(bundleConfigPath)) {
    try {
      await rm(bundleConfigPath);
      deletedFiles.push(bundleConfigFile);
    } catch (error) {
      errors.push({ kind: 'bundle_config', message: `Failed to delete ${bundleConfigFile}: ${error.message}` });
    }
  }

  // 2. Delete all field instance files for this bundle
  const instancePrefix = `field.field.${entityType}.${bundle}.`;
  const instanceFiles = allFiles.filter(f => f.startsWith(instancePrefix) && f.endsWith('.yml'));

  for (const file of instanceFiles) {
    try {
      await rm(join(configDir, file));
      deletedFiles.push(file);
    } catch (error) {
      errors.push({ kind: 'field_instance', message: `Failed to delete ${file}: ${error.message}` });
    }
  }

  // 3. Delete field storage files that are not used by other bundles
  const storagePrefix = `field.storage.${entityType}.`;
  const bundleData = project.entities?.[entityType]?.[bundle];
  const fieldNames = Object.keys(bundleData?.fields || {});

  for (const fieldName of fieldNames) {
    if (!fieldStorageUsedElsewhere(project, entityType, fieldName, deletingBundleKeys)) {
      const storageFile = getStorageFilename(entityType, fieldName);
      const storagePath = join(configDir, storageFile);
      if (existsSync(storagePath)) {
        try {
          await rm(storagePath);
          deletedFiles.push(storageFile);
        } catch (error) {
          errors.push({ kind: 'field_storage', message: `Failed to delete ${storageFile}: ${error.message}` });
        }
      }
    }
  }

  // 4. Delete form and view display configs
  const formPattern = `core.entity_form_display.${entityType}.${bundle}.`;
  const viewPattern = `core.entity_view_display.${entityType}.${bundle}.`;
  const displayFiles = allFiles.filter(f =>
    (f.startsWith(formPattern) || f.startsWith(viewPattern)) && f.endsWith('.yml')
  );

  for (const file of displayFiles) {
    try {
      await rm(join(configDir, file));
      deletedFiles.push(file);
    } catch (error) {
      errors.push({ kind: 'display_config', message: `Failed to delete ${file}: ${error.message}` });
    }
  }

  // 5. Delete base field overrides (e.g., core.base_field_override.node.article.promote.yml)
  try {
    const overrides = await deleteBaseFieldOverrides(configDir, entityType, bundle);
    deletedFiles.push(...overrides);
  } catch (error) {
    errors.push({ kind: 'base_field_override', message: `Base field override cleanup failed: ${error.message}` });
  }

  // 6. Clean up all config files that depend on the bundle config
  //    (roles, views, workflows, entity reference fields, etc.)
  try {
    cleanupBundleDependencies(configDir, entityType, bundle);
  } catch (error) {
    errors.push({ kind: 'dependency_cleanup', message: `Bundle dependency cleanup failed: ${error.message}` });
  }

  // 7. Clean up role permissions for this bundle
  try {
    await cleanupRolePermissions(configDir, entityType, bundle);
  } catch (error) {
    errors.push({ kind: 'role_cleanup', message: `Role permission cleanup failed: ${error.message}` });
  }

  return { deletedFiles, errors };
}

/**
 * Execute deletions for full sync.
 *
 * @param {object} project - Project object
 * @param {Array} toDelete - Items to delete from buildSyncDiff
 * @returns {Promise<{deleted: Array, errors: Array}>}
 */
export async function executeDeletions(project, toDelete) {
  const deleted = [];
  const errors = [];
  const configDir = project.configDirectory;

  const bundleDeletions = toDelete.filter(d => d.kind === 'bundle');
  const fieldDeletions = toDelete.filter(d => d.kind === 'field');

  // Build set of bundle keys being deleted (for field storage cleanup)
  const deletingBundleKeys = new Set(
    bundleDeletions.map(d => `${d.entityType}:${d.bundle}`)
  );

  // Delete bundles first (includes all their fields, displays, and role permissions)
  for (const item of bundleDeletions) {
    try {
      const result = await deleteBundleFiles(project, item.entityType, item.bundle, deletingBundleKeys);
      deleted.push({ ...item, files: result.deletedFiles });
      errors.push(...result.errors);
    } catch (error) {
      errors.push({ ...item, message: error.message });
    }
  }

  // Group field deletions by bundle for display config cleanup
  const fieldsByBundle = new Map();

  for (const item of fieldDeletions) {
    // Skip fields on bundles that are already being deleted
    if (deletingBundleKeys.has(`${item.entityType}:${item.bundle}`)) continue;

    try {
      // Delete field instance file
      const instanceFile = getInstanceFilename(item.entityType, item.bundle, item.fieldName);
      const instancePath = join(configDir, instanceFile);

      if (existsSync(instancePath)) {
        await rm(instancePath);
      }

      // Check if we should also delete storage
      if (!fieldStorageUsedElsewhere(project, item.entityType, item.fieldName, deletingBundleKeys)) {
        const storageFile = getStorageFilename(item.entityType, item.fieldName);
        const storagePath = join(configDir, storageFile);
        if (existsSync(storagePath)) {
          await rm(storagePath);
        }
      }

      // Track for display config cleanup
      const bundleKey = `${item.entityType}:${item.bundle}`;
      if (!fieldsByBundle.has(bundleKey)) {
        fieldsByBundle.set(bundleKey, { entityType: item.entityType, bundle: item.bundle, fields: [] });
      }
      fieldsByBundle.get(bundleKey).fields.push(item.fieldName);

      deleted.push(item);
    } catch (error) {
      errors.push({ ...item, message: error.message });
    }
  }

  // Clean up display configs for each affected bundle (field deletions only)
  for (const { entityType, bundle, fields } of fieldsByBundle.values()) {
    try {
      cleanupDisplayConfigs(configDir, entityType, bundle, fields);
    } catch (error) {
      errors.push({
        kind: 'display_cleanup',
        entityType,
        bundle,
        message: `Display config cleanup failed: ${error.message}`
      });
    }
  }

  return { deleted, errors };
}

/**
 * Execute creations using the existing import pipeline.
 *
 * @param {object} project - Project object
 * @param {object} reportData - Report data structure
 * @param {Array} toCreate - Items to create from buildSyncDiff
 * @returns {Promise<{created: Array, errors: Array}>}
 */
export async function executeCreations(project, reportData, toCreate) {
  const created = [];
  const errors = [];

  for (const item of toCreate) {
    try {
      if (item.kind === 'bundle') {
        const result = await createBundle(project, item.entityType, {
          label: item.label,
          machineName: item.bundle,
          description: item.description
        });
        created.push({ ...item, files: result.createdFiles });
      } else if (item.kind === 'field') {
        const settings = translateFieldSettings(item.fieldType, item.settings);
        const result = await createField(project, item.entityType, [item.bundle], {
          fieldName: item.fieldName,
          fieldType: item.fieldType,
          label: item.label,
          description: item.description,
          required: item.required,
          cardinality: item.cardinality,
          settings
        });
        created.push({ ...item, files: result.createdFiles });
      }
    } catch (error) {
      errors.push({ ...item, message: error.message });
    }
  }

  return { created, errors };
}

/**
 * Full spreadsheet sync: parse, diff, delete, create.
 *
 * @param {object} project - Project object
 * @param {string} filePath - Path to .xlsx file
 * @returns {Promise<object>} - { parseErrors, diff, deletionResult, creationResult }
 */
export async function importSpreadsheet(project, filePath) {
  // Read and parse
  const sheets = await readSpreadsheet(filePath);
  const { data, errors: parseErrors } = parseSpreadsheet(sheets);

  if (!data) {
    return { parseErrors, diff: null, deletionResult: null, creationResult: null };
  }

  // Validate
  const validation = validateReportData(data);
  if (validation !== true) {
    parseErrors.push(validation);
    return { parseErrors, diff: null, deletionResult: null, creationResult: null };
  }

  // Build diff
  const diff = buildSyncDiff(project, data);

  return { parseErrors, diff, data };
}

/**
 * Export project to xlsx spreadsheet.
 *
 * @param {object} project - Project object
 * @param {string} filePath - Output file path
 * @returns {Promise<void>}
 */
export async function exportSpreadsheet(project, filePath) {
  await writeSpreadsheet(filePath, project);
}
