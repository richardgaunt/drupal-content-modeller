/**
 * Migration CLI Commands
 */

import { join } from 'path';
import { loadProject } from '../../commands/project.js';
import {
  createMigrationReport,
  createSingleMigrationReport,
  getMigrationReportData,
  getSingleMigrationReportData,
  listMigrations
} from '../../commands/migration.js';
import { getReportsDir } from '../../io/fileSystem.js';
import { output, handleError } from '../cliUtils.js';

/**
 * Generate migration report for all migrations
 */
export async function cmdMigrationReport(options) {
  try {
    if (!options.project) {
      throw new Error('--project is required');
    }

    const project = await loadProject(options.project);

    if (options.json) {
      const data = await getMigrationReportData(project);
      output(data, true);
      return;
    }

    const outputPath = options.output ||
      join(getReportsDir(project.slug), `${project.slug}-migrations-report.md`);

    await createMigrationReport(project, outputPath);
    console.log(`Report saved to: ${outputPath}`);
  } catch (error) {
    handleError(error);
  }
}

/**
 * Generate migration report for a single migration
 */
export async function cmdMigrationReportSingle(options) {
  try {
    if (!options.project) {
      throw new Error('--project is required');
    }
    if (!options.migration) {
      throw new Error('--migration is required');
    }

    const project = await loadProject(options.project);

    if (options.json) {
      const data = await getSingleMigrationReportData(project, options.migration);
      if (!data) {
        throw new Error(`Migration "${options.migration}" not found`);
      }
      output(data, true);
      return;
    }

    const outputPath = options.output ||
      join(getReportsDir(project.slug), `${project.slug}-migration-${options.migration}.md`);

    const result = await createSingleMigrationReport(project, options.migration, outputPath);
    if (!result) {
      throw new Error(`Migration "${options.migration}" not found`);
    }
    console.log(`Report saved to: ${outputPath}`);
  } catch (error) {
    handleError(error);
  }
}

/**
 * List all migrations in a project
 */
export async function cmdMigrationList(options) {
  try {
    if (!options.project) {
      throw new Error('--project is required');
    }

    const project = await loadProject(options.project);
    const migrations = await listMigrations(project);

    if (options.json) {
      output(migrations, true);
      return;
    }

    if (migrations.length === 0) {
      console.log('No migrations found.');
      return;
    }

    console.log(`\nMigrations (${migrations.length}):\n`);
    for (const m of migrations) {
      const group = m.group ? ` [${m.group}]` : '';
      console.log(`  ${m.id} - ${m.label}${group}`);
    }
    console.log();
  } catch (error) {
    handleError(error);
  }
}
