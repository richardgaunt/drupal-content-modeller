
Each markdown file we generate should be generated in `projects/<project-name>/reports/<report_file_name.md>`

## Implementation

### Files Changed

- `src/io/fileSystem.js` - Added `getReportsDir(slug)` function that returns `projects/<slug>/reports/`
- `src/cli/menus.js` - Updated `handleEntityReport` and `handleProjectReport` to save reports to project reports directory
- `tests/project.test.mjs` - Added test for `getReportsDir` function

### Details

Reports are now saved to:
- Entity reports: `projects/<slug>/reports/<slug>-<entityType>-report.md`
- Project reports: `projects/<slug>/reports/<slug>-content-model.md`

The `writeTextFile` function automatically creates the `reports/` directory if it doesn't exist.
