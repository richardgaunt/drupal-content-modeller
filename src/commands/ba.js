// src/commands/ba.js
/** Personal Loop orchestration: wires pure core + baStore. Returns data only. */
import { createInitialState } from '../ba/state.js';
import { applySignal } from '../ba/ledger.js';
import { buildHandoff } from '../ba/handoffManifest.js';
import { reconcileSyncDown } from '../ba/syncDown.js';
import {
  loadState, saveState, appendHandoffManifest, rewriteRequirementBlock
} from '../io/baStore.js';

export async function baInit(root, slug) {
  const existing = await loadState(root, slug);
  if (existing) return { created: false, state: existing };
  const state = createInitialState(slug);
  await saveState(root, state);
  return { created: true, state };
}

async function requireState(root, slug) {
  const state = await loadState(root, slug);
  if (!state) throw new Error(`no Personal Loop state for ${slug} — run "dcm ba init -p ${slug}" first`);
  return state;
}

export async function baStatus(root, slug, opts = {}) {
  const state = await requireState(root, slug);
  if (opts.raw) return state;
  return {
    phase: state.phase,
    round: state.round,
    requirements: Object.entries(state.requirements)
      .map(([id, r]) => ({ id, status: r.status, tickets: r.tickets }))
      .sort((a, b) => a.id.localeCompare(b.id))
  };
}

export async function baGate(root, slug, signal) {
  const state = await requireState(root, slug);
  const r = applySignal(state, signal);
  if (r.state !== state) await saveState(root, r.state);
  return { action: r.action, id: r.id, state: r.state };
}

export async function baHandoff(root, slug, { reqIds, ts, snapshots }) {
  const state = await requireState(root, slug);
  const out = buildHandoff(state, { reqIds, ts, snapshots });
  await appendHandoffManifest(root, slug, out.file, out.markdown);
  await saveState(root, out.state);
  return { state: out.state, file: out.file };
}

export async function baSyncDown(root, slug, returned) {
  const state = await requireState(root, slug);
  const out = reconcileSyncDown(state, returned);
  if (out.changed) {
    for (const a of out.annotations) {
      await rewriteRequirementBlock(root, slug, a.reqId, `${a.text}\n\n_${a.note}_`);
    }
    await saveState(root, out.state);
  }
  return out;
}

// Test-only helper to seed a hand-crafted state through the real store.
baSyncDown.__saveForTest = (root, state) => saveState(root, state);
