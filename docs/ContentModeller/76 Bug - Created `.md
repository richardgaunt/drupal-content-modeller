
## 76 Bug - Invalid 'core' module dependency in generated config

### Description

Generated field configuration files were including `dependencies.module: ['core']` which causes Drupal config import to fail with the error:

```
Configuration field.field.node.news.field_n_featured_image depends on the
core module that will not be installed after import.
```

**Root cause:** In Drupal, `core` is not a valid module for dependencies. The `module: core` property in field storage indicates the field type is provided by core, but this should NOT be included in `dependencies.module`.

### Solution

Two changes were made to `src/generators/fieldGenerator.js`:

#### 1. Added ENTITY_TYPE_MODULES mapping

Maps entity types to their Drupal modules for proper dependency declarations:

```javascript
export const ENTITY_TYPE_MODULES = {
  node: 'node',
  media: 'media',
  paragraph: 'paragraphs',
  taxonomy_term: 'taxonomy',
  block_content: 'block_content'
};
```

#### 2. Fixed generateFieldStorage function

Updated module dependency logic to:
- Never include 'core' in `dependencies.module`
- Include proper module dependencies based on field type
- Include the host entity type's module

**Before:**
```javascript
const moduleDeps = module !== 'core' ? [module] : [];
```

**After:**
```javascript
const moduleDeps = [];

if (fieldType === 'entity_reference_revisions') {
  moduleDeps.push('entity_reference_revisions', 'paragraphs');
} else if (fieldType === 'entity_reference') {
  const targetType = settings.targetType || 'node';
  const targetModule = ENTITY_TYPE_MODULES[targetType];
  if (targetModule) {
    moduleDeps.push(targetModule);
  }
} else if (module !== 'core') {
  moduleDeps.push(module);
}

// Always include the host entity type's module
const entityModule = ENTITY_TYPE_MODULES[entityType];
if (entityModule && !moduleDeps.includes(entityModule)) {
  moduleDeps.push(entityModule);
}
```

#### 3. Fixed generateFieldInstance function

Updated to only include `dependencies.module` when there are non-core modules:

**Before:**
```javascript
dependencies: {
  config: configDeps,
  module: [module]
}
```

**After:**
```javascript
const moduleDeps = [];
if (module !== 'core') {
  moduleDeps.push(module);
}

const dependencies = {
  config: configDeps
};
if (moduleDeps.length > 0) {
  dependencies.module = moduleDeps;
}
```

### Example Output

**Field Storage for entity_reference to media (corrected):**
```yaml
dependencies:
  module:
    - media
    - node
```

**Field Instance for entity_reference (corrected):**
```yaml
dependencies:
  config:
    - field.storage.node.field_n_featured_image
    - node.type.news
    - media.type.civictheme_image
# Note: No module dependency since entity_reference is from core
```

### Files Changed

- `src/generators/fieldGenerator.js` - Added ENTITY_TYPE_MODULES, fixed generateFieldStorage and generateFieldInstance

### Acceptance Criteria

- [x] Generated field storage does not include 'core' in dependencies.module
- [x] Generated field instance does not include 'core' in dependencies.module
- [x] Entity reference fields include target type module in storage dependencies
- [x] All field types include host entity type module in storage dependencies
- [x] All existing tests pass (385 tests)
- [x] Generated config can be imported into Drupal without module dependency errors
