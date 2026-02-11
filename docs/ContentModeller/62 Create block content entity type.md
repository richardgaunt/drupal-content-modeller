# Create block_content entity type

Add support for block_content entity type (Custom Block Types in Drupal).

## Research Summary

### Block Content Configuration Structure

Bundle config files follow the pattern: `block_content.type.{machine_name}.yml`

Example YAML structure:
```yaml
langcode: en
status: true
dependencies: {}
id: civictheme_banner
label: Banner
revision: false
description: 'Provides a block type to create CivicTheme banners.'
```

Key fields:
- `id` - Machine name
- `label` - Human-readable name
- `description` - Description
- `revision` - Whether revisions are enabled (typically false)

### Field Naming Convention

Existing block_content fields use the prefix `field_c_b_` (e.g., `field_c_b_theme`, `field_c_b_background_image`).

### Field Config Patterns

- Storage: `field.storage.block_content.{field_name}.yml`
- Instance: `field.field.block_content.{bundle}.{field_name}.yml`

The storage config includes `block_content` in the module dependencies.

---

## Implementation Plan

### 1. Update Config Parser (src/parsers/configParser.js)

Add block_content to `ENTITY_TYPE_PATTERNS`:
```javascript
block_content: {
  bundlePrefix: 'block_content.type.',
  bundleSuffix: '.yml',
  fieldStoragePrefix: 'field.storage.block_content.',
  fieldInstancePrefix: 'field.field.block_content.'
}
```

Add parser function `parseBlockContentTypeBundle`:
```javascript
export function parseBlockContentTypeBundle(config) {
  return {
    id: config.id || '',
    label: config.label || '',
    description: config.description || ''
  };
}
```

Update `parseBundleConfig` to include block_content case.

### 2. Update Bundle Generator (src/generators/bundleGenerator.js)

Add `generateBlockContentType` function:
```javascript
export function generateBlockContentType({ label, machineName, description = '' }) {
  const config = {
    langcode: 'en',
    status: true,
    dependencies: {},
    id: machineName,
    label: label,
    revision: false,
    description: description
  };
  return yaml.dump(config, { quotingType: "'", forceQuotes: false });
}
```

Update `getBundleFilename` to return `block_content.type.${machineName}.yml`.

Update `generateBundle` to call `generateBlockContentType`.

### 3. Update Field Generator (src/generators/fieldGenerator.js)

Add to `ENTITY_PREFIXES`:
```javascript
block_content: 'field_c_b_'
```

Update `generateFieldInstance` to add block_content bundle dependency:
```javascript
case 'block_content':
  configDeps.push(`block_content.type.${bundle}`);
  break;
```

### 4. Update CLI Menus (src/cli/menus.js)

Add to `ENTITY_TYPE_CHOICES`:
```javascript
{ value: 'block_content', name: 'Block Content Type' }
```

Add to `REFERENCE_TARGET_CHOICES`:
```javascript
{ value: 'block_content', name: 'Block Content' }
```

### 5. Add Tests

Create/update tests in:
- `tests/configParser.test.mjs` - Add block_content parsing tests
- `tests/bundleGenerator.test.mjs` - Add generateBlockContentType tests
- `tests/fieldGenerator.test.mjs` - Add block_content prefix and instance tests

---

## Files to Modify

1. `src/parsers/configParser.js`
2. `src/generators/bundleGenerator.js`
3. `src/generators/fieldGenerator.js`
4. `src/cli/menus.js`
5. `tests/configParser.test.mjs`
6. `tests/bundleGenerator.test.mjs`
7. `tests/fieldGenerator.test.mjs`

---

## Acceptance Criteria

- [x] block_content bundles are detected and listed during sync
- [x] Can create new block_content types via CLI
- [x] Can add fields to block_content types
- [x] block_content appears in entity type selection menus
- [x] block_content appears as a target for entity reference fields
- [x] All tests pass

---

## Implementation Complete

All changes implemented and tested. 261 tests passing.
