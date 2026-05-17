// src/ba/handoffManifest.js
/** Build an immutable handoff manifest + next state (pure). */

export function buildHandoff(state, { reqIds, ts, snapshots = {} }) {
  for (const id of reqIds) {
    const req = state.requirements[id];
    if (!req) throw new Error(`buildHandoff: unknown ${id}`);
    if (req.status === 'refined' || req.status === 'synced-back') {
      throw new Error(`buildHandoff: ${id} already refined`);
    }
    for (const t of req.tickets) {
      if (state.artefacts[t] !== 'approved') {
        throw new Error(`buildHandoff: ${id} ticket ${t} not approved (is ${state.artefacts[t]})`);
      }
    }
  }

  const next = structuredClone(state);
  for (const id of reqIds) next.requirements[id].status = 'refined';
  const file = `handoff/${ts}.md`;
  next.handoffs = [...next.handoffs, { ts, file, reqs: [...reqIds] }];

  const lines = [];
  lines.push('<!-- IMMUTABLE — append a new handoff manifest to correct -->');
  lines.push('');
  lines.push(`# Handoff ${ts}`);
  lines.push('');
  lines.push(`Project: ${state.project}`);
  lines.push('');
  for (const id of reqIds) {
    lines.push(`## ${id}`);
    lines.push('');
    lines.push('Requirement snapshot:');
    lines.push('');
    lines.push('```');
    lines.push(snapshots[id] ?? '(no snapshot provided)');
    lines.push('```');
    lines.push('');
    for (const t of state.requirements[id].tickets) {
      lines.push(`### Ticket ${t}`);
      lines.push('');
      lines.push('```');
      lines.push(snapshots[t] ?? '(no snapshot provided)');
      lines.push('```');
      lines.push('');
    }
  }
  return { state: next, file, markdown: lines.join('\n') };
}
