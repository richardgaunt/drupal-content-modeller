# 61 Create Field

## Goal
Implement "Create a field" feature that generates YAML configuration for new fields on bundles.

## Dependencies
- 60 Create Bundle
- 31 Sync Configuration

## Acceptance Criteria
- [ ] Prompts user to select entity type
- [ ] Prompts user to select target bundle(s) - multi-select
- [ ] Prompts user to select field type from supported types
- [ ] For all fields, prompts for:
  - Label
  - Machine name (auto-generated with entity prefix, editable)
  - Description (optional)
  - Required? (yes/no)
  - Cardinality (single/unlimited)
- [ ] Type-specific prompts (see below)
- [ ] Checks if field storage already exists for this entity type
  - If exists: only create field instance(s)
  - If not: create storage + instance(s)
- [ ] Generates correct YAML files:
  - `field.storage.{entity}.{field_name}.yml` (if new)
  - `field.field.{entity}.{bundle}.{field_name}.yml` (per bundle)
- [ ] Saves files to project's config directory
- [ ] Updates project entities

## Type-Specific Prompts

### String
- Max length (default: 255)

### List String
- Options (prompt for key|label pairs until done)

### Entity Reference
- Target type: Media, Taxonomy, Node, Paragraph
- Target bundles (multi-select from project's synced data)

### Entity Reference Revisions (Paragraphs)
- Target paragraph types (multi-select from project's synced paragraphs)

### Link
- Allow external URLs? (yes/no, default: yes)
- Link title: disabled/optional/required (default: optional)

### Image
- Allowed extensions (default: png gif jpg jpeg svg)
- Alt text required? (yes/no, default: yes)
- File directory (default: images/[date:custom:Y]-[date:custom:m])
- Max file size (optional)
- Max resolution (optional)

### File
- Allowed extensions (default: txt pdf doc docx xls xlsx)
- File directory (default: documents/[date:custom:Y]-[date:custom:m])
- Max file size (optional)

## Reference Files
- `docs/ContentModeller/02 Research.md` - field patterns
- `docs/ContentModeller/03 Data Structures.md` - field schemas
- `config/field.storage.node.field_c_n_body.yml` - storage example
- `config/field.field.node.civictheme_page.field_c_n_body.yml` - instance example

## Implementation Notes
- Store generators in `src/generators/fieldGenerator.js`
- Field name prefix by entity: `field_c_n_`, `field_c_m_`, `field_c_p_`, etc.
- When reusing storage, validate field type matches

## Field Type to Module Mapping
```javascript
const fieldModules = {
  string: 'core',
  string_long: 'core',
  text_long: 'text',
  boolean: 'core',
  integer: 'core',
  list_string: 'options',
  list_integer: 'options',
  datetime: 'datetime',
  daterange: 'datetime_range',
  link: 'link',
  image: 'image',
  file: 'file',
  entity_reference: 'core',
  entity_reference_revisions: 'entity_reference_revisions'
};
```

## Example Flow

```
? Select entity type: Node
? Select bundle(s): [x] Page  [x] Event  [ ] Alert
? Select field type: Entity Reference
? Field label: Related Topics
? Machine name: field_c_n_related_topics
? Description: Select related topic tags
? Required? No
? Cardinality: Unlimited
? Target type: Taxonomy Term
? Target bundles: [x] Topics  [ ] Site Sections

Creating field storage: field.storage.node.field_c_n_related_topics.yml
Creating field instance: field.field.node.civictheme_page.field_c_n_related_topics.yml
Creating field instance: field.field.node.civictheme_event.field_c_n_related_topics.yml

✓ Created 3 configuration files
```

## Tests
Test file: `tests/fieldGenerator.test.js`

### Unit Tests - Field Storage Generation
- [ ] `generateFieldStorage returns valid YAML` - parseable, correct structure
- [ ] `generateFieldStorage includes correct module` - maps type to module
- [ ] `generateFieldStorage sets cardinality` - 1 or -1
- [ ] `generateFieldStorage includes type-specific settings` - allowed_values for list_string

### Unit Tests - Field Instance Generation
- [ ] `generateFieldInstance returns valid YAML` - parseable, correct structure
- [ ] `generateFieldInstance includes dependencies` - storage and bundle refs
- [ ] `generateFieldInstance sets required` - true/false
- [ ] `generateFieldInstance includes type-specific settings` - handler_settings for refs

### Unit Tests - File Naming
- [ ] `getStorageFilename returns correct format` - field.storage.{entity}.{field}.yml
- [ ] `getInstanceFilename returns correct format` - field.field.{entity}.{bundle}.{field}.yml

### Unit Tests - Field Name Generation
- [ ] `generateFieldName adds correct prefix for node` - field_c_n_
- [ ] `generateFieldName adds correct prefix for media` - field_c_m_
- [ ] `generateFieldName adds correct prefix for paragraph` - field_c_p_
- [ ] `generateFieldName converts label to machine name` - "My Field" → "field_c_n_my_field"

### Unit Tests - Type-Specific Settings
- [ ] `getStringSettings includes max_length` - default 255
- [ ] `getListStringSettings includes allowed_values` - array of value/label
- [ ] `getEntityReferenceSettings includes target_type` - media/taxonomy_term/node
- [ ] `getEntityReferenceSettings includes handler_settings` - target_bundles
- [ ] `getLinkSettings includes link_type` - 16 or 17
- [ ] `getLinkSettings includes title` - 0, 1, or 2
- [ ] `getImageSettings includes file_extensions` - default png gif jpg jpeg svg
- [ ] `getImageSettings includes alt_field_required` - true/false
- [ ] `getImageSettings includes file_directory` - default pattern
- [ ] `getFileSettings includes file_extensions` - default extensions
- [ ] `getFileSettings includes file_directory` - default pattern

### Unit Tests - Module Mapping
- [ ] `getModuleForFieldType returns core for string` - correct module
- [ ] `getModuleForFieldType returns text for text_long` - correct module
- [ ] `getModuleForFieldType returns options for list_string` - correct module
- [ ] `getModuleForFieldType returns link for link` - correct module
- [ ] `getModuleForFieldType returns image for image` - correct module
- [ ] `getModuleForFieldType returns file for file` - correct module
