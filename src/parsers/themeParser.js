/**
 * Theme Parser - PURE functions
 * Parse Drupal theme info.yml content to extract theme metadata.
 */

import yaml from 'js-yaml';

/**
 * Parse a theme info.yml content string
 * @param {string} yamlContent - Raw YAML content of a *.info.yml file
 * @returns {object} - { name, baseTheme } where baseTheme may be null
 */
export function parseThemeInfo(yamlContent) {
  const config = yaml.load(yamlContent);

  if (!config || typeof config !== 'object') {
    return { name: null, baseTheme: null };
  }

  return {
    name: config.name || null,
    baseTheme: config['base theme'] || null
  };
}
