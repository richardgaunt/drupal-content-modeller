/**
 * Command log I/O operations
 * Handles reading and writing command log entries in JSONL format.
 */

import { appendFileSync, readFileSync, existsSync } from 'fs';
import { getLogPath } from './fileSystem.js';

/**
 * Append a log entry to a project's command log
 * @param {string} slug - Project slug
 * @param {object} entry - Log entry with cli, success, and optionally error
 */
export function appendLog(slug, entry) {
  const logPath = getLogPath(slug);
  const logEntry = {
    timestamp: new Date().toISOString(),
    ...entry
  };
  appendFileSync(logPath, JSON.stringify(logEntry) + '\n', 'utf-8');
}

/**
 * Read log entries from a project's command log
 * @param {string} slug - Project slug
 * @param {object} [options] - Read options
 * @param {number} [options.limit] - Maximum number of entries to return (most recent first)
 * @returns {object[]} - Array of log entries, most recent first
 */
export function readLog(slug, options = {}) {
  const logPath = getLogPath(slug);

  if (!existsSync(logPath)) {
    return [];
  }

  const content = readFileSync(logPath, 'utf-8');
  const lines = content.trim().split('\n').filter(line => line.length > 0);

  let entries = lines.map(line => JSON.parse(line));

  // Most recent first
  entries.reverse();

  if (options.limit && options.limit > 0) {
    entries = entries.slice(0, options.limit);
  }

  return entries;
}
