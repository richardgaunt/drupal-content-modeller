## 93 Add base fields to entity reports

### Status: Complete

### Description
Add the node fields we add to form display to the entity report field section. For these there are no "Manage fields" section, just the form display section.

Also check for base field override config files.

### Base Field Override Format
`core.base_field_override.<entity_type>.<bundle>.<field_name>.yml`

Example: `core.base_field_override.node.test_bundle.title.yml`

```yaml
uuid: <uuid>
langcode: en
status: true
dependencies:
  config:
    - node.type.test_bundle
id: node.test_bundle.title
field_name: title
entity_type: node
bundle: test_bundle
label: 'Test title'
description: ''
required: true
translatable: true
default_value: {  }
default_value_callback: ''
settings: {  }
field_type: string
```

### Implementation

**Files Modified:**
- `src/generators/reportGenerator.js` - Added base fields section to bundle reports
- `src/parsers/configParser.js` - Added base field override parsing functions
- `src/io/configReader.js` - Added `parseBaseFieldOverrides()` I/O function
- `tests/reportGenerator.test.mjs` - Added tests for base fields in reports
- `tests/configParser.test.mjs` - Added tests for base field override parsing

**Changes:**

1. **Report Generator** (`reportGenerator.js`):
   - Imported `getBaseFields` from `baseFields.js`
   - Modified `generateBundleReport()` to include a "Base Fields" section
   - Base fields table shows: Field Name, Machine Name, Field Type, Widget
   - Supports `baseFieldOverrides` option to use custom labels from override files

2. **Config Parser** (`configParser.js`):
   - `isBaseFieldOverrideFile(filename)` - Check if file is a base field override
   - `extractBaseFieldOverrideInfo(filename)` - Extract entityType, bundle, fieldName from filename
   - `filterBaseFieldOverrideFiles(files, entityType, bundle)` - Filter files for specific bundle
   - `parseBaseFieldOverride(config)` - Parse override YAML to extract label, description, required, etc.

3. **Config Reader** (`configReader.js`):
   - `parseBaseFieldOverrides(configPath, entityType, bundle)` - Read all base field overrides for a bundle

**Report Output Example:**
```markdown
### Article (node)

#### Base Fields

| Field Name | Machine Name | Field Type | Widget |
|------------|--------------|------------|--------|
| Title | `title` | string | string_textfield |
| Published | `status` | boolean | boolean_checkbox |
| Authored by | `uid` | entity_reference | entity_reference_autocomplete |

#### Fields

| Field Name | Machine Name | Field Type | ... |
```

### Test Coverage
- Base fields section appears in node bundle reports
- Base fields section appears in taxonomy_term bundle reports
- Base field override labels are used when available
- Base field override file parsing extracts correct data
- Filter functions correctly identify override files
