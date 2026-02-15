/**
 * Project management commands
 * Orchestrates pure functions and I/O operations.
 */

import { generateSlug, isValidProjectName } from '../utils/slug.js';
import { createProjectObject, getProjectSummary } from '../utils/project.js';
import {
  projectExists,
  directoryExists,
  directoryContainsYmlFiles,
  getProjectJsonPath,
  readJsonFile,
  writeJsonFile,
  listProjectDirectories,
  deleteProjectDirectory,
  ensureProjectsDir,
  renameProjectDirectory
} from '../io/fileSystem.js';

/**
 * Create a new project
 * @param {string} name - Human-readable project name
 * @param {string} configDir - Path to Drupal config directory
 * @param {string} baseUrl - Base URL of the Drupal site (optional)
 * @param {object} options - Additional options
 * @param {string} options.drupalRoot - Root directory of Drupal installation
 * @param {string} options.drushCommand - Command to run drush
 * @returns {Promise<object>} - Created project object
 * @throws {Error} - If validation fails
 */
export async function createProject(name, configDir, baseUrl = '', options = {}) {
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
  const project = createProjectObject(name, slug, configDir, baseUrl, options);

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

/**
 * Update a project's settings
 * @param {object} project - Current project object
 * @param {object} updates - Object with updated values (name, configDirectory, baseUrl, drupalRoot, drushCommand)
 * @returns {Promise<object>} - Updated project object
 * @throws {Error} - If validation fails
 */
export async function updateProject(project, updates) {
  if (!project || !project.slug) {
    throw new Error('Invalid project object');
  }

  // Validate required fields
  if (!updates.name || updates.name.trim().length === 0) {
    throw new Error('Project name is required');
  }

  if (!updates.configDirectory || updates.configDirectory.trim().length === 0) {
    throw new Error('Configuration directory is required');
  }

  // Validate config directory exists
  if (!directoryExists(updates.configDirectory)) {
    throw new Error(`Configuration directory does not exist: ${updates.configDirectory}`);
  }

  // Check if name changed and would result in a different slug
  const newSlug = generateSlug(updates.name);
  const slugChanged = newSlug !== project.slug;

  // If slug changed, check new slug doesn't conflict with existing project
  if (slugChanged && projectExists(newSlug)) {
    throw new Error(`A project with slug "${newSlug}" already exists`);
  }

  // Build updated project
  const updatedProject = {
    ...project,
    name: updates.name.trim(),
    configDirectory: updates.configDirectory.trim(),
    baseUrl: (updates.baseUrl || '').trim(),
    drupalRoot: (updates.drupalRoot || '').trim(),
    drushCommand: (updates.drushCommand || 'drush').trim()
  };

  // Handle slug change: rename directory
  if (slugChanged) {
    await renameProjectDirectory(project.slug, newSlug);
    updatedProject.slug = newSlug;
  }

  // Save updated project
  await saveProject(updatedProject);

  return updatedProject;
}
