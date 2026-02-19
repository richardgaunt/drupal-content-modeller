
1. Update project report to JSON formatted report of the project

2. Review the project, entity and bunde reports
3. Add a proposed JSON structure for each to this ticket
4. Add a flag `--json` for these reports

Research, review and create implementation

## Implementation Plan

### Current state

- `--json` flag already exists on `dcm report entity` and `dcm report project` CLI commands
- Currently, `--json` only outputs `{ outputPath }` — the file path, not structured data
- `dcm report entity` does not have a `--json` flag on the `bundle` subcommand (there's no `dcm report bundle` CLI command)

### Proposed JSON structures

**Bundle report (`dcm report entity -e node -b article --json`)**
```json
{
  "entityType": "node",
  "bundle": "article",
  "label": "Article",
  "description": "...",
  "adminLinks": [
    { "name": "Manage Fields", "url": "/admin/structure/types/manage/article/fields" }
  ],
  "baseFields": [
    { "name": "title", "label": "Title", "type": "string", "widget": "string_textfield" }
  ],
  "fields": [
    {
      "name": "field_n_body",
      "label": "Body",
      "type": "text_long",
      "description": "",
      "cardinality": 1,
      "required": false,
      "other": "-"
    }
  ]
}
```

**Entity type report (`dcm report entity -e node --json`)**
```json
{
  "entityType": "node",
  "label": "Content Types",
  "bundles": [ ...array of bundle objects as above... ]
}
```

**Project report (`dcm report project --json`)**
```json
{
  "project": "My Project",
  "baseUrl": "https://example.com",
  "entityTypes": [
    {
      "entityType": "node",
      "label": "Content Types",
      "bundles": [ ...bundle objects... ]
    }
  ]
}
```

### Files to Modify

| File | Change |
|------|--------|
| `src/generators/reportGenerator.js` | Add `generateBundleReportData()`, `generateEntityTypeReportData()`, `generateProjectReportData()` — return structured objects instead of markdown |
| `src/cli/commands.js` | Update `cmdReportEntity`, `cmdReportProject` to output structured JSON when `--json` and no `--output` |
| `tests/reportGenerator.test.mjs` | Add tests for JSON data generation functions |

### Steps

1. **Add data generation functions** in `reportGenerator.js` — mirror existing markdown generators but return plain objects.
2. **Update `cmdReportEntity`** — when `--json` is passed, call `generateEntityTypeReportData()` and output to stdout instead of writing a file. If `-o` is also passed, still write the markdown file.
3. **Update `cmdReportProject`** — same pattern.
4. **Add tests** for the new data functions.