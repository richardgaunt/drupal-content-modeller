# 50 List Entity Types

## Goal
Implement "List entity types" feature that displays all bundles across all entity types.

## Dependencies
- 31 Sync Configuration
- 40 CLI Interface

## Acceptance Criteria
- [ ] Shows warning if project has never been synced
- [ ] Displays table with columns: Entity Type, Label, Machine Name, Field Count
- [ ] Groups by entity type (Node, Media, Paragraph, Taxonomy)
- [ ] Sorted alphabetically within each group
- [ ] Shows total count at bottom
- [ ] Returns to project menu after display

## Reference Files
- `src/commands/sync.js` - synced project data
- `docs/ContentModeller/03 Data Structures.md` - project structure

## Implementation Notes
- Store in `src/commands/list.js`
- Use `console.table()` or format manually for alignment
- Example output:

```
Entity Types for "CivicTheme"
Last synced: 2025-01-15 10:30 AM

Node Types (3)
┌─────────────────────┬───────────────────┬────────┐
│ Label               │ Machine Name      │ Fields │
├─────────────────────┼───────────────────┼────────┤
│ Alert               │ civictheme_alert  │ 5      │
│ Event               │ civictheme_event  │ 12     │
│ Page                │ civictheme_page   │ 8      │
└─────────────────────┴───────────────────┴────────┘

Media Types (6)
┌─────────────────────┬─────────────────────────┬────────┐
│ Label               │ Machine Name            │ Fields │
├─────────────────────┼─────────────────────────┼────────┤
│ Audio               │ civictheme_audio        │ 2      │
│ Document            │ civictheme_document     │ 2      │
│ ...                 │ ...                     │ ...    │
└─────────────────────┴─────────────────────────┴────────┘

Paragraph Types (42)
...

Total: 54 bundles across 4 entity types
```

## Tests
Test file: `tests/list.test.js`

### Unit Tests
- [ ] `formatEntityTypeTable returns formatted string` - correct table structure
- [ ] `formatEntityTypeTable sorts alphabetically` - bundles in order
- [ ] `formatEntityTypeTable counts fields correctly` - field count matches
- [ ] `groupBundlesByEntityType groups correctly` - node, media, paragraph, taxonomy separate
- [ ] `getBundleSummary returns warning for unsynced project` - lastSync null case
- [ ] `getBundleSummary returns correct totals` - bundleCount, entityTypeCount accurate
- [ ] `formatLastSync formats date correctly` - human-readable format
