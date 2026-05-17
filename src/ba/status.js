// src/ba/status.js
/** Personal Loop status vocabularies and transition rules (pure). */

export const PHASES = ['audit', 'requirements', 'draft-tickets', 'ticket-refinement'];

export const ARTEFACT_STATUS = ['draft', 'refining', 'in-review', 'approved', 'reopened'];

export const REQ_STATUS = ['open', 'drafted', 'refined', 'synced-back'];

/** A requirement that the loop must never re-analyse or re-elicit. */
export function isRefined(status) {
  return status === 'refined' || status === 'synced-back';
}

const REQ_FORWARD = {
  open: ['drafted'],
  drafted: ['refined'],
  refined: ['synced-back'],
  'synced-back': ['synced-back'] // repeatable sync-down on changed input
};

export function canTransitionReq(from, to) {
  return Boolean(REQ_FORWARD[from] && REQ_FORWARD[from].includes(to));
}
