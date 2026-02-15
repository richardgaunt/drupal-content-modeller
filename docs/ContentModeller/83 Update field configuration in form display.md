## 83 Update field configuration (in form display)

### Dependencies
- Ticket 79 (Implement form display)

### Overview
Comprehensive form display field configuration including:
- Show hidden fields with correct widget configuration
- Change field widgets (select from available widgets per field type)
- Configure widget settings
- Create new form displays (different form modes)
- Overwrite/reset existing form displays

---

### Part 1: Field Type to Widget Mapping

#### Problem
When showing a hidden field or configuring a field widget, we need to know:
1. The field's storage type (from field instance config)
2. Available widgets for that field type
3. Default settings for each widget

#### Solution
Create `src/constants/fieldWidgets.js` with the mapping below.

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
 */
export function getDefaultWidget(fieldType) {
  const widgets = FIELD_WIDGETS[fieldType];
  return widgets ? widgets[0] : null;
}

/**
 * Get all available widgets for a field type
 */
export function getWidgetsForFieldType(fieldType) {
  return FIELD_WIDGETS[fieldType] || [];
}
```

---

### Part 2: Show Hidden Fields

#### Current Problem
When a field is hidden and then shown again, we lose its widget configuration because:
1. Hidden fields only store `field_name: true` in YAML
2. We cannot store DCM config in the YAML (wiped on config sync)

#### Solution
When showing a hidden field:
1. Read the field instance config (`field.field.<entity_type>.<bundle>.<field_name>.yml`)
2. Get the `field_type` from the instance
3. Look up the default widget for that field type
4. Add the field to the content section with default widget settings

#### Implementation
```javascript
// In src/commands/formDisplay.js
export async function showHiddenField(project, formDisplay, fieldName) {
  // 1. Read field instance to get field type
  const fieldInstance = await readFieldInstance(project, formDisplay.entityType, formDisplay.bundle, fieldName);
  if (!fieldInstance) {
    throw new Error(`Field instance not found: ${fieldName}`);
  }

  // 2. Get default widget for field type
  const defaultWidget = getDefaultWidget(fieldInstance.field_type);
  if (!defaultWidget) {
    throw new Error(`No widget found for field type: ${fieldInstance.field_type}`);
  }

  // 3. Add field to fields array and remove from hidden
  const newField = {
    name: fieldName,
    type: defaultWidget.type,
    weight: getNextWeight(formDisplay.fields),
    region: 'content',
    settings: { ...defaultWidget.settings },
    thirdPartySettings: {}
  };

  return {
    ...formDisplay,
    fields: [...formDisplay.fields, newField],
    hidden: formDisplay.hidden.filter(f => f !== fieldName)
  };
}
```

---

### Part 3: Configure Field Widget

#### Features
1. **Change widget type** - Select from available widgets for the field type
2. **Edit widget settings** - Configure settings specific to the widget

#### UI Flow
```
Form Display Menu
  -> "Configure field" (NEW)
  -> Select field
  -> Current: [widget_type] - [widget_label]
  -> Options:
     - Change widget type
     - Edit widget settings
     - Back
```

#### Change Widget Type
```javascript
// Show available widgets for the field type
const fieldInstance = await readFieldInstance(...);
const availableWidgets = getWidgetsForFieldType(fieldInstance.field_type);

const choices = availableWidgets.map(w => ({
  value: w.type,
  name: `${w.label} (${w.type})`
}));

const newWidgetType = await select({
  message: 'Select widget:',
  choices,
  default: currentWidget.type
});

// Update field with new widget and default settings
const newWidget = availableWidgets.find(w => w.type === newWidgetType);
updatedField = {
  ...field,
  type: newWidgetType,
  settings: { ...newWidget.settings }
};
```

#### Edit Widget Settings
Dynamic form based on widget settings schema:
```javascript
// For each setting in the widget
for (const [key, defaultValue] of Object.entries(widgetSettings)) {
  if (typeof defaultValue === 'boolean') {
    // Yes/No select
    settings[key] = await select({ choices: [{value: true}, {value: false}] });
  } else if (typeof defaultValue === 'number') {
    // Number input
    settings[key] = await input({ validate: isNumber });
  } else if (Array.isArray(defaultValue)) {
    // Multi-select or text input for arrays
    settings[key] = await input({ message: `${key} (comma-separated):` });
  } else {
    // Text input
    settings[key] = await input({ default: defaultValue });
  }
}
```

---

### Part 4: Create New Form Display

#### Features
1. Create form display for a new form mode (e.g., `compact`, `inline`)
2. Copy from existing form display or start fresh
3. Generate with all bundle fields using default widgets

#### UI Flow
```
Project Menu
  -> "Create form display" (NEW)
  -> Select entity type
  -> Select bundle
  -> Form mode name? [default: "default"]
  -> Options:
     - Copy from existing form display
     - Generate fresh with all fields
     - Start empty
```

#### Implementation
```javascript
export async function createFormDisplay(project, entityType, bundle, mode, options = {}) {
  const { copyFrom, includeAllFields } = options;

  if (copyFrom) {
    // Copy existing form display with new mode
    const existing = await loadFormDisplay(project, entityType, bundle, copyFrom);
    return {
      ...existing,
      mode,
      id: `${entityType}.${bundle}.${mode}`
    };
  }

  if (includeAllFields) {
    // Generate with all bundle fields
    const fields = await getBundleFields(project, entityType, bundle);
    const formFields = [];

    for (const field of fields) {
      const widget = getDefaultWidget(field.type);
      formFields.push({
        name: field.name,
        type: widget?.type || 'string_textfield',
        weight: formFields.length,
        region: 'content',
        settings: widget?.settings || {},
        thirdPartySettings: {}
      });
    }

    return {
      entityType,
      bundle,
      mode,
      groups: [],
      fields: formFields,
      hidden: []
    };
  }

  // Empty form display
  return {
    entityType,
    bundle,
    mode,
    groups: [],
    fields: [],
    hidden: []
  };
}
```

---

### Part 5: Overwrite/Reset Form Display

#### Features
1. Reset to Drupal defaults (regenerate from field instances)
2. Overwrite with copy from another bundle's form display
3. Clear all field groups

#### UI Flow
```
Form Display Menu
  -> "Reset form display" (NEW)
  -> Options:
     - Regenerate with default widgets (keeps field order)
     - Copy from another bundle
     - Clear all field groups (keep fields)
     - Cancel
```

---

### Updated Form Display Menu

```javascript
const FORM_DISPLAY_MENU_CHOICES = [
  { value: 'view', name: 'View form layout' },
  { value: 'reorder', name: 'Reorder items in group' },
  { value: 'move', name: 'Move field or group' },
  { value: 'configure-field', name: 'Configure field widget' },  // NEW
  { value: 'create-group', name: 'Create field group' },
  { value: 'edit-group', name: 'Edit field group' },
  { value: 'delete-group', name: 'Delete field group' },
  { value: 'visibility', name: 'Hide/show fields' },
  { value: 'reset', name: 'Reset form display' },  // NEW
  { value: 'back', name: 'Back' }
];
```

---

### Acceptance Criteria

#### Part 1: Widget Mapping
- [ ] Create `src/constants/fieldWidgets.js` with FIELD_WIDGETS mapping
- [ ] Implement `getDefaultWidget(fieldType)`
- [ ] Implement `getWidgetsForFieldType(fieldType)`

#### Part 2: Show Hidden Fields
- [ ] Read field type from field instance config
- [ ] Look up default widget for field type
- [ ] Add field to content section with default widget settings
- [ ] Update hide/show UI to use new logic

#### Part 3: Configure Field Widget
- [ ] Add "Configure field widget" menu option
- [ ] Allow selecting field to configure
- [ ] Show current widget type
- [ ] Allow changing to different widget (from available for field type)
- [ ] Allow editing widget settings

#### Part 4: Create Form Display
- [ ] Add "Create form display" to project menu
- [ ] Prompt for entity type, bundle, form mode
- [ ] Option to copy from existing
- [ ] Option to generate with all fields
- [ ] Option to start empty

#### Part 5: Reset Form Display
- [ ] Add "Reset form display" menu option
- [ ] Regenerate with default widgets
- [ ] Copy from another bundle
- [ ] Clear all field groups

---

### Files to Create/Modify

#### New Files
- `src/constants/fieldWidgets.js` - Widget mapping and helpers

#### Modified Files
- `src/io/configReader.js` - Add `readFieldInstance()`
- `src/commands/formDisplay.js` - Add show/configure/create/reset functions
- `src/cli/menus.js` - Add new menu options and handlers
- `src/cli/prompts.js` - Add project menu option for create form display

---

### Test Specifications

#### Widget Mapping Tests
- `getDefaultWidget` returns first widget for known field type
- `getDefaultWidget` returns null for unknown field type
- `getWidgetsForFieldType` returns array of widgets
- `getWidgetsForFieldType` returns empty array for unknown type

#### Show Hidden Field Tests
- Shows field with correct default widget
- Removes field from hidden array
- Adds field to fields array
- Throws error for unknown field

#### Configure Field Tests
- Changes widget type
- Preserves field name and weight
- Updates settings to new widget defaults
- Validates widget is compatible with field type

#### Create Form Display Tests
- Creates with specified mode
- Copies from existing form display
- Generates with all bundle fields
- Creates empty form display

#### Reset Form Display Tests
- Regenerates with default widgets
- Clears field groups
- Preserves field order on regenerate
