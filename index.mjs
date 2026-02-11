#!/usr/bin/env node

import chalk from 'chalk';
import { input } from '@inquirer/prompts';
import { program } from 'commander';

/**
 * Registers all available commands with the Commander program
 * @param {import('commander').Command} program - The Commander program instance
 */
export function registerCommands(program) {
  program
    .name('drupal-content-modeller')
    .version('1.0.0')
    .description('Creates content types and basic fields for a new project.')
    .addHelpCommand('help [command]', 'Display help for a command');

  program
    .command('configure')
    .description('Configure the application')
    .action(() => {
      helloWorld();
    });

  return program;
}

/**
 * Main entry point for the CLI application
 */
export async function main() {
  const cli = registerCommands(program);

  // When run without arguments, show the interactive menu
  if (process.argv.length <= 2) {
    showMainMenu();
  } else {
    cli.parse(process.argv);
  }
}

/**
 * Shows the interactive main menu
 */
export async function showMainMenu() {
  console.log(chalk.green('🚀 Drupal content modeller'));
  console.log(chalk.white('Creates content types and basic fields for a new project.'));
  console.log();

  const action = await input({
    message: 'What would you like to do?',
    default: 'configure',
  });

  if (action === 'configure') {
    helloWorld();
  } else {
    console.log(chalk.yellow('Unknown command. Try "configure" instead.'));
  }
}

/**
 * Prompts for the user's name and displays a personalized greeting
 */
export async function helloWorld() {
  const name = await input({
    message: 'What is your name?',
    default: 'world',
  });

  console.log(chalk.blue(`Hello, ${name}!`));
  console.log(chalk.green('Thank you for using Drupal content modeller'));
}

main();
