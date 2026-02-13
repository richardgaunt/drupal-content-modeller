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
