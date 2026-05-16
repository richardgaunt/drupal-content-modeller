// src/ba/state.js
/** Personal Loop state.json schema — single source of truth (pure). */
import { PHASES, REQ_STATUS, ARTEFACT_STATUS } from './status.js';

export const STATE_VERSION = 1;

export function createInitialState(projectSlug) {
  return {
    version: STATE_VERSION,
    project: projectSlug,
    phase: 'audit',
    round: 0,
    artefacts: {},
    requirements: {},
    nextReqSeq: 1,
    handoffs: []
  };
}

export function validateState(state) {
  const errors = [];
  if (!state || typeof state !== 'object') return { ok: false, errors: ['state is not an object'] };
  if (state.version !== STATE_VERSION) errors.push(`version must be ${STATE_VERSION}`);
  if (!state.project || typeof state.project !== 'string') errors.push('project is required');
  if (!PHASES.includes(state.phase)) errors.push(`unknown phase: ${state.phase}`);
  if (typeof state.round !== 'number' || state.round < 0) errors.push('round must be a non-negative number');
  if (typeof state.nextReqSeq !== 'number' || state.nextReqSeq < 1) errors.push('nextReqSeq must be >= 1');
  if (!Array.isArray(state.handoffs)) errors.push('handoffs must be an array');

  for (const [name, status] of Object.entries(state.artefacts || {})) {
    if (!ARTEFACT_STATUS.includes(status)) errors.push(`artefact ${name}: bad status ${status}`);
  }
  for (const [id, req] of Object.entries(state.requirements || {})) {
    if (!REQ_STATUS.includes(req?.status)) errors.push(`${id}: bad status ${req?.status}`);
    if (!Array.isArray(req?.tickets)) errors.push(`${id}: tickets must be an array`);
    if (!('amends' in req)) errors.push(`${id}: amends key missing`);
    if (!Array.isArray(req?.amendedBy)) errors.push(`${id}: amendedBy must be an array`);
  }
  return { ok: errors.length === 0, errors };
}
