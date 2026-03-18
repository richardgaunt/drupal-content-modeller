---
name: drupal-migrate
description: Generate Drupal migrate_plus migration YAML configs and custom PHP source/process plugins. Invoke when the user wants to create migrations for moving content between Drupal sites or importing data.
disable-model-invocation: true
---

# Drupal Migration Generator Skill

You are helping the user generate Drupal `migrate_plus` migration configurations: YAML migration files, a custom migration module with PHP source/process plugins, and the full dependency chain.

## Step 0: Gather project information

Run these commands to understand the project and destination content model:

```bash
dcm project list --json
dcm help migration --json
```

Ask the user which project to use. Then get the full project configuration:

```bash
dcm project view -p <project> --json
```

This returns `configDirectory`, `drupalRoot`, `drushCommand`, `baseUrl`, theme chain, and last sync date. Use these values — do NOT ask the user for paths that are already configured.

Then gather the content model:

```bash
dcm bundle list -p <project> --json
dcm migration list -p <project> --json
```

If `drupalRoot` is set, the custom module path is typically `<drupalRoot>/web/modules/custom/<project>_migrate/`. Confirm this with the user.

Only ask the user for information not already in the project config:
- **Source database connection key** (usually `source` — defined in `settings.php`)

## Step 1: Examine existing migrations

If migrations already exist, inspect them to learn the project's conventions:

```bash
dcm migration report -p <project> --json
```

This reveals naming conventions, source plugin patterns (standard `d8_entity` vs custom), process plugin preferences, and dependency ordering.

## Step 2: Get the mapping requirements

Ask the user to provide a source-to-destination field mapping. This could be:
- A table of source fields → destination fields
- A ticket describing what content to migrate
- A description of source and destination content types

## Step 3: Discover destination field details

For each destination bundle involved, get detailed field info:

```bash
dcm field list -p <project> -e <entity_type> -b <bundle> --json
```

This returns field type, cardinality, required status, and settings (target_type, target_bundles, allowed_values, etc.) — all critical for choosing the right process plugins.

## Step 3b: Discover text formats for formatted text fields

For any `text_long` or `string_long` field that stores HTML, you need to know which text format to use in the migration. Run:

```bash
dcm filter-list -p <project> --json
```

This returns all text formats with their configuration:
- **`id`** — the machine name to use in migration YAML (e.g., `civictheme_rich_text`, `full_html`)
- **`htmlMode`** — `full` (no restriction), `restricted` (allowlist), or `escaped` (plain text only)
- **`allowedHtml`** — the exact HTML tags permitted (when restricted)
- **`mediaEmbed`** — whether `<drupal-media>` tags are supported, and which media types
- **`linkit`** — whether linkit data attributes are supported on `<a>` tags

### Choosing the right text format

Use this decision process:
1. **If the source content has `<drupal-media>` embeds or inline images that will be rewritten to `<drupal-media>`** — use a format with `mediaEmbed` enabled (check `allowedMediaTypes` includes the media bundles you're migrating)
2. **If the content has rich HTML (headings, tables, lists, links)** — use a format with `htmlMode: "restricted"` or `"full"` that allows those tags
3. **If the content is plain text** — use a format with `htmlMode: "escaped"` (e.g., `plain_text`)
4. **If the content has linkit-style internal links** — prefer a format with `linkit: true`
5. **When in doubt** — check the `allowedHtml` to confirm the tags in your source content are permitted

In the migration YAML, always set both value and format:
```yaml
field_n_body/value: body_rewritten
field_n_body/format:
  plugin: default_value
  default_value: civictheme_rich_text   # ← from filter-list output
```

## Step 4: Plan the migration chain

Determine what migrations are needed and their dependency order:

1. **Taxonomy terms** (no dependencies)
2. **Files** (no dependencies)
3. **Media** (depends on files)
4. **Inline media** (depends on inline files) — for body content with embedded images/videos
5. **Simple paragraphs** (depends on taxonomy)
6. **Complex paragraphs** (depends on other paragraphs, media)
7. **Nodes** (depends on taxonomy, media, paragraphs)
8. **Path aliases** (depends on nodes)
9. **File downloads** (depends on all file migrations — prefix with `zzz_` to run last)

For each migration, decide:
- Whether a custom source plugin is needed (see decision guide below)
- Which process plugins to use per field
- What migration dependencies to declare

### Present the plan

Before generating any files, present a summary table:

```
Migration Plan:

| Migration ID              | Entity Type | Bundle        | Source Plugin | Dependencies |
|---------------------------|-------------|---------------|--------------|--------------|
| project_category          | taxonomy    | category      | d8_entity    | none         |
| project_file              | file        | -             | custom       | none         |
| project_media_image       | media       | image         | d8_entity    | project_file |
| project_article           | node        | article       | custom       | project_category, project_media_image |

Custom plugins needed:
- project_file: scopes query to public:// files only
- project_article: body HTML rewriting (inline images → drupal-media)

Proceed? (wait for confirmation)
```

**Wait for user confirmation before generating files.**

## Step 5: Generate migration files

Generate all YAML and PHP files. Follow these patterns exactly.

---

## Migration YAML Structure

### Migration Group

```yaml
uuid: <generate-a-uuid>
langcode: en
status: true
dependencies:
  module:
    - <project>_migrate
_core:
  default_config_hash: placeholder
id: <group_id>
label: '<Group Label>'
description: '<Description>'
source_type: Custom
module: null
shared_configuration:
  source:
    key: source
```

### Migration File Template

```yaml
uuid: <generate-a-uuid>
langcode: en
status: true
dependencies:
  module:
    - <project>_migrate
_core:
  default_config_hash: placeholder
id: <migration_id>
label: '<Human-readable label>'
migration_group: <group_id>
migration_tags:
  - <project>
source:
  plugin: <source_plugin>
  key: source
  entity_type: <entity_type>
  bundle: <source_bundle>
process:
  # field mappings (see patterns below)
destination:
  plugin: 'entity:<entity_type>'
  default_bundle: <dest_bundle>
migration_dependencies:
  required:
    - <dependency_id>
  optional: {}
include: null
```

### Naming Convention

`<project>_<entity_description>` — examples:
- `project_category` — taxonomy migration
- `project_file` — base file migration
- `project_media_image` — media migration
- `project_article` — node migration
- `project_article_attachment` — paragraph wrapping media
- `project_inline_media_article_body` — inline media for a body field
- `project_inline_file_article_body` — inline file for a body field
- `project_node_path_alias` — path alias migration
- `zzz_project_file_download` — file download (runs last)

---

## Process Plugin Patterns by Field Type

### Direct Value (string, integer, boolean)
```yaml
field_n_title: source_field/0/value
title: title
```

### Default Value (constants)
```yaml
type:
  plugin: default_value
  default_value: <bundle_name>
uid:
  plugin: default_value
  default_value: 1
```

### Text with Format (text_long, string_long)
Always set both value and format:
```yaml
field_n_body/value: body_rewritten
field_n_body/format:
  plugin: default_value
  default_value: full_html
```

### Date Formatting (datetime, daterange)
```yaml
# From ISO format
field_n_date:
  plugin: format_date
  source: field_date/0/value
  from_format: 'Y-m-d\TH:i:s'
  to_format: Y-m-d

# From Unix timestamp
field_n_date:
  plugin: format_date
  source: created
  from_format: U
  to_format: 'Y-m-d\TH:i:s'
```

### Single Entity Reference (taxonomy, media, etc.)
```yaml
field_n_category:
  plugin: migration_lookup
  migration: <taxonomy_migration_id>
  source: field_category/0/target_id
  no_stub: true
```

### Multi-valued Entity Reference (cardinality: -1)
```yaml
field_n_tags:
  plugin: sub_process
  source: field_tags
  process:
    target_id:
      plugin: migration_lookup
      migration: <taxonomy_migration_id>
      source: target_id
      no_stub: true
```

### Paragraph Reference (entity_reference_revisions)
Paragraphs ALWAYS need both `target_id` AND `target_revision_id`:
```yaml
field_n_sections:
  plugin: sub_process
  source: sections
  process:
    target_id:
      plugin: migration_lookup
      migration: <paragraph_migration_id>
      source: target_id
      no_stub: true
    target_revision_id:
      - plugin: migration_lookup
        migration: <paragraph_migration_id>
        source: target_id
        no_stub: true
      - plugin: entity_revision_lookup
        entity_type: paragraph
```

### Multiple Migration Lookups (polymorphic references)
When a field can reference entities from different migrations:
```yaml
field_n_vehicle:
  plugin: sub_process
  source: vehicle_ids
  process:
    target_id:
      plugin: migration_lookup
      migration:
        - migration_a
        - migration_b
      source: source_id
      no_stub: true
    target_revision_id:
      - plugin: migration_lookup
        migration:
          - migration_a
          - migration_b
        source: source_id
        no_stub: true
      - plugin: entity_revision_lookup
        entity_type: paragraph
```

### Null Coalesce (fallback values)
```yaml
_lookup_a:
  plugin: migration_lookup
  migration: migration_a
  source: source_id
  no_stub: true
_lookup_b:
  plugin: migration_lookup
  migration: migration_b
  source: source_id
  no_stub: true
field_n_image:
  plugin: null_coalesce
  source:
    - '@_lookup_a'
    - '@_lookup_b'
```

### Link Field
```yaml
# Single link
field_p_link/uri: field_link/0/uri
field_p_link/title: field_link/0/title

# Multi-value links via sub_process
field_p_links:
  plugin: sub_process
  source: field_links
  process:
    uri: uri
    title: title
```

### String Replacement
```yaml
field_p_link/uri:
  plugin: str_replace
  source: field_link/0/uri
  search:
    - 'https://old-domain.com'
    - 'http://old-domain.com'
  replace:
    - ''
    - ''
```

### Entity Lookup (by property, not migration)
```yaml
field_m_image/target_id:
  plugin: entity_lookup
  entity_type: file
  value_key: uri
  source: destination_uri
```

### File Migration
```yaml
process:
  uuid: uuid
  filename: filename
  uri:
    - plugin: str_replace
      source: uri
      search: 'public://'
      replace: ''
    - plugin: concat
      source:
        - constants/base_url
        - '@uri'
  _file_check:
    plugin: file_head
    source: '@uri'
    skip_on_error: true
    guzzle_options:
      timeout: 10
      connect_timeout: 5
  filemime: filemime
  status: status
  uid:
    plugin: default_value
    default_value: 1
  created: created
  changed: changed
destination:
  plugin: 'entity:file'
```

### Media Migration
```yaml
process:
  uuid: uuid
  name: name
  status: status
  uid:
    plugin: default_value
    default_value: 1
  created: created
  changed: changed
  # Image media field:
  field_m_image/target_id:
    plugin: migration_lookup
    migration: <file_migration>
    source: field_image/0/target_id
  field_m_image/alt: field_image/0/alt
  field_m_image/title: field_image/0/title
  field_m_image/width: field_image/0/width
  field_m_image/height: field_image/0/height
destination:
  plugin: 'entity:media'
  default_bundle: <media_bundle>
```

### Path Alias Migration
```yaml
source:
  plugin: <custom_path_alias_source>
  key: source
  node_types:
    - content_type_a
    - content_type_b
  constants:
    node_prefix: /node/
process:
  uuid: uuid
  path:
    plugin: concat
    source:
      - constants/node_prefix
      - _destination_nid
    delimiter: ''
  alias: alias
  langcode: langcode
  status:
    plugin: default_value
    default_value: 1
destination:
  plugin: 'entity:path_alias'
```

### File Download Migration (runs last)
```yaml
id: zzz_<project>_file_download
source:
  plugin: <custom_file_download_source>
  key: source
  base_url: 'https://source-site.com'
  root: 'https://source-site.com/sites/default/files/'
process:
  fid: fid
  uri:
    plugin: file_import
    source: source_url
    destination: destination_uri
    file_exists: 'use existing'
    guzzle_options:
      timeout: 30
      connect_timeout: 10
destination:
  plugin: file_download
migration_dependencies:
  optional:
    - <project>_file
```

---

## When Custom Source Plugins Are Needed

### Use Standard `d8_entity` When:
- Source and destination have 1:1 field mapping
- No HTML transformation needed
- No field consolidation required
- Simple taxonomy/vocabulary migrations

### Create Custom Source Plugin When:
1. **HTML body rewriting** — Converting `<img>` to `<drupal-media>`, rewriting inline videos, URL normalization
2. **Field consolidation** — Combining multiple source fields into one (e.g., summary + content → body)
3. **Synthetic row generation** — Creating rows from parsed HTML (extracting inline images from body fields)
4. **Cross-entity data collection** — Pulling taxonomy references from related paragraph tables
5. **Pathauto state lookup** — Reading from key_value table
6. **Data restructuring** — Converting nested paragraph references into flat arrays for `sub_process`

---

## Custom Module Structure

```
web/modules/custom/<project>_migrate/
├── <project>_migrate.info.yml
├── src/Plugin/migrate/
│   ├── source/
│   │   ├── MyNodeSource.php
│   │   ├── RewritesInlineImages.php   # Shared trait
│   │   └── ...
│   ├── process/
│   │   ├── EntityRevisionLookup.php
│   │   └── FileHead.php
│   └── destination/                    # Rarely needed
│       └── FileDownloadDestination.php
```

### Module Info File
```yaml
name: '<Project> Migrate'
type: module
description: 'Migration plugins for <project>'
core_version_requirement: ^10.3 || ^11
package: Migration
dependencies:
  - drupal:migrate
  - migrate_plus:migrate_plus
  - migrate_drupal_d8:migrate_drupal_d8
```

### Minimal Custom Source Plugin (query scoping)
```php
<?php
namespace Drupal\<project>_migrate\Plugin\migrate\source;

use Drupal\migrate_drupal_d8\Plugin\migrate\source\d8\ContentEntity;

/**
 * @MigrateSource(id = "<plugin_id>")
 */
final class MyFileSource extends ContentEntity {
  public function query() {
    $query = parent::query();
    $query->condition('b.uri', 'public://%', 'LIKE');
    return $query;
  }
}
```

### Field Consolidation / Body Rewriting Plugin
```php
<?php
namespace Drupal\<project>_migrate\Plugin\migrate\source;

use Drupal\migrate\Row;
use Drupal\migrate_drupal_d8\Plugin\migrate\source\d8\ContentEntity;

/**
 * @MigrateSource(id = "<plugin_id>")
 */
final class MyNodeSource extends ContentEntity {
  use RewritesInlineImages;

  public function prepareRow(Row $row): bool {
    if (!parent::prepareRow($row)) {
      return FALSE;
    }

    // Rewrite body HTML (inline images → drupal-media)
    $body = $row->getSourceProperty('body/0/value') ?: '';
    $row->setSourceProperty('body_rewritten', $this->rewriteBody($body));

    // Combine fields
    $summary = $row->getSourceProperty('field_summary/0/value');
    $content = $row->getSourceProperty('field_content/0/value');
    $row->setSourceProperty('body_combined', ($summary ?: '') . ($content ?: ''));

    // Restructure references for sub_process
    $refs = $row->getSourceProperty('field_items') ?: [];
    $ids = array_map(fn($r) => ['target_id' => $r['target_id']], $refs);
    $row->setSourceProperty('item_ids', $ids);

    // Pathauto state lookup
    $nid = $row->getSourceProperty('nid');
    $pathauto_state = 0;
    if ($nid) {
      $value = $this->select('key_value', 'kv')
        ->fields('kv', ['value'])
        ->condition('collection', 'pathauto_state.node')
        ->condition('name', $nid)
        ->execute()
        ->fetchField();
      if ($value !== FALSE) {
        $pathauto_state = (int) unserialize($value, ['allowed_classes' => FALSE]);
      }
    }
    $row->setSourceProperty('pathauto_state', $pathauto_state);

    return TRUE;
  }
}
```

### HTML Rewriting Trait (shared across source plugins)
```php
<?php
namespace Drupal\<project>_migrate\Plugin\migrate\source;

use Drupal\Core\Database\Database;
use Ramsey\Uuid\Uuid;

trait RewritesInlineImages {
  protected ?array $fileManagedUuidCache = NULL;

  protected function rewriteBody(string $body): string {
    // Normalize absolute URLs to relative
    $body = preg_replace('#https?://(?:www\.)?example\.com/#', '/', $body);
    // Rewrite <img data-entity-uuid> to <drupal-media>
    $body = preg_replace(
      '/<img[^>]*data-entity-uuid="([^"]+)"[^>]*\/?>/i',
      '<drupal-media data-entity-type="media" data-entity-uuid="$1" data-view-mode="default"></drupal-media>',
      $body
    );
    $body = $this->rewritePublicFileImages($body);
    return $this->rewriteInlineVideos($body);
  }

  protected function rewriteInlineVideos(string $body): string {
    if (!str_contains($body, 'youtube.com') && !str_contains($body, 'youtu.be') && !str_contains($body, 'vimeo.com')) {
      return $body;
    }
    return preg_replace_callback(
      '/<iframe\s[^>]*src="([^"]*(?:youtube\.com|youtu\.be|vimeo\.com)[^"]*)"[^>]*><\/iframe>/i',
      function (array $matches) {
        $src_url = html_entity_decode($matches[1], ENT_QUOTES);
        $video_url = $this->normalizeVideoUrl($src_url);
        if (!$video_url) return $matches[0];
        $uuid = Uuid::uuid5(Uuid::NAMESPACE_URL, $video_url)->toString();
        return '<drupal-media data-entity-type="media" data-entity-uuid="' . $uuid . '" data-view-mode="default"></drupal-media>';
      },
      $body
    ) ?? $body;
  }

  protected function normalizeVideoUrl(string $src_url): ?string {
    if (preg_match('#youtube\.com/embed/([a-zA-Z0-9_-]+)#', $src_url, $m)) return 'https://www.youtube.com/watch?v=' . $m[1];
    if (preg_match('#youtu\.be/([a-zA-Z0-9_-]+)#', $src_url, $m)) return 'https://www.youtube.com/watch?v=' . $m[1];
    if (preg_match('#vimeo\.com/(?:video/)?(\d+)#', $src_url, $m)) return 'https://vimeo.com/' . $m[1];
    return NULL;
  }

  protected function rewritePublicFileImages(string $body): string {
    if (!str_contains($body, '/sites/default/files/')) return $body;
    $this->loadFileManagedUuidCache();
    return preg_replace_callback(
      '/<img\s[^>]*src="(\/sites\/default\/files\/([^"]+))"[^>]*\/?>/i',
      function (array $matches) {
        $relative_path = urldecode($matches[2]);
        $uuid = $this->fileManagedUuidCache[$relative_path]
          ?? Uuid::uuid5(Uuid::NAMESPACE_URL, $matches[1])->toString();
        return '<drupal-media data-entity-type="media" data-entity-uuid="' . $uuid . '" data-view-mode="default"></drupal-media>';
      },
      $body
    ) ?? $body;
  }

  protected function loadFileManagedUuidCache(): void {
    if ($this->fileManagedUuidCache !== NULL) return;
    $this->fileManagedUuidCache = [];
    $db = Database::getConnection('default', 'source');
    if (!$db->schema()->tableExists('file_managed')) return;
    $results = $db->select('file_managed', 'f')
      ->fields('f', ['uri', 'uuid'])
      ->condition('f.uri', 'public://%', 'LIKE')
      ->execute();
    foreach ($results as $result) {
      $relative_path = str_replace('public://', '', (string) $result->uri);
      $this->fileManagedUuidCache[$relative_path] = (string) $result->uuid;
    }
  }

  protected function demoteHeadings(string $body): string {
    $body = preg_replace('#<(/?)h3(\s|>)#i', '<$1h4$2', $body) ?? $body;
    return preg_replace('#<(/?)h2(\s|>)#i', '<$1h3$2', $body) ?? $body;
  }
}
```

### entity_revision_lookup Process Plugin
Required for paragraph `target_revision_id`:
```php
<?php
namespace Drupal\<project>_migrate\Plugin\migrate\process;

use Drupal\migrate\Attribute\MigrateProcess;
use Drupal\migrate\MigrateExecutableInterface;
use Drupal\migrate\ProcessPluginBase;
use Drupal\migrate\Row;

#[MigrateProcess('entity_revision_lookup')]
final class EntityRevisionLookup extends ProcessPluginBase {
  public function transform($value, MigrateExecutableInterface $migrate_executable, Row $row, $destination_property): ?int {
    if (empty($value)) return NULL;
    $entity_type = $this->configuration['entity_type'] ?? 'paragraph';
    $entity = \Drupal::entityTypeManager()->getStorage($entity_type)->load($value);
    return $entity ? (int) $entity->getRevisionId() : NULL;
  }
}
```

### file_head Process Plugin
Verify remote files exist before downloading:
```php
<?php
namespace Drupal\<project>_migrate\Plugin\migrate\process;

use Drupal\migrate\Attribute\MigrateProcess;
use Drupal\migrate\MigrateExecutableInterface;
use Drupal\migrate\MigrateSkipRowException;
use Drupal\migrate\ProcessPluginBase;
use Drupal\migrate\Row;

#[MigrateProcess('file_head')]
final class FileHead extends ProcessPluginBase {
  public function transform($value, MigrateExecutableInterface $migrate_executable, Row $row, $destination_property): array {
    $url = (string) $value;
    $skip_on_error = !empty($this->configuration['skip_on_error']);
    $guzzle_options = $this->configuration['guzzle_options'] ?? [];
    try {
      $response = \Drupal::httpClient()->head($url, $guzzle_options);
      return ['exists' => TRUE, 'content_type' => $response->getHeaderLine('Content-Type')];
    } catch (\Exception $e) {
      if ($skip_on_error) throw new MigrateSkipRowException("HEAD failed for {$url}: " . $e->getMessage());
      throw $e;
    }
  }
}
```

---

## Step 6: Verify

After generating all files, tell the user to:
1. Enable the migration module: `drush en <project>_migrate`
2. Import config: `drush cim -y`
3. Check migration status: `drush ms --group=<group_id>`
4. Run a single migration to test: `drush mim <migration_id> --limit=5`
5. Check for errors: `drush mmsg <migration_id>`

---

## Key Gotchas

1. **Paragraph references ALWAYS need target_revision_id** — use `entity_revision_lookup` after `migration_lookup`
2. **Always use `no_stub: true`** on `migration_lookup` to avoid creating stub entities
3. **`sub_process` source must be an array** — prepare arrays in custom source plugin `prepareRow()`
4. **Text format must be set explicitly** — always map `field/format` alongside `field/value`
5. **Inline media requires a 3-step chain**: inline file migration → inline media migration → node body rewriting in source plugin
6. **Empty optional dependencies use `{}` not `[]`** — YAML: `optional: {}` not `optional: []`
7. **Source plugin `key: source`** — references the database connection key in `settings.php`
8. **Field prefixes** — node: `field_n_`, media: `field_m_`, paragraph: `field_p_`, taxonomy: `field_t_`, block: `field_b_`
9. **File downloads run last** — prefix with `zzz_` and use optional dependencies
10. **Deterministic UUIDs** — use `Uuid::uuid5()` for synthetic media/files so re-runs are idempotent
