# 66 Create Support for entity_reference_revisions Field Type

## Goal
Add support for creating `entity_reference_revisions` fields, used for paragraph references in Drupal.

## Dependencies
- 61 Create Field (base field creation infrastructure)

## Research Summary

Based on analysis of config directory examples:

### Key Differences from entity_reference

| Aspect | entity_reference_revisions | entity_reference |
|--------|---------------------------|------------------|
| Module | `entity_reference_revisions` | `core` |
| Type value | `entity_reference_revisions` | `entity_reference` |
| Primary use | Paragraph composition | General entity refs |
| Handler settings | Includes `target_bundles_drag_drop` | Simpler structure |
| Cardinality | Usually unlimited (-1) | Often limited |

### Example Field Storage Config
```yaml
langcode: en
status: true
dependencies:
  module:
    - entity_reference_revisions
    - paragraphs
id: node.field_c_n_components
field_name: field_c_n_components
entity_type: node
type: entity_reference_revisions
settings:
  target_type: paragraph
module: entity_reference_revisions
locked: false
cardinality: -1
translatable: true
indexes: {}
persist_with_no_fields: false
custom_storage: false
```

### Example Field Instance Config
```yaml
langcode: en
status: true
dependencies:
  config:
    - field.storage.node.field_c_n_components
    - paragraphs.paragraphs_type.accordion
    - paragraphs.paragraphs_type.content
  module:
    - entity_reference_revisions
id: node.civictheme_page.field_c_n_components
field_name: field_c_n_components
entity_type: node
bundle: civictheme_page
label: Components
description: ''
required: false
translatable: true
default_value: []
default_value_callback: ''
settings:
  handler: 'default:paragraph'
  handler_settings:
    target_bundles:
      accordion: accordion
      content: content
    negate: 0
    target_bundles_drag_drop:
      accordion:
        weight: 0
        enabled: true
      content:
        weight: 1
        enabled: true
field_type: entity_reference_revisions
```

---

## Implementation Plan

### Part 1: Update Field Type Definition

**File: `src/generators/fieldGenerator.js`**

The `entity_reference_revisions` type already exists in `FIELD_TYPES` array (verified in research). Verify it includes:
```javascript
{ value: 'entity_reference_revisions', name: 'Paragraphs (Entity Reference Revisions)' }
```

### Part 2: Update Module Mapping

**File: `src/generators/fieldGenerator.js`**

Update `getModuleForFieldType()`:
```javascript
case 'entity_reference_revisions':
  return 'entity_reference_revisions';
```

### Part 3: Add Storage Settings Function

**File: `src/generators/fieldGenerator.js`**

Create `getEntityReferenceRevisionsStorageSettings()`:
```javascript
function getEntityReferenceRevisionsStorageSettings() {
  return {
    target_type: 'paragraph'  // Always paragraph for this field type
  };
}
```

Update `generateFieldStorage()` to use this for `entity_reference_revisions` type.

### Part 4: Add Instance Settings Function

**File: `src/generators/fieldGenerator.js`**

Create `getEntityReferenceRevisionsHandlerSettings()`:
```javascript
function getEntityReferenceRevisionsHandlerSettings(options) {
  const targetBundles = {};
  const dragDrop = {};

  if (options.targetBundles && Array.isArray(options.targetBundles)) {
    options.targetBundles.forEach((bundle, index) => {
      targetBundles[bundle] = bundle;
      dragDrop[bundle] = {
        weight: index,
        enabled: true
      };
    });
  }

  return {
    handler: 'default:paragraph',
    handler_settings: {
      target_bundles: targetBundles,
      negate: 0,
      target_bundles_drag_drop: dragDrop
    }
  };
}
```

### Part 5: Update generateFieldStorage

**File: `src/generators/fieldGenerator.js`**

In `generateFieldStorage()`, add case for storage settings:
```javascript
case 'entity_reference_revisions':
  settings = getEntityReferenceRevisionsStorageSettings();
  break;
```

Update dependencies to include both modules:
```javascript
if (type === 'entity_reference_revisions') {
  dependencies.module = ['entity_reference_revisions', 'paragraphs'];
}
```

### Part 6: Update generateFieldInstance

**File: `src/generators/fieldGenerator.js`**

In `generateFieldInstance()`, add case for instance settings:
```javascript
case 'entity_reference_revisions':
  Object.assign(config.settings, getEntityReferenceRevisionsHandlerSettings(options));
  // Add paragraph bundle dependencies
  if (options.targetBundles) {
    config.dependencies.config = options.targetBundles.map(
      bundle => `paragraphs.paragraphs_type.${bundle}`
    );
  }
  break;
```

### Part 7: Update CLI Prompts

**File: `src/cli/menus.js`**

In `getTypeSpecificSettings()`, ensure `entity_reference_revisions` prompts for paragraph bundles:
```javascript
case 'entity_reference_revisions': {
  // Get paragraph bundles from project
  const paragraphBundles = Object.keys(project.entities.paragraph || {});

  if (paragraphBundles.length === 0) {
    console.log(chalk.yellow('No paragraph types found. Create paragraph types first.'));
    return null;
  }

  const targetBundles = await checkbox({
    message: 'Select paragraph types to allow:',
    choices: paragraphBundles.map(id => ({
      name: project.entities.paragraph[id].label,
      value: id
    })),
    required: true
  });

  return { targetBundles };
}
```

### Part 8: Update Default Cardinality

**File: `src/cli/menus.js`** or field creation flow

For `entity_reference_revisions`, suggest unlimited cardinality:
```javascript
const defaultCardinality = (fieldType === 'entity_reference_revisions') ? -1 : 1;
```

---

## Acceptance Criteria

- [ ] `entity_reference_revisions` available in field type selection
- [ ] Prompts user to select paragraph bundles when creating field
- [ ] Shows error if no paragraph types exist in project
- [ ] Generated storage config includes `entity_reference_revisions` module dependency
- [ ] Generated storage config includes `paragraphs` module dependency
- [ ] Storage settings have `target_type: paragraph`
- [ ] Instance settings include `handler: 'default:paragraph'`
- [ ] Instance settings include `target_bundles` with selected paragraphs
- [ ] Instance settings include `target_bundles_drag_drop` with weights
- [ ] Instance dependencies include paragraph type config references
- [ ] Default cardinality is unlimited (-1)

## Tests

Test file: `tests/entity-reference-revisions.test.js`

### Unit Tests
- [ ] `getModuleForFieldType returns entity_reference_revisions module`
- [ ] `getEntityReferenceRevisionsStorageSettings returns paragraph target`
- [ ] `getEntityReferenceRevisionsHandlerSettings builds target_bundles correctly`
- [ ] `getEntityReferenceRevisionsHandlerSettings builds drag_drop with weights`
- [ ] `generateFieldStorage includes both module dependencies`
- [ ] `generateFieldInstance includes paragraph config dependencies`
- [ ] `generateFieldInstance uses default:paragraph handler`

### Integration Tests
- [ ] Full field creation generates valid storage YAML
- [ ] Full field creation generates valid instance YAML
- [ ] Generated configs match CivicTheme examples structure
