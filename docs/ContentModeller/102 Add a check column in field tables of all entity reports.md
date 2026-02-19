
Add an additional column to the field tables in report with a markdown checkbox so i can check that this field is correct

## Implementation (Done)

- **File:** `src/generators/reportGenerator.js`
- Added a `Check` column with `<input type="checkbox">` as the first column in the custom fields table header and each field row
- Uses HTML checkbox since markdown `[ ]` doesn't render inside tables
- Base fields table is unchanged (those are fixed by Drupal)