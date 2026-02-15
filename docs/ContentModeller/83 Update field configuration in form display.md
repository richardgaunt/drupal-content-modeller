## 83 Update field configuration (in form display)

### Dependencies
- Ticket 79 (Implement form display)

### Problem
When showing a hidden field in form display, we need to know its widget type and settings. Currently:
1. Hidden fields in Drupal only store `field_name: true` in the hidden section
2. We cannot store custom DCM config in the YAML as it gets wiped on config import/export
3. We need to derive widget info from the field instance config file

### Solution
Get field details from the corresponding field instance config file (`field.field.<entity_type>.<bundle>.<field_name>.yml`) and use a mapping of field types to available widgets.

### Field Type to Widget Mapping

Each field type has specific widgets that can be used. When showing a hidden field, we should:
1. Read the field instance config to get the field type
2. Look up available widgets for that field type
3. Use the default widget or prompt user to select

#### Widget Mappings

The first widget in each array is the default. Copy this to `src/constants/fieldWidgets.js`:

```javascript
/**
 * Field Type to Widget Mapping
 * Maps Drupal field types to their available form widgets.
 * First widget in array is the default.
 */
export const FIELD_WIDGETS = {
  boolean: [
    { type: 'boolean_checkbox', label: 'Single on/off checkbox', settings: { display_label: true } },
    { type: 'options_buttons', label: 'Check boxes/radio buttons', settings: {} }
  ],
  created: [
    { type: 'datetime_timestamp', label: 'Datetime Timestamp', settings: {} }
  ],
  daterange: [
    { type: 'daterange_default', label: 'Date and time range', settings: {} },
    { type: 'daterange_datelist', label: 'Select list', settings: { increment: '15', date_order: 'YMD', time_type: '24' } }
  ],
  datetime: [
    { type: 'datetime_default', label: 'Date and time', settings: {} },
    { type: 'datetime_datelist', label: 'Select list', settings: { increment: '15', date_order: 'YMD', time_type: '24' } }
  ],
  decimal: [
    { type: 'number', label: 'Number field', settings: { placeholder: '' } }
  ],
  email: [
    { type: 'email_default', label: 'Email', settings: { size: 60, placeholder: '' } }
  ],
  entity_reference: [
    { type: 'entity_reference_autocomplete', label: 'Autocomplete', settings: { match_operator: 'CONTAINS', match_limit: 10, size: 60, placeholder: '' } },
    { type: 'media_library_widget', label: 'Media library', settings: { media_types: [] } },
    { type: 'options_select', label: 'Select list', settings: {} },
    { type: 'entity_reference_autocomplete_tags', label: 'Autocomplete (Tags style)', settings: { match_operator: 'CONTAINS', match_limit: 10, size: 60, placeholder: '' } },
    { type: 'options_buttons', label: 'Check boxes/radio buttons', settings: {} }
  ],
  entity_reference_revisions: [
    { type: 'paragraphs', label: 'Paragraphs (stable)', settings: { title: 'Paragraph', title_plural: 'Paragraphs', edit_mode: 'open', closed_mode: 'summary', autocollapse: 'none', closed_mode_threshold: 0, add_mode: 'dropdown', form_display_mode: 'default', default_paragraph_type: '', features: { duplicate: 'duplicate', collapse_edit_all: 'collapse_edit_all' } } },
    { type: 'entity_reference_revisions_autocomplete', label: 'Autocomplete', settings: { match_operator: 'CONTAINS', match_limit: 10, size: 60, placeholder: '' } },
    { type: 'entity_reference_paragraphs', label: 'Paragraphs Legacy', settings: { title: 'Paragraph', title_plural: 'Paragraphs', edit_mode: 'open', add_mode: 'dropdown', form_display_mode: 'default', default_paragraph_type: '' } },
    { type: 'options_select', label: 'Select list', settings: {} },
    { type: 'options_buttons', label: 'Check boxes/radio buttons', settings: {} }
  ],
  file: [
    { type: 'file_generic', label: 'File', settings: { progress_indicator: 'throbber' } }
  ],
  file_uri: [
    { type: 'uri', label: 'URI field', settings: { size: 60, placeholder: '' } }
  ],
  float: [
    { type: 'number', label: 'Number field', settings: { placeholder: '' } }
  ],
  image: [
    { type: 'image_image', label: 'Image', settings: { progress_indicator: 'throbber', preview_image_style: 'thumbnail' } },
    { type: 'image_focal_point', label: 'Image (Focal Point)', settings: { progress_indicator: 'throbber', preview_image_style: 'thumbnail', preview_link: true, offsets: '50,50' } }
  ],
  integer: [
    { type: 'number', label: 'Number field', settings: { placeholder: '' } }
  ],
  language: [
    { type: 'language_select', label: 'Language select', settings: { include_locked: true } }
  ],
  layout_section: [
    { type: 'layout_builder_widget', label: 'Layout Builder Widget', settings: {} }
  ],
  link: [
    { type: 'link_default', label: 'Link', settings: { placeholder_url: '', placeholder_title: '' } },
    { type: 'linkit', label: 'Linkit', settings: { linkit_profile: 'default', linkit_auto_link_text: false, placeholder_url: '', placeholder_title: '' } },
    { type: 'redirect_source', label: 'Redirect source', settings: {} }
  ],
  list_float: [
    { type: 'options_select', label: 'Select list', settings: {} },
    { type: 'options_buttons', label: 'Check boxes/radio buttons', settings: {} }
  ],
  list_integer: [
    { type: 'options_select', label: 'Select list', settings: {} },
    { type: 'options_buttons', label: 'Check boxes/radio buttons', settings: {} }
  ],
  list_string: [
    { type: 'options_select', label: 'Select list', settings: {} },
    { type: 'options_buttons', label: 'Check boxes/radio buttons', settings: {} }
  ],
  path: [
    { type: 'path', label: 'URL alias', settings: {} }
  ],
  string: [
    { type: 'string_textfield', label: 'Textfield', settings: { size: 60, placeholder: '' } },
    { type: 'oembed_textfield', label: 'oEmbed URL', settings: { size: 60, placeholder: '' } },
    { type: 'moderation_state_default', label: 'Moderation state', settings: {} }
  ],
  string_long: [
    { type: 'string_textarea', label: 'Text area (multiple rows)', settings: { rows: '5', placeholder: '' } }
  ],
  text: [
    { type: 'text_textfield', label: 'Text field', settings: { size: 60, placeholder: '' } }
  ],
  text_long: [
    { type: 'text_textarea', label: 'Text area (multiple rows)', settings: { rows: '5', placeholder: '' } }
  ],
  text_with_summary: [
    { type: 'text_textarea_with_summary', label: 'Text area with a summary', settings: { rows: '9', summary_rows: '3', placeholder: '', show_summary: false } }
  ],
  timestamp: [
    { type: 'datetime_timestamp', label: 'Datetime Timestamp', settings: {} }
  ],
  uri: [
    { type: 'uri', label: 'URI field', settings: { size: 60, placeholder: '' } }
  ],
  webform: [
    { type: 'webform_entity_reference_autocomplete', label: 'Autocomplete', settings: { default_data: true, match_operator: 'CONTAINS', match_limit: 10, size: 60, placeholder: '' } },
    { type: 'webform_entity_reference_select', label: 'Select list', settings: { default_data: true, webforms: [] } }
  ]
};

/**
 * Get default widget for a field type
 * @param {string} fieldType - Drupal field type
 * @returns {object|null} - Default widget config or null
 */
export function getDefaultWidget(fieldType) {
  const widgets = FIELD_WIDGETS[fieldType];
  return widgets ? widgets[0] : null;
}

/**
 * Get all available widgets for a field type
 * @param {string} fieldType - Drupal field type
 * @returns {object[]} - Array of widget configs
 */
export function getWidgetsForFieldType(fieldType) {
  return FIELD_WIDGETS[fieldType] || [];
}
```

### Acceptance Criteria
- [ ] Read field type from field instance config file
- [ ] Create field type to widget mapping (use code above)
- [ ] When showing a hidden field:
  - [ ] Look up field type from field instance
  - [ ] Get default widget for field type
  - [ ] Add field to content section with default widget
- [ ] Add "Configure field widget" option to form display menu
  - [ ] Allow changing widget type for a field
  - [ ] Allow configuring widget settings

### Implementation Notes

#### Reading Field Instance
```javascript
// field.field.node.article.field_body.yml
{
  field_type: 'text_long',
  // ... other config
}
```

#### Widget Settings Structure
Each widget type has specific settings. Example for `string_textfield`:
```yaml
type: string_textfield
settings:
  size: 60
  placeholder: ''
```

### Files to Create/Modify
- `src/constants/fieldWidgets.js` - NEW: Widget mapping (use code above)
- `src/parsers/formDisplayParser.js` - Import and use widget mapping
- `src/generators/formDisplayGenerator.js` - Generate widget config
- `src/commands/formDisplay.js` - Add widget configuration commands
- `src/cli/menus.js` - Add widget config UI
- `src/io/configReader.js` - Read field instance for type info

### Test Specifications
- Test field type to widget mapping
- Test reading field type from instance config
- Test generating default widget config
- Test widget config round-trip
