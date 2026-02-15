# CLI Commands Reference

Complete reference for all `dcm` CLI commands.

## Command Structure

```
dcm <resource> <action> [options]
```

## Global Options

| Option | Short | Description |
|--------|-------|-------------|
| `--help` | `-h` | Show help for command |
| `--version` | `-V` | Show version number |
| `--json` | `-j` | Output as JSON (where supported) |

---

## Project Commands

### `dcm project create`

Create a new project.

```bash
dcm project create \
  --name "Project Name" \
  --config-path "/path/to/drupal/config" \
  [--base-url "https://example.com"]
```

| Option | Short | Required | Description |
|--------|-------|----------|-------------|
| `--name` | `-n` | Yes | Human-readable project name |
| `--config-path` | `-c` | Yes | Path to Drupal configuration directory |
| `--base-url` | `-u` | No | Base URL of the Drupal site |
| `--json` | `-j` | No | Output as JSON |

**Example:**
```bash
dcm project create -n "My Site" -c ~/work/mysite/config -u https://mysite.com
```

---

### `dcm project list`

List all projects.

```bash
dcm project list [--json]
```

| Option | Short | Required | Description |
|--------|-------|----------|-------------|
| `--json` | `-j` | No | Output as JSON |

**Example:**
```bash
dcm project list
dcm project list --json
```

---

### `dcm project edit`

Edit project settings.

```bash
dcm project edit \
  --project "project-slug" \
  [--name "New Name"] \
  [--config-path "/new/path"] \
  [--base-url "https://new-url.com"]
```

| Option | Short | Required | Description |
|--------|-------|----------|-------------|
| `--project` | `-p` | Yes | Project slug to edit |
| `--name` | `-n` | No | New project name |
| `--config-path` | `-c` | No | New configuration directory path |
| `--base-url` | `-u` | No | New base URL |
| `--json` | `-j` | No | Output as JSON |

**Example:**
```bash
dcm project edit -p my-site --base-url https://staging.mysite.com
```

---

### `dcm project sync`

Sync project configuration from Drupal config directory.

```bash
dcm project sync --project "project-slug"
```

| Option | Short | Required | Description |
|--------|-------|----------|-------------|
| `--project` | `-p` | Yes | Project slug to sync |
| `--json` | `-j` | No | Output as JSON |

**Example:**
```bash
dcm project sync -p my-site
```

---

### `dcm project delete`

Delete a project.

```bash
dcm project delete --project "project-slug" [--force]
```

| Option | Short | Required | Description |
|--------|-------|----------|-------------|
| `--project` | `-p` | Yes | Project slug to delete |
| `--force` | `-f` | No | Skip confirmation prompt |
| `--json` | `-j` | No | Output as JSON |

**Example:**
```bash
dcm project delete -p old-project --force
```

---

## Bundle Commands

### `dcm bundle create`

Create a new entity bundle.

```bash
dcm bundle create \
  --project "project-slug" \
  --entity-type "node|media|paragraph|taxonomy_term|block_content" \
  --label "Bundle Label" \
  [--machine-name "bundle_name"] \
  [--description "Description text"] \
  [--source-type "image|file|remote_video"]
```

| Option | Short | Required | Description |
|--------|-------|----------|-------------|
| `--project` | `-p` | Yes | Project slug |
| `--entity-type` | `-e` | Yes | Entity type: `node`, `media`, `paragraph`, `taxonomy_term`, `block_content` |
| `--label` | `-l` | Yes | Human-readable bundle label |
| `--machine-name` | `-m` | No | Machine name (auto-generated from label if omitted) |
| `--description` | `-d` | No | Bundle description |
| `--source-type` | `-s` | No | Media source type (required for media): `image`, `file`, `remote_video` |
| `--json` | `-j` | No | Output as JSON |

**Examples:**
```bash
# Create a content type
dcm bundle create -p my-site -e node -l "Blog Post" -d "Blog post content type"

# Create a media type
dcm bundle create -p my-site -e media -l "Document" -s file

# Create a paragraph type
dcm bundle create -p my-site -e paragraph -l "Hero Banner" -m hero_banner
```

---

### `dcm bundle list`

List bundles in a project.

```bash
dcm bundle list \
  --project "project-slug" \
  [--entity-type "node|media|paragraph|taxonomy_term|block_content"] \
  [--json]
```

| Option | Short | Required | Description |
|--------|-------|----------|-------------|
| `--project` | `-p` | Yes | Project slug |
| `--entity-type` | `-e` | No | Filter by entity type |
| `--json` | `-j` | No | Output as JSON |

**Examples:**
```bash
dcm bundle list -p my-site
dcm bundle list -p my-site -e node
dcm bundle list -p my-site --json
```

---

## Field Commands

### `dcm field create`

Create a new field on a bundle.

```bash
dcm field create \
  --project "project-slug" \
  --entity-type "node" \
  --bundle "bundle_name" \
  --field-type "string" \
  --label "Field Label" \
  [options...]
```

#### Required Options

| Option | Short | Description |
|--------|-------|-------------|
| `--project` | `-p` | Project slug |
| `--entity-type` | `-e` | Entity type |
| `--bundle` | `-b` | Bundle machine name |
| `--field-type` | `-t` | Field type (see list below) |
| `--label` | `-l` | Human-readable field label |

#### Common Options

| Option | Short | Description |
|--------|-------|-------------|
| `--field-name` | `-n` | Machine name (auto-generated if omitted) |
| `--description` | `-d` | Field description/help text |
| `--required` | `-r` | Make field required |
| `--cardinality` | | Number of values: `1` (single) or `-1` (unlimited) |
| `--json` | `-j` | Output as JSON |

#### Type-Specific Options

| Option | Applies To | Description |
|--------|------------|-------------|
| `--max-length` | `string` | Maximum length (default: 255) |
| `--allowed-values` | `list_string`, `list_integer` | Comma-separated `key\|label` pairs |
| `--target-type` | `entity_reference` | Target entity type |
| `--target-bundles` | `entity_reference`, `entity_reference_revisions` | Comma-separated bundle names |
| `--datetime-type` | `datetime`, `daterange` | `date` or `datetime` |
| `--link-type` | `link` | `external` or `internal` |
| `--title-option` | `link` | `optional`, `required`, or `disabled` |
| `--file-extensions` | `image`, `file` | Space-separated extensions |
| `--file-directory` | `image`, `file` | Upload directory path |
| `--alt-required` | `image` | Require alt text |

#### Field Types

- `string` - Plain text (single line)
- `string_long` - Plain text (multi-line)
- `text_long` - Formatted text
- `boolean` - True/false
- `integer` - Whole number
- `list_string` - Select list (text keys)
- `list_integer` - Select list (integer keys)
- `datetime` - Date/time
- `daterange` - Date range
- `link` - URL/link
- `image` - Image file
- `file` - File upload
- `entity_reference` - Reference to entity
- `entity_reference_revisions` - Paragraph reference
- `webform` - Webform reference

**Examples:**
```bash
# Simple text field
dcm field create -p my-site -e node -b article -t string -l "Subtitle"

# Required long text
dcm field create -p my-site -e node -b article -t text_long -l "Body" --required

# Select list
dcm field create -p my-site -e node -b article -t list_string -l "Status" \
  --allowed-values "draft|Draft,published|Published,archived|Archived"

# Entity reference to paragraphs
dcm field create -p my-site -e node -b article -t entity_reference_revisions \
  -l "Components" --target-bundles "hero,text_block,image_gallery" --cardinality -1

# Image field
dcm field create -p my-site -e node -b article -t image -l "Featured Image" \
  --file-extensions "png jpg jpeg webp" --alt-required
```

---

### `dcm field list`

List fields on a bundle or entity type.

```bash
dcm field list \
  --project "project-slug" \
  --entity-type "node" \
  [--bundle "bundle_name"] \
  [--json]
```

| Option | Short | Required | Description |
|--------|-------|----------|-------------|
| `--project` | `-p` | Yes | Project slug |
| `--entity-type` | `-e` | Yes | Entity type |
| `--bundle` | `-b` | No | Bundle name (if omitted, lists all fields across entity type) |
| `--json` | `-j` | No | Output as JSON |

**Examples:**
```bash
# List all node fields
dcm field list -p my-site -e node

# List fields on specific bundle
dcm field list -p my-site -e node -b article

# JSON output
dcm field list -p my-site -e node -b article --json
```

---

### `dcm field edit`

Edit a field instance.

```bash
dcm field edit \
  --project "project-slug" \
  --entity-type "node" \
  --bundle "bundle_name" \
  --field-name "field_name" \
  [--label "New Label"] \
  [--description "New description"] \
  [--required|--not-required]
```

| Option | Short | Required | Description |
|--------|-------|----------|-------------|
| `--project` | `-p` | Yes | Project slug |
| `--entity-type` | `-e` | Yes | Entity type |
| `--bundle` | `-b` | Yes | Bundle machine name |
| `--field-name` | `-n` | Yes | Field machine name |
| `--label` | `-l` | No | New field label |
| `--description` | `-d` | No | New description |
| `--required` | `-r` | No | Make field required |
| `--not-required` | | No | Make field optional |
| `--target-bundles` | | No | Update target bundles (entity_reference fields) |
| `--json` | `-j` | No | Output as JSON |

**Example:**
```bash
dcm field edit -p my-site -e node -b article -n field_n_subtitle \
  --label "Article Subtitle" --required
```

---

## Report Commands

### `dcm report entity`

Generate a report for an entity type.

```bash
dcm report entity \
  --project "project-slug" \
  --entity-type "node" \
  [--output "/path/to/output.md"] \
  [--base-url "https://example.com"]
```

| Option | Short | Required | Description |
|--------|-------|----------|-------------|
| `--project` | `-p` | Yes | Project slug |
| `--entity-type` | `-e` | Yes | Entity type to report on |
| `--output` | `-o` | No | Output file path (default: project reports dir) |
| `--base-url` | `-u` | No | Base URL for admin links (default: project base URL) |
| `--json` | `-j` | No | Output as JSON |

**Example:**
```bash
dcm report entity -p my-site -e node -o ~/reports/content-types.md
```

---

### `dcm report project`

Generate a full project report.

```bash
dcm report project \
  --project "project-slug" \
  [--output "/path/to/output.md"] \
  [--base-url "https://example.com"]
```

| Option | Short | Required | Description |
|--------|-------|----------|-------------|
| `--project` | `-p` | Yes | Project slug |
| `--output` | `-o` | No | Output file path (default: project reports dir) |
| `--base-url` | `-u` | No | Base URL for admin links |
| `--json` | `-j` | No | Output as JSON |

**Example:**
```bash
dcm report project -p my-site
dcm report project -p my-site -o ~/docs/content-model.md -u https://staging.mysite.com
```

---

## Form Display Commands

### `dcm form-display view`

View form display layout as a tree.

```bash
dcm form-display view \
  --project "project-slug" \
  --entity-type "node" \
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
```

---

### `dcm form-display list-modes`

List available form display modes for a bundle.

```bash
dcm form-display list-modes \
  --project "project-slug" \
  --entity-type "node" \
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

### `dcm form-display hide`

Hide one or more fields from the form display.

```bash
dcm form-display hide \
  --project "project-slug" \
  --entity-type "node" \
  --bundle "bundle_name" \
  --fields "field1,field2,..."
```

| Option | Short | Required | Description |
|--------|-------|----------|-------------|
| `--project` | `-p` | Yes | Project slug |
| `--entity-type` | `-e` | Yes | Entity type |
| `--bundle` | `-b` | Yes | Bundle machine name |
| `--fields` | `-f` | Yes | Comma-separated field names to hide |
| `--json` | `-j` | No | Output as JSON |

**Example:**
```bash
dcm form-display hide -p my-site -e node -b article -f "created,status,promote"
```

---

### `dcm form-display show`

Show one or more hidden fields (adds them back with default widget).

```bash
dcm form-display show \
  --project "project-slug" \
  --entity-type "node" \
  --bundle "bundle_name" \
  --fields "field1,field2,..."
```

| Option | Short | Required | Description |
|--------|-------|----------|-------------|
| `--project` | `-p` | Yes | Project slug |
| `--entity-type` | `-e` | Yes | Entity type |
| `--bundle` | `-b` | Yes | Bundle machine name |
| `--fields` | `-f` | Yes | Comma-separated field names to show |
| `--json` | `-j` | No | Output as JSON |

**Example:**
```bash
dcm form-display show -p my-site -e node -b article -f "status"
```

---

### `dcm form-display set-widget`

Change the widget type for a field.

```bash
dcm form-display set-widget \
  --project "project-slug" \
  --entity-type "node" \
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
| `--widget` | `-w` | Yes | Widget type |
| `--json` | `-j` | No | Output as JSON |

**Example:**
```bash
# Change entity reference to use select list
dcm form-display set-widget -p my-site -e node -b article -f field_n_category -w options_select

# Change to media library widget
dcm form-display set-widget -p my-site -e node -b article -f field_n_image -w media_library_widget
```

---

### `dcm form-display set-widget-setting`

Update a specific widget setting for a field.

```bash
dcm form-display set-widget-setting \
  --project "project-slug" \
  --entity-type "node" \
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
| `--json` | `-j` | No | Output as JSON |

**Example:**
```bash
# Set textarea rows
dcm form-display set-widget-setting -p my-site -e node -b article -f field_n_body -s rows -v 15

# Set placeholder text
dcm form-display set-widget-setting -p my-site -e node -b article -f field_n_title -s placeholder -v "Enter title here"
```

---

### `dcm form-display list-widgets`

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

### `dcm form-display group create`

Create a new field group.

```bash
dcm form-display group create \
  --project "project-slug" \
  --entity-type "node" \
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
| `--json` | `-j` | No | Output as JSON |

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

### `dcm form-display group edit`

Edit a field group's properties.

```bash
dcm form-display group edit \
  --project "project-slug" \
  --entity-type "node" \
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
| `--json` | `-j` | No | Output as JSON |

**Example:**
```bash
dcm form-display group edit -p my-site -e node -b article -n group_advanced -l "Advanced Options"
```

---

### `dcm form-display group delete`

Delete a field group.

```bash
dcm form-display group delete \
  --project "project-slug" \
  --entity-type "node" \
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
| `--json` | `-j` | No | Output as JSON |

**Example:**
```bash
dcm form-display group delete -p my-site -e node -b article -n group_old_settings
dcm form-display group delete -p my-site -e node -b article -n group_old_settings --move-children-to root
```

---

### `dcm form-display group list`

List all field groups in a form display.

```bash
dcm form-display group list \
  --project "project-slug" \
  --entity-type "node" \
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

### `dcm form-display move`

Move a field or group to a different parent.

```bash
dcm form-display move \
  --project "project-slug" \
  --entity-type "node" \
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
| `--json` | `-j` | No | Output as JSON |

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

### `dcm form-display reorder`

Reorder items within a group (or at root level).

```bash
dcm form-display reorder \
  --project "project-slug" \
  --entity-type "node" \
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
| `--json` | `-j` | No | Output as JSON |

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

### `dcm form-display set-weight`

Set the weight of a specific field or group.

```bash
dcm form-display set-weight \
  --project "project-slug" \
  --entity-type "node" \
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
| `--json` | `-j` | No | Output as JSON |

**Example:**
```bash
dcm form-display set-weight -p my-site -e node -b article -i field_n_title -w 0
dcm form-display set-weight -p my-site -e node -b article -i group_sidebar -w 100
```

---

### `dcm form-display reset`

Reset form display to defaults.

```bash
dcm form-display reset \
  --project "project-slug" \
  --entity-type "node" \
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
| `--json` | `-j` | No | Output as JSON |

**Example:**
```bash
dcm form-display reset -p my-site -e node -b article --force
dcm form-display reset -p my-site -e node -b article --keep-groups
```

---

## Admin Commands

### `dcm admin links`

Display admin links for a bundle.

```bash
dcm admin links \
  --project "project-slug" \
  --entity-type "node" \
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
dcm admin links -p my-site -e node -b article
```

**Output:**
```
Admin links for node > Article

  Edit Form            https://mysite.com/admin/structure/types/manage/article
  Manage Fields        https://mysite.com/admin/structure/types/manage/article/fields
  Manage Form Display  https://mysite.com/admin/structure/types/manage/article/form-display
  Manage Display       https://mysite.com/admin/structure/types/manage/article/display
  Manage Permissions   https://mysite.com/admin/structure/types/manage/article/permissions
```

---

## Role Commands

### `dcm role create`

Create a new role.

```bash
dcm role create \
  --project "project-slug" \
  --label "Role Label" \
  [--name "machine_name"] \
  [--is-admin]
```

| Option | Short | Required | Description |
|--------|-------|----------|-------------|
| `--project` | `-p` | Yes | Project slug |
| `--label` | `-l` | Yes | Human-readable role label |
| `--name` | `-n` | No | Machine name (auto-generated from label if omitted) |
| `--is-admin` | | No | Make this an admin role (has all permissions) |
| `--json` | `-j` | No | Output as JSON |

**Example:**
```bash
dcm role create -p my-site -l "Content Editor"
dcm role create -p my-site -l "Site Admin" -n site_admin --is-admin
```

---

### `dcm role list`

List all roles in a project.

```bash
dcm role list --project "project-slug" [--json]
```

| Option | Short | Required | Description |
|--------|-------|----------|-------------|
| `--project` | `-p` | Yes | Project slug |
| `--json` | `-j` | No | Output as JSON |

**Example:**
```bash
dcm role list -p my-site
dcm role list -p my-site --json
```

---

### `dcm role view`

View role details and permissions.

```bash
dcm role view \
  --project "project-slug" \
  --role "role_id"
```

| Option | Short | Required | Description |
|--------|-------|----------|-------------|
| `--project` | `-p` | Yes | Project slug |
| `--role` | `-r` | Yes | Role machine name |
| `--json` | `-j` | No | Output as JSON |

**Example:**
```bash
dcm role view -p my-site -r content_editor
```

---

### `dcm role delete`

Delete a role.

```bash
dcm role delete \
  --project "project-slug" \
  --role "role_id" \
  [--force]
```

| Option | Short | Required | Description |
|--------|-------|----------|-------------|
| `--project` | `-p` | Yes | Project slug |
| `--role` | `-r` | Yes | Role machine name |
| `--force` | `-f` | No | Skip confirmation prompt |
| `--json` | `-j` | No | Output as JSON |

**Example:**
```bash
dcm role delete -p my-site -r old_role --force
```

---

### `dcm role add-permission`

Add permissions for a bundle to a role.

```bash
dcm role add-permission \
  --project "project-slug" \
  --role "role_id" \
  --entity-type "node|media|taxonomy_term|block_content" \
  --bundle "bundle_name" \
  --permissions "create,edit_own,..."
```

| Option | Short | Required | Description |
|--------|-------|----------|-------------|
| `--project` | `-p` | Yes | Project slug |
| `--role` | `-r` | Yes | Role machine name |
| `--entity-type` | `-e` | Yes | Entity type: `node`, `media`, `taxonomy_term`, `block_content` |
| `--bundle` | `-b` | Yes | Bundle machine name |
| `--permissions` | | Yes | Comma-separated permission short names or `all` |
| `--json` | `-j` | No | Output as JSON |

**Permission Short Names:**

| Short Name | Description |
|------------|-------------|
| `create` | Create new content |
| `edit_own` | Edit own content |
| `edit_any` | Edit any content |
| `delete_own` | Delete own content |
| `delete_any` | Delete any content |
| `view_revisions` | View revisions |
| `revert_revisions` | Revert revisions |
| `delete_revisions` | Delete revisions |

**Examples:**
```bash
# Add create and edit_own permissions
dcm role add-permission -p my-site -r content_editor -e node -b article \
  --permissions "create,edit_own"

# Add all permissions for a bundle
dcm role add-permission -p my-site -r content_editor -e node -b article \
  --permissions "all"
```

---

### `dcm role remove-permission`

Remove specific permissions from a role.

```bash
dcm role remove-permission \
  --project "project-slug" \
  --role "role_id" \
  --permissions "permission1,permission2,..."
```

| Option | Short | Required | Description |
|--------|-------|----------|-------------|
| `--project` | `-p` | Yes | Project slug |
| `--role` | `-r` | Yes | Role machine name |
| `--permissions` | | Yes | Comma-separated full permission keys |
| `--json` | `-j` | No | Output as JSON |

**Example:**
```bash
dcm role remove-permission -p my-site -r content_editor \
  --permissions "delete any article content,delete own article content"
```

---

### `dcm role set-permissions`

Set permissions for a bundle (replaces any existing permissions for that bundle).

```bash
dcm role set-permissions \
  --project "project-slug" \
  --role "role_id" \
  --entity-type "node|media|taxonomy_term|block_content" \
  --bundle "bundle_name" \
  --permissions "create,edit_own,..."
```

| Option | Short | Required | Description |
|--------|-------|----------|-------------|
| `--project` | `-p` | Yes | Project slug |
| `--role` | `-r` | Yes | Role machine name |
| `--entity-type` | `-e` | Yes | Entity type |
| `--bundle` | `-b` | Yes | Bundle machine name |
| `--permissions` | | Yes | Comma-separated permission short names, `all`, or `none` |
| `--json` | `-j` | No | Output as JSON |

**Examples:**
```bash
# Set specific permissions (replaces existing)
dcm role set-permissions -p my-site -r content_editor -e node -b article \
  --permissions "create,edit_own,edit_any"

# Remove all permissions for a bundle
dcm role set-permissions -p my-site -r content_editor -e node -b article \
  --permissions "none"
```

---

### `dcm role list-permissions`

List available permissions for a bundle.

```bash
dcm role list-permissions \
  --entity-type "node|media|taxonomy_term|block_content" \
  --bundle "bundle_name"
```

| Option | Short | Required | Description |
|--------|-------|----------|-------------|
| `--entity-type` | `-e` | Yes | Entity type |
| `--bundle` | `-b` | Yes | Bundle machine name |
| `--json` | `-j` | No | Output as JSON |

**Example:**
```bash
dcm role list-permissions -e node -b article
```

**Output:**
```
Available permissions for node > article:

  Short Name         Permission Key                    Label
  create             create article content            Create new content
  edit_own           edit own article content          Edit own content
  edit_any           edit any article content          Edit any content
  delete_own         delete own article content        Delete own content
  delete_any         delete any article content        Delete any content
  view_revisions     view article revisions            View revisions
  revert_revisions   revert article revisions          Revert revisions
  delete_revisions   delete article revisions          Delete revisions
```

---

## Drush Commands

These commands integrate with Drupal's drush tool to sync configuration between files and the database.

**Prerequisites:**
- Project must have `drupalRoot` configured (path to Drupal installation)
- Drush must be available (configured via `drushCommand` in project settings, default: `drush`)

### `dcm drush sync`

Sync configuration with Drupal by running `drush cim` (import) followed by `drush cex` (export).

```bash
dcm drush sync --project "project-slug"
```

| Option | Short | Required | Description |
|--------|-------|----------|-------------|
| `--project` | `-p` | Yes | Project slug |
| `--json` | `-j` | No | Output as JSON |

**Example:**
```bash
dcm drush sync -p my-site
```

This is useful after creating configuration files to:
1. Import the new configuration into Drupal
2. Export it back to capture any UUIDs or third-party settings Drupal adds

---

### `dcm drush status`

Check drush sync configuration status for a project.

```bash
dcm drush status --project "project-slug"
```

| Option | Short | Required | Description |
|--------|-------|----------|-------------|
| `--project` | `-p` | Yes | Project slug |
| `--json` | `-j` | No | Output as JSON |

**Example:**
```bash
dcm drush status -p my-site
```

**Output:**
```
Drush Sync Status:
  Configured: Yes
  Drupal Root: /var/www/mysite
  Drush Command: drush

Ready to sync using "drush" in /var/www/mysite

Checking drush availability...
Drush is available and working.
```

---

## Automatic Sync (--sync flag)

Many commands support the `--sync` flag to automatically sync with Drupal after making changes. This runs `drush cim && drush cex` after the operation completes.

**Commands supporting --sync:**
- `dcm bundle create --sync`
- `dcm field create --sync`
- `dcm field edit --sync`
- `dcm role create --sync`
- `dcm role add-permission --sync`
- `dcm role remove-permission --sync`
- `dcm role set-permissions --sync`

**Example:**
```bash
# Create a field and sync immediately
dcm field create -p my-site -e node -b article -t string -l "Subtitle" --sync

# Add permissions and sync
dcm role add-permission -p my-site -r content_editor -e node -b article \
  --permissions "create,edit_own" --sync
```

**Note:** If `drupalRoot` is not configured or drush is not available, the sync will be skipped with a warning message.

---

## Interactive Mode

Running `dcm` without arguments launches interactive mode:

```bash
dcm
```

This provides a menu-driven interface for all operations.

---

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | Error |
