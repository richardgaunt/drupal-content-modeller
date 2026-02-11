# 30 Config Parser

## Goal
Parse Drupal YAML configuration files to extract entity types, bundles, and fields.

## Dependencies
- 10 Project Setup

## Acceptance Criteria
- [ ] `parseConfigDirectory(configPath)` scans directory and returns parsed data
- [ ] `parseBundleConfigs(configPath, entityType)` extracts bundles for an entity type:
  - Node types from `node.type.*.yml`
  - Media types from `media.type.*.yml`
  - Paragraph types from `paragraphs.paragraphs_type.*.yml`
  - Vocabularies from `taxonomy.vocabulary.*.yml`
- [ ] `parseFieldStorages(configPath, entityType)` extracts field storage definitions:
  - From `field.storage.{entityType}.*.yml`
  - Returns `{fieldName, type, cardinality, settings}`
- [ ] `parseFieldInstances(configPath, entityType, bundle)` extracts field instances:
  - From `field.field.{entityType}.{bundle}.*.yml`
  - Returns `{fieldName, label, required, settings}`
- [ ] All parsers handle missing/malformed files gracefully
- [ ] Tests cover parsing of sample CivicTheme config files

## Reference Files
- `config/node.type.civictheme_page.yml` - sample node type
- `config/media.type.civictheme_image.yml` - sample media type
- `config/field.storage.node.field_c_n_body.yml` - sample field storage
- `config/field.field.node.civictheme_page.field_c_n_body.yml` - sample field instance
- `docs/ContentModeller/02 Research.md` - file patterns

## Implementation Notes
- Store pure parsing functions in `src/parsers/configParser.js`
- Store file I/O in `src/io/fileSystem.js`
- Parsers receive YAML strings, not file paths (pure functions)
- Use `js-yaml` for YAML parsing
- File naming patterns:
  | Entity Type | Bundle Pattern |
  |---|---|
  | node | `node.type.{bundle}.yml` |
  | media | `media.type.{bundle}.yml` |
  | paragraph | `paragraphs.paragraphs_type.{bundle}.yml` |
  | taxonomy_term | `taxonomy.vocabulary.{bundle}.yml` |

## Example Output
```javascript
// parseBundleConfigs(configPath, 'node')
[
  { id: 'civictheme_page', label: 'Page', description: '...' },
  { id: 'civictheme_event', label: 'Event', description: '...' }
]

// parseFieldInstances(configPath, 'node', 'civictheme_page')
[
  { name: 'field_c_n_body', label: 'Body', type: 'text_long', required: false },
  { name: 'field_c_n_topics', label: 'Topics', type: 'entity_reference', required: false }
]
```

## Tests
Test file: `tests/configParser.test.js`

Use `tests/fixtures/` directory with sample YAML files for testing.

### Unit Tests - Bundle Parsing
- [ ] `parseBundleConfigs finds node types` - parses node.type.*.yml files
- [ ] `parseBundleConfigs finds media types` - parses media.type.*.yml files
- [ ] `parseBundleConfigs finds paragraph types` - parses paragraphs.paragraphs_type.*.yml
- [ ] `parseBundleConfigs finds vocabularies` - parses taxonomy.vocabulary.*.yml
- [ ] `parseBundleConfigs returns empty array for missing entity type` - no crash
- [ ] `parseBundleConfigs extracts id, label, description` - correct properties

### Unit Tests - Field Storage Parsing
- [ ] `parseFieldStorages finds field storages` - parses field.storage.{entity}.*.yml
- [ ] `parseFieldStorages extracts type and cardinality` - correct properties
- [ ] `parseFieldStorages extracts settings` - entity_reference target_type, list allowed_values
- [ ] `parseFieldStorages returns empty for no storages` - handles missing files

### Unit Tests - Field Instance Parsing
- [ ] `parseFieldInstances finds field instances` - parses field.field.{entity}.{bundle}.*.yml
- [ ] `parseFieldInstances extracts label and required` - correct properties
- [ ] `parseFieldInstances extracts settings` - handler_settings for references
- [ ] `parseFieldInstances returns empty for no fields` - handles bundles with no fields

### Unit Tests - Error Handling
- [ ] `handles malformed YAML gracefully` - logs warning, continues parsing
- [ ] `handles missing directory` - throws descriptive error
- [ ] `handles permission errors` - throws descriptive error

