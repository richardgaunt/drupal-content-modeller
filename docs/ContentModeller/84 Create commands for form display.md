## 84 Create CLI Commands for Form Display

### Dependencies
- Ticket 79 (Implement form display)
- Ticket 83 (Update field configuration in form display)

### Overview

Add CLI one-liner commands for all form display operations, enabling scripting and automation for form display configuration. These commands follow the same conventions as ticket 67.

---

## Commands

### 1. Form Display View Commands

#### `dcm form-display view`

View the form display layout as a tree.

```bash
dcm form-display view \
  --project "project-slug" \
  --entity-type "node|media|paragraph|taxonomy_term|block_content" \
  --bundle "bundle_name" \
  [--mode "default"] \
  [--json]
```

| Option | Short | Required | Description |
|--------|-------|----------|-------------|
| `--project` | `-p` | Yes | Project slug |
| `--entity-type` | `-e` | Yes | Entity type |
| `--bundle` | `-b` | Yes | Bundle machine name |
| `--mode` | `-m` | No | Form mode (default: "default") |
| `--json` | `-j` | No | Output as JSON |

**Example:**
```bash
dcm form-display view -p my-site -e node -b article
dcm form-display view -p my-site -e node -b article --json
```

---

#### `dcm form-display list-modes`

List available form display modes for a bundle.

```bash
dcm form-display list-modes \
  --project "project-slug" \
  --entity-type "node|media|paragraph|taxonomy_term|block_content" \
  --bundle "bundle_name" \
  [--json]
```

| Option | Short | Required | Description |
|--------|-------|----------|-------------|
| `--project` | `-p` | Yes | Project slug |
| `--entity-type` | `-e` | Yes | Entity type |
| `--bundle` | `-b` | Yes | Bundle machine name |
| `--json` | `-j` | No | Output as JSON |

**Example:**
```bash
dcm form-display list-modes -p my-site -e node -b article
```

---

### 2. Field Visibility Commands

#### `dcm form-display hide`

Hide one or more fields from the form display.

```bash
dcm form-display hide \
  --project "project-slug" \
  --entity-type "node|media|paragraph|taxonomy_term|block_content" \
  --bundle "bundle_name" \
  --fields "field1,field2,..."
```

| Option | Short | Required | Description |
|--------|-------|----------|-------------|
| `--project` | `-p` | Yes | Project slug |
| `--entity-type` | `-e` | Yes | Entity type |
| `--bundle` | `-b` | Yes | Bundle machine name |
| `--fields` | `-f` | Yes | Comma-separated field names to hide |

**Example:**
```bash
dcm form-display hide -p my-site -e node -b article -f "created,status,promote"
```

---

#### `dcm form-display show`

Show one or more hidden fields (adds them back with default widget).

```bash
dcm form-display show \
  --project "project-slug" \
  --entity-type "node|media|paragraph|taxonomy_term|block_content" \
  --bundle "bundle_name" \
  --fields "field1,field2,..."
```

| Option | Short | Required | Description |
|--------|-------|----------|-------------|
| `--project` | `-p` | Yes | Project slug |
| `--entity-type` | `-e` | Yes | Entity type |
| `--bundle` | `-b` | Yes | Bundle machine name |
| `--fields` | `-f` | Yes | Comma-separated field names to show |

**Example:**
```bash
dcm form-display show -p my-site -e node -b article -f "status"
```

---

### 3. Field Widget Commands

#### `dcm form-display set-widget`

Change the widget type for a field.

```bash
dcm form-display set-widget \
  --project "project-slug" \
  --entity-type "node|media|paragraph|taxonomy_term|block_content" \
  --bundle "bundle_name" \
  --field "field_name" \
  --widget "widget_type"
```

| Option | Short | Required | Description |
|--------|-------|----------|-------------|
| `--project` | `-p` | Yes | Project slug |
| `--entity-type` | `-e` | Yes | Entity type |
| `--bundle` | `-b` | Yes | Bundle machine name |
| `--field` | `-f` | Yes | Field name |
| `--widget` | `-w` | Yes | Widget type (e.g., `options_select`, `entity_reference_autocomplete`) |

**Example:**
```bash
# Change entity reference to use select list instead of autocomplete
dcm form-display set-widget -p my-site -e node -b article -f field_n_category -w options_select

# Change to media library widget
dcm form-display set-widget -p my-site -e node -b article -f field_n_image -w media_library_widget
```

---

#### `dcm form-display set-widget-setting`

Update a specific widget setting for a field.

```bash
dcm form-display set-widget-setting \
  --project "project-slug" \
  --entity-type "node|media|paragraph|taxonomy_term|block_content" \
  --bundle "bundle_name" \
  --field "field_name" \
  --setting "setting_name" \
  --value "setting_value"
```

| Option | Short | Required | Description |
|--------|-------|----------|-------------|
| `--project` | `-p` | Yes | Project slug |
| `--entity-type` | `-e` | Yes | Entity type |
| `--bundle` | `-b` | Yes | Bundle machine name |
| `--field` | `-f` | Yes | Field name |
| `--setting` | `-s` | Yes | Setting name (e.g., `size`, `placeholder`, `rows`) |
| `--value` | `-v` | Yes | Setting value |

**Example:**
```bash
# Set textarea rows
dcm form-display set-widget-setting -p my-site -e node -b article -f field_n_body -s rows -v 15

# Set placeholder text
dcm form-display set-widget-setting -p my-site -e node -b article -f field_n_title -s placeholder -v "Enter title here"
```

---

#### `dcm form-display list-widgets`

List available widgets for a field type.

```bash
dcm form-display list-widgets \
  --field-type "string|entity_reference|..." \
  [--json]
```

| Option | Short | Required | Description |
|--------|-------|----------|-------------|
| `--field-type` | `-t` | Yes | Field type |
| `--json` | `-j` | No | Output as JSON |

**Example:**
```bash
dcm form-display list-widgets -t entity_reference
dcm form-display list-widgets -t string --json
```

---

### 4. Field Group Commands

#### `dcm form-display group create`

Create a new field group.

```bash
dcm form-display group create \
  --project "project-slug" \
  --entity-type "node|media|paragraph|taxonomy_term|block_content" \
  --bundle "bundle_name" \
  --label "Group Label" \
  [--name "group_machine_name"] \
  [--format "tabs|tab|details|fieldset"] \
  [--parent "parent_group_name"]
```

| Option | Short | Required | Description |
|--------|-------|----------|-------------|
| `--project` | `-p` | Yes | Project slug |
| `--entity-type` | `-e` | Yes | Entity type |
| `--bundle` | `-b` | Yes | Bundle machine name |
| `--label` | `-l` | Yes | Human-readable group label |
| `--name` | `-n` | No | Machine name (auto-generated from label if omitted) |
| `--format` | `-f` | No | Format type: `tabs`, `tab`, `details`, `fieldset` (default: `details`) |
| `--parent` | | No | Parent group name (if nesting) |

**Example:**
```bash
# Create a tabs container
dcm form-display group create -p my-site -e node -b article -l "Main Tabs" -f tabs

# Create a tab inside the tabs container
dcm form-display group create -p my-site -e node -b article -l "Content" -f tab --parent group_main_tabs

# Create a details group
dcm form-display group create -p my-site -e node -b article -l "Advanced Settings" -f details
```

---

#### `dcm form-display group edit`

Edit a field group's properties.

```bash
dcm form-display group edit \
  --project "project-slug" \
  --entity-type "node|media|paragraph|taxonomy_term|block_content" \
  --bundle "bundle_name" \
  --name "group_name" \
  [--label "New Label"] \
  [--format "tabs|tab|details|fieldset"]
```

| Option | Short | Required | Description |
|--------|-------|----------|-------------|
| `--project` | `-p` | Yes | Project slug |
| `--entity-type` | `-e` | Yes | Entity type |
| `--bundle` | `-b` | Yes | Bundle machine name |
| `--name` | `-n` | Yes | Group machine name |
| `--label` | `-l` | No | New group label |
| `--format` | `-f` | No | New format type |

**Example:**
```bash
dcm form-display group edit -p my-site -e node -b article -n group_advanced -l "Advanced Options"
```

---

#### `dcm form-display group delete`

Delete a field group.

```bash
dcm form-display group delete \
  --project "project-slug" \
  --entity-type "node|media|paragraph|taxonomy_term|block_content" \
  --bundle "bundle_name" \
  --name "group_name" \
  [--move-children-to "parent|root"]
```

| Option | Short | Required | Description |
|--------|-------|----------|-------------|
| `--project` | `-p` | Yes | Project slug |
| `--entity-type` | `-e` | Yes | Entity type |
| `--bundle` | `-b` | Yes | Bundle machine name |
| `--name` | `-n` | Yes | Group machine name to delete |
| `--move-children-to` | | No | Where to move children: `parent` (default) or `root` |

**Example:**
```bash
dcm form-display group delete -p my-site -e node -b article -n group_old_settings
dcm form-display group delete -p my-site -e node -b article -n group_old_settings --move-children-to root
```

---

#### `dcm form-display group list`

List all field groups in a form display.

```bash
dcm form-display group list \
  --project "project-slug" \
  --entity-type "node|media|paragraph|taxonomy_term|block_content" \
  --bundle "bundle_name" \
  [--json]
```

| Option | Short | Required | Description |
|--------|-------|----------|-------------|
| `--project` | `-p` | Yes | Project slug |
| `--entity-type` | `-e` | Yes | Entity type |
| `--bundle` | `-b` | Yes | Bundle machine name |
| `--json` | `-j` | No | Output as JSON |

**Example:**
```bash
dcm form-display group list -p my-site -e node -b article
```

---

### 5. Field/Group Movement Commands

#### `dcm form-display move`

Move a field or group to a different parent.

```bash
dcm form-display move \
  --project "project-slug" \
  --entity-type "node|media|paragraph|taxonomy_term|block_content" \
  --bundle "bundle_name" \
  --item "field_name|group_name" \
  --to "target_group|root"
```

| Option | Short | Required | Description |
|--------|-------|----------|-------------|
| `--project` | `-p` | Yes | Project slug |
| `--entity-type` | `-e` | Yes | Entity type |
| `--bundle` | `-b` | Yes | Bundle machine name |
| `--item` | `-i` | Yes | Field or group name to move |
| `--to` | `-t` | Yes | Target group name, or `root` for root level |

**Example:**
```bash
# Move field to a group
dcm form-display move -p my-site -e node -b article -i field_n_subtitle -t group_content

# Move field to root level
dcm form-display move -p my-site -e node -b article -i field_n_tags -t root

# Move a nested group
dcm form-display move -p my-site -e node -b article -i group_meta -t group_sidebar
```

---

#### `dcm form-display reorder`

Reorder items within a group (or at root level).

```bash
dcm form-display reorder \
  --project "project-slug" \
  --entity-type "node|media|paragraph|taxonomy_term|block_content" \
  --bundle "bundle_name" \
  [--group "group_name"] \
  --order "item1,item2,item3,..."
```

| Option | Short | Required | Description |
|--------|-------|----------|-------------|
| `--project` | `-p` | Yes | Project slug |
| `--entity-type` | `-e` | Yes | Entity type |
| `--bundle` | `-b` | Yes | Bundle machine name |
| `--group` | `-g` | No | Group to reorder within (omit for root level) |
| `--order` | `-o` | Yes | Comma-separated list of items in desired order |

**Example:**
```bash
# Reorder fields within a group
dcm form-display reorder -p my-site -e node -b article -g group_content \
  -o "field_n_title,field_n_subtitle,field_n_body"

# Reorder at root level
dcm form-display reorder -p my-site -e node -b article \
  -o "group_main_tabs,field_n_status,group_sidebar"
```

---

#### `dcm form-display set-weight`

Set the weight of a specific field or group.

```bash
dcm form-display set-weight \
  --project "project-slug" \
  --entity-type "node|media|paragraph|taxonomy_term|block_content" \
  --bundle "bundle_name" \
  --item "field_name|group_name" \
  --weight <number>
```

| Option | Short | Required | Description |
|--------|-------|----------|-------------|
| `--project` | `-p` | Yes | Project slug |
| `--entity-type` | `-e` | Yes | Entity type |
| `--bundle` | `-b` | Yes | Bundle machine name |
| `--item` | `-i` | Yes | Field or group name |
| `--weight` | `-w` | Yes | Weight value (lower = higher position) |

**Example:**
```bash
dcm form-display set-weight -p my-site -e node -b article -i field_n_title -w 0
dcm form-display set-weight -p my-site -e node -b article -i group_sidebar -w 100
```

---

### 6. Reset Commands

#### `dcm form-display reset`

Reset form display to defaults.

```bash
dcm form-display reset \
  --project "project-slug" \
  --entity-type "node|media|paragraph|taxonomy_term|block_content" \
  --bundle "bundle_name" \
  [--keep-groups] \
  [--force]
```

| Option | Short | Required | Description |
|--------|-------|----------|-------------|
| `--project` | `-p` | Yes | Project slug |
| `--entity-type` | `-e` | Yes | Entity type |
| `--bundle` | `-b` | Yes | Bundle machine name |
| `--keep-groups` | | No | Keep field groups (only reset field widgets) |
| `--force` | `-f` | No | Skip confirmation |

**Example:**
```bash
dcm form-display reset -p my-site -e node -b article --force
dcm form-display reset -p my-site -e node -b article --keep-groups
```

---

## Implementation Notes

### Files to Modify

#### `src/cli/commands.js`
Add new command handler functions:
- `cmdFormDisplayView`
- `cmdFormDisplayListModes`
- `cmdFormDisplayHide`
- `cmdFormDisplayShow`
- `cmdFormDisplaySetWidget`
- `cmdFormDisplaySetWidgetSetting`
- `cmdFormDisplayListWidgets`
- `cmdFormDisplayGroupCreate`
- `cmdFormDisplayGroupEdit`
- `cmdFormDisplayGroupDelete`
- `cmdFormDisplayGroupList`
- `cmdFormDisplayMove`
- `cmdFormDisplayReorder`
- `cmdFormDisplaySetWeight`
- `cmdFormDisplayReset`

#### `index.mjs`
Add commander configuration for `form-display` command group with subcommands.

### Imports Needed

```javascript
import {
  loadFormDisplay,
  saveFormDisplay,
  getFormDisplayTree,
  reorderGroupChildren,
  moveFieldToGroup,
  moveGroupToParent,
  createFieldGroup,
  deleteFieldGroup,
  updateFieldGroup,
  toggleFieldVisibility,
  showHiddenField,
  updateFieldWidget,
  updateFieldSettings,
  resetFormDisplay,
  clearFieldGroups,
  getFormDisplayModes
} from '../commands/formDisplay.js';

import {
  getWidgetsForFieldType,
  getWidgetByType,
  FIELD_WIDGETS
} from '../constants/fieldWidgets.js';
```

---

## Acceptance Criteria

- [ ] All commands listed above are implemented
- [ ] `--help` works on all commands
- [ ] `--json` output works where specified
- [ ] Error messages are clear and actionable
- [ ] Exit codes are correct (0 = success, 1 = error)
- [ ] Commands validate inputs before processing
- [ ] Commands save form display after modifications
- [ ] Interactive mode still works

---

## Test Specifications

### Command Tests
- `form-display view` shows tree output
- `form-display hide` removes fields from content, adds to hidden
- `form-display show` restores fields with correct default widget
- `form-display set-widget` changes widget type
- `form-display group create` creates new group
- `form-display group delete` removes group, handles children
- `form-display move` moves items between groups
- `form-display reorder` updates weights correctly
- `form-display reset` regenerates with default widgets

### Error Handling Tests
- Missing required options show clear errors
- Invalid entity types are rejected
- Non-existent bundles are handled
- Invalid widget types are rejected
- Non-existent fields/groups show errors

---

## Example Workflow

```bash
# View current form display
dcm form-display view -p my-site -e node -b article

# Create a tabs container with two tabs
dcm form-display group create -p my-site -e node -b article -l "Main" -f tabs -n group_main
dcm form-display group create -p my-site -e node -b article -l "Content" -f tab --parent group_main
dcm form-display group create -p my-site -e node -b article -l "Settings" -f tab --parent group_main

# Move fields into tabs
dcm form-display move -p my-site -e node -b article -i field_n_title -t group_content
dcm form-display move -p my-site -e node -b article -i field_n_body -t group_content
dcm form-display move -p my-site -e node -b article -i field_n_status -t group_settings

# Reorder fields within Content tab
dcm form-display reorder -p my-site -e node -b article -g group_content \
  -o "field_n_title,field_n_subtitle,field_n_body"

# Hide administrative fields
dcm form-display hide -p my-site -e node -b article -f "created,changed,uid"

# Change a widget
dcm form-display set-widget -p my-site -e node -b article -f field_n_category -w options_select

# View the result
dcm form-display view -p my-site -e node -b article
```
