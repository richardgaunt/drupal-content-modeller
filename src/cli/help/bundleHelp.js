import { formatHelpText } from './formatHelpText.js';

export const BUNDLE_HELP_DATA = {
  validValues: [
    {
      label: 'Entity Types',
      values: [
        { name: 'node', description: 'Content types (pages, articles, etc.)' },
        { name: 'media', description: 'Media types (images, documents, videos)' },
        { name: 'paragraph', description: 'Paragraph types (reusable components)' },
        { name: 'taxonomy_term', description: 'Taxonomy vocabularies (categories, tags)' },
        { name: 'block_content', description: 'Custom block types' }
      ]
    }
  ],
  notes: [
    'Media bundles require --source-type (image, file, or remote_video)',
    'Machine name is required (--machine-name / -m)'
  ],
  examples: [
    'dcm bundle create -p my-site -e node -l "Blog Post" -m blog_post',
    'dcm bundle create -p my-site -e media -l "Document" -m document -s file',
    'dcm bundle create -p my-site -e paragraph -l "Hero Banner" -m hero_banner',
    'dcm bundle list -p my-site -e node --json'
  ]
};

export const BUNDLE_HELP = formatHelpText(BUNDLE_HELP_DATA);
