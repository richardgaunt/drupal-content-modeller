
When updating a form display, if the original YAML had a UUID (added by Drupal during `drush cex`), it was being silently dropped on save.

## Root Cause

Two functions failed to handle UUID:

1. **Parser** (`src/parsers/formDisplayParser.js:parseFormDisplay`) did not include `uuid` in the returned object
2. **Generator** (`src/generators/formDisplayGenerator.js:generateFormDisplay`) did not output `uuid` in the generated YAML config

## Implementation

- `src/parsers/formDisplayParser.js` — Preserve `config.uuid` in parsed result when present
- `src/generators/formDisplayGenerator.js` — Include `formDisplay.uuid` in output config when present
- `tests/formDisplay.test.mjs` — Added 4 tests: parser preserves/omits uuid, generator includes/omits uuid