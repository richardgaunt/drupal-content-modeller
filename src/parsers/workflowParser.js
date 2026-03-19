/**
 * Workflow Parser - PURE functions
 * Parse workflow YAML configs into structured objects.
 */

/**
 * Filter filenames that match the workflow pattern
 * @param {string[]} files - Array of filenames
 * @returns {string[]} - Matching workflow filenames
 */
export function filterWorkflowFiles(files) {
  return files.filter(f =>
    f.startsWith('workflows.workflow.') && f.endsWith('.yml')
  );
}

/**
 * Extract workflow ID from filename
 * @param {string} filename - e.g. 'workflows.workflow.editorial.yml'
 * @returns {string|null} - Workflow ID or null
 */
export function extractWorkflowIdFromFilename(filename) {
  const prefix = 'workflows.workflow.';
  const suffix = '.yml';
  if (filename.startsWith(prefix) && filename.endsWith(suffix)) {
    return filename.slice(prefix.length, -suffix.length);
  }
  return null;
}

/**
 * Get workflow config filename from ID
 * @param {string} workflowId - e.g. 'editorial'
 * @returns {string} - e.g. 'workflows.workflow.editorial.yml'
 */
export function getWorkflowFilename(workflowId) {
  return `workflows.workflow.${workflowId}.yml`;
}

/**
 * Parse a workflow YAML object into a structured object
 * @param {object} config - Parsed YAML config
 * @returns {object|null} - Parsed workflow or null
 */
export function parseWorkflow(config) {
  if (!config) return null;

  const typeSettings = config.type_settings || {};
  const states = typeSettings.states || {};
  const transitions = typeSettings.transitions || {};
  const entityTypes = typeSettings.entity_types || {};

  const parsedStates = Object.entries(states).map(([id, state]) => ({
    id,
    label: state.label || id,
    published: state.published ?? false,
    defaultRevision: state.default_revision ?? true,
    weight: state.weight ?? 0
  })).sort((a, b) => a.weight - b.weight);

  const parsedTransitions = Object.entries(transitions).map(([id, transition]) => ({
    id,
    label: transition.label || id,
    from: transition.from || [],
    to: transition.to || '',
    weight: transition.weight ?? 0
  })).sort((a, b) => a.weight - b.weight);

  const parsedEntityTypes = {};
  for (const [entityType, bundles] of Object.entries(entityTypes)) {
    parsedEntityTypes[entityType] = [...bundles].sort();
  }

  return {
    id: config.id || '',
    label: config.label || '',
    type: config.type || '',
    status: config.status !== false,
    defaultModerationState: typeSettings.default_moderation_state || '',
    states: parsedStates,
    transitions: parsedTransitions,
    entityTypes: parsedEntityTypes
  };
}

/**
 * Add a bundle to a workflow config's entity_types and dependencies.
 * Returns the updated config object (does not mutate the original).
 * @param {object} config - Raw parsed YAML config
 * @param {string} entityType - e.g. 'node'
 * @param {string} bundle - e.g. 'article'
 * @param {string} bundleConfigName - e.g. 'node.type.article'
 * @returns {object} - Updated config
 */
export function addBundleToWorkflow(config, entityType, bundle, bundleConfigName) {
  const updated = JSON.parse(JSON.stringify(config));

  if (!updated.type_settings) updated.type_settings = {};
  if (!updated.type_settings.entity_types) updated.type_settings.entity_types = {};
  if (!updated.type_settings.entity_types[entityType]) {
    updated.type_settings.entity_types[entityType] = [];
  }

  const bundles = updated.type_settings.entity_types[entityType];
  if (!bundles.includes(bundle)) {
    bundles.push(bundle);
    bundles.sort();
  }

  if (!updated.dependencies) updated.dependencies = {};
  if (!updated.dependencies.config) updated.dependencies.config = [];

  const deps = updated.dependencies.config;
  if (!deps.includes(bundleConfigName)) {
    deps.push(bundleConfigName);
    deps.sort();
  }

  return updated;
}

/**
 * Remove a bundle from a workflow config's entity_types and dependencies.
 * Returns the updated config object (does not mutate the original).
 * @param {object} config - Raw parsed YAML config
 * @param {string} entityType - e.g. 'node'
 * @param {string} bundle - e.g. 'article'
 * @param {string} bundleConfigName - e.g. 'node.type.article'
 * @returns {object} - Updated config
 */
export function removeBundleFromWorkflow(config, entityType, bundle, bundleConfigName) {
  const updated = JSON.parse(JSON.stringify(config));

  const entityTypes = updated.type_settings?.entity_types;
  if (entityTypes && entityTypes[entityType]) {
    entityTypes[entityType] = entityTypes[entityType].filter(b => b !== bundle);
    if (entityTypes[entityType].length === 0) {
      delete entityTypes[entityType];
    }
  }

  const deps = updated.dependencies?.config;
  if (deps) {
    updated.dependencies.config = deps.filter(d => d !== bundleConfigName);
  }

  return updated;
}
