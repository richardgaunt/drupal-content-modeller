/**
 * Component Parser - PURE functions
 * Parse Drupal Single Directory Component (SDC) *.component.yml content.
 * Reusable API for component data extraction.
 */

import yaml from 'js-yaml';

/**
 * Parse a *.component.yml content string
 * @param {string} yamlContent - Raw YAML content of a *.component.yml file
 * @returns {object} - { name, description, status, replaces, props, slots }
 */
export function parseComponentYml(yamlContent) {
  const config = yaml.load(yamlContent);

  if (!config || typeof config !== 'object') {
    return { name: null, description: null, status: null, replaces: null, props: null, slots: null };
  }

  return {
    name: config.name || null,
    description: config.description || null,
    status: config.status || null,
    replaces: config.replaces || null,
    props: config.props || null,
    slots: config.slots || null
  };
}

/**
 * Extract machine name from a component.yml filename
 * @param {string} filename - e.g. "table.component.yml"
 * @returns {string} - e.g. "table"
 */
export function getComponentMachineName(filename) {
  return filename.replace('.component.yml', '');
}
