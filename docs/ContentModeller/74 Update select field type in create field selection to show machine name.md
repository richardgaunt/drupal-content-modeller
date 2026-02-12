
## 74 Update select field type in create field selection to show machine name

### Description

Currently in "Select field type:" we only show the field type label. Update to show both the human-readable label and the Drupal machine name.

### Implementation

Updated `FIELD_TYPES` in `src/generators/fieldGenerator.js` to include machine names in the display format:

**Format:** `Label (machine_name)`

### Before and After

| Before | After |
|--------|-------|
| Text (plain) | Text - plain (string) |
| Text (plain, long) | Text - plain, long (string_long) |
| Text (formatted, long) | Text - formatted, long (text_long) |
| Boolean | Boolean (boolean) |
| Number (integer) | Number - integer (integer) |
| List (text) | List - text (list_string) |
| Date | Date (datetime) |
| Date range | Date range (daterange) |
| Link | Link (link) |
| Image | Image (image) |
| File | File (file) |
| Entity Reference | Entity reference (entity_reference) |
| Paragraphs (Entity Reference Revisions) | Paragraphs (entity_reference_revisions) |

### Changes Made

**File:** `src/generators/fieldGenerator.js`
- Updated `FIELD_TYPES` array to include machine names in display text
- Used consistent format: `Label (machine_name)` or `Label - qualifier (machine_name)`

### Acceptance Criteria

- [x] Field type selection shows machine name in parentheses
- [x] All existing tests pass
- [x] Format is consistent across all field types
