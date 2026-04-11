/**
 * Ticket Commands - Orchestration layer
 * Generates QA tickets from project content model data.
 */

import { writeTextFile, getTicketsDir } from '../io/fileSystem.js';
import { loadFormDisplay } from './formDisplay.js';
import { listRoles } from './role.js';
import { generateAllTickets, generateAllTemplates, generateTicketTemplate } from '../generators/ticketGenerator.js';
import { getEntityTypeSingularLabel } from '../constants/entityTypes.js';
import { join } from 'path';

/**
 * Load form displays for all bundles across all entity types.
 * @param {object} project - Project object
 * @returns {Promise<object>} - Nested object: { entityType: { bundleId: formDisplay } }
 */
async function loadAllFormDisplays(project) {
  const formDisplays = {};
  for (const entityType of Object.keys(project.entities || {})) {
    const bundles = project.entities[entityType] || {};
    formDisplays[entityType] = {};
    for (const bundleId of Object.keys(bundles)) {
      const fd = await loadFormDisplay(project, entityType, bundleId);
      if (fd) {
        formDisplays[entityType][bundleId] = fd;
      }
    }
  }
  return formDisplays;
}

/**
 * Generate and save QA tickets for a project.
 * @param {object} project - Project object
 * @param {string} outputDir - Directory to save tickets
 * @param {string} baseUrl - Base URL for admin links
 * @returns {Promise<Array<{filename: string, entityType: string, bundleId: string}>>}
 */
export async function createTickets(project, outputDir, baseUrl = '') {
  const roles = await listRoles(project);
  const formDisplays = await loadAllFormDisplays(project);

  const tickets = generateAllTickets(project, baseUrl, { roles, formDisplays });

  const results = [];
  for (const ticket of tickets) {
    const filePath = join(outputDir, ticket.filename);
    await writeTextFile(filePath, ticket.content);
    results.push({
      filename: ticket.filename,
      entityType: ticket.entityType,
      bundleId: ticket.bundleId
    });
  }

  return results;
}

/**
 * Generate and save blank ticket templates.
 * Without options: generates one template per entity type.
 * With options.entityType: generates a single template for that entity type/bundle.
 * @param {string} outputDir - Directory to save templates
 * @param {object} [options] - Optional filters
 * @param {string} [options.entityType] - Entity type
 * @param {string} [options.label] - Bundle label
 * @param {string} [options.machineName] - Bundle machine name
 * @param {number} [options.ticketNumber] - Ticket number
 * @param {string} [options.baseUrl] - Base URL
 * @returns {Promise<Array<{filename: string}>>}
 */
export async function createTicketTemplates(outputDir, options = {}) {
  if (options.entityType) {
    const content = generateTicketTemplate(options.entityType, {
      label: options.label,
      machineName: options.machineName,
      ticketNumber: options.ticketNumber,
      baseUrl: options.baseUrl
    });

    const singularLabel = getEntityTypeSingularLabel(options.entityType);
    const label = options.label || 'template';
    const filename = options.label
      ? `template-${label.toLowerCase().replace(/\s+/g, '-')}-${singularLabel.replace(/\s+/g, '-')}.md`
      : `template-${singularLabel.replace(/\s+/g, '-')}.md`;

    const filePath = join(outputDir, filename);
    await writeTextFile(filePath, content);
    return [{ filename }];
  }

  const templates = generateAllTemplates();

  const results = [];
  for (const template of templates) {
    const filePath = join(outputDir, template.filename);
    await writeTextFile(filePath, template.content);
    results.push({ filename: template.filename });
  }

  return results;
}
