import { formatHelpText } from './formatHelpText.js';

export const ROLE_HELP_DATA = {
  validValues: [
    {
      label: 'Permission Short Names (for --permissions flag)',
      values: [
        { name: 'create', description: 'Create new content' },
        { name: 'edit_own', description: 'Edit own content' },
        { name: 'edit_any', description: 'Edit any content' },
        { name: 'delete_own', description: 'Delete own content' },
        { name: 'delete_any', description: 'Delete any content' },
        { name: 'view_revisions', description: 'View revisions' },
        { name: 'revert_revisions', description: 'Revert revisions' },
        { name: 'delete_revisions', description: 'Delete revisions' }
      ]
    }
  ],
  notes: [
    'Use "all" to grant all permissions for a bundle.',
    'Use "none" with set-permissions to remove all permissions.',
    'Entity types supporting permissions: node, media, taxonomy_term, block_content',
    '(paragraph types do not have content permissions)'
  ],
  examples: [
    'dcm role create -p my-site -l "Content Editor"',
    'dcm role add-permission -p my-site -r content_editor -e node -b article --permissions "create,edit_own"',
    'dcm role add-permission -p my-site -r content_editor -e node -b article --permissions "all"',
    'dcm role set-permissions -p my-site -r content_editor -e node -b article --permissions "none"',
    'dcm role list-permissions -e node -b article',
    'dcm role view -p my-site -r content_editor --json'
  ]
};

export const ROLE_HELP = formatHelpText(ROLE_HELP_DATA);
