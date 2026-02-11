# 51 List Fields

## Goal
Implement "List fields of entity" and "List fields of bundle" features.

## Dependencies
- 31 Sync Configuration
- 40 CLI Interface

## Acceptance Criteria

### List Fields of Entity Type
- [ ] Prompts user to select entity type (node, media, paragraph, taxonomy_term)
- [ ] Shows all fields used by that entity type across all bundles
- [ ] Displays: Field Label, Machine Name, Type, Bundles (comma-separated list)
- [ ] Fields sorted alphabetically by label
- [ ] Shows "No fields found" if entity type has no bundles/fields

### List Fields of Bundle
- [ ] Prompts user to select entity type
- [ ] Prompts user to select bundle from that entity type
- [ ] Displays all fields for that specific bundle
- [ ] Shows: Field Label, Machine Name, Type, Required, Cardinality
- [ ] Fields sorted by label
- [ ] Shows "No fields found" if bundle has no fields

## Reference Files
- `src/commands/sync.js` - synced project data

## Implementation Notes
- Store in `src/commands/list.js` (extend from ticket 50)
- Cardinality display: `1` shows "Single", `-1` shows "Unlimited"
- Required display: `true` shows "Yes", `false` shows "No"

## Example Output - List Fields of Entity

```
Fields for Node types in "CivicTheme"

┌──────────────┬───────────────────┬──────────────────┬─────────────────────────────┐
│ Label        │ Machine Name      │ Type             │ Used In Bundles             │
├──────────────┼───────────────────┼──────────────────┼─────────────────────────────┤
│ Body         │ field_c_n_body    │ text_long        │ page, event                 │
│ Summary      │ field_c_n_summary │ string_long      │ page, event, alert          │
│ Thumbnail    │ field_c_n_thumb   │ entity_reference │ page, event                 │
│ Topics       │ field_c_n_topics  │ entity_reference │ page, event                 │
└──────────────┴───────────────────┴──────────────────┴─────────────────────────────┘

Total: 12 unique fields across 3 node types
```

## Example Output - List Fields of Bundle

```
Fields for Node > Page in "CivicTheme"

┌──────────────┬───────────────────┬──────────────────┬──────────┬─────────────┐
│ Label        │ Machine Name      │ Type             │ Required │ Cardinality │
├──────────────┼───────────────────┼──────────────────┼──────────┼─────────────┤
│ Body         │ field_c_n_body    │ text_long        │ No       │ Single      │
│ Components   │ field_c_n_comps   │ entity_reference │ No       │ Unlimited   │
│ Summary      │ field_c_n_summary │ string_long      │ No       │ Single      │
│ Thumbnail    │ field_c_n_thumb   │ entity_reference │ No       │ Single      │
│ Topics       │ field_c_n_topics  │ entity_reference │ No       │ Unlimited   │
└──────────────┴───────────────────┴──────────────────┴──────────┴─────────────┘

Total: 5 fields
```

## Tests
Test file: `tests/list.test.js` (extend from ticket 50)

### Unit Tests - List Fields of Entity
- [ ] `getFieldsForEntityType returns all fields across bundles` - aggregates correctly
- [ ] `getFieldsForEntityType deduplicates fields` - same field on multiple bundles listed once
- [ ] `getFieldsForEntityType lists bundle usage` - shows which bundles use each field
- [ ] `getFieldsForEntityType sorts by label` - alphabetical order
- [ ] `getFieldsForEntityType returns empty for no fields` - handles empty case

### Unit Tests - List Fields of Bundle
- [ ] `getFieldsForBundle returns fields for specific bundle` - correct fields
- [ ] `getFieldsForBundle includes required status` - true/false mapped
- [ ] `getFieldsForBundle includes cardinality` - 1 → "Single", -1 → "Unlimited"
- [ ] `getFieldsForBundle sorts by label` - alphabetical order
- [ ] `getFieldsForBundle returns empty for no fields` - handles empty case

### Unit Tests - Formatting
- [ ] `formatCardinality returns Single for 1` - correct mapping
- [ ] `formatCardinality returns Unlimited for -1` - correct mapping
- [ ] `formatRequired returns Yes for true` - correct mapping
- [ ] `formatRequired returns No for false` - correct mapping
