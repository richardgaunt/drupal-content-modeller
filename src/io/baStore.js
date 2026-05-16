// src/io/baStore.js
/** IO for a project's BA dir — state.json canonical, manifest.md derived. */
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { resolveBaDir } from './fileSystem.js';
import { validateState } from '../ba/state.js';
import { renderManifest } from '../ba/manifestRender.js';

export async function loadState(slug) {
  const file = join(await resolveBaDir(slug), 'state.json');
  let raw;
  try {
    raw = await readFile(file, 'utf8');
  } catch (e) {
    if (e.code === 'ENOENT') return null;
    throw e;
  }
  const state = JSON.parse(raw);
  const v = validateState(state);
  if (!v.ok) throw new Error(`invalid state.json: ${v.errors.join('; ')}`);
  return state;
}

export async function saveState(state) {
  const v = validateState(state);
  if (!v.ok) throw new Error(`refusing to save invalid state: ${v.errors.join('; ')}`);
  const dir = await resolveBaDir(state.project);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, 'state.json'), JSON.stringify(state, null, 2) + '\n', 'utf8');
  await writeFile(join(dir, 'manifest.md'), renderManifest(state), 'utf8');
}

async function exists(p) {
  try { await access(p); return true; } catch { return false; }
}

export async function appendHandoffManifest(slug, relFile, markdown) {
  const target = join(await resolveBaDir(slug), relFile);
  if (await exists(target)) throw new Error(`handoff manifest already exists: ${relFile}`);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, markdown, 'utf8');
}

/**
 * Rewrite a single REQ block in requirements.md in place, delimited by
 * `<!-- REQ-<id> START -->` / `<!-- REQ-<id> END -->`. Creates a wrapped
 * block (appended) if the markers are absent. Pure-string find/replace so
 * other REQ blocks are untouched.
 */
export async function rewriteRequirementBlock(slug, reqId, body) {
  const file = join(await resolveBaDir(slug), 'requirements.md');
  let current = '';
  try { current = await readFile(file, 'utf8'); } catch (e) { if (e.code !== 'ENOENT') throw e; }

  const start = `<!-- ${reqId} START -->`;
  const end = `<!-- ${reqId} END -->`;
  const block = `${start}\n\n## ${reqId}\n\n${body}\n\n${end}`;

  const s = current.indexOf(start);
  const e = current.indexOf(end);
  let next;
  if (s !== -1 && e !== -1 && e > s) {
    next = current.slice(0, s) + block + current.slice(e + end.length);
  } else {
    next = current + (current && !current.endsWith('\n') ? '\n' : '') + '\n' + block + '\n';
  }
  await writeFile(file, next, 'utf8');
}
