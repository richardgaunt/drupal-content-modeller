
## 75 Update select bundle to only be able to select 1 bundle at a time

### Description

For field creation, change bundle selection from multi-select (checkbox) to single selection with search capability. Users should be able to type any part of the bundle name to filter options.

### Implementation

**File:** `src/cli/menus.js`

#### Changes Made

1. **Added `search` import** from `@inquirer/prompts`
   ```javascript
   import { select, input, checkbox, search } from '@inquirer/prompts';
   ```

2. **Updated bundle selection in `handleCreateField`**
   - Changed from `checkbox` (multi-select) to `search` (single select with filtering)
   - Users can now type to filter bundles by name or machine name
   - Message updated from "Select bundle(s):" to "Select bundle (type to search):"

#### Before
```javascript
const selectedBundles = await checkbox({
  message: 'Select bundle(s):',
  choices: bundleOptions,
  required: true
});
```

#### After
```javascript
const selectedBundle = await search({
  message: 'Select bundle (type to search):',
  source: async (input) => {
    const searchTerm = (input || '').toLowerCase();
    return bundleEntries.filter(b =>
      b.name.toLowerCase().includes(searchTerm) ||
      b.value.toLowerCase().includes(searchTerm)
    );
  }
});

const selectedBundles = [selectedBundle];
```

### Search Functionality

- Searches both the display name (label) and machine name
- Case-insensitive matching
- Matches any part of the string (not just prefix)
- Shows all bundles when search is empty

### Notes

- The `selectTargetBundles` function (for entity reference fields) remains multi-select since entity references can target multiple bundle types - this is expected Drupal behavior
- The single bundle selection only applies to the "which bundle to add the field to" selection

### Acceptance Criteria

- [x] Bundle selection changed from multi-select to single select
- [x] Search/filter capability added - can type any part of bundle name
- [x] Searches both label and machine name
- [x] All existing tests pass
- [x] Entity reference target bundles remain multi-select (different use case)
