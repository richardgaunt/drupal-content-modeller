/**
 * Component Generator - Pure functions for generating SDC component files.
 */

import yaml from 'js-yaml';

const SDC_SCHEMA = 'https://git.drupalcode.org/project/drupal/-/raw/HEAD/core/assets/schemas/v1/metadata.schema.json';

/**
 * Generate the YAML content for an overridden component.
 * Copies props and slots from the source component and adds the replaces field.
 * @param {object} sourceConfig - Parsed source component YAML (from parseComponentYml with raw reload)
 * @param {string} replacesId - The component ID being overridden (e.g. "civictheme:table")
 * @returns {string} - YAML string for the new component.yml
 */
export function generateOverrideComponentYml(sourceConfig, replacesId) {
  const output = {
    $schema: SDC_SCHEMA,
    name: sourceConfig.name || null,
    status: sourceConfig.status || 'stable',
    description: sourceConfig.description || null,
    replaces: replacesId
  };

  if (sourceConfig.props) {
    output.props = sourceConfig.props;
  }

  if (sourceConfig.slots) {
    output.slots = sourceConfig.slots;
  }

  return yaml.dump(output, {
    lineWidth: -1,
    noRefs: true,
    quotingType: "'",
    forceQuotes: false,
    sortKeys: false
  });
}

/**
 * Generate the YAML content for a full component config.
 * Preserves all existing fields while allowing props/slots updates.
 * @param {object} config - Full component config object
 * @returns {string} - YAML string for the component.yml
 */
export function generateComponentYml(config) {
  const output = {};

  if (config.$schema) output.$schema = config.$schema;
  if (config.name) output.name = config.name;
  if (config.status) output.status = config.status;
  if (config.description) output.description = config.description;
  if (config.replaces) output.replaces = config.replaces;

  if (config.props) {
    output.props = config.props;
  }

  if (config.slots) {
    output.slots = config.slots;
  }

  return yaml.dump(output, {
    lineWidth: -1,
    noRefs: true,
    quotingType: "'",
    forceQuotes: false,
    sortKeys: false
  });
}
