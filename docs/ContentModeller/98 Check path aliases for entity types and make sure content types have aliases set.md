
1. Add the ability to add path alias patterns to any entity types
2. Generate report summarising the alias patterns for each bundle in entity types
3. Add this report to each bundle report and enity report

Research this:

```
config/pathauto.pattern.civictheme_alert.yml
config/pathauto.pattern.civictheme_event.yml
config/pathauto.pattern.civictheme_page.yml

```

To work out options.

In summary in project menu, I want:

Add / Edit path alias for entity
Select Entity
Select Bundle
Edit options for path auto

'[node:title]' - should be the default pattern.
or whatever the machine name of the entity we are creating

## Implementation Plan

### YAML Structure (from research)

Pathauto pattern files follow this structure:
```yaml
langcode: en
status: true
dependencies:
  module:
    - node
id: {pattern_id}
label: {label}
type: 'canonical_entities:node'  # or :media, :taxonomy_term, etc.
pattern: '[node:title]'
selection_criteria:
  {uuid}:
    id: 'entity_bundle:node'
    negate: false
    uuid: {uuid}
    context_mapping:
      node: node
    bundles:
      {bundle}: {bundle}
selection_logic: and
weight: -5
relationships: {}
```

### Default token patterns by entity type

| Entity Type | Default Pattern |
|---|---|
| node | `[node:title]` |
| media | `[media:name]` |
| taxonomy_term | `[term:name]` |
| block_content | n/a (no URL aliases) |
| paragraph | n/a (no URL aliases) |

### Files to Create

| File | Purpose |
|------|---------|
| `src/generators/pathautoGenerator.js` | PURE: Generate pathauto pattern YAML from options |
| `src/parsers/pathautoParser.js` | PURE: Parse pathauto YAML into data object |

### Files to Modify

| File | Change |
|------|--------|
| `src/io/configReader.js` | Add `readPathautoPattern()`, `listPathautoPatterns()` |
| `src/commands/create.js` | Add `createPathautoPattern()` |
| `src/commands/sync.js` | Parse pathauto patterns during project sync |
| `src/cli/menus.js` | Add "Path Aliases" menu option under project menu |
| `src/cli/commands.js` | Add `cmdPathautoCreate`, `cmdPathautoList` CLI handlers |
| `index.mjs` | Register `dcm pathauto create` and `dcm pathauto list` commands |
| `src/generators/reportGenerator.js` | Add path alias row to bundle/entity reports |

### Steps

1. **Create pathautoGenerator.js** — `generatePathautoPattern(entityType, bundle, pattern, options)` returns YAML string. Uses UUID for selection_criteria key (can use `crypto.randomUUID()`).
2. **Create pathautoParser.js** — `parsePathautoPattern(config)` returns `{ id, label, entityType, bundle, pattern, weight }`.
3. **Update configReader.js** — `listPathautoPatterns(configPath)` reads all `pathauto.pattern.*.yml` files; `readPathautoPattern(configPath, id)` reads one.
4. **Update sync.js** — During `syncProject`, parse pathauto patterns and store them on the project object (e.g. `project.pathautoPatterns`).
5. **Add CLI commands** — `dcm pathauto create -p <project> -e <type> -b <bundle> --pattern "[node:title]"` and `dcm pathauto list -p <project>`.
6. **Add interactive menu** — Under project menu, add "Manage Path Aliases" which lists existing patterns and allows create/edit.
7. **Update reports** — In `generateBundleReport`, add a "Path Alias" row showing the pattern if one exists for the bundle.