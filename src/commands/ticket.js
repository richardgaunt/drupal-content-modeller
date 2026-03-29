/**
 * Ticket Commands - Orchestration layer
 * Generates QA tickets from project content model data.
 */

import { writeTextFile, getTicketsDir } from '../io/fileSystem.js';
import { loadFormDisplay } from './formDisplay.js';
import { listRoles } from './role.js';
import { generateAllTickets } from '../generators/ticketGenerator.js';
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
