
In the bundle report table, other column, we say references: `<bundle>` change to references: `<bundle>(<entity_type>)`

## Implementation (Done)

### Current behaviour

`getFieldOtherInfo()` in `src/generators/reportGenerator.js` shows:
```
References: page, article
```
It reads `field.settings.handler_settings.target_bundles` (keys only).

### Target behaviour

```
References: page(node), article(node)
```

### Available data

- `field.settings.handler_settings.target_bundles` — bundle names (keys)
- `field.settings.handler` — string like `"default:node"` or `"default:taxonomy_term"` — entity type is after the colon

For `entity_reference_revisions`, the target type is always `paragraph`.

### Files to Modify

| File | Change |
|------|--------|
| `src/generators/reportGenerator.js` | Update `getFieldOtherInfo()` to append entity type to each bundle name |
| `tests/reportGenerator.test.mjs` | Update test expectations for entity_reference fields |

### Steps

1. In `getFieldOtherInfo()`, for `entity_reference` fields, extract the entity type from `field.settings.handler` (split on `:`, take second part, default to `'node'`).
2. For `entity_reference_revisions`, hardcode `'paragraph'` as the entity type.
3. Format each bundle as `bundle(entity_type)`.
4. Update the existing test to expect `"References: page(node), article(node)"`.
