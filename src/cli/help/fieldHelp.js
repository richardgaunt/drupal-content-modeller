import { formatHelpText } from './formatHelpText.js';

export const FIELD_HELP_DATA = {
  validValues: [
    {
      label: 'Field Types',
      values: [
        { name: 'string', description: 'Plain text (single line)' },
        { name: 'string_long', description: 'Plain text (multi-line)' },
        { name: 'text_long', description: 'Formatted text (HTML)' },
        { name: 'boolean', description: 'True/false' },
        { name: 'integer', description: 'Whole number' },
        { name: 'list_string', description: 'Select list (text keys)' },
        { name: 'list_integer', description: 'Select list (integer keys)' },
        { name: 'datetime', description: 'Date/time' },
        { name: 'daterange', description: 'Date range' },
        { name: 'link', description: 'URL/link' },
        { name: 'image', description: 'Image file' },
        { name: 'file', description: 'File upload' },
        { name: 'entity_reference', description: 'Reference to another entity' },
        { name: 'entity_reference_revisions', description: 'Paragraph reference' },
        { name: 'webform', description: 'Webform reference' }
      ]
    },
    {
      label: 'Field Name Prefixes (auto-generated per entity type)',
      values: [
        { name: 'node', description: 'field_n_' },
        { name: 'media', description: 'field_m_' },
        { name: 'paragraph', description: 'field_p_' },
        { name: 'taxonomy_term', description: 'field_t_' },
        { name: 'block_content', description: 'field_b_' }
      ]
    }
  ],
  examples: [
    'dcm field create -p my-site -e node -b article -t string -l "Subtitle"',
    'dcm field create -p my-site -e node -b article -t entity_reference_revisions -l "Components" --target-bundles "hero,text_block" --cardinality -1',
    'dcm field list -p my-site -e node -b article --json',
    'dcm field edit -p my-site -e node -b article -n field_n_subtitle --label "Article Subtitle"'
  ]
};

export const FIELD_HELP = formatHelpText(FIELD_HELP_DATA);

export const FIELD_CREATE_HELP_DATA = {
  validValues: [
    {
      label: 'Field Types and Type-Specific Options',
      values: [
        { name: 'string', description: '--max-length <num>' },
        { name: 'string_long', description: '(no type-specific options)' },
        { name: 'text_long', description: '(no type-specific options)' },
        { name: 'boolean', description: '(no type-specific options)' },
        { name: 'integer', description: '(no type-specific options)' },
        { name: 'list_string', description: '--allowed-values "key1|Label 1,key2|Label 2"' },
        { name: 'list_integer', description: '--allowed-values "1|One,2|Two,3|Three"' },
        { name: 'datetime', description: '--datetime-type <date|datetime>' },
        { name: 'daterange', description: '--datetime-type <date|datetime>' },
        { name: 'link', description: '--link-type <external|internal> --title-option <optional|required|disabled>' },
        { name: 'image', description: '--file-extensions "png jpg" --file-directory "images" --alt-required' },
        { name: 'file', description: '--file-extensions "pdf doc" --file-directory "documents"' },
        { name: 'entity_reference', description: '--target-type <entity_type> --target-bundles "bundle1,bundle2"' },
        { name: 'entity_reference_revisions', description: '--target-bundles "paragraph1,paragraph2"' },
        { name: 'webform', description: '(no type-specific options)' }
      ]
    },
    {
      label: 'Common Options',
      values: [
        { name: '--required', description: 'Make field required' },
        { name: '--cardinality <n>', description: 'Number of values (1 = single, -1 = unlimited)' },
        { name: '--description <d>', description: 'Help text shown to editors' }
      ]
    }
  ],
  examples: [
    'dcm field create -p my-site -e node -b article -t list_string -l "Status" --allowed-values "draft|Draft,published|Published,archived|Archived"',
    'dcm field create -p my-site -e node -b article -t image -l "Hero Image" --file-extensions "png jpg jpeg webp" --alt-required',
    'dcm field create -p my-site -e node -b article -t entity_reference -l "Category" --target-type taxonomy_term --target-bundles "categories"'
  ]
};

export const FIELD_CREATE_HELP = formatHelpText(FIELD_CREATE_HELP_DATA);
