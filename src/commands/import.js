/**
 * Import commands
 * Import content model from JSON project report.
 */

import { bundleExists } from './create.js';
import {
  fieldStorageExists,
  getExistingFieldType
} from '../generators/fieldGenerator.js';
import { createBundle, createField } from './create.js';

/**
 * Validate report data structure
 * @param {*} data - Parsed JSON data
 * @returns {true|string} - true if valid, error string if invalid
 */
export function validateReportData(data) {
  if (!data || typeof data !== 'object') {
    return 'Report data must be an object';
  }

  if (!Array.isArray(data.entityTypes)) {
    return 'Report data must contain an "entityTypes" array';
  }

  for (let i = 0; i < data.entityTypes.length; i++) {
    const et = data.entityTypes[i];
    if (!et.entityType) {
      return `entityTypes[${i}] is missing "entityType"`;
    }
    if (!Array.isArray(et.bundles)) {
      return `entityTypes[${i}] is missing "bundles" array`;
    }
  }

  return true;
}

/**
 * Translate raw YAML field settings (snake_case) to camelCase options for createField
 * @param {string} fieldType - Field type
 * @param {object} rawSettings - Raw settings from JSON report
 * @returns {object} - Translated settings for createField
 */
export function translateFieldSettings(fieldType, rawSettings) {
  if (!rawSettings || typeof rawSettings !== 'object') {
    return {};
  }

  switch (fieldType) {
    case 'string':
      return pickDefined({
        maxLength: rawSettings.max_length
      });

    case 'list_string':
    case 'list_integer':
      return pickDefined({
        allowedValues: rawSettings.allowed_values
      });

    case 'datetime':
    case 'daterange':
      return pickDefined({
        datetimeType: rawSettings.datetime_type
      });

    case 'entity_reference': {
      const result = {};
      if (rawSettings.target_type !== undefined) {
        result.targetType = rawSettings.target_type;
      }
      const bundles = rawSettings.handler_settings?.target_bundles;
      if (bundles && typeof bundles === 'object') {
        result.targetBundles = Object.keys(bundles);
      }
      return result;
    }

    case 'entity_reference_revisions': {
      const result = {};
      const bundles = rawSettings.handler_settings?.target_bundles;
      if (bundles && typeof bundles === 'object') {
        result.targetBundles = Object.keys(bundles);
      }
      return result;
    }

    case 'link': {
      const result = {};
      if (rawSettings.link_type !== undefined) {
        result.allowExternal = rawSettings.link_type === 17;
      }
      if (rawSettings.title !== undefined) {
        const titleMap = { 0: 'disabled', 1: 'optional', 2: 'required' };
        result.titleOption = titleMap[rawSettings.title];
      }
      return result;
    }

    case 'image':
      return pickDefined({
        fileExtensions: rawSettings.file_extensions,
        altRequired: rawSettings.alt_field_required,
        fileDirectory: rawSettings.file_directory,
        maxFileSize: rawSettings.max_filesize
      });

    case 'file':
      return pickDefined({
        fileExtensions: rawSettings.file_extensions,
        fileDirectory: rawSettings.file_directory,
        maxFileSize: rawSettings.max_filesize
      });

    default:
      return {};
  }
}

/**
 * Remove undefined values from an object
 * @param {object} obj - Object to clean
 * @returns {object} - Object without undefined values
 */
function pickDefined(obj) {
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Audit import data against existing project
 * @param {object} project - Project object
 * @param {object} reportData - Validated report data
 * @returns {object} - { toCreate[], reused[], blocked[], hasBlockers }
 */
export function auditImport(project, reportData) {
  const toCreate = [];
  const reused = [];
  const blocked = [];

  for (const entityTypeData of reportData.entityTypes) {
    const entityType = entityTypeData.entityType;

    for (const bundle of entityTypeData.bundles) {
      const bundleId = bundle.bundle;
      const bundleLabel = bundle.label || bundleId;

      // Check bundle collision
      if (bundleExists(project, entityType, bundleId)) {
        blocked.push({
          type: 'bundle_exists',
          entityType,
          bundle: bundleId,
          label: bundleLabel,
          message: `Bundle "${bundleId}" already exists for ${entityType}`
        });
        continue;
      }

      // Bundle can be created — add it
      toCreate.push({
        kind: 'bundle',
        entityType,
        bundle: bundleId,
        label: bundleLabel,
        description: bundle.description || ''
      });

      // Check each field in this bundle
      for (const field of bundle.fields || []) {
        const fieldName = field.name;
        const fieldType = field.type;

        if (fieldStorageExists(project, entityType, fieldName)) {
          const existingType = getExistingFieldType(project, entityType, fieldName);
          if (existingType === fieldType) {
            // Storage matches — can reuse
            reused.push({
              entityType,
              bundle: bundleId,
              fieldName,
              fieldType,
              label: field.label || fieldName
            });
          } else {
            // Type mismatch — blocker
            blocked.push({
              type: 'field_type_mismatch',
              entityType,
              bundle: bundleId,
              fieldName,
              existingType,
              requestedType: fieldType,
              message: `Field "${fieldName}" exists as "${existingType}" but report has "${fieldType}"`
            });
          }
        } else {
          // New field — create storage + instance
          toCreate.push({
            kind: 'field',
            entityType,
            bundle: bundleId,
            fieldName,
            fieldType,
            label: field.label || fieldName,
            description: field.description || '',
            required: !!field.required,
            cardinality: field.cardinality || 1,
            settings: field.settings || {}
          });
        }
      }
    }
  }

  return {
    toCreate,
    reused,
    blocked,
    hasBlockers: blocked.length > 0
  };
}

/**
 * Import content model into a project
 * @param {object} project - Project object
 * @param {object} reportData - Validated report data
 * @param {object} auditResult - Result from auditImport
 * @returns {Promise<object>} - { created[], errors[] }
 */
export async function importContentModel(project, reportData, auditResult) {
  const created = [];
  const errors = [];

  for (const item of auditResult.toCreate) {
    try {
      if (item.kind === 'bundle') {
        const result = await createBundle(project, item.entityType, {
          label: item.label,
          machineName: item.bundle,
          description: item.description
        });
        created.push({
          kind: 'bundle',
          entityType: item.entityType,
          bundle: item.bundle,
          label: item.label,
          files: result.createdFiles
        });
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
        created.push({
          kind: 'field',
          entityType: item.entityType,
          bundle: item.bundle,
          fieldName: item.fieldName,
          fieldType: item.fieldType,
          label: item.label,
          files: result.createdFiles,
          storageCreated: result.storageCreated
        });
      }
    } catch (error) {
      errors.push({
        kind: item.kind,
        entityType: item.entityType,
        bundle: item.bundle,
        fieldName: item.fieldName,
        message: error.message
      });
    }
  }

  // Handle reused fields (create instance only)
  for (const reuse of auditResult.reused) {
    try {
      // Find the field data from the report to get settings
      const entityTypeData = reportData.entityTypes.find(et => et.entityType === reuse.entityType);
      const bundleData = entityTypeData?.bundles.find(b => b.bundle === reuse.bundle);
      const fieldData = bundleData?.fields.find(f => f.name === reuse.fieldName);

      const settings = fieldData ? translateFieldSettings(reuse.fieldType, fieldData.settings) : {};
      const result = await createField(project, reuse.entityType, [reuse.bundle], {
        fieldName: reuse.fieldName,
        fieldType: reuse.fieldType,
        label: fieldData?.label || reuse.label,
        description: fieldData?.description || '',
        required: fieldData?.required || false,
        cardinality: fieldData?.cardinality || 1,
        settings
      });
      created.push({
        kind: 'field',
        entityType: reuse.entityType,
        bundle: reuse.bundle,
        fieldName: reuse.fieldName,
        fieldType: reuse.fieldType,
        label: reuse.label,
        files: result.createdFiles,
        storageCreated: false
      });
    } catch (error) {
      errors.push({
        kind: 'field',
        entityType: reuse.entityType,
        bundle: reuse.bundle,
        fieldName: reuse.fieldName,
        message: error.message
      });
    }
  }

  return { created, errors };
}
