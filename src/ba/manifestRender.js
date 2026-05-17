// src/ba/manifestRender.js
/** Render state.json -> human-readable manifest.md (pure, deterministic). */

function cell(v) {
  if (Array.isArray(v)) return v.length ? v.join(', ') : '—';
  return v === null || v === undefined || v === '' ? '—' : String(v);
}

export function renderManifest(state) {
  const lines = [];
  lines.push('<!-- GENERATED FROM state.json — DO NOT EDIT -->');
  lines.push('');
  lines.push(`# Personal Loop manifest — ${state.project}`);
  lines.push('');
  lines.push(`**Phase:** ${state.phase}`);
  lines.push('');
  lines.push(`**Round:** ${state.round}`);
  lines.push('');
  lines.push('## Requirements ledger');
  lines.push('');
  lines.push('| REQ | Status | Tickets | Amends | Amended by |');
  lines.push('|---|---|---|---|---|');
  for (const id of Object.keys(state.requirements).sort()) {
    const r = state.requirements[id];
    lines.push(`| ${id} | ${cell(r.status)} | ${cell(r.tickets)} | ${cell(r.amends)} | ${cell(r.amendedBy)} |`);
  }
  lines.push('');
  lines.push('## Handoffs');
  lines.push('');
  if (!state.handoffs.length) {
    lines.push('_None yet._');
  } else {
    lines.push('| When | Manifest | REQs |');
    lines.push('|---|---|---|');
    for (const h of state.handoffs) {
      lines.push(`| ${h.ts} | ${h.file} | ${cell(h.reqs)} |`);
    }
  }
  lines.push('');
  return lines.join('\n');
}
