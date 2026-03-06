/**
 * Bundle and Field Commands
 */

import chalk from 'chalk';
import { loadProject } from '../../commands/project.js';
import { createBundle, createField, updateField } from '../../commands/create.js';
import {
  groupBundlesByEntityType,
  getFieldsForEntityType,
  getFieldsForBundle,
  findEntityReferenceFieldsTargeting
} from '../../commands/list.js';
import { ENTITY_PREFIXES } from '../../generators/fieldGenerator.js';
import {
  output,
  handleError,
  logSuccess,
  isValidEntityType,
  isValidFieldType,
  VALID_ENTITY_TYPES,
  VALID_SOURCE_TYPES,
  VALID_FIELD_TYPES,
  autoSyncProject,
  runSyncIfRequested
} from '../cliUtils.js';

/**
 * Parse allowed values from CLI format
 * @param {string} value - Comma-separated key|label pairs
 * @returns {object[]} - Array of {value, label} objects
 */
function parseAllowedValues(value) {
  if (!value) return [];

  return value.split(',').map(pair => {
    const [key, label] = pair.split('|');
    return { value: key.trim(), label: (label || key).trim() };
  });
}

/**
 * Create a new bundle
 */
export async function cmdBundleCreate(options) {
  try {
    if (!options.project) {
      throw new Error('--project is required');
    }
    if (!options.entityType) {
      throw new Error('--entity-type is required');
    }
    if (!isValidEntityType(options.entityType)) {
      throw new Error(`Invalid entity type. Must be one of: ${VALID_ENTITY_TYPES.join(', ')}`);
    }
    if (!options.label) {
      throw new Error('--label is required');
    }
    if (options.entityType === 'media' && !options.sourceType) {
      throw new Error('--source-type is required for media entity type');
    }
    if (options.sourceType && !VALID_SOURCE_TYPES.includes(options.sourceType)) {
      throw new Error(`Invalid source type. Must be one of: ${VALID_SOURCE_TYPES.join(', ')}`);
    }

    const project = await loadProject(options.project);

    const machineName = options.machineName;

    const bundleOptions = {
      label: options.label,
      machineName,
      description: options.description || '',
      sourceType: options.sourceType
    };

    const result = await createBundle(project, options.entityType, bundleOptions);
    logSuccess(options.project);

    if (options.json) {
      output(result, true);
    } else {
      console.log(chalk.green(`Bundle "${result.label}" created successfully!`));
      console.log(chalk.cyan('Created files:'));
      for (const file of result.createdFiles) {
        console.log(`  - ${file}`);
      }
    }

    await runSyncIfRequested(project, options);
  } catch (error) {
    handleError(error);
  }
}

/**
 * List bundles in a project
 */
export async function cmdBundleList(options) {
  try {
    if (!options.project) {
      throw new Error('--project is required');
    }
    if (options.entityType && !isValidEntityType(options.entityType)) {
      throw new Error(`Invalid entity type. Must be one of: ${VALID_ENTITY_TYPES.join(', ')}`);
    }

    const project = await loadProject(options.project);
    await autoSyncProject(project);

    if (!project.entities) {
      throw new Error('Project has not been synced. Run "dcm project sync" first.');
    }

    const groups = groupBundlesByEntityType(project.entities);

    if (options.json) {
      if (options.entityType) {
        output(groups[options.entityType] || { bundles: [] }, true);
      } else {
        output(groups, true);
      }
    } else {
      const entityTypes = options.entityType ? [options.entityType] : Object.keys(groups);

      if (entityTypes.length === 0) {
        console.log(chalk.yellow('No bundles found.'));
        return;
      }

      for (const et of entityTypes) {
        const group = groups[et];
        if (!group) continue;

        console.log();
        console.log(chalk.cyan(`${group.label} (${group.bundles.length})`));
        for (const bundle of group.bundles) {
          console.log(`  ${bundle.label} (${bundle.id}) - ${bundle.fieldCount} fields`);
        }
      }
      console.log();
    }
  } catch (error) {
    handleError(error);
  }
}

/**
 * Show field name prefixes per entity type
 */
export async function cmdFieldPrefixes(options) {
  try {
    if (options.json) {
      output(ENTITY_PREFIXES, true);
    } else {
      console.log();
      console.log(chalk.cyan('Field Name Prefixes:'));
      console.log();
      for (const [entityType, prefix] of Object.entries(ENTITY_PREFIXES)) {
        console.log(`  ${entityType.padEnd(20)}${prefix}`);
      }
      console.log();
    }
  } catch (error) {
    handleError(error);
  }
}

/**
 * List available field types
 */
export async function cmdFieldTypes(options) {
  try {
    const fieldTypes = VALID_FIELD_TYPES.map(type => {
      const descriptions = {
        string: 'Plain text (single line)',
        string_long: 'Plain text (multi-line)',
        text_long: 'Formatted text (HTML)',
        boolean: 'True/false',
        integer: 'Whole number',
        list_string: 'Select list (text keys)',
        list_integer: 'Select list (integer keys)',
        datetime: 'Date/time',
        daterange: 'Date range',
        link: 'URL/link',
        image: 'Image file',
        file: 'File upload',
        entity_reference: 'Reference to another entity',
        entity_reference_revisions: 'Paragraph reference',
        webform: 'Webform reference',
        email: 'Email address'
      };
      return { type, description: descriptions[type] || type };
    });

    if (options.json) {
      output(fieldTypes, true);
    } else {
      console.log();
      console.log(chalk.cyan('Available Field Types:'));
      console.log();
      for (const ft of fieldTypes) {
        console.log(`  ${ft.type.padEnd(30)}${ft.description}`);
      }
      console.log();
    }
  } catch (error) {
    handleError(error);
  }
}

/**
 * Create a new field
 */
export async function cmdFieldCreate(options) {
  try {
    if (!options.project) {
      throw new Error('--project is required');
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
    if (!options.fieldType) {
      throw new Error('--field-type is required');
    }
    if (!isValidFieldType(options.fieldType)) {
      throw new Error(`Invalid field type. Must be one of: ${VALID_FIELD_TYPES.join(', ')}`);
    }
    if (!options.label) {
      throw new Error('--label is required');
    }

    const project = await loadProject(options.project);

    const fieldName = options.fieldName;

    // Build settings based on field type
    const settings = {};

    // String field settings
    if (options.fieldType === 'string' && options.maxLength) {
      settings.maxLength = parseInt(options.maxLength, 10);
    }

    // List field settings
    if ((options.fieldType === 'list_string' || options.fieldType === 'list_integer') && options.allowedValues) {
      settings.allowedValues = parseAllowedValues(options.allowedValues);
    }

    // Entity reference settings
    if (options.fieldType === 'entity_reference') {
      settings.targetType = options.targetType || 'node';
      if (options.targetBundles) {
        settings.targetBundles = options.targetBundles.split(',').map(b => b.trim());
      }
    }

    // Entity reference revisions settings
    if (options.fieldType === 'entity_reference_revisions') {
      settings.targetType = 'paragraph';
      if (options.targetBundles) {
        settings.targetBundles = options.targetBundles.split(',').map(b => b.trim());
      }
    }

    // Datetime settings
    if (options.fieldType === 'datetime' || options.fieldType === 'daterange') {
      settings.datetimeType = options.datetimeType || 'date';
    }

    // Link settings
    if (options.fieldType === 'link') {
      settings.allowExternal = options.linkType !== 'internal';
      settings.titleOption = options.titleOption || 'optional';
    }

    // Image settings
    if (options.fieldType === 'image') {
      settings.fileExtensions = options.fileExtensions || 'png gif jpg jpeg svg';
      settings.altRequired = !!options.altRequired;
      settings.fileDirectory = options.fileDirectory || 'images/[date:custom:Y]-[date:custom:m]';
    }

    // File settings
    if (options.fieldType === 'file') {
      settings.fileExtensions = options.fileExtensions || 'txt pdf doc docx xls xlsx';
      settings.fileDirectory = options.fileDirectory || 'documents/[date:custom:Y]-[date:custom:m]';
    }

    const fieldOptions = {
      fieldName,
      fieldType: options.fieldType,
      label: options.label,
      description: options.description || '',
      required: !!options.required,
      cardinality: options.cardinality ? parseInt(options.cardinality, 10) : 1,
      settings
    };

    const result = await createField(project, options.entityType, [options.bundle], fieldOptions);
    logSuccess(options.project);

    if (options.json) {
      output(result, true);
    } else {
      console.log(chalk.green(`Field "${result.label}" created successfully!`));
      if (result.storageCreated) {
        console.log(chalk.cyan('Created storage and instance files:'));
      } else {
        console.log(chalk.cyan('Storage already exists. Created instance files:'));
      }
      for (const file of result.createdFiles) {
        console.log(`  - ${file}`);
      }
    }

    await runSyncIfRequested(project, options);
  } catch (error) {
    handleError(error);
  }
}

/**
 * List fields
 */
export async function cmdFieldList(options) {
  try {
    if (!options.project) {
      throw new Error('--project is required');
    }
    if (!options.entityType) {
      throw new Error('--entity-type is required');
    }
    if (!isValidEntityType(options.entityType)) {
      throw new Error(`Invalid entity type. Must be one of: ${VALID_ENTITY_TYPES.join(', ')}`);
    }

    const project = await loadProject(options.project);
    await autoSyncProject(project);

    if (!project.entities) {
      throw new Error('Project has not been synced. Run "dcm project sync" first.');
    }

    let fields;
    if (options.bundle) {
      fields = getFieldsForBundle(project.entities, options.entityType, options.bundle);
    } else {
      fields = getFieldsForEntityType(project.entities, options.entityType);
    }

    if (options.json) {
      output(fields, true);
    } else {
      if (fields.length === 0) {
        console.log(chalk.yellow('No fields found.'));
        return;
      }

      console.log();
      if (options.bundle) {
        console.log(chalk.cyan(`Fields for ${options.entityType} > ${options.bundle}:`));
      } else {
        console.log(chalk.cyan(`Fields for ${options.entityType}:`));
      }
      console.log();

      for (const field of fields) {
        const required = field.required ? ' (required)' : '';
        const cardinality = field.cardinality === -1 ? ' [unlimited]' : field.cardinality > 1 ? ` [${field.cardinality}]` : '';
        console.log(`  ${field.label} (${field.name}) - ${field.type}${required}${cardinality}`);
      }
      console.log();
    }
  } catch (error) {
    handleError(error);
  }
}

/**
 * Edit a field
 */
export async function cmdFieldEdit(options) {
  try {
    if (!options.project) {
      throw new Error('--project is required');
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
    if (!options.fieldName) {
      throw new Error('--field-name is required');
    }

    const project = await loadProject(options.project);

    const updates = {};
    if (options.label) {
      updates.label = options.label;
    }
    if (options.description !== undefined) {
      updates.description = options.description;
    }
    if (options.required) {
      updates.required = true;
    }
    if (options.notRequired) {
      updates.required = false;
    }
    if (options.targetBundles) {
      updates.targetBundles = options.targetBundles.split(',').map(b => b.trim());
    }

    if (Object.keys(updates).length === 0) {
      throw new Error('No updates specified. Use --label, --description, --required, --not-required, or --target-bundles.');
    }

    const result = await updateField(project, options.entityType, options.bundle, options.fieldName, updates);
    logSuccess(options.project);

    if (options.json) {
      output(result, true);
    } else {
      console.log(chalk.green(`Field "${result.fieldName}" updated successfully!`));
      console.log(chalk.cyan(`Updated file: ${result.updatedFile}`));
    }

    await runSyncIfRequested(project, options);
  } catch (error) {
    handleError(error);
  }
}

/**
 * Add a bundle to entity reference fields that target its entity type
 */
export async function cmdFieldAddToRefs(options) {
  try {
    if (!options.project) {
      throw new Error('--project is required');
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

    const project = await loadProject(options.project);
    await autoSyncProject(project);

    if (!project.entities) {
      throw new Error('No entities found. Run sync first.');
    }

    // Find all entity reference fields targeting this entity type
    const matchingFields = findEntityReferenceFieldsTargeting(project, options.entityType);

    // Filter out fields that already have this bundle
    const fieldsToUpdate = matchingFields.filter(
      f => !f.currentTargetBundles.includes(options.bundle)
    );

    // If --fields specified, filter to only those
    if (options.fields) {
      const requestedSpecs = options.fields.split(',').map(s => s.trim());
      const filtered = fieldsToUpdate.filter(f => {
        const spec = `${f.entityType}.${f.bundleId}.${f.fieldName}`;
        return requestedSpecs.includes(spec);
      });

      if (filtered.length === 0) {
        const msg = 'No matching fields found for the specified --fields filter.';
        if (options.json) {
          output({ updated: [], message: msg }, true);
        } else {
          console.log(chalk.yellow(msg));
        }
        return;
      }

      fieldsToUpdate.length = 0;
      fieldsToUpdate.push(...filtered);
    }

    if (fieldsToUpdate.length === 0) {
      const msg = `No entity reference fields found that target ${options.entityType}, or all already include "${options.bundle}".`;
      if (options.json) {
        output({ updated: [], message: msg }, true);
      } else {
        console.log(chalk.yellow(msg));
      }
      return;
    }

    // Update each field
    const results = [];
    for (const field of fieldsToUpdate) {
      const updatedBundles = [...field.currentTargetBundles, options.bundle];

      const result = await updateField(project, field.entityType, field.bundleId, field.fieldName, {
        targetBundles: updatedBundles
      });
      results.push(result);

      if (!options.json) {
        console.log(chalk.green(`  Updated ${field.fieldName} on ${field.entityType} > ${field.bundleId}`));
      }
    }

    logSuccess(options.project);

    if (options.json) {
      output({ updated: results, bundle: options.bundle, entityType: options.entityType }, true);
    } else {
      console.log(chalk.green(`\nAdded "${options.bundle}" to ${results.length} field(s).`));
    }
  } catch (error) {
    handleError(error);
  }
}
