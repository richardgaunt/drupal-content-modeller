## 96 - When generating form display - we do not want a default paragraph unless the paragraph field is required

When we generate form displays with paragraph fields (entity_reference_revision) we should not set a default paragraph in `default_paragraph_type`  and set it to: `default_paragraph_type: _none`

If the field is required then add a default paragraph.

This is because otherwise we need to delete the paragraph in the form display each time if we dont want.

### Implementation

- [x] Changed default `default_paragraph_type` from `''` to `'_none'` in `fieldWidgets.js` for both `paragraphs` and `entity_reference_paragraphs` widgets
- [x] Updated `createFormDisplay()` in `formDisplay.js` to check if an `entity_reference_revisions` field is required - if so, sets `default_paragraph_type` to the first target bundle from `handler_settings.target_bundles`
- [x] Added tests for default paragraph type behaviour in `formDisplay.test.mjs`

### Files Changed

- `src/constants/fieldWidgets.js` - Default widget settings for paragraph widgets
- `src/commands/formDisplay.js` - Form display creation logic
- `tests/formDisplay.test.mjs` - Tests for paragraph widget defaults
