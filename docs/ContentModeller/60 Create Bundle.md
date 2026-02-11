# 60 Create Bundle

## Goal
Implement "Create a bundle" feature that generates YAML configuration for new entity bundles.

## Dependencies
- 40 CLI Interface
- 30 Config Parser (for understanding YAML structure)

## Acceptance Criteria
- [ ] Prompts user to select entity type: Node, Media, Paragraph, Taxonomy
- [ ] For all entity types, prompts for:
  - Label (human-readable name)
  - Machine name (auto-generated from label, editable)
  - Description (optional)
- [ ] For Media types, additionally prompts for:
  - Source type: Image, File, Remote Video
  - Source field name (auto-generated based on source)
- [ ] Validates machine name:
  - Lowercase letters and underscores only
  - Doesn't already exist in project
- [ ] Generates correct YAML file:
  - `node.type.{machine_name}.yml` for nodes
  - `media.type.{machine_name}.yml` for media
  - `paragraphs.paragraphs_type.{machine_name}.yml` for paragraphs
  - `taxonomy.vocabulary.{machine_name}.yml` for taxonomy
- [ ] For Media types, also generates source field:
  - `field.storage.media.{source_field}.yml`
  - `field.field.media.{machine_name}.{source_field}.yml`
- [ ] Saves files to project's config directory
- [ ] Displays success message with file paths created
- [ ] Updates project entities (runs partial sync)

## Reference Files
- `docs/ContentModeller/02 Research.md` - YAML templates
- `docs/ContentModeller/03 Data Structures.md` - bundle schemas
- `config/node.type.civictheme_page.yml` - example
- `config/media.type.civictheme_image.yml` - example with source field

## Implementation Notes
- Store generators in `src/generators/bundleGenerator.js`
- Store command in `src/commands/create.js`
- Machine name generation: `"My Content Type"` → `"my_content_type"`
- Media source field naming:
  - Image source: `field_c_m_{bundle}_image`
  - File source: `field_c_m_{bundle}_file`
  - Remote video: `field_c_m_{bundle}_video_url`

## YAML Templates

### Node Type
```yaml
langcode: en
status: true
dependencies: {}
name: {label}
type: {machine_name}
description: '{description}'
help: null
new_revision: true
preview_mode: 1
display_submitted: false
```

### Media Type (Image)
```yaml
langcode: en
status: true
dependencies: {}
id: {machine_name}
label: {label}
description: '{description}'
source: image
queue_thumbnail_downloads: false
new_revision: true
source_configuration:
  source_field: {source_field}
field_map:
  name: name
```

### Paragraph Type
```yaml
langcode: en
status: true
dependencies: {}
id: {machine_name}
label: {label}
icon_uuid: null
icon_default: null
description: '{description}'
behavior_plugins: {}
```

### Taxonomy Vocabulary
```yaml
langcode: en
status: true
dependencies: {}
name: {label}
vid: {machine_name}
description: '{description}'
weight: 0
new_revision: false
```

## Tests
Test file: `tests/bundleGenerator.test.js`

### Unit Tests - YAML Generation
- [ ] `generateNodeType returns valid YAML` - parseable, correct structure
- [ ] `generateNodeType includes all required fields` - name, type, status, etc.
- [ ] `generateMediaType returns valid YAML` - parseable, correct structure
- [ ] `generateMediaType includes source configuration` - source_field set
- [ ] `generateMediaType sets correct source plugin` - image/file/oembed:video
- [ ] `generateParagraphType returns valid YAML` - parseable, correct structure
- [ ] `generateVocabulary returns valid YAML` - parseable, correct structure

### Unit Tests - File Naming
- [ ] `getBundleFilename returns correct name for node` - node.type.{name}.yml
- [ ] `getBundleFilename returns correct name for media` - media.type.{name}.yml
- [ ] `getBundleFilename returns correct name for paragraph` - paragraphs.paragraphs_type.{name}.yml
- [ ] `getBundleFilename returns correct name for taxonomy` - taxonomy.vocabulary.{name}.yml

### Unit Tests - Machine Name
- [ ] `generateMachineName converts spaces to underscores` - "My Type" → "my_type"
- [ ] `generateMachineName lowercases` - "MyType" → "mytype"
- [ ] `generateMachineName removes invalid characters` - only a-z and underscore
- [ ] `validateMachineName rejects invalid characters` - returns false for "my-type"
- [ ] `validateMachineName accepts valid name` - returns true for "my_type"

### Unit Tests - Media Source Fields
- [ ] `generateMediaSourceField creates storage YAML` - valid field storage
- [ ] `generateMediaSourceField creates instance YAML` - valid field instance
- [ ] `getSourceFieldName returns correct name for image` - field_c_m_{bundle}_image
- [ ] `getSourceFieldName returns correct name for file` - field_c_m_{bundle}_file
