// src/commands/ba.js
/** Personal Loop orchestration: project-gated; wires pure core + baStore. */
import { loadProject } from './project.js';
import { projectExists } from '../io/fileSystem.js';
import { createInitialState } from '../ba/state.js';
import { applySignal } from '../ba/ledger.js';
import { buildHandoff } from '../ba/handoffManifest.js';
import { reconcileSyncDown } from '../ba/syncDown.js';
import {
  loadState, saveState, appendHandoffManifest, rewriteRequirementBlock
} from '../io/baStore.js';

async function requireProject(slug) {
  if (!projectExists(slug)) {
    throw new Error(`Project "${slug}" not found — run \`dcm project create\` first`);
  }
  await loadProject(slug);
}

export async function baInit(slug) {
  await requireProject(slug);
  const existing = await loadState(slug);
  if (existing) return { created: false, state: existing };
  const state = createInitialState(slug);
  await saveState(state);
  return { created: true, state };
}

async function requireState(slug) {
  await requireProject(slug);
  const state = await loadState(slug);
  if (!state) throw new Error(`no Personal Loop state for ${slug} — run "dcm ba init -p ${slug}" first`);
  return state;
}

export async function baStatus(slug, opts = {}) {
  const state = await requireState(slug);
  if (opts.raw) return state;
  return {
    phase: state.phase,
    round: state.round,
    requirements: Object.entries(state.requirements)
      .map(([id, r]) => ({ id, status: r.status, tickets: r.tickets }))
      .sort((a, b) => a.id.localeCompare(b.id))
  };
}

export async function baGate(slug, signal) {
  const state = await requireState(slug);
  const r = applySignal(state, signal);
  if (r.state !== state) await saveState(r.state);
  return { action: r.action, id: r.id, state: r.state };
}

export async function baHandoff(slug, { reqIds, ts, snapshots }) {
  const state = await requireState(slug);
  const out = buildHandoff(state, { reqIds, ts, snapshots });
  await appendHandoffManifest(slug, out.file, out.markdown);
  await saveState(out.state);
  return { state: out.state, file: out.file };
}

export async function baSyncDown(slug, returned) {
  const state = await requireState(slug);
  const out = reconcileSyncDown(state, returned);
  if (out.changed) {
    for (const a of out.annotations) {
      await rewriteRequirementBlock(slug, a.reqId, `${a.text}\n\n_${a.note}_`);
    }
    await saveState(out.state);
  }
  return out;
}

// Test-only helper to seed a hand-crafted state through the real store.
baSyncDown.__saveForTest = (state) => saveState(state);
