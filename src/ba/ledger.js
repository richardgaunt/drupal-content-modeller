// src/ba/ledger.js
/** Settled-work gate: enforce the spec's mechanical conflict rule (pure). */
import { isRefined } from './status.js';
import { allocateReq } from './reqId.js';

/**
 * signal: { kind: 'new' | 'match' | 'conflict', refId?: string }
 * Returns { action, id?, state }.
 *  - new                       -> 'created'  (fresh open REQ)
 *  - match  + refined refId    -> 'skipped'  (already done)
 *  - match  + non-refined      -> 'noop'     (let normal flow handle it)
 *  - conflict + refined refId  -> 'amended'  (new REQ amends old; old gains amendedBy)
 *  - conflict + non-refined    -> 'reopened' (mapped artefacts -> reopened)
 */
export function applySignal(state, signal) {
  if (signal.kind === 'new') {
    const out = allocateReq(state);
    return { action: 'created', id: out.id, state: out.state };
  }

  const req = state.requirements[signal.refId];
  if (!req) throw new Error(`applySignal: unknown refId ${signal.refId}`);

  if (signal.kind === 'match') {
    if (isRefined(req.status)) return { action: 'skipped', state };
    return { action: 'noop', state };
  }

  if (signal.kind === 'conflict') {
    if (isRefined(req.status)) {
      const out = allocateReq(state, { amends: signal.refId });
      out.state.requirements[signal.refId].amendedBy =
        [...out.state.requirements[signal.refId].amendedBy, out.id];
      return { action: 'amended', id: out.id, state: out.state };
    }
    const next = structuredClone(state);
    for (const t of next.requirements[signal.refId].tickets) {
      if (next.artefacts[t] !== undefined) next.artefacts[t] = 'reopened';
    }
    return { action: 'reopened', state: next };
  }

  throw new Error(`applySignal: unknown signal kind ${signal.kind}`);
}
