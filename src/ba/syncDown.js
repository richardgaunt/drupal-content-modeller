// src/ba/syncDown.js
/** Reconcile returned team-refined tickets — tickets win; idempotent (pure). */

/**
 * returned: [{ reqId, ticketId, content, hash }]
 * Returns { state, annotations, changed }.
 * annotations: requirements.md rewrites to apply (IO layer performs the write).
 */
export function reconcileSyncDown(state, returned) {
  const next = structuredClone(state);
  const annotations = [];
  let changed = false;

  for (const item of returned) {
    const req = next.requirements[item.reqId];
    if (!req) throw new Error(`reconcileSyncDown: unknown ${item.reqId}`);
    if (req.lastSyncHash === item.hash && req.status === 'synced-back') {
      continue; // idempotent: identical input already reconciled
    }
    req.status = 'synced-back';
    req.lastSyncHash = item.hash;
    annotations.push({
      reqId: item.reqId,
      text: item.content,
      note: `realised as ${item.ticketId} (team-adjusted)`
    });
    changed = true;
  }

  if (!changed) return { state, annotations: [], changed: false };
  return { state: next, annotations, changed: true };
}
