/**
 * Project management commands
 * Orchestrates pure functions and I/O operations.
 */

import { generateSlug, isValidProjectName } from '../utils/slug';
import { createProjectObject, getProjectSummary } from '../utils/project';
import {
  projectExists,
  directoryExists,
  directoryContainsYmlFiles,
  getProjectJsonPath,
  readJsonFile,
  writeJsonFile,
  listProjectDirectories,
  deleteProjectDirectory,
  ensureProjectsDir
} from '../io/fileSystem';

/**
 * Create a new project
 * @param {string} name - Human-readable project name
 * @param {string} configDir - Path to Drupal config directory
 * @returns {Promise<object>} - Created project object
 * @throws {Error} - If validation fails
 */
export async function createProject(name, configDir) {
  // Validate project name
  if (!isValidProjectName(name)) {
    throw new Error('Project name cannot be empty');
  }

  // Generate slug
  const slug = generateSlug(name);

  if (!slug) {
    throw new Error('Could not generate valid slug from project name');
  }

  // Check if project already exists
  if (projectExists(slug)) {
    throw new Error(`Project "${slug}" already exists`);
  }

  // Validate config directory exists
  if (!directoryExists(configDir)) {
    throw new Error(`Configuration directory does not exist: ${configDir}`);
  }

  // Validate config directory contains .yml files
  const hasYmlFiles = await directoryContainsYmlFiles(configDir);
  if (!hasYmlFiles) {
    throw new Error(`Configuration directory contains no .yml files: ${configDir}`);
  }

  // Ensure projects directory exists
  await ensureProjectsDir();

  // Create project object
  const project = createProjectObject(name, slug, configDir);

  // Save project
  const projectJsonPath = getProjectJsonPath(slug);
  await writeJsonFile(projectJsonPath, project);

  return project;
}

/**
 * Load an existing project
 * @param {string} slug - Project slug
 * @returns {Promise<object>} - Project object
 * @throws {Error} - If project not found
 */
export async function loadProject(slug) {
  if (!projectExists(slug)) {
    throw new Error(`Project "${slug}" not found`);
  }

  const projectJsonPath = getProjectJsonPath(slug);
  return readJsonFile(projectJsonPath);
}

/**
 * Save a project
 * @param {object} project - Project object to save
 * @returns {Promise<void>}
 */
export async function saveProject(project) {
  if (!project || !project.slug) {
    throw new Error('Invalid project object');
  }

  const projectJsonPath = getProjectJsonPath(project.slug);
  await writeJsonFile(projectJsonPath, project);
}

/**
 * List all projects
 * @returns {Promise<object[]>} - Array of project summaries
 */
export async function listProjects() {
  const slugs = await listProjectDirectories();
  const projects = [];

  for (const slug of slugs) {
    try {
      const project = await loadProject(slug);
      projects.push(getProjectSummary(project));
    } catch {
      // Skip invalid projects
    }
  }

  return projects;
}

/**
 * Delete a project
 * @param {string} slug - Project slug to delete
 * @returns {Promise<boolean>} - True if deleted successfully
 */
export async function deleteProject(slug) {
  return deleteProjectDirectory(slug);
}
