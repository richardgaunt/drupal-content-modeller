
Currently does not say whether they are date and time or just date fields. Update the other column.

## Implementation (Done)

### Current state

- `getFieldOtherInfo()` in `src/generators/reportGenerator.js` has no case for `datetime` or `daterange` fields — returns `-`
- The `datetime_type` value is available at `field.settings.datetime_type` after parsing
- Values: `"date"` (date only) or `"datetime"` (date and time)

### Target output

| Field Type | datetime_type | Other column |
|---|---|---|
| datetime | date | Date only |
| datetime | datetime | Date and time |
| daterange | date | Date only |
| daterange | datetime | Date and time |

### Files to Modify

| File | Change |
|------|--------|
| `src/generators/reportGenerator.js` | Add `datetime`/`daterange` case to `getFieldOtherInfo()` |
| `tests/reportGenerator.test.mjs` | Add tests for datetime field other info |

### Steps

1. In `getFieldOtherInfo()`, add a case for `datetime` and `daterange`:
   ```javascript
   if (field.type === 'datetime' || field.type === 'daterange') {
     const datetimeType = field.settings?.datetime_type;
     parts.push(datetimeType === 'datetime' ? 'Date and time' : 'Date only');
   }
   ```
2. Add tests for both `date` and `datetime` values on both field types.