## 94 Add check for field name length - max 32 characters

### Status: Complete

### Description
When creating new fields, Drupal has a 32 character limit on machine names. We should check that field names are less than this limit and return an error if exceeded.

### Implementation

**Files Modified:**
- `src/commands/create.js` - Added length validation to `validateFieldMachineName()`
- `tests/create.test.mjs` - Added tests for the 32-character limit

**Changes:**
1. Added `FIELD_NAME_MAX_LENGTH = 32` constant
2. Modified `validateFieldMachineName()` to check `fieldName.length > FIELD_NAME_MAX_LENGTH`
3. Returns descriptive error message showing current length: `"Field name must be 32 characters or less (currently X)"`

**Example:**
```javascript
// field_n_ (8 chars) + long_label (24+ chars) could exceed 32
validateFieldMachineName('field_n_this_name_is_way_too_long');
// Returns: "Field name must be 32 characters or less (currently 33)"
```

### Test Coverage
- Rejects field names exceeding 32 characters with descriptive error
- Accepts field names at exactly 32 characters
- Existing tests for format validation still pass
