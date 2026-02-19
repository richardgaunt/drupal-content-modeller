import { formatHelpText } from './formatHelpText.js';

export const ADMIN_HELP_DATA = {
  notes: [
    'Admin links use the project\'s base URL. Set it with: dcm project edit -p my-site --base-url https://mysite.com',
    'Without a base URL, only the path portion is shown.'
  ],
  examples: [
    'dcm admin links -p my-site -e node -b article',
    'dcm admin links -p my-site -e media -b image --json'
  ]
};

export const ADMIN_HELP = formatHelpText(ADMIN_HELP_DATA);
