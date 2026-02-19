## 95 Add report generation just for 1 bundle

### Status: Complete

### Description
Add ability to generate a report for a single bundle instead of a whole entity type or project.

### Implementation

**Files Modified:**
- `src/generators/reportGenerator.js` - Added `generateSingleBundleReport()` function
- `src/commands/report.js` - Added `createBundleReport()` command function
- `src/cli/prompts.js` - Added `report-bundle` menu choice
- `src/cli/menus.js` - Added `handleBundleReport()` handler
- `tests/reportGenerator.test.mjs` - Added tests for single bundle report
- `tests/cli.test.mjs` - Updated menu count test

**New Functions:**

1. **`generateSingleBundleReport(project, entityType, bundleId, baseUrl, options)`**
   - Returns markdown report for a single bundle
   - Includes project name and entity type header
   - Includes base fields and custom fields
   - Returns `null` if bundle not found

2. **`createBundleReport(project, entityType, bundleId, outputPath, baseUrl, options)`**
   - Writes single bundle report to file
   - Returns output path or `null` if bundle not found

**Menu Flow:**
1. User selects "Generate report for bundle"
2. Select entity type (node, media, paragraph, etc.)
3. Select specific bundle from list
4. Optionally enter base URL for links
5. Report saved to `projects/{slug}/reports/{slug}-{entityType}-{bundleId}-report.md`

**Report Output Example:**
```markdown
# Page (node)

**Project:** My Project
**Entity Type:** Content Types

---

### Page (node)

A basic page content type.

**Admin Links:**
- [Edit Form](/admin/structure/types/manage/page)
- [Manage Fields](/admin/structure/types/manage/page/fields)
...

#### Base Fields

| Field Name | Machine Name | Field Type | Widget |
|------------|--------------|------------|--------|
| Title | `title` | string | string_textfield |
...

#### Fields

| Field Name | Machine Name | Field Type | Description | Cardinality | Required | Other | URL |
...
```

### Test Coverage
- Includes project name and entity type in header
- Includes bundle content (description, fields)
- Includes base fields section
- Returns null for non-existent bundle
- Returns null for non-existent entity type
- Uses base URL when provided
