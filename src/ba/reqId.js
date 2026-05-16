// src/ba/reqId.js
/** Stable REQ-NNN allocation — monotonic, never reused (pure). */

export function formatReqId(seq) {
  return `REQ-${String(seq).padStart(3, '0')}`;
}

/**
 * Allocate the next requirement id from a state.
 * Returns { id, state } with a NEW state object (input untouched).
 * opts.amends: optional REQ id this new requirement amends.
 */
export function allocateReq(state, opts = {}) {
  const next = structuredClone(state);
  const id = formatReqId(next.nextReqSeq);
  next.nextReqSeq += 1;
  next.requirements[id] = {
    status: 'open',
    tickets: [],
    amends: opts.amends ?? null,
    amendedBy: []
  };
  return { id, state: next };
}
