/**
 * Spreadsheet Generator
 * Generates ExcelJS workbook data from project entities for export.
 */

import { ENTITY_TYPES } from '../constants/entityTypes.js';
import { FIELD_GROUP_FORMATS } from './formDisplayGenerator.js';

const VALID_ENTITY_TYPES = Object.keys(ENTITY_TYPES);

const FIELD_TYPES = [
  'string', 'string_long', 'text_long', 'boolean', 'integer',
  'list_string', 'list_integer', 'datetime', 'daterange',
  'link', 'image', 'file', 'entity_reference',
  'entity_reference_revisions', 'webform', 'email'
];

const DATETIME_TYPES = ['date', 'datetime'];
const LINK_TYPES = ['internal', 'external', 'both'];
const TITLE_OPTIONS = ['disabled', 'optional', 'required'];
const CARDINALITY_OPTIONS = ['1', '-1', '2', '3', '4', '5'];
const YES_NO = ['Yes', 'No'];
const ITEM_TYPES = ['group', 'field', 'hidden'];
const GROUP_FORMAT_TYPES = FIELD_GROUP_FORMATS.map(f => f.value);
const COMPONENT_STATUSES = ['stable', 'experimental', 'deprecated', 'obsolete'];
const PROP_SLOT_TYPES = ['prop', 'slot'];
const PROP_DATA_TYPES = ['string', 'number', 'integer', 'boolean', 'array', 'object'];

/**
 * Header style for worksheet headers
 */
const HEADER_STYLE = {
  font: { bold: true, color: { argb: 'FFFFFFFF' } },
  fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4472C4' } },
  alignment: { vertical: 'middle', horizontal: 'left' }
};

/**
 * Shared field highlight style
 */
const SHARED_FIELD_FILL = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFFFF2CC' }
};

/**
 * Style header row on a worksheet.
 * @param {object} worksheet - ExcelJS worksheet
 */
function styleHeaders(worksheet) {
  const headerRow = worksheet.getRow(1);
  headerRow.eachCell((cell) => {
    cell.font = HEADER_STYLE.font;
    cell.fill = HEADER_STYLE.fill;
    cell.alignment = HEADER_STYLE.alignment;
  });
  headerRow.height = 24;
}

/**
 * Add data validation dropdown to a column range.
 * @param {object} worksheet - ExcelJS worksheet
 * @param {string} col - Column letter (e.g. 'A')
 * @param {string[]} values - Allowed values
 * @param {number} startRow - First data row (default 2)
 * @param {number} endRow - Last row (default 9999)
 */
function addDropdown(worksheet, col, values, startRow = 2, endRow = 9999) {
  const formula = `"${values.join(',')}"`;
  worksheet.dataValidations.add(`${col}${startRow}:${col}${endRow}`, {
    type: 'list',
    allowBlank: true,
    formulae: [formula],
    showErrorMessage: true,
    errorTitle: 'Invalid value',
    error: `Must be one of: ${values.join(', ')}`
  });
}

/**
 * Format allowed values array to pipe-delimited string.
 * @param {Array<{value: string, label: string}>} values
 * @returns {string}
 */
function formatAllowedValues(values) {
  if (!Array.isArray(values)) return '';
  return values.map(v => {
    if (v.value === v.label) return v.value;
    return `${v.value}|${v.label}`;
  }).join(', ');
}

/**
 * Map link_type number to string.
 * @param {number} linkType
 * @returns {string}
 */
function formatLinkType(linkType) {
  if (linkType === 16) return 'external';
  if (linkType === 1) return 'internal';
  return 'both';
}

/**
 * Map title number to string.
 * @param {number} title
 * @returns {string}
 */
function formatTitleOption(title) {
  if (title === 0) return 'disabled';
  if (title === 2) return 'required';
  return 'optional';
}

/**
 * Serialize format settings object to a semicolon-delimited string.
 * Skips empty string values and 'classes'/'id' if empty.
 * @param {object} settings - Format settings object
 * @returns {string}
 */
export function serializeFormatSettings(settings) {
  if (!settings || typeof settings !== 'object') return '';
  const parts = [];
  for (const [key, value] of Object.entries(settings)) {
    if (value === '' || value === null || value === undefined) continue;
    parts.push(`${key}=${value}`);
  }
  return parts.join('; ');
}

/**
 * Parse a serialized format settings string back to an object.
 * @param {string} str - Semicolon-delimited key=value string
 * @returns {object}
 */
export function parseFormatSettings(str) {
  if (!str || typeof str !== 'string' || str.trim() === '') return {};
  const result = {};
  for (const part of str.split(';')) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.substring(0, eqIndex).trim();
    let value = trimmed.substring(eqIndex + 1).trim();
    // Parse booleans and numbers
    if (value === 'true') value = true;
    else if (value === 'false') value = false;
    else if (/^\d+$/.test(value)) value = parseInt(value, 10);
    if (key) result[key] = value;
  }
  return result;
}

/**
 * Generate workbook structure from project data.
 * Returns an object describing sheets and their data, which the IO layer
 * uses to build the actual ExcelJS workbook.
 *
 * @param {object} project - Project object with entities
 * @param {object} [options] - Optional pre-loaded data
 * @param {object} [options.formDisplays] - Pre-loaded form displays keyed by "entityType:bundle"
 * @param {object} [options.components] - Pre-loaded component details keyed by machine name
 * @returns {object} - Workbook descriptor
 */
export function generateSpreadsheetData(project, options = {}) {
  const entities = project.entities || {};
  const bundles = [];
  const fields = [];
  const stringSettings = [];
  const listSettings = [];
  const datetimeSettings = [];
  const entityRefSettings = [];
  const entityRefTargets = [];
  const linkSettings = [];
  const imageSettings = [];
  const fileSettings = [];

  // Track field names for shared field detection
  const fieldUsageCount = new Map();

  // First pass: count field usage
  for (const entityType of VALID_ENTITY_TYPES) {
    const typeBundles = entities[entityType] || {};
    for (const bundleData of Object.values(typeBundles)) {
      for (const fieldName of Object.keys(bundleData.fields || {})) {
        const key = `${entityType}:${fieldName}`;
        fieldUsageCount.set(key, (fieldUsageCount.get(key) || 0) + 1);
      }
    }
  }

  // Second pass: build all sheet data
  for (const entityType of VALID_ENTITY_TYPES) {
    const typeBundles = entities[entityType] || {};

    for (const [bundleId, bundleData] of Object.entries(typeBundles)) {
      bundles.push({
        'Entity Type': entityType,
        'Machine Name': bundleId,
        'Label': bundleData.label || bundleId,
        'Description': bundleData.description || ''
      });

      for (const [fieldName, fieldData] of Object.entries(bundleData.fields || {})) {
        const isShared = (fieldUsageCount.get(`${entityType}:${fieldName}`) || 0) > 1;

        fields.push({
          'Entity Type': entityType,
          'Bundle': bundleId,
          'Field Name': fieldName,
          'Label': fieldData.label || fieldName,
          'Field Type': fieldData.type,
          'Required': fieldData.required ? 'Yes' : 'No',
          'Cardinality': fieldData.cardinality || 1,
          'Description': fieldData.description || '',
          _shared: isShared
        });

        const settings = fieldData.settings || {};

        // Extract type-specific settings
        switch (fieldData.type) {
          case 'string':
            if (settings.max_length) {
              stringSettings.push({
                'Field Name': fieldName,
                'Max Length': settings.max_length
              });
            }
            break;

          case 'list_string':
          case 'list_integer':
            if (settings.allowed_values) {
              listSettings.push({
                'Field Name': fieldName,
                'Allowed Values': formatAllowedValues(settings.allowed_values)
              });
            }
            break;

          case 'datetime':
          case 'daterange':
            if (settings.datetime_type) {
              datetimeSettings.push({
                'Field Name': fieldName,
                'DateTime Type': settings.datetime_type
              });
            }
            break;

          case 'entity_reference': {
            const targetType = settings.target_type ||
              (settings.handler ? settings.handler.split(':')[1] : 'node');
            entityRefSettings.push({
              'Field Name': fieldName,
              'Target Type': targetType
            });
            const refBundles = settings.handler_settings?.target_bundles;
            if (refBundles) {
              for (const tb of Object.keys(refBundles)) {
                entityRefTargets.push({
                  'Field Name': fieldName,
                  'Target Bundle': tb
                });
              }
            }
            break;
          }

          case 'entity_reference_revisions': {
            const revBundles = settings.handler_settings?.target_bundles;
            if (revBundles) {
              for (const tb of Object.keys(revBundles)) {
                entityRefTargets.push({
                  'Field Name': fieldName,
                  'Target Bundle': tb
                });
              }
            }
            break;
          }

          case 'link':
            if (settings.link_type !== undefined || settings.title !== undefined) {
              linkSettings.push({
                'Field Name': fieldName,
                'Link Type': formatLinkType(settings.link_type),
                'Title Option': formatTitleOption(settings.title)
              });
            }
            break;

          case 'image':
            imageSettings.push({
              'Field Name': fieldName,
              'File Extensions': settings.file_extensions || '',
              'Alt Required': settings.alt_field_required !== false ? 'Yes' : 'No',
              'File Directory': settings.file_directory || '',
              'Max File Size': settings.max_filesize || '',
              'Max Resolution': settings.max_resolution || ''
            });
            break;

          case 'file':
            fileSettings.push({
              'Field Name': fieldName,
              'File Extensions': settings.file_extensions || '',
              'File Directory': settings.file_directory || '',
              'Max File Size': settings.max_filesize || ''
            });
            break;
        }
      }
    }
  }

  // Build form display items from pre-loaded data
  const formDisplayItems = [];
  const formDisplays = options.formDisplays || {};

  for (const entityType of VALID_ENTITY_TYPES) {
    const typeBundles = entities[entityType] || {};
    for (const bundleId of Object.keys(typeBundles)) {
      const key = `${entityType}:${bundleId}`;
      const fd = formDisplays[key];
      if (!fd) continue;

      // Add groups
      for (const group of fd.groups || []) {
        formDisplayItems.push({
          'Entity Type': entityType,
          'Bundle': bundleId,
          'Item Name': group.name,
          'Item Type': 'group',
          'Label': group.label || '',
          'Parent Group': group.parentName || '',
          'Weight': group.weight ?? 0,
          'Widget/Format Type': group.formatType || 'fieldset',
          'Format Settings': serializeFormatSettings(group.formatSettings)
        });
      }

      // Add fields
      for (const field of fd.fields || []) {
        const parentGroup = fd.groups
          ? (fd.groups.find(g => (g.children || []).includes(field.name))?.name || '')
          : '';
        formDisplayItems.push({
          'Entity Type': entityType,
          'Bundle': bundleId,
          'Item Name': field.name,
          'Item Type': 'field',
          'Label': '',
          'Parent Group': parentGroup,
          'Weight': field.weight ?? 0,
          'Widget/Format Type': field.type || '',
          'Format Settings': ''
        });
      }

      // Add hidden fields
      for (const hiddenName of fd.hidden || []) {
        formDisplayItems.push({
          'Entity Type': entityType,
          'Bundle': bundleId,
          'Item Name': hiddenName,
          'Item Type': 'hidden',
          'Label': '',
          'Parent Group': '',
          'Weight': 0,
          'Widget/Format Type': '',
          'Format Settings': ''
        });
      }
    }
  }

  // Build components data from pre-loaded data
  const componentItems = [];
  const componentPropsSlots = [];
  const components = options.components || {};

  for (const [machineName, comp] of Object.entries(components)) {
    componentItems.push({
      'Machine Name': machineName,
      'Name': comp.name || machineName,
      'Description': comp.description || '',
      'Status': comp.status || '',
      'Replaces': comp.replaces || ''
    });

    // Props
    const props = comp.props;
    if (props && props.properties) {
      const requiredSet = new Set(props.required || []);
      for (const [propName, propDef] of Object.entries(props.properties)) {
        componentPropsSlots.push({
          'Component': machineName,
          'Type': 'prop',
          'Machine Name': propName,
          'Title': propDef.title || '',
          'Description': propDef.description || '',
          'Data Type': propDef.type || '',
          'Required': requiredSet.has(propName) ? 'Yes' : 'No',
          'Default': propDef.default !== undefined ? String(propDef.default) : '',
          'Enum Values': Array.isArray(propDef.enum) ? propDef.enum.join(', ') : ''
        });
      }
    }

    // Slots
    if (comp.slots) {
      for (const [slotName, slotDef] of Object.entries(comp.slots)) {
        componentPropsSlots.push({
          'Component': machineName,
          'Type': 'slot',
          'Machine Name': slotName,
          'Title': slotDef?.title || '',
          'Description': slotDef?.description || '',
          'Data Type': '',
          'Required': '',
          'Default': '',
          'Enum Values': ''
        });
      }
    }
  }

  return {
    bundles,
    fields,
    stringSettings,
    listSettings,
    datetimeSettings,
    entityRefSettings,
    entityRefTargets,
    linkSettings,
    imageSettings,
    fileSettings,
    formDisplayItems,
    componentItems,
    componentPropsSlots
  };
}

/**
 * Build an ExcelJS workbook from project data.
 * @param {object} ExcelJS - The ExcelJS module (injected for testability)
 * @param {object} project - Project object with entities
 * @param {object} [options] - Optional pre-loaded data (formDisplays, components)
 * @returns {object} - ExcelJS Workbook instance
 */
export function buildWorkbook(ExcelJS, project, options = {}) {
  const data = generateSpreadsheetData(project, options);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Drupal Content Modeller';
  workbook.created = new Date();

  // 1. Bundles sheet
  const bundlesSheet = workbook.addWorksheet('Bundles');
  bundlesSheet.columns = [
    { header: 'Entity Type', key: 'Entity Type', width: 20 },
    { header: 'Machine Name', key: 'Machine Name', width: 30 },
    { header: 'Label', key: 'Label', width: 30 },
    { header: 'Description', key: 'Description', width: 50 }
  ];
  for (const row of data.bundles) {
    bundlesSheet.addRow(row);
  }
  styleHeaders(bundlesSheet);
  addDropdown(bundlesSheet, 'A', VALID_ENTITY_TYPES);

  // 2. Fields sheet
  const fieldsSheet = workbook.addWorksheet('Fields');
  fieldsSheet.columns = [
    { header: 'Entity Type', key: 'Entity Type', width: 20 },
    { header: 'Bundle', key: 'Bundle', width: 25 },
    { header: 'Field Name', key: 'Field Name', width: 30 },
    { header: 'Label', key: 'Label', width: 25 },
    { header: 'Field Type', key: 'Field Type', width: 28 },
    { header: 'Required', key: 'Required', width: 12 },
    { header: 'Cardinality', key: 'Cardinality', width: 14 },
    { header: 'Description', key: 'Description', width: 40 }
  ];
  for (const row of data.fields) {
    const excelRow = fieldsSheet.addRow({
      'Entity Type': row['Entity Type'],
      'Bundle': row['Bundle'],
      'Field Name': row['Field Name'],
      'Label': row['Label'],
      'Field Type': row['Field Type'],
      'Required': row['Required'],
      'Cardinality': row['Cardinality'],
      'Description': row['Description']
    });
    if (row._shared) {
      excelRow.eachCell(cell => {
        cell.fill = SHARED_FIELD_FILL;
      });
      excelRow.getCell('Field Name').note = 'Shared field — used on multiple bundles';
    }
  }
  styleHeaders(fieldsSheet);
  addDropdown(fieldsSheet, 'A', VALID_ENTITY_TYPES);
  addDropdown(fieldsSheet, 'E', FIELD_TYPES);
  addDropdown(fieldsSheet, 'F', YES_NO);
  addDropdown(fieldsSheet, 'G', CARDINALITY_OPTIONS);

  // 3. String Settings
  const stringSheet = workbook.addWorksheet('String Settings');
  stringSheet.columns = [
    { header: 'Field Name', key: 'Field Name', width: 30 },
    { header: 'Max Length', key: 'Max Length', width: 15 }
  ];
  for (const row of data.stringSettings) stringSheet.addRow(row);
  styleHeaders(stringSheet);

  // 4. List Settings
  const listSheet = workbook.addWorksheet('List Settings');
  listSheet.columns = [
    { header: 'Field Name', key: 'Field Name', width: 30 },
    { header: 'Allowed Values', key: 'Allowed Values', width: 60 }
  ];
  for (const row of data.listSettings) listSheet.addRow(row);
  styleHeaders(listSheet);

  // 5. DateTime Settings
  const dtSheet = workbook.addWorksheet('DateTime Settings');
  dtSheet.columns = [
    { header: 'Field Name', key: 'Field Name', width: 30 },
    { header: 'DateTime Type', key: 'DateTime Type', width: 20 }
  ];
  for (const row of data.datetimeSettings) dtSheet.addRow(row);
  styleHeaders(dtSheet);
  addDropdown(dtSheet, 'B', DATETIME_TYPES);

  // 6. Entity Reference Settings
  const refSheet = workbook.addWorksheet('Entity Reference Settings');
  refSheet.columns = [
    { header: 'Field Name', key: 'Field Name', width: 30 },
    { header: 'Target Type', key: 'Target Type', width: 20 }
  ];
  for (const row of data.entityRefSettings) refSheet.addRow(row);
  styleHeaders(refSheet);
  addDropdown(refSheet, 'B', VALID_ENTITY_TYPES);

  // 7. Entity Reference Targets
  const refTargetsSheet = workbook.addWorksheet('Entity Reference Targets');
  refTargetsSheet.columns = [
    { header: 'Field Name', key: 'Field Name', width: 30 },
    { header: 'Target Bundle', key: 'Target Bundle', width: 30 }
  ];
  for (const row of data.entityRefTargets) refTargetsSheet.addRow(row);
  styleHeaders(refTargetsSheet);

  // 8. Link Settings
  const linkSheet = workbook.addWorksheet('Link Settings');
  linkSheet.columns = [
    { header: 'Field Name', key: 'Field Name', width: 30 },
    { header: 'Link Type', key: 'Link Type', width: 15 },
    { header: 'Title Option', key: 'Title Option', width: 15 }
  ];
  for (const row of data.linkSettings) linkSheet.addRow(row);
  styleHeaders(linkSheet);
  addDropdown(linkSheet, 'B', LINK_TYPES);
  addDropdown(linkSheet, 'C', TITLE_OPTIONS);

  // 9. Image Settings
  const imgSheet = workbook.addWorksheet('Image Settings');
  imgSheet.columns = [
    { header: 'Field Name', key: 'Field Name', width: 30 },
    { header: 'File Extensions', key: 'File Extensions', width: 30 },
    { header: 'Alt Required', key: 'Alt Required', width: 14 },
    { header: 'File Directory', key: 'File Directory', width: 40 },
    { header: 'Max File Size', key: 'Max File Size', width: 15 },
    { header: 'Max Resolution', key: 'Max Resolution', width: 15 }
  ];
  for (const row of data.imageSettings) imgSheet.addRow(row);
  styleHeaders(imgSheet);
  addDropdown(imgSheet, 'C', YES_NO);

  // 10. File Settings
  const fileSheet = workbook.addWorksheet('File Settings');
  fileSheet.columns = [
    { header: 'Field Name', key: 'Field Name', width: 30 },
    { header: 'File Extensions', key: 'File Extensions', width: 30 },
    { header: 'File Directory', key: 'File Directory', width: 40 },
    { header: 'Max File Size', key: 'Max File Size', width: 15 }
  ];
  for (const row of data.fileSettings) fileSheet.addRow(row);
  styleHeaders(fileSheet);

  // 11. Form Display sheet
  const formDisplaySheet = workbook.addWorksheet('Form Display');
  formDisplaySheet.columns = [
    { header: 'Entity Type', key: 'Entity Type', width: 20 },
    { header: 'Bundle', key: 'Bundle', width: 25 },
    { header: 'Item Name', key: 'Item Name', width: 30 },
    { header: 'Item Type', key: 'Item Type', width: 12 },
    { header: 'Label', key: 'Label', width: 25 },
    { header: 'Parent Group', key: 'Parent Group', width: 25 },
    { header: 'Weight', key: 'Weight', width: 10 },
    { header: 'Widget/Format Type', key: 'Widget/Format Type', width: 35 },
    { header: 'Format Settings', key: 'Format Settings', width: 50 }
  ];
  for (const row of data.formDisplayItems) {
    formDisplaySheet.addRow(row);
  }
  styleHeaders(formDisplaySheet);
  addDropdown(formDisplaySheet, 'A', VALID_ENTITY_TYPES);
  addDropdown(formDisplaySheet, 'D', ITEM_TYPES);

  // 12. Components sheet
  const componentsSheet = workbook.addWorksheet('Components');
  componentsSheet.columns = [
    { header: 'Machine Name', key: 'Machine Name', width: 30 },
    { header: 'Name', key: 'Name', width: 30 },
    { header: 'Description', key: 'Description', width: 50 },
    { header: 'Status', key: 'Status', width: 15 },
    { header: 'Replaces', key: 'Replaces', width: 30 }
  ];
  for (const row of data.componentItems) {
    componentsSheet.addRow(row);
  }
  styleHeaders(componentsSheet);
  addDropdown(componentsSheet, 'D', COMPONENT_STATUSES);

  // 13. Component Props & Slots sheet
  const propsSheet = workbook.addWorksheet('Component Props & Slots');
  propsSheet.columns = [
    { header: 'Component', key: 'Component', width: 25 },
    { header: 'Type', key: 'Type', width: 10 },
    { header: 'Machine Name', key: 'Machine Name', width: 25 },
    { header: 'Title', key: 'Title', width: 25 },
    { header: 'Description', key: 'Description', width: 40 },
    { header: 'Data Type', key: 'Data Type', width: 15 },
    { header: 'Required', key: 'Required', width: 12 },
    { header: 'Default', key: 'Default', width: 20 },
    { header: 'Enum Values', key: 'Enum Values', width: 40 }
  ];
  for (const row of data.componentPropsSlots) {
    propsSheet.addRow(row);
  }
  styleHeaders(propsSheet);
  addDropdown(propsSheet, 'B', PROP_SLOT_TYPES);
  addDropdown(propsSheet, 'F', PROP_DATA_TYPES);
  addDropdown(propsSheet, 'G', YES_NO);

  // 14. Data sheet (reference lists)
  const dataSheet = workbook.addWorksheet('Data');
  dataSheet.columns = [
    { header: 'Entity Types', key: 'entityTypes', width: 25 },
    { header: 'Field Types', key: 'fieldTypes', width: 30 },
    { header: 'Yes/No', key: 'yesNo', width: 10 },
    { header: 'Cardinality', key: 'cardinality', width: 14 },
    { header: 'DateTime Types', key: 'datetimeTypes', width: 16 },
    { header: 'Link Types', key: 'linkTypes', width: 14 },
    { header: 'Title Options', key: 'titleOptions', width: 14 },
    { header: 'Item Types', key: 'itemTypes', width: 14 },
    { header: 'Group Formats', key: 'groupFormats', width: 18 },
    { header: 'Prop/Slot Types', key: 'propSlotTypes', width: 16 },
    { header: 'Prop Data Types', key: 'propDataTypes', width: 16 },
    { header: 'Component Statuses', key: 'componentStatuses', width: 18 }
  ];

  const maxRows = Math.max(
    VALID_ENTITY_TYPES.length, FIELD_TYPES.length, YES_NO.length,
    CARDINALITY_OPTIONS.length, DATETIME_TYPES.length, LINK_TYPES.length,
    TITLE_OPTIONS.length, ITEM_TYPES.length, GROUP_FORMAT_TYPES.length,
    PROP_SLOT_TYPES.length, PROP_DATA_TYPES.length, COMPONENT_STATUSES.length
  );
  for (let i = 0; i < maxRows; i++) {
    dataSheet.addRow({
      entityTypes: VALID_ENTITY_TYPES[i] || '',
      fieldTypes: FIELD_TYPES[i] || '',
      yesNo: YES_NO[i] || '',
      cardinality: CARDINALITY_OPTIONS[i] || '',
      datetimeTypes: DATETIME_TYPES[i] || '',
      linkTypes: LINK_TYPES[i] || '',
      titleOptions: TITLE_OPTIONS[i] || '',
      itemTypes: ITEM_TYPES[i] || '',
      groupFormats: GROUP_FORMAT_TYPES[i] || '',
      propSlotTypes: PROP_SLOT_TYPES[i] || '',
      propDataTypes: PROP_DATA_TYPES[i] || '',
      componentStatuses: COMPONENT_STATUSES[i] || ''
    });
  }
  styleHeaders(dataSheet);

  // Add a note about Google Sheets
  const noteCell = dataSheet.getCell('A' + (maxRows + 3));
  noteCell.value = 'Note: Data validation dropdowns will not survive import into Google Sheets. Use Excel or LibreOffice for full dropdown support.';
  noteCell.font = { italic: true, color: { argb: 'FF808080' } };

  return workbook;
}
