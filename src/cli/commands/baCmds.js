// src/cli/commands/baCmds.js
/** Commander action handlers for `dcm ba …`. */
import { output, handleError } from '../cliUtils.js';
import { baInit, baStatus, baGate, baHandoff, baSyncDown } from '../../commands/ba.js';

const root = () => process.cwd();

export async function cmdBaInit(opts) {
  try {
    const r = await baInit(root(), opts.project);
    output(r, opts.json);
  } catch (e) { handleError(e); }
}

export async function cmdBaStatus(opts) {
  try {
    const r = await baStatus(root(), opts.project);
    output(r, opts.json);
  } catch (e) { handleError(e); }
}

export async function cmdBaGate(opts) {
  try {
    const signal = { kind: opts.kind };
    if (opts.ref) signal.refId = opts.ref;
    const r = await baGate(root(), opts.project, signal);
    output({ action: r.action, id: r.id }, opts.json);
  } catch (e) { handleError(e); }
}

export async function cmdBaHandoff(opts) {
  try {
    const ts = opts.ts || new Date().toISOString().replace(/[:.]/g, '-');
    const reqIds = String(opts.reqs).split(',').map((s) => s.trim()).filter(Boolean);
    const r = await baHandoff(root(), opts.project, { reqIds, ts, snapshots: {} });
    output({ file: r.file, refined: reqIds }, opts.json);
  } catch (e) { handleError(e); }
}

export async function cmdBaSyncDown(opts) {
  try {
    const returned = JSON.parse(opts.input); // [{reqId,ticketId,content,hash}]
    const r = await baSyncDown(root(), opts.project, returned);
    output({ changed: r.changed, annotations: r.annotations.length }, opts.json);
  } catch (e) { handleError(e); }
}
