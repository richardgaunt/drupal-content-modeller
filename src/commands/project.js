/**
 * Project management commands
 * Orchestrates pure functions and I/O operations.
 */

import { existsSync } from 'fs';
import { generateSlug, isValidProjectName } from '../utils/slug.js';
import { createProjectObject, getProjectSummary, projectMatchesCwd } from '../utils/project.js';
import {
  projectExists,
  directoryExists,
  directoryContainsYmlFiles,
  getExternalProjectJsonPath,
  getRegistryStubPath,
  readRegistryStub,
  writeRegistryStub,
  resolveProjectJsonPath,
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
 * @param {string} options.baseDirectory - REQUIRED. Repo root; project.json is
 *   written to <baseDirectory>/.dcm/project.json and a registry stub is left
 *   in <dcm>/projects/<slug>/. Must be an existing directory.
 * @returns {Promise<object>} - Created project object
 * @throws {Error} - If validation fails or baseDirectory is absent
 */
export async function createProject(name, configDir, baseUrl = '', options = {}) {
  if (!isValidProjectName(name)) {
    throw new Error('Project name cannot be empty');
  }

  const slug = generateSlug(name);

  if (!slug) {
    throw new Error('Could not generate valid slug from project name');
  }

  if (projectExists(slug)) {
    throw new Error(`Project "${slug}" already exists`);
  }

  if (!directoryExists(configDir)) {
    throw new Error(`Configuration directory does not exist: ${configDir}`);
  }

  const hasYmlFiles = await directoryContainsYmlFiles(configDir);
  if (!hasYmlFiles) {
    throw new Error(`Configuration directory contains no .yml files: ${configDir}`);
  }

  const baseDirectory = (options.baseDirectory || '').trim();
  if (!baseDirectory) {
    throw new Error('A save directory is required');
  }
  if (!directoryExists(baseDirectory)) {
    throw new Error(`Base directory does not exist: ${baseDirectory}`);
  }
  const externalPath = getExternalProjectJsonPath(baseDirectory);
  if (existsSync(externalPath)) {
    throw new Error(
      `A DCM project config already exists at ${externalPath}. ` +
      `Use \`dcm project register -b ${baseDirectory}\` to register it instead.`
    );
  }

  await ensureProjectsDir();

  const project = createProjectObject(name, slug, configDir, baseUrl, options);

  await writeJsonFile(externalPath, project);
  await writeRegistryStub(slug, {
    slug,
    baseDirectory,
    createdAt: new Date().toISOString()
  });

  return project;
}

/**
 * Register an existing externalized project (a <baseDirectory>/.dcm/project.json)
 * with DCM. Used by teammates who clone a repo that already has a DCM config.
 * @param {string} baseDirectory - Absolute path to the repo root
 * @returns {Promise<object>} - Registered project object
 * @throws {Error} - If validation fails or slug conflicts
 */
export async function registerProject(baseDirectory) {
  if (!baseDirectory || !baseDirectory.trim()) {
    throw new Error('Base directory is required');
  }
  const trimmed = baseDirectory.trim();
  if (!directoryExists(trimmed)) {
    throw new Error(`Base directory does not exist: ${trimmed}`);
  }

  const externalPath = getExternalProjectJsonPath(trimmed);
  if (!existsSync(externalPath)) {
    throw new Error(`No DCM project config found at ${externalPath}`);
  }

  const project = await readJsonFile(externalPath);
  if (!project.slug) {
    throw new Error(`project.json at ${externalPath} is missing a slug`);
  }

  if (projectExists(project.slug)) {
    const existingStub = await readRegistryStub(project.slug);
    if (existingStub && existingStub.baseDirectory === trimmed) {
      return project;
    }
    throw new Error(
      `A project with slug "${project.slug}" is already registered. ` +
      `Delete it first with \`dcm project delete -p ${project.slug}\` or rename the project in ${externalPath}.`
    );
  }

  await ensureProjectsDir();
  await writeRegistryStub(project.slug, {
    slug: project.slug,
    baseDirectory: trimmed,
    registeredAt: new Date().toISOString()
  });

  return project;
}

/**
 * Load an existing project
 * @param {string} slug - Project slug
 * @returns {Promise<object>} - Project object
 * @throws {Error} - If the project is not registered (no stub) or its external config is missing
 */
export async function loadProject(slug) {
  const jsonPath = await resolveProjectJsonPath(slug);
  if (!existsSync(jsonPath)) {
    const stub = await readRegistryStub(slug);
    throw new Error(
      stub
        ? `Externalized project "${slug}" is missing its config at ${jsonPath}. ` +
          `The repo at ${stub.baseDirectory} may have been moved or deleted.`
        : `Project "${slug}" config is missing at ${jsonPath}.`
    );
  }
  return readJsonFile(jsonPath);
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

  const jsonPath = await resolveProjectJsonPath(project.slug);
  await writeJsonFile(jsonPath, project);
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
 * Delete a project. For externalized projects this only removes the DCM-side
 * registry stub and artefacts (reports, logs). The external project.json inside
 * the Drupal repo is left untouched — delete it manually if desired.
 * @param {string} slug - Project slug to delete
 * @returns {Promise<{deleted: boolean, externalConfigPath: string|null}>}
 */
export async function deleteProject(slug) {
  const stub = await readRegistryStub(slug);
  const externalConfigPath = stub ? getExternalProjectJsonPath(stub.baseDirectory) : null;
  const deleted = await deleteProjectDirectory(slug);
  return { deleted, externalConfigPath };
}

/**
 * Find projects whose baseDirectory (or configDirectory as fallback) contains
 * the given working directory. Used to auto-load a project when `dcm` is run
 * from inside a project tree.
 * @param {string} cwd - Absolute working directory
 * @returns {Promise<object[]>} - Full project objects that match
 */
export async function findProjectsByCwd(cwd) {
  const slugs = await listProjectDirectories();
  const matches = [];

  for (const slug of slugs) {
    try {
      const project = await loadProject(slug);
      if (projectMatchesCwd(project, cwd)) {
        matches.push(project);
      }
    } catch {
      // Skip invalid projects
    }
  }

  return matches;
}

/**
 * Update a project's settings
 * @param {object} project - Current project object
 * @param {object} updates - Object with updated values (name, configDirectory, baseUrl, drupalRoot, drushCommand, baseDirectory)
 * @returns {Promise<object>} - Updated project object
 * @throws {Error} - If validation fails
 */
export async function updateProject(project, updates) {
  if (!project || !project.slug) {
    throw new Error('Invalid project object');
  }

  if (!updates.name || updates.name.trim().length === 0) {
    throw new Error('Project name is required');
  }

  if (!updates.configDirectory || updates.configDirectory.trim().length === 0) {
    throw new Error('Configuration directory is required');
  }

  if (!directoryExists(updates.configDirectory)) {
    throw new Error(`Configuration directory does not exist: ${updates.configDirectory}`);
  }

  const stub = await readRegistryStub(project.slug);
  const isExternalized = Boolean(stub);

  const newSlug = generateSlug(updates.name);
  const slugChanged = newSlug !== project.slug;

  if (slugChanged && projectExists(newSlug)) {
    throw new Error(`A project with slug "${newSlug}" already exists`);
  }

  const updatedProject = {
    ...project,
    name: updates.name.trim(),
    configDirectory: updates.configDirectory.trim(),
    baseUrl: (updates.baseUrl || '').trim(),
    drupalRoot: (updates.drupalRoot || '').trim(),
    drushCommand: (updates.drushCommand || 'drush').trim()
  };

  if (updates.baseDirectory !== undefined) {
    const newBaseDirectory = updates.baseDirectory.trim();
    if (isExternalized && newBaseDirectory !== stub.baseDirectory) {
      throw new Error(
        'Changing baseDirectory on an externalized project is not supported. ' +
        'Delete and re-register the project to move its config.'
      );
    }
    updatedProject.baseDirectory = newBaseDirectory;
  }

  if (updates.theme !== undefined) {
    updatedProject.theme = updates.theme;
  }

  if (updates.editableBaseTheme !== undefined) {
    updatedProject.editableBaseTheme = updates.editableBaseTheme;
  }

  if (slugChanged) {
    await renameProjectDirectory(project.slug, newSlug);
    updatedProject.slug = newSlug;

    if (isExternalized) {
      // renameProjectDirectory moved the stub with the dir; rewrite it so its
      // own `slug` field tracks the new slug.
      await writeRegistryStub(newSlug, {
        ...stub,
        slug: newSlug
      });
    }
  }

  await saveProject(updatedProject);

  return updatedProject;
}
