import { formatHelpText } from './formatHelpText.js';

export const REPORT_HELP_DATA = {
  notes: [
    'Reports are saved as markdown files. Default location is the project\'s reports directory.',
    'Use --base-url to include admin links in the report.',
    'The project must be synced before generating reports.'
  ],
  examples: [
    'dcm report entity -p my-site -e node',
    'dcm report entity -p my-site -e node -o ~/docs/content-types.md',
    'dcm report project -p my-site',
    'dcm report project -p my-site -o ~/docs/content-model.md -u https://staging.mysite.com'
  ]
};

export const REPORT_HELP = formatHelpText(REPORT_HELP_DATA);
