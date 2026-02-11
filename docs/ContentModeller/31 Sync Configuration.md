# 31 Sync Configuration

## Goal
Implement the "Sync project configuration" feature that analyzes the config directory and updates the project's entity/field index.

## Dependencies
- 20 Project Management
- 30 Config Parser

## Acceptance Criteria
- [ ] `syncProject(project)` reads config directory and updates project.entities
- [ ] For each entity type (node, media, paragraph, taxonomy_term):
  - Finds all bundles
  - For each bundle, finds all field instances
  - Merges field storage data (type, cardinality) with instance data (label, required)
- [ ] Updates `project.lastSync` with current ISO timestamp
- [ ] Saves updated project to disk
- [ ] Returns summary: `{bundlesFound: 12, fieldsFound: 87}`
- [ ] Handles empty config directories gracefully
- [ ] Handles partially valid configs (skips invalid files, logs warnings)

## Reference Files
- `src/parsers/configParser.js` - parsing functions
- `src/commands/project.js` - project save function

## Implementation Notes
- Store in `src/commands/sync.js`
- Build a map of field storages first, then match with instances
- Field instance references storage via `field.storage.{entity}.{field}` dependency
- Log progress during sync: "Found 3 node types... Found 42 paragraph types..."

## Example Project After Sync
```json
{
  "name": "CivicTheme",
  "slug": "civictheme",
  "configDirectory": "/path/to/config",
  "lastSync": "2025-01-15T10:30:00.000Z",
  "entities": {
    "node": {
      "civictheme_page": {
        "id": "civictheme_page",
        "label": "Page",
        "description": "Use pages for static content",
        "fields": {
          "field_c_n_body": {
            "name": "field_c_n_body",
            "label": "Body",
            "type": "text_long",
            "required": false,
            "cardinality": 1
          },
          "field_c_n_topics": {
            "name": "field_c_n_topics",
            "label": "Topics",
            "type": "entity_reference",
            "required": false,
            "cardinality": -1,
            "settings": {
              "target_type": "taxonomy_term"
            }
          }
        }
      }
    }
  }
}
```

## Tests
Test file: `tests/sync.test.js`

### Unit Tests
- [ ] `syncProject updates project.entities` - entities object populated
- [ ] `syncProject finds all entity types` - node, media, paragraph, taxonomy_term
- [ ] `syncProject merges storage and instance data` - type from storage, label from instance
- [ ] `syncProject sets lastSync timestamp` - ISO format, recent time
- [ ] `syncProject returns correct summary` - bundlesFound and fieldsFound counts
- [ ] `syncProject handles empty config directory` - returns zeros, no crash
- [ ] `syncProject handles partial configs` - skips invalid, continues with valid
- [ ] `syncProject preserves existing project data` - name, slug unchanged

