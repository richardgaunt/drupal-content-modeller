import { formatHelpText } from './formatHelpText.js';

export const COMPONENT_HELP_DATA = {
  validValues: [
    {
      label: 'Component ID Format',
      values: [
        { name: 'theme_name:component_name', description: 'e.g. civictheme:header' }
      ]
    }
  ],
  notes: [
    'Components are discovered from the theme\'s components/ directory during sync.',
    'Custom components are those in the active theme that do not override a base theme component.',
    'Overridden components have a "replaces" value pointing to the base theme component.'
  ],
  examples: [
    'dcm component list -p my-site',
    'dcm component list -p my-site --json',
    'dcm component list-custom -p my-site',
    'dcm component list-overridden -p my-site --json',
    'dcm component inspect -p my-site -c civictheme:header',
    'dcm component inspect -p my-site -c civictheme:header --json'
  ]
};

export const COMPONENT_HELP = formatHelpText(COMPONENT_HELP_DATA);

export const VIEW_MODE_HELP_DATA = {
  validValues: [
    {
      label: 'Entity Types',
      values: [
        { name: 'node', description: 'Content types' },
        { name: 'media', description: 'Media types' },
        { name: 'paragraph', description: 'Paragraph types' },
        { name: 'taxonomy_term', description: 'Vocabularies' },
        { name: 'block_content', description: 'Block types' }
      ]
    }
  ],
  notes: [
    'View modes control how entities are displayed (e.g. teaser, full, card).',
    'Use --entity-type with list to filter by entity type.',
    'Machine names are auto-generated from the label if not provided.'
  ],
  examples: [
    'dcm view-mode list -p my-site',
    'dcm view-mode list -p my-site -e node --json',
    'dcm view-mode create -p my-site -e node -l "Card"',
    'dcm view-mode create -p my-site -e paragraph -l "Featured" -n featured',
    'dcm view-mode delete -p my-site -e node -n card'
  ]
};

export const VIEW_MODE_HELP = formatHelpText(VIEW_MODE_HELP_DATA);

export const THEME_SUGGESTIONS_HELP_DATA = {
  notes: [
    'Theme suggestions follow Drupal core\'s hook_theme_suggestions_HOOK() patterns.',
    'Suggestions are listed from lowest to highest priority.',
    'Each suggestion shows the preprocess function name and corresponding Twig template.'
  ],
  examples: [
    'dcm theme-suggestions bundle -p my-site -e node -b article',
    'dcm theme-suggestions bundle -p my-site -e node -b article -v teaser',
    'dcm theme-suggestions bundle -p my-site -e paragraph -b hero --json',
    'dcm theme-suggestions field -p my-site -e node -b article -n field_n_subtitle -t string',
    'dcm theme-suggestions field -p my-site -e node -b article -n field_n_subtitle -t string --json'
  ]
};

export const THEME_SUGGESTIONS_HELP = formatHelpText(THEME_SUGGESTIONS_HELP_DATA);
