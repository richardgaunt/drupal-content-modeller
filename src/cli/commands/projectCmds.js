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
 * View project configuration details
 */
export async function cmdProjectView(options) {
  try {
    if (!options.project) {
      throw new Error('--project is required');
    }

    const project = await loadProject(options.project);

    // Build a config-only view (exclude entities to keep output manageable)
    const config = {
      name: project.name,
      slug: project.slug,
      configDirectory: project.configDirectory || null,
      baseUrl: project.baseUrl || null,
      drupalRoot: project.drupalRoot || null,
      drushCommand: project.drushCommand || null,
      lastSync: project.lastSync || null,
      editableBaseTheme: project.editableBaseTheme || false,
      activeTheme: project.theme?.themes?.[0] ? {
        label: project.theme.themes[0].name,
        machine_name: project.theme.themes[0].machine_name,
        directory: project.theme.themes[0].directory
      } : null,
      theme: project.theme ? {
        themes: (project.theme.themes || []).map(t => ({
          name: t.name,
          machine_name: t.machine_name,
          directory: t.directory
        }))
      } : null
    };

    if (options.json) {
      output(config, true);
    } else {
      console.log();
      console.log(chalk.cyan(`Project: ${config.name}`));
      console.log(`  Slug:             ${config.slug}`);
      console.log(`  Config directory:  ${config.configDirectory || chalk.gray('not set')}`);
      console.log(`  Base URL:          ${config.baseUrl || chalk.gray('not set')}`);
      console.log(`  Drupal root:       ${config.drupalRoot || chalk.gray('not set')}`);
      console.log(`  Drush command:     ${config.drushCommand || chalk.gray('not set')}`);
      console.log(`  Last sync:         ${config.lastSync || chalk.gray('never')}`);
      if (config.activeTheme) {
        console.log(`  Active theme:      ${config.activeTheme.label} (${config.activeTheme.machine_name}) → ${config.activeTheme.directory}`);
      }
      if (config.theme) {
        console.log(`  Theme chain:`);
        for (const t of config.theme.themes) {
          console.log(`    - ${t.name} (${t.machine_name}) → ${t.directory}`);
        }
      }
      console.log();
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
