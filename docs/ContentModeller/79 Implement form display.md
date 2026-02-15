## 79 Implement form display

**Status:** Completed

### Goal

I want to be able to create the `form_display` for entity types.
I need to be able to order fields within a entity type, add fields to a field group, order fields within that group.

I need advice on how to implement ordering of a list within a cli application. Is there a input type that can handle this?

I want to be able to:

- Select "Edit an entity type form display"
- Select "Entity type"
- Select "Bundle"
- Then the bundles's existing form display configuration file is parsed and loaded

All entity type config files are stored in the configuration directory as `core.entity_form_display.<entity_type>.<bundle>.default.yml` - you can have more than 1 form display but the main and the focus of this application is `default` only.

Firstly research how to do list order within a CLI application and write in the section below how this could be achieved.

---

## Research on: List ordering in CLI applications

### Available Solutions

The `@inquirer/prompts` package (already installed, v7.10.1) does not natively support list reordering. However, there are community prompts that extend inquirer with this capability:

#### Option 1: `inquirer-sortable-checkbox` (Recommended)

A community package that extends the checkbox prompt with reordering capability using `ctrl+up` / `ctrl+down` keyboard shortcuts.

**GitHub:** https://github.com/th0r/inquirer-sortable-checkbox

**Installation:**
```bash
npm install inquirer-sortable-checkbox
```

**Features:**
- Same as built-in checkbox prompt
- Reorder items using `ctrl+up` and `ctrl+down`
- Toggle selection with `space`
- Select all with `a`, invert with `i`
- Pagination support for long lists (default: 7 items per page)
- `sortingLoop` option: when enabled, moving first item up cycles to end

**Configuration Options:**
| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `message` | string | Yes | The prompt question |
| `choices` | Array | Yes | List of items (name, value, disabled, checked) |
| `pageSize` | number | No | Items per page (default: 7) |
| `sortingLoop` | boolean | No | Enable wrap-around when reordering |
| `required` | boolean | No | Require at least one selection |
| `validate` | function | No | Custom validation |
| `theme` | object | No | Visual customization |

**Example:**
```javascript
import sortableCheckbox from 'inquirer-sortable-checkbox';

const answer = await sortableCheckbox({
  message: 'Order fields (use ctrl+up/down to reorder):',
  choices: [
    { name: 'Title', value: 'title', checked: true },
    { name: 'Body', value: 'field_body', checked: true },
    { name: 'Tags', value: 'field_tags' },
  ],
  sortingLoop: true,
  pageSize: 15,
});
// Returns array of selected values in the order they appear
```

#### Option 2: `inquirer-ordered-checkbox`

A sortable checkbox that maintains the order of selection - items show numbers indicating selection order.

**Features:**
- Shows selection order with numbers [1], [2], [3]
- Good for prioritizing/ranking

#### Option 3: Custom Implementation

Build a custom prompt using `@inquirer/core` that implements:
- Arrow key navigation
- `ctrl+up` / `ctrl+down` or `shift+up` / `shift+down` for reordering
- Visual feedback showing current order with weights

### Recommended Approach for This Application

Use **`inquirer-sortable-checkbox`** for the following reasons:
1. Familiar checkbox interface
2. Intuitive ctrl+up/down reordering
3. Compatible with @inquirer/core v10+
4. Active maintenance

### Alternative: Multi-step Workflow

If reordering proves complex, use a simpler workflow:
1. Display current field order as numbered list
2. Prompt: "Enter field name to move"
3. Prompt: "Enter position (1-N)"
4. Repeat until user confirms

---

## Research on: Field group implementation

### Add to Required Modules

Add `field_group` to the list of recommended modules in `RECOMMENDED_MODULES` constant.

### Field Group Types

Field groups in Drupal support several display types:

| Type | Description | Use Case |
|------|-------------|----------|
| `tabs` | Horizontal or vertical tab container | Groups multiple `tab` items |
| `tab` | Individual tab within a tabs container | Organizing content into tabbed sections |
| `details` | Collapsible fieldset | Grouping related fields, can be open/closed |
| `details_sidebar` | Details in sidebar region | Sidebar metadata/settings |
| `fieldset` | Non-collapsible fieldset | Simple visual grouping |

### Form Display YAML Structure

Based on analysis of `core.entity_form_display.node.civictheme_page.default.yml`:

```yaml
# Main structure
langcode: en
status: true
dependencies:
  config:
    - field.field.node.bundle.field_name
    - node.type.bundle
  module:
    - field_group
    - paragraphs

# Third party settings contain field group definitions
third_party_settings:
  field_group:
    group_name:
      children:           # Array of field names or group names
        - title
        - field_body
        - group_metadata  # Can contain nested groups
      label: 'Group Label'
      region: content
      parent_name: ''     # Empty for root groups, or parent group name
      weight: 0           # Display order
      format_type: tabs   # tabs, tab, details, details_sidebar, fieldset
      format_settings:
        classes: ''
        id: ''
        direction: horizontal  # For tabs: horizontal/vertical
        # For details:
        open: false            # Default open/closed state
        description: ''
        required_fields: true
        show_empty_fields: false

# Content section contains field widget configurations
id: node.bundle.default
targetEntityType: node
bundle: bundle_name
mode: default
content:
  field_name:
    type: string_textfield   # Widget type
    weight: 1                # Display order within parent
    region: content
    settings:
      size: 60
      placeholder: ''
    third_party_settings: {}

# Hidden fields
hidden:
  created: true
  status: true
```

### Key Observations

1. **Field ordering** is controlled by `weight` property in `content` section
2. **Field groups** are defined in `third_party_settings.field_group`
3. **Hierarchy** is established via `parent_name` (points to parent group) and `children` (lists child items)
4. **Widget types** vary by field type (see table below)
5. **Hidden fields** go in the `hidden` section with `true` value

### Common Widget Types

Based on analysis of config files, these are the most common widget types:

| Field Type | Widget Type | Module | Settings |
|------------|-------------|--------|----------|
| string | `string_textfield` | core | size, placeholder |
| string_long | `string_textarea` | core | rows, placeholder |
| text_long | `text_textarea` | text | rows, placeholder |
| boolean | `boolean_checkbox` | core | display_label |
| list_string | `options_select` | options | - |
| list_string | `options_buttons` | options | - |
| datetime | `datetime_default` | datetime | - |
| datetime | `datetime_timestamp` | datetime | - |
| entity_reference | `entity_reference_autocomplete` | core | match_operator, match_limit, size, placeholder |
| entity_reference | `options_select` | options | - |
| entity_reference_revisions | `paragraphs` | paragraphs | title, edit_mode, add_mode, etc. |
| image/file (media) | `media_library_widget` | media_library | media_types |
| link | `link_default` | link | placeholder_url, placeholder_title |
| path | `path` | path | - |

### Third Party Settings Structure

References:
- [Demystifying third-party settings in Drupal](https://medium.com/@novosibcool/demystifying-third-party-settings-in-drupal-3029b8a23637)
- [Drupal 10: Adding Third Party Settings](https://www.hashbangcode.com/article/drupal-10-adding-third-party-settings-drupal-configuration-entities)

The `field_group` module injects its configuration into form display entities using Drupal's standard third-party settings mechanism:

```yaml
third_party_settings:
  field_group:
    group_name:
      # Group configuration here
```

This pattern allows contributed modules to extend core configuration entities without modifying their schema.

### Field Group Hierarchy Example

```
group_civictheme_tabs (format_type: tabs)
├── group_civictheme_content (format_type: tab)
│   ├── title
│   ├── field_c_n_summary
│   ├── group_metadata (format_type: details)
│   │   ├── field_c_n_topics
│   │   └── field_c_n_site_section
│   ├── field_c_n_show_toc
│   ├── field_c_n_components
│   └── group_appearance (format_type: details)
│       ├── field_c_n_thumbnail
│       └── field_c_n_vertical_spacing
└── group_civictheme_banner (format_type: tab)
    ├── field_c_n_banner_type
    ├── field_c_n_banner_theme
    └── ...
```

---

## Proposed Implementation Plan

### Phase 1: Parse Existing Form Display

1. Add parser function `parseFormDisplay(config)` in `configParser.js`
2. Add I/O function `readFormDisplay(configPath, entityType, bundle)` in `configReader.js`
3. Extract:
   - Field configurations from `content` section
   - Field groups from `third_party_settings.field_group`
   - Hidden fields from `hidden` section
   - Build hierarchy tree from parent_name/children relationships

### Phase 2: Display Current Form Layout

1. Add menu option "Edit form display" in project menu
2. Display current form layout as tree structure:
   ```
   Form Display: node > civictheme_page

   ├── [tabs] Tabs
   │   ├── [tab] Content
   │   │   ├── title (string_textfield) weight: 11
   │   │   ├── field_c_n_summary (string_textarea) weight: 12
   │   │   └── [details] Metadata
   │   │       ├── field_c_n_topics
   │   │       └── field_c_n_site_section
   │   └── [tab] Banner
   │       └── ...
   └── [details_sidebar] Last updated date
       └── ...

   Hidden: created, status
   ```

### Phase 3: Edit Operations

1. **Reorder fields within a group**
   - Install `inquirer-sortable-checkbox`
   - Select group to edit
   - Show sortable list of children
   - Save new weights

2. **Move field to different group**
   - Select field to move
   - Select destination group
   - Update parent_name and children arrays

3. **Create new field group**
   - Prompt for: name, label, format_type, parent group
   - Add to third_party_settings.field_group

4. **Hide/show fields**
   - Toggle between content and hidden sections

### Phase 4: Generate Updated YAML

1. Add generator function `generateFormDisplay(formDisplayData)` in new file `formDisplayGenerator.js`
2. Calculate weights based on visual order
3. Write to `core.entity_form_display.<entity_type>.<bundle>.default.yml`

### Dependencies

- `inquirer-sortable-checkbox` - for reordering UI
- Add `field_group` to `RECOMMENDED_MODULES` in `configParser.js`

### Files to Create/Modify

| File | Action |
|------|--------|
| `src/parsers/configParser.js` | Add form display parsing, add field_group to RECOMMENDED_MODULES |
| `src/io/configReader.js` | Add readFormDisplay function |
| `src/generators/formDisplayGenerator.js` | NEW - generate form display YAML |
| `src/commands/formDisplay.js` | NEW - form display commands |
| `src/cli/menus.js` | Add "Edit form display" menu option |
| `src/cli/prompts.js` | Add form display menu choices |
| `package.json` | Add inquirer-sortable-checkbox dependency |

### Test Plan

1. Parse existing form display files from config/ directory
2. Round-trip test: parse -> generate -> compare (should be equivalent)
3. Test reordering fields updates weights correctly
4. Test moving fields between groups
5. Test creating new field groups

---

## References

### Drupal Documentation
- [Display Modes: View Modes and Form Modes](https://www.drupal.org/docs/drupal-apis/entity-api/display-modes-view-modes-and-form-modes)
- [EntityFormDisplay API](https://api.drupal.org/api/drupal/core!lib!Drupal!Core!Entity!Entity!EntityFormDisplay.php/class/EntityFormDisplay/8.9.x)
- [Custom Field Types and Widgets](https://www.drupal.org/docs/extending-drupal/contributed-modules/contributed-module-documentation/drupal-lms/plugin-developers-guide-for-drupal-lms/custom-field-types-and-widgets)

### Inquirer.js
- [@inquirer/prompts npm package](https://www.npmjs.com/package/@inquirer/prompts)
- [inquirer-sortable-checkbox](https://github.com/th0r/inquirer-sortable-checkbox)
- [Inquirer.js GitHub](https://github.com/SBoudrias/Inquirer.js)

---

## Implementation Details

### Acceptance Criteria

- [x] User can select "Edit form display" from project menu
- [x] User selects entity type, then bundle
- [x] Existing form display config is parsed and loaded
- [x] Form layout displayed as tree structure
- [x] User can reorder fields within a group
- [x] User can move fields between groups
- [x] User can create new field groups
- [x] User can edit field group properties
- [x] User can delete field groups
- [x] User can hide/show fields
- [x] Changes can be saved to config file
- [x] Added `field_group` to RECOMMENDED_MODULES

### Files Created

1. **src/parsers/formDisplayParser.js** (NEW)
   - `getFormDisplayFilename(entityType, bundle)` - Get filename pattern
   - `parseFormDisplay(config)` - Parse complete form display config
   - `parseFieldGroups(thirdPartySettings)` - Extract field groups
   - `parseFormFields(content)` - Extract field widget configs
   - `parseHiddenFields(hidden)` - Extract hidden field names
   - `findFieldParentGroup(fieldName, groups)` - Find parent group
   - `getGroupChildren(groupName, groups, fields)` - Get children of group
   - `buildFormDisplayTree(groups, fields, hidden)` - Build hierarchical tree
   - `formatTreeForDisplay(tree, entityType, bundle)` - Format tree for console
   - `getGroupChoices(groups)` - Get group options for prompts
   - `getFieldChoices(fields, hidden)` - Get field options for prompts
   - `validateGroupName(name, groups)` - Validate unique group name
   - `generateGroupName(label)` - Generate machine name from label

2. **src/generators/formDisplayGenerator.js** (NEW)
   - `FIELD_GROUP_FORMATS` - Available format types
   - `getDefaultFormatSettings(formatType)` - Default settings per format
   - `recalculateWeights(orderedNames, items, baseWeight)` - Assign weights
   - `generateThirdPartySettings(groups)` - Generate field_group section
   - `generateContentSection(fields)` - Generate content section
   - `generateHiddenSection(hiddenFields)` - Generate hidden section
   - `generateDependencies(groups, fields, entityType, bundle)` - Generate deps
   - `generateFormDisplay(formDisplay)` - Generate complete YAML
   - `createNewGroup(options)` - Create new group with defaults
   - `updateGroupChildren(group, newChildren)` - Update children array
   - `addChildToGroup(group, itemName, position)` - Add child
   - `removeChildFromGroup(group, itemName)` - Remove child

3. **src/commands/formDisplay.js** (NEW)
   - `loadFormDisplay(project, entityType, bundle)` - Load form display
   - `hasFormDisplay(project, entityType, bundle)` - Check if exists
   - `saveFormDisplay(project, formDisplay)` - Save updated form display
   - `getFormDisplayTree(formDisplay)` - Get display tree string
   - `reorderGroupChildren(formDisplay, groupName, newOrder)` - Reorder items
   - `moveFieldToGroup(formDisplay, fieldName, targetGroupName)` - Move field
   - `createFieldGroup(formDisplay, groupConfig)` - Create new group
   - `deleteFieldGroup(formDisplay, groupName, moveChildrenToParent)` - Delete
   - `updateFieldGroup(formDisplay, groupName, updates)` - Update group
   - `toggleFieldVisibility(formDisplay, fieldName)` - Toggle visibility
   - `hideFields(formDisplay, fieldNames)` - Hide multiple fields
   - `showFields(formDisplay, fieldNames)` - Show multiple fields
   - `getAvailableGroups(formDisplay)` - Get group choices
   - `getVisibleFields(formDisplay)` - Get visible field choices
   - `getHiddenFields(formDisplay)` - Get hidden field choices
   - `addFieldsToGroup(formDisplay, groupName, fieldNames)` - Add fields to group

4. **tests/formDisplay.test.mjs** (NEW)
   - 47 tests covering parser, generator, and command functions

### Files Modified

1. **src/io/configReader.js**
   - Added `getFormDisplayPath(configPath, entityType, bundle)`
   - Added `formDisplayExists(configPath, entityType, bundle)`
   - Added `readFormDisplay(configPath, entityType, bundle)`

2. **src/cli/prompts.js**
   - Added `{ value: 'edit-form-display', name: 'Edit form display' }` to `PROJECT_MENU_CHOICES`

3. **src/cli/menus.js**
   - Added `FORM_DISPLAY_MENU_CHOICES` constant
   - Added `handleEditFormDisplay(project)` - Main entry point
   - Added `showFormDisplayMenu(project, formDisplay)` - Submenu loop
   - Added `handleReorderFields(formDisplay)` - Reorder handler
   - Added `handleMoveField(formDisplay)` - Move field handler
   - Added `handleCreateGroup(formDisplay)` - Create group handler
   - Added `handleEditGroup(formDisplay)` - Edit group handler
   - Added `handleDeleteGroup(formDisplay)` - Delete group handler
   - Added `handleToggleVisibility(formDisplay)` - Visibility handler
   - Added case handler for `edit-form-display` in `showProjectMenu`

4. **src/parsers/configParser.js**
   - Added `'field_group'` to `RECOMMENDED_MODULES` array

5. **tests/cli.test.mjs**
   - Updated to expect 14 menu options (was 13)
   - Added check for `edit-form-display` value

### User Flow

1. **From project menu "Edit form display":**
   - Select entity type (node, media, paragraph, etc.)
   - Select bundle
   - Form display tree is shown

2. **Form display submenu options:**
   - View form layout (displays tree)
   - Reorder fields in group (select group, reorder children)
   - Move field to group (select field, select target group)
   - Create field group (enter label, machine name, format type, parent)
   - Edit field group (select group, update label/format)
   - Delete field group (children moved to parent)
   - Hide/show fields (toggle visibility)
   - Save changes (writes YAML file)
   - Cancel and go back

### Technical Notes

- Used checkbox prompt for reordering (simpler than inquirer-sortable-checkbox)
- User deselects and re-selects items in desired order
- Weights are recalculated based on position in ordered array
- Field groups use Drupal's third_party_settings pattern
- Dependencies are automatically calculated for config and module keys
