#!/usr/bin/env node

import { showMainMenu } from './src/cli/menus.js';

/**
 * Main entry point for the CLI application
 */
async function main() {
  try {
    await showMainMenu();
  } catch (error) {
    console.error('Fatal error:', error.message);
    process.exit(1);
  }
}

main();
