
Add an additional column to the field tables in report with a markdown checkbox so i can check that this field is correct

## Implementation

- **File:** `src/generators/reportGenerator.js`
- Added a `Check` column with `[ ]` as the first column in the custom fields table header and each field row
- Base fields table is unchanged (those are fixed by Drupal)