/**
 * File system I/O operations
 * These functions handle all file system interactions and can be mocked in tests.
 */

import { readdir, readFile, writeFile, mkdir, rm } from 'fs/promises';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const defaultProjectRoot = join(__dirname, '..', '..');

// Configurable projects directory for testing
let _projectsDir = null;

/**
 * Set the projects directory (for testing)
 * @param {string|null} dir - Path to projects directory, or null to reset
 */
export function setProjectsDir(dir) {
  _projectsDir = dir;
}

/**
 * Get the projects directory path
 * @returns {string} - Absolute path to projects directory
 */
export function getProjectsDir() {
  if (_projectsDir) {
    return _projectsDir;
  }
  return join(defaultProjectRoot, 'projects');
}

/**
 * Get the path to a specific project directory
 * @param {string} slug - Project slug
 * @returns {string} - Absolute path to project directory
 */
export function getProjectPath(slug) {
  return join(getProjectsDir(), slug);
}

/**
 * Get the path to a project's project.json file
 * @param {string} slug - Project slug
 * @returns {string} - Absolute path to project.json
 */
export function getProjectJsonPath(slug) {
  return join(getProjectPath(slug), 'project.json');
}

/**
 * Check if a directory exists
 * @param {string} dirPath - Path to check
 * @returns {boolean} - True if exists
 */
export function directoryExists(dirPath) {
  return existsSync(dirPath);
}

/**
 * Check if a project with the given slug exists
 * @param {string} slug - The project slug to check
 * @returns {boolean} - True if the project exists
 */
export function projectExists(slug) {
  const projectPath = getProjectPath(slug);
  return existsSync(projectPath);
}

/**
 * Check if a directory contains .yml files
 * @param {string} dirPath - Path to check
 * @returns {Promise<boolean>} - True if contains .yml files
 */
export async function directoryContainsYmlFiles(dirPath) {
  try {
    const files = await readdir(dirPath);
    return files.some(file => file.endsWith('.yml'));
  } catch {
    return false;
  }
}

/**
 * Read a JSON file
 * @param {string} filePath - Path to JSON file
 * @returns {Promise<object>} - Parsed JSON content
 */
export async function readJsonFile(filePath) {
  const content = await readFile(filePath, 'utf-8');
  return JSON.parse(content);
}

/**
 * Write a JSON file
 * @param {string} filePath - Path to write to
 * @param {object} data - Data to write
 */
export async function writeJsonFile(filePath, data) {
  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
  await writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * List all project directories
 * @returns {Promise<string[]>} - Array of project slugs
 */
export async function listProjectDirectories() {
  const projectsDir = getProjectsDir();

  if (!existsSync(projectsDir)) {
    return [];
  }

  const entries = await readdir(projectsDir, { withFileTypes: true });
  return entries
    .filter(entry => entry.isDirectory())
    .filter(entry => !entry.name.startsWith('.'))
    .map(entry => entry.name);
}

/**
 * Delete a project directory
 * @param {string} slug - Project slug to delete
 * @returns {Promise<boolean>} - True if deleted successfully
 */
export async function deleteProjectDirectory(slug) {
  const projectPath = getProjectPath(slug);

  if (!existsSync(projectPath)) {
    return false;
  }

  await rm(projectPath, { recursive: true });
  return true;
}

/**
 * Ensure the projects directory exists
 */
export async function ensureProjectsDir() {
  const projectsDir = getProjectsDir();
  if (!existsSync(projectsDir)) {
    await mkdir(projectsDir, { recursive: true });
  }
}
