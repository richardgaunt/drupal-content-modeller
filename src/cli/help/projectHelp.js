import { formatHelpText } from './formatHelpText.js';

export const PROJECT_HELP_DATA = {
  notes: [
    '--config-path should point to Drupal\'s config/sync directory',
    '(the directory containing .yml files like node.type.*.yml)'
  ],
  examples: [
    'dcm project create -n "My Site" -c ~/work/mysite/config/sync',
    'dcm project create -n "My Site" -c ~/drupal/config -u https://mysite.com',
    'dcm project list --json',
    'dcm project sync -p my-site',
    'dcm project edit -p my-site --base-url https://staging.mysite.com',
    'dcm project delete -p old-project --force'
  ]
};

export const PROJECT_HELP = formatHelpText(PROJECT_HELP_DATA);
