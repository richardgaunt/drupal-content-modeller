
Change to a multi-select checkbox rather than selcet 1 report that will generate many bundle reports at the same time.

## Implementation

- **File:** `src/cli/menus.js` — `handleBundleReport()`
- Changed bundle selection from `select` (single) to `checkbox` (multi-select)
- After selecting an entity type, users can now check multiple bundles
- A separate report file is generated for each selected bundle