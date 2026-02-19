import { formatHelpText } from './formatHelpText.js';

export const DRUSH_HELP_DATA = {
  notes: [
    'Project must have drupalRoot configured (path to Drupal installation)',
    'Drush must be installed and accessible (default command: "drush")',
    'Check status with: dcm drush status -p <project>',
    'Many commands also support --sync to sync automatically after changes'
  ],
  workflow: [
    'Create bundles/fields with dcm',
    'Run "dcm drush sync -p <project>" to import config into Drupal',
    'Drupal adds UUIDs and third-party settings during import',
    'The export step captures those additions back to config files'
  ],
  examples: [
    'dcm drush status -p my-site',
    'dcm drush sync -p my-site',
    'dcm bundle create -p my-site -e node -l "Article" --sync'
  ]
};

export const DRUSH_HELP = formatHelpText(DRUSH_HELP_DATA);
