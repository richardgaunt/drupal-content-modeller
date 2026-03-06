/**
 * Project Commands
 */

import chalk from 'chalk';
import { createProject, loadProject, listProjects, updateProject, deleteProject } from '../../commands/project.js';
import { syncProject } from '../../commands/sync.js';
import { output, handleError, logSuccess } from '../cliUtils.js';

/**
 * Create a new project
 */
export async function cmdProjectCreate(options) {
  try {
    if (!options.name) {
      throw new Error('--name is required');
    }
    if (!options.configPath) {
      throw new Error('--config-path is required');
    }

    const project = await createProject(options.name, options.configPath, options.baseUrl || '');
    logSuccess(project.slug);

    if (options.json) {
      output(project, true);
    } else {
      console.log(chalk.green(`Project "${project.name}" created successfully!`));
      console.log(chalk.cyan(`Slug: ${project.slug}`));
    }
  } catch (error) {
    handleError(error);
  }
}

/**
 * List all projects
 */
export async function cmdProjectList(options) {
  try {
    const projects = await listProjects();

    if (options.json) {
      output(projects, true);
    } else if (projects.length === 0) {
      console.log(chalk.yellow('No projects found.'));
    } else {
      console.log(chalk.cyan('Projects:'));
      console.log();
      for (const p of projects) {
        console.log(`  ${p.name} (${p.slug})`);
        if (p.configDirectory) {
          console.log(chalk.gray(`    Config: ${p.configDirectory}`));
        }
      }
    }
  } catch (error) {
    handleError(error);
  }
}

/**
 * Edit a project
 */
export async function cmdProjectEdit(options) {
  try {
    if (!options.project) {
      throw new Error('--project is required');
    }

    const project = await loadProject(options.project);

    const updates = {
      name: options.name || project.name,
      configDirectory: options.configPath || project.configDirectory,
      baseUrl: options.baseUrl !== undefined ? options.baseUrl : project.baseUrl
    };

    const updated = await updateProject(project, updates);
    logSuccess(updated.slug);

    if (options.json) {
      output(updated, true);
    } else {
      console.log(chalk.green(`Project "${updated.name}" updated successfully!`));
      if (updated.slug !== options.project) {
        console.log(chalk.cyan(`Slug changed: ${options.project} -> ${updated.slug}`));
      }
    }
  } catch (error) {
    handleError(error);
  }
}

/**
 * Sync a project
 */
export async function cmdProjectSync(options) {
  try {
    if (!options.project) {
      throw new Error('--project is required');
    }

    const project = await loadProject(options.project);
    const result = await syncProject(project);
    logSuccess(options.project);

    if (options.json) {
      output(result, true);
    } else {
      console.log(chalk.green('Sync complete!'));
      console.log(chalk.cyan(`Found ${result.bundlesFound} bundles and ${result.fieldsFound} fields`));
    }
  } catch (error) {
    handleError(error);
  }
}

/**
 * Delete a project
 */
export async function cmdProjectDelete(options) {
  try {
    if (!options.project) {
      throw new Error('--project is required');
    }

    // Load project first to confirm it exists
    await loadProject(options.project);

    const deleted = await deleteProject(options.project);

    if (deleted) {
      // Note: log file is deleted with the project directory
      if (options.json) {
        output({ deleted: true, slug: options.project }, true);
      } else {
        console.log(chalk.green(`Project "${options.project}" deleted successfully!`));
      }
    } else {
      throw new Error(`Failed to delete project "${options.project}"`);
    }
  } catch (error) {
    handleError(error);
  }
}
