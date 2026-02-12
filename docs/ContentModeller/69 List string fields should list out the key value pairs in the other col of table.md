

In the report for fields, we have an other column. For list_string fields we should list out the options (the key|value pairs).

Update the report generation for this type of field.

## Implementation

### Files Changed

- `src/generators/reportGenerator.js` - Updated `getFieldOtherInfo()` function
- `tests/reportGenerator.test.mjs` - Updated tests for list_string display

### Details

The `getFieldOtherInfo` function now displays list_string options as:
- One option per line using `<br>` tags for markdown table compatibility
- Format: `key::label` (using `::` separator to avoid conflicts with markdown table pipes)

Example output in the "Other" column:
```
draft::Draft<br>published::Published<br>archived::Archived
```

Also fixed:
- Field URLs now use format `entity_type.bundle.field_machine_name` instead of just `field_machine_name`
