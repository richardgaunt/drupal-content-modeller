/**
 * Spreadsheet Parser
 * Pure functions to transform spreadsheet workbook data into the report JSON structure
 * used by the existing import pipeline.
 */

import { ENTITY_TYPES } from '../constants/entityTypes.js';

const VALID_ENTITY_TYPES = Object.keys(ENTITY_TYPES);

const VALID_FIELD_TYPES = [
  'string', 'string_long', 'text_long', 'boolean', 'integer',
  'list_string', 'list_integer', 'datetime', 'daterange',
  'link', 'image', 'file', 'entity_reference',
  'entity_reference_revisions', 'webform', 'email'
];

/**
 * Parse allowed values from pipe-delimited string.
 * Format: "key|Label, key2|Label 2"
 * If no pipe, the value is used as both key and label.
 * @param {string} str - Pipe-delimited allowed values string
 * @returns {Array<{value: string, label: string}>}
 */
export function parseAllowedValues(str) {
  if (!str || typeof str !== 'string' || str.trim() === '') return [];

  return str.split(',').map(item => {
    const trimmed = item.trim();
    if (!trimmed) return null;

    const pipeIndex = trimmed.indexOf('|');
    if (pipeIndex === -1) {
      return { value: trimmed, label: trimmed };
    }

    const value = trimmed.substring(0, pipeIndex).trim();
    const label = trimmed.substring(pipeIndex + 1).trim();
    return { value, label: label || value };
  }).filter(Boolean);
}

/**
 * Normalise a cell value: trim strings, handle empty/undefined.
 * @param {*} val - Raw cell value
 * @returns {string}
 */
function cell(val) {
  if (val === undefined || val === null) return '';
  return String(val).trim();
}

/**
 * Parse a boolean-like cell value (Yes/No/true/false/1/0).
 * @param {*} val - Cell value
 * @returns {boolean}
 */
function parseBool(val) {
  const s = cell(val).toLowerCase();
  return s === 'yes' || s === 'true' || s === '1';
}

/**
 * Parse cardinality cell value.
 * @param {*} val - Cell value
 * @returns {number}
 */
function parseCardinality(val) {
  const s = cell(val);
  if (s === '' || s === '1') return 1;
  if (s === '-1' || s.toLowerCase() === 'unlimited') return -1;
  const n = parseInt(s, 10);
  return isNaN(n) ? 1 : n;
}

/**
 * Build a lookup of settings sub-sheet rows keyed by field name.
 * @param {Array<object>} rows - Rows from a settings sub-sheet
 * @returns {Map<string, Array<object>>} - Field name → array of rows
 */
function buildSettingsLookup(rows) {
  const lookup = new Map();
  for (const row of rows || []) {
    const fieldName = cell(row['Field Name']);
    if (!fieldName) continue;
    if (!lookup.has(fieldName)) {
      lookup.set(fieldName, []);
    }
    lookup.get(fieldName).push(row);
  }
  return lookup;
}

/**
 * Resolve settings for a field from the appropriate sub-sheets.
 * @param {string} fieldType - Field type
 * @param {string} fieldName - Field machine name
 * @param {object} settingsSheets - Object with arrays for each settings sheet
 * @returns {object} - Settings in snake_case (matching import pipeline expectations)
 */
export function resolveFieldSettings(fieldType, fieldName, settingsSheets) {
  const settings = {};

  switch (fieldType) {
    case 'string': {
      const rows = settingsSheets.stringSettings?.get(fieldName);
      if (rows && rows.length > 0) {
        const row = rows[0];
        const maxLen = cell(row['Max Length']);
        if (maxLen) settings.max_length = parseInt(maxLen, 10);
      }
      break;
    }

    case 'list_string':
    case 'list_integer': {
      const rows = settingsSheets.listSettings?.get(fieldName);
      if (rows && rows.length > 0) {
        const row = rows[0];
        const rawValues = cell(row['Allowed Values']);
        if (rawValues) {
          settings.allowed_values = parseAllowedValues(rawValues);
        }
      }
      break;
    }

    case 'datetime':
    case 'daterange': {
      const rows = settingsSheets.datetimeSettings?.get(fieldName);
      if (rows && rows.length > 0) {
        const row = rows[0];
        const dtType = cell(row['DateTime Type']);
        if (dtType) settings.datetime_type = dtType;
      }
      break;
    }

    case 'entity_reference': {
      const refRows = settingsSheets.entityRefSettings?.get(fieldName);
      if (refRows && refRows.length > 0) {
        const row = refRows[0];
        const targetType = cell(row['Target Type']);
        if (targetType) settings.target_type = targetType;
      }

      // Target bundles from separate sheet
      const targetRows = settingsSheets.entityRefTargets?.get(fieldName);
      if (targetRows && targetRows.length > 0) {
        const targetBundles = {};
        for (const row of targetRows) {
          const bundle = cell(row['Target Bundle']);
          if (bundle) targetBundles[bundle] = bundle;
        }
        if (Object.keys(targetBundles).length > 0) {
          settings.handler = `default:${settings.target_type || 'node'}`;
          settings.handler_settings = { target_bundles: targetBundles };
        }
      }
      break;
    }

    case 'entity_reference_revisions': {
      // Target bundles from separate sheet (same sheet as entity_reference)
      const targetRows = settingsSheets.entityRefTargets?.get(fieldName);
      if (targetRows && targetRows.length > 0) {
        const targetBundles = {};
        for (const row of targetRows) {
          const bundle = cell(row['Target Bundle']);
          if (bundle) targetBundles[bundle] = bundle;
        }
        if (Object.keys(targetBundles).length > 0) {
          settings.handler = 'default:paragraph';
          settings.handler_settings = { target_bundles: targetBundles };
        }
      }
      break;
    }

    case 'link': {
      const rows = settingsSheets.linkSettings?.get(fieldName);
      if (rows && rows.length > 0) {
        const row = rows[0];
        const linkType = cell(row['Link Type']).toLowerCase();
        if (linkType === 'external') settings.link_type = 16;
        else if (linkType === 'internal') settings.link_type = 1;
        else if (linkType === 'both') settings.link_type = 17;

        const titleOpt = cell(row['Title Option']).toLowerCase();
        if (titleOpt === 'disabled') settings.title = 0;
        else if (titleOpt === 'optional') settings.title = 1;
        else if (titleOpt === 'required') settings.title = 2;
      }
      break;
    }

    case 'image': {
      const rows = settingsSheets.imageSettings?.get(fieldName);
      if (rows && rows.length > 0) {
        const row = rows[0];
        const ext = cell(row['File Extensions']);
        if (ext) settings.file_extensions = ext;
        const altReq = cell(row['Alt Required']);
        if (altReq) settings.alt_field_required = parseBool(altReq);
        const dir = cell(row['File Directory']);
        if (dir) settings.file_directory = dir;
        const maxSize = cell(row['Max File Size']);
        if (maxSize) settings.max_filesize = maxSize;
        const maxRes = cell(row['Max Resolution']);
        if (maxRes) settings.max_resolution = maxRes;
      }
      break;
    }

    case 'file': {
      const rows = settingsSheets.fileSettings?.get(fieldName);
      if (rows && rows.length > 0) {
        const row = rows[0];
        const ext = cell(row['File Extensions']);
        if (ext) settings.file_extensions = ext;
        const dir = cell(row['File Directory']);
        if (dir) settings.file_directory = dir;
        const maxSize = cell(row['Max File Size']);
        if (maxSize) settings.max_filesize = maxSize;
      }
      break;
    }
  }

  return settings;
}

/**
 * Parse spreadsheet data into the report JSON structure.
 * This is the main entry point — a pure function that takes sheet data
 * and returns the {entityTypes} structure.
 *
 * @param {object} sheets - Object keyed by sheet name, each value is an array of row objects
 * @returns {{data: object|null, errors: string[]}}
 */
export function parseSpreadsheet(sheets) {
  const errors = [];

  const bundleRows = sheets['Bundles'] || [];
  const fieldRows = sheets['Fields'] || [];

  if (bundleRows.length === 0) {
    errors.push('Bundles sheet is empty or missing');
    return { data: null, errors };
  }

  // Build settings lookups
  const settingsSheets = {
    stringSettings: buildSettingsLookup(sheets['String Settings']),
    listSettings: buildSettingsLookup(sheets['List Settings']),
    datetimeSettings: buildSettingsLookup(sheets['DateTime Settings']),
    entityRefSettings: buildSettingsLookup(sheets['Entity Reference Settings']),
    entityRefTargets: buildSettingsLookup(sheets['Entity Reference Targets']),
    linkSettings: buildSettingsLookup(sheets['Link Settings']),
    imageSettings: buildSettingsLookup(sheets['Image Settings']),
    fileSettings: buildSettingsLookup(sheets['File Settings']),
  };

  // Parse bundles, grouped by entity type
  const entityTypeMap = new Map(); // entityType → Map<bundleId, bundleObj>

  for (let i = 0; i < bundleRows.length; i++) {
    const row = bundleRows[i];
    const entityType = cell(row['Entity Type']);
    const machineName = cell(row['Machine Name']);
    const label = cell(row['Label']);
    const description = cell(row['Description']);

    if (!entityType) {
      errors.push(`Bundles row ${i + 2}: missing Entity Type`);
      continue;
    }
    if (!VALID_ENTITY_TYPES.includes(entityType)) {
      errors.push(`Bundles row ${i + 2}: invalid Entity Type "${entityType}"`);
      continue;
    }
    if (!machineName) {
      errors.push(`Bundles row ${i + 2}: missing Machine Name`);
      continue;
    }
    if (!label) {
      errors.push(`Bundles row ${i + 2}: missing Label`);
      continue;
    }

    if (!entityTypeMap.has(entityType)) {
      entityTypeMap.set(entityType, new Map());
    }
    entityTypeMap.get(entityType).set(machineName, {
      bundle: machineName,
      label,
      description,
      fields: []
    });
  }

  // Parse fields and attach to bundles
  for (let i = 0; i < fieldRows.length; i++) {
    const row = fieldRows[i];
    const entityType = cell(row['Entity Type']);
    const bundle = cell(row['Bundle']);
    const fieldName = cell(row['Field Name']);
    const label = cell(row['Label']);
    const fieldType = cell(row['Field Type']);
    const required = parseBool(row['Required']);
    const cardinality = parseCardinality(row['Cardinality']);
    const description = cell(row['Description']);

    if (!entityType || !bundle || !fieldName || !fieldType) {
      errors.push(`Fields row ${i + 2}: missing required column (Entity Type, Bundle, Field Name, or Field Type)`);
      continue;
    }

    if (!VALID_FIELD_TYPES.includes(fieldType)) {
      errors.push(`Fields row ${i + 2}: invalid Field Type "${fieldType}"`);
      continue;
    }

    // Check that the bundle exists in our parsed bundles
    const bundleMap = entityTypeMap.get(entityType);
    if (!bundleMap || !bundleMap.has(bundle)) {
      errors.push(`Fields row ${i + 2}: bundle "${entityType}:${bundle}" not found in Bundles sheet`);
      continue;
    }

    const settings = resolveFieldSettings(fieldType, fieldName, settingsSheets);

    bundleMap.get(bundle).fields.push({
      name: fieldName,
      type: fieldType,
      label: label || fieldName,
      description,
      required,
      cardinality,
      settings: Object.keys(settings).length > 0 ? settings : undefined
    });
  }

  // Build the final report structure
  const entityTypes = [];
  for (const [entityType, bundleMap] of entityTypeMap) {
    const bundles = [...bundleMap.values()];
    entityTypes.push({ entityType, bundles });
  }

  return { data: { entityTypes }, errors };
}

/**
 * Identify shared fields — fields that appear on multiple bundles.
 * Returns a Set of field names used more than once.
 * @param {object} reportData - The parsed report data
 * @returns {Set<string>} - Set of shared field names
 */
export function findSharedFields(reportData) {
  const fieldCount = new Map();

  for (const et of reportData.entityTypes) {
    for (const bundle of et.bundles) {
      for (const field of bundle.fields || []) {
        const key = `${et.entityType}:${field.name}`;
        fieldCount.set(key, (fieldCount.get(key) || 0) + 1);
      }
    }
  }

  const shared = new Set();
  for (const [key, count] of fieldCount) {
    if (count > 1) {
      const fieldName = key.split(':')[1];
      shared.add(fieldName);
    }
  }
  return shared;
}
