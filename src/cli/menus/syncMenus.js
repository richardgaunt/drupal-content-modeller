/**
 * Sync Menu Handlers
 * Handles sync-related menu actions.
 */

import { select, checkbox, Separator } from '@inquirer/prompts';
import chalk from 'chalk';

import { syncProject, checkProjectModules, enableProjectModules, getRecommendedModulesBySource } from '../../commands/sync.js';

/**
 * Handle sync configuration action
 * @param {object} project - The current project
 * @returns {Promise<void>}
 */
export async function handleSync(project) {
  console.log(chalk.cyan('Syncing configuration...'));

  try {
    const result = await syncProject(project);
    console.log(chalk.green('Sync complete!'));
    console.log(chalk.cyan(`Found ${result.bundlesFound} bundles and ${result.fieldsFound} fields`));
    if (result.componentsFound > 0) {
      console.log(chalk.cyan(`Found ${result.componentsFound} theme components`));
    }

    // Check for missing recommended modules
    await checkAndPromptForModules(project);
  } catch (error) {
    console.log(chalk.red(`Sync failed: ${error.message}`));
  }
}

/**
 * Check for missing recommended modules and prompt to enable them
 * @param {object} project - The current project
 * @returns {Promise<void>}
 */
export async function checkAndPromptForModules(project) {
  try {
    const { missingModules } = await checkProjectModules(project);

    if (missingModules.length === 0) {
      return;
    }

    const { core, contrib } = getRecommendedModulesBySource();
    const missingCore = missingModules.filter(mod => core.includes(mod));
    const missingContrib = missingModules.filter(mod => contrib.includes(mod));

    console.log();
    console.log(chalk.yellow('Some recommended modules are not enabled:'));
    if (missingCore.length > 0) {
      console.log(chalk.yellow('  Core modules:'));
      for (const mod of missingCore) {
        console.log(chalk.yellow(`    - ${mod}`));
      }
    }
    if (missingContrib.length > 0) {
      console.log(chalk.yellow('  Contrib modules (require download):'));
      for (const mod of missingContrib) {
        console.log(chalk.yellow(`    - ${mod}`));
      }
      console.log();
      console.log(chalk.cyan('Install missing contrib modules with:'));
      console.log(chalk.cyan(`  composer require ${missingContrib.map(mod => `drupal/${mod}`).join(' ')}`));
    }
    console.log();
    console.log(chalk.cyan('These modules are recommended for effective content modelling.'));

    const enableNow = await select({
      message: 'Would you like to enable these modules now?',
      choices: [
        { value: 'select', name: 'Select which modules to enable' },
        { value: 'all', name: 'Enable all missing modules' },
        { value: 'skip', name: 'Skip for now' }
      ]
    });

    if (enableNow === 'skip') {
      return;
    }

    let modulesToEnable;
    if (enableNow === 'all') {
      modulesToEnable = missingModules;
    } else {
      const choices = [];
      if (missingCore.length > 0) {
        choices.push(new Separator('── Core modules ──'));
        choices.push(...missingCore.map(mod => ({ value: mod, name: mod, checked: true })));
      }
      if (missingContrib.length > 0) {
        choices.push(new Separator('── Contrib modules (require download) ──'));
        choices.push(...missingContrib.map(mod => ({ value: mod, name: mod, checked: true })));
      }
      modulesToEnable = await checkbox({
        message: 'Select modules to enable:',
        choices
      });
    }

    if (modulesToEnable.length > 0) {
      await enableProjectModules(project, modulesToEnable);
      console.log(chalk.green('Modules enabled in core.extension.yml:'));
      for (const mod of modulesToEnable) {
        console.log(chalk.green(`  - ${mod}`));
      }
    }
  } catch (error) {
    console.log(chalk.yellow(`Could not check modules: ${error.message}`));
  }
}

/**
 * Handle enable required modules action
 * @param {object} project - The current project
 * @returns {Promise<void>}
 */
export async function handleEnableModules(project) {
  try {
    const { missingModules, enabledModules } = await checkProjectModules(project);
    const { core, contrib } = getRecommendedModulesBySource();

    console.log();
    console.log(chalk.cyan('Recommended core modules:'));
    for (const mod of core) {
      if (enabledModules.includes(mod)) {
        console.log(chalk.green(`  ✓ ${mod}`));
      } else {
        console.log(chalk.yellow(`  ✗ ${mod}`));
      }
    }
    console.log(chalk.cyan('Recommended contrib modules (require download):'));
    for (const mod of contrib) {
      if (enabledModules.includes(mod)) {
        console.log(chalk.green(`  ✓ ${mod}`));
      } else {
        console.log(chalk.yellow(`  ✗ ${mod}`));
      }
    }
    const missingContrib = missingModules.filter(mod => contrib.includes(mod));
    if (missingContrib.length > 0) {
      console.log();
      console.log(chalk.cyan('Install missing contrib modules with:'));
      console.log(chalk.cyan(`  composer require ${missingContrib.map(mod => `drupal/${mod}`).join(' ')}`));
    }
    console.log();

    if (missingModules.length === 0) {
      console.log(chalk.green('All strongly recommended content modules are enabled.'));
      return;
    }

    const enableNow = await select({
      message: 'Enable missing modules?',
      choices: [
        { value: 'select', name: 'Select which modules to enable' },
        { value: 'all', name: 'Enable all missing modules' },
        { value: 'skip', name: 'Cancel' }
      ]
    });

    if (enableNow === 'skip') {
      return;
    }

    let modulesToEnable;
    if (enableNow === 'all') {
      modulesToEnable = missingModules;
    } else {
      const missingCore = missingModules.filter(mod => core.includes(mod));
      const missingContrib = missingModules.filter(mod => contrib.includes(mod));
      const choices = [];
      if (missingCore.length > 0) {
        choices.push(new Separator('── Core modules ──'));
        choices.push(...missingCore.map(mod => ({ value: mod, name: mod, checked: true })));
      }
      if (missingContrib.length > 0) {
        choices.push(new Separator('── Contrib modules (require download) ──'));
        choices.push(...missingContrib.map(mod => ({ value: mod, name: mod, checked: true })));
      }
      modulesToEnable = await checkbox({
        message: 'Select modules to enable:',
        choices
      });
    }

    if (modulesToEnable.length > 0) {
      await enableProjectModules(project, modulesToEnable);
      console.log();
      console.log(chalk.green('Modules enabled in core.extension.yml:'));
      for (const mod of modulesToEnable) {
        console.log(chalk.green(`  - ${mod}`));
      }
      console.log();
    }
  } catch (error) {
    if (error.name === 'ExitPromptError') {
      return;
    }
    console.log(chalk.red(`Error: ${error.message}`));
  }
}
