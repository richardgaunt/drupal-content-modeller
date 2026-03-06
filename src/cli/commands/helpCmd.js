/**
 * Help Command
 */

import chalk from 'chalk';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { output, handleError } from '../cliUtils.js';

/**
 * Serialize a Commander option to a plain object
 */
function serializeOption(opt) {
  const result = {
    flags: opt.flags,
    description: opt.description,
    required: opt.mandatory || false
  };
  if (opt.defaultValue !== undefined) {
    result.defaultValue = opt.defaultValue;
  }
  return result;
}

/**
 * Serialize a Commander command tree to a plain object
 */
function serializeCommand(cmd) {
  const result = {
    name: cmd.name(),
    description: cmd.description()
  };

  const options = cmd.options.filter(o => o.flags !== '-h, --help');
  if (options.length > 0) {
    result.options = options.map(serializeOption);
  }

  if (cmd._helpData) {
    if (cmd._helpData.examples) {
      result.examples = cmd._helpData.examples;
    }
    if (cmd._helpData.validValues) {
      result.validValues = cmd._helpData.validValues;
    }
    if (cmd._helpData.notes) {
      result.notes = cmd._helpData.notes;
    }
    if (cmd._helpData.workflow) {
      result.workflow = cmd._helpData.workflow;
    }
  }

  const subcommands = cmd.commands.filter(c => c.name() !== 'help');
  if (subcommands.length > 0) {
    result.subcommands = subcommands.map(serializeCommand);
  }

  return result;
}

/**
 * Show full CLI reference or specific command help
 */
export async function cmdHelp(command, options, cmd) {
  try {
    const parentProgram = cmd.parent;

    if (command === 'all') {
      const __dirname = dirname(fileURLToPath(import.meta.url));
      const commandsPath = join(__dirname, '..', '..', '..', 'COMMANDS.md');
      const helpText = readFileSync(commandsPath, 'utf-8');
      if (options.json) {
        output({ help: helpText }, true);
      } else {
        output(helpText);
      }
      return;
    }

    if (command) {
      const targetCmd = parentProgram.commands.find(c => c.name() === command);
      if (!targetCmd) {
        throw new Error(`Unknown command: "${command}". Run "dcm help" to see available commands.`);
      }

      if (options.json) {
        output(serializeCommand(targetCmd), true);
      } else {
        targetCmd.help();
      }
      return;
    }

    if (options.json) {
      const commands = parentProgram.commands
        .filter(c => c.name() !== 'help')
        .map(c => ({
          name: c.name(),
          description: c.description(),
          help: `dcm help ${c.name()} --json`
        }));
      output({ name: 'dcm', description: parentProgram.description(), commands }, true);
    } else {
      const commands = parentProgram.commands.filter(c => c.name() !== 'help');
      const lines = [
        chalk.bold('Drupal Content Modeller (dcm)'),
        '',
        'CLI tool for designing and generating Drupal content models as YAML',
        'configuration files. Works offline — no running Drupal instance needed.',
        '',
        chalk.bold('Key Concepts:'),
        '  project        A workspace representing one Drupal site',
        '  entity type    node, media, paragraph, taxonomy_term, block_content',
        '  bundle         A specific type within an entity type (e.g. "Article")',
        '  field          A data field on a bundle (e.g. "Subtitle")',
        '  form display   Controls how fields appear on the edit form',
        '  role           A user role with CRUD permissions on bundles',
        '',
        chalk.bold('Typical Workflow:'),
        '  1. dcm project create    Create a project',
        '  2. dcm project sync      Import existing Drupal config',
        '  3. dcm bundle create     Create entity bundles',
        '  4. dcm field create      Add fields to bundles',
        '  5. dcm form-display create  Configure form displays',
        '  6. dcm role create       Set up roles and permissions',
        '  7. dcm report project    Generate reports',
        '  8. dcm drush sync        Sync config to Drupal',
        '',
        chalk.bold('Commands:'),
        ...commands.map(c => `  ${c.name().padEnd(16)}${c.description()}`),
        '',
        chalk.bold('Getting detailed help:'),
        `  dcm help ${chalk.cyan('<command>')}          Show detailed help for a command group`,
        `  dcm help ${chalk.cyan('<command>')} --json   Machine-readable help with examples`,
        `  dcm ${chalk.cyan('<command>')} --help        Show options for a command group`,
        ''
      ];
      output(lines.join('\n'));
    }
  } catch (error) {
    handleError(error);
  }
}
