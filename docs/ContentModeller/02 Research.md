# Content Modeller Research

## Overview

This document captures the analysis of the CivicTheme configuration in `/config/` to determine which entity types and field types the Content Modeller CLI will support.

---

## 1. Entity Types Present

### Node Types (3)
| Machine Name | Label | Description |
|---|---|---|
| `civictheme_page` | Page | Main content pages |
| `civictheme_event` | Event | Event content type |
| `civictheme_alert` | Alert | Alert/notification content type |

### Media Types (6)
| Machine Name | Label | Source Plugin |
|---|---|---|
| `civictheme_image` | Image | `image` |
| `civictheme_document` | Document | `file` |
| `civictheme_audio` | Audio | `file` |
| `civictheme_video` | Video | `file` |
| `civictheme_remote_video` | Remote Video | `oembed:video` |
| `civictheme_icon` | Icon | `file` |

### Paragraph Types (42)
**Layout Components:**
- `civictheme_content`, `civictheme_accordion`, `civictheme_accordion_panel`
- `civictheme_slider`, `civictheme_slider_slide`
- `civictheme_manual_list`, `civictheme_automated_list`

**Card Components:**
- `civictheme_promo_card`, `civictheme_event_card`, `civictheme_navigation_card`
- `civictheme_subject_card`, `civictheme_publication_card`, `civictheme_service_card`

**Card References (non-nested):**
- `civictheme_promo_card_ref`, `civictheme_event_card_ref`, `civictheme_navigation_card_ref`
- `civictheme_subject_card_ref`, `civictheme_slider_slide_ref`, `civictheme_snippet_ref`

**Other Components:**
- `civictheme_callout`, `civictheme_campaign`, `civictheme_iframe`, `civictheme_map`
- `civictheme_message`, `civictheme_next_step`, `civictheme_promo`, `civictheme_snippet`
- `civictheme_social_icon`, `civictheme_attachment`, `civictheme_webform`

### Taxonomy Vocabularies (3)
| Machine Name | Label |
|---|---|
| `civictheme_topics` | Topics |
| `civictheme_site_sections` | Site Sections |
| `civictheme_media_tags` | Media Tags |

### Block Content Types (5)
| Machine Name | Label |
|---|---|
| `civictheme_banner` | Banner |
| `civictheme_component_block` | Component Block |
| `civictheme_mobile_navigation` | Mobile Navigation |
| `civictheme_search` | Search |
| `civictheme_social_links` | Social Links |

---

## 2. Field Types Present

### Supported Field Types (15)

| Field Type | Module | Description | Example Field |
|---|---|---|---|
| `string` | core | Short text (max 255) | `field_c_p_title` |
| `string_long` | core | Long text (plain) | `field_c_n_summary` |
| `text_long` | text | Rich text/HTML | `field_c_n_body` |
| `boolean` | core | Checkbox true/false | `field_c_p_expand` |
| `list_string` | options | Dropdown (string values) | `field_c_n_alert_type` |
| `list_integer` | options | Dropdown (integer values) | `field_c_p_list_column_count` |
| `integer` | core | Number input | `field_c_p_list_limit` |
| `datetime` | datetime | Date/time picker | `field_c_n_custom_last_updated` |
| `daterange` | datetime_range | Date range picker | `field_c_p_date_range` |
| `image` | image | Image upload | `field_c_m_image` |
| `file` | file | File upload | `field_c_m_document` |
| `link` | link | URL with optional title | `field_c_p_link` |
| `entity_reference` | core | Reference to entities | `field_c_n_topics` |
| `entity_reference_revisions` | entity_reference_revisions | Paragraph references | `field_c_n_components` |
| `webform` | webform | Webform selector | `field_c_p_webform` |

---

## 3. Bundle Configuration Patterns

### Node Type
**File:** `node.type.{bundle}.yml`

```yaml
langcode: en
status: true
dependencies:
  module:
    - menu_ui  # optional
name: {Human Label}
type: {machine_name}
description: {HTML description}
help: null
new_revision: true
preview_mode: 1
display_submitted: false
```

### Media Type
**File:** `media.type.{bundle}.yml`

```yaml
langcode: en
status: true
dependencies: {}
id: {machine_name}
label: {Human Label}
description: {Description}
source: {image|file|oembed:video}
queue_thumbnail_downloads: false
new_revision: true
source_configuration:
  source_field: {field_machine_name}
field_map:
  name: name
```

**Source plugins available:**
- `image` - Local image uploads
- `file` - Document/file uploads
- `oembed:video` - Remote video (YouTube, Vimeo)

### Paragraph Type
**File:** `paragraphs.paragraphs_type.{bundle}.yml`

```yaml
langcode: en
status: true
dependencies: {}
id: {machine_name}
label: {Human Label}
icon_uuid: null
icon_default: null
description: ''
behavior_plugins: {}
```

### Taxonomy Vocabulary
**File:** `taxonomy.vocabulary.{vocab_id}.yml`

```yaml
langcode: en
status: true
dependencies: {}
name: {Human Label}
vid: {machine_name}
description: null
weight: 0
new_revision: false
```

### Block Content Type
**File:** `block_content.type.{bundle}.yml`

```yaml
langcode: en
status: true
dependencies: {}
id: {machine_name}
label: {Human Label}
revision: false
description: {Description}
```

---

## 4. Field Configuration Patterns

### Field Storage (Global Definition)
**File:** `field.storage.{entity_type}.{field_name}.yml`

```yaml
langcode: en
status: true
dependencies:
  module:
    - {entity_type_module}
    - {field_type_module}
id: {entity_type}.{field_name}
field_name: {field_name}
entity_type: {node|media|paragraph|block_content|taxonomy_term}
type: {field_type}
settings: {}  # field-type-specific
module: {providing_module}
locked: false
cardinality: 1  # or -1 for unlimited
translatable: true
indexes: {}
persist_with_no_fields: false
custom_storage: false
```

### Field Instance (Bundle-specific)
**File:** `field.field.{entity_type}.{bundle}.{field_name}.yml`

```yaml
langcode: en
status: true
dependencies:
  config:
    - field.storage.{entity_type}.{field_name}
    - {entity_type}.type.{bundle}
  module:
    - {field_type_module}
id: {entity_type}.{bundle}.{field_name}
field_name: {field_name}
entity_type: {entity_type}
bundle: {bundle}
label: {Human Label}
description: ''
required: false
translatable: true
default_value: []
default_value_callback: ''
settings: {}  # field-type-specific
field_type: {field_type}
```

### Storage-Instance Relationship

1. **Storage** = field exists on entity type (shared across bundles)
2. **Instance** = field attached to specific bundle with label/settings
3. One storage can have multiple instances (same field on multiple bundles)

---

## 5. Field Type Settings

### String
```yaml
# storage settings
settings:
  max_length: 255
  is_ascii: false
  case_sensitive: false
```

### List String (Dropdown)
```yaml
# storage settings
settings:
  allowed_values:
    - value: option1
      label: Option 1
    - value: option2
      label: Option 2
  allowed_values_function: ''
```

### Entity Reference
```yaml
# storage settings
settings:
  target_type: {taxonomy_term|media|node|paragraph}

# instance settings
settings:
  handler: 'default:{target_type}'
  handler_settings:
    target_bundles:
      {bundle}: {bundle}
    sort:
      field: _none
      direction: ASC
    auto_create: false
```

### Image
```yaml
# instance settings
settings:
  file_directory: 'images/[date:custom:Y]-[date:custom:m]'
  file_extensions: 'png gif jpg jpeg svg'
  max_filesize: ''
  max_resolution: ''
  min_resolution: ''
  alt_field: true
  alt_field_required: true
  title_field: false
```

### Link
```yaml
# instance settings
settings:
  link_type: 16  # 16=internal+external, 17=external only
  title: 1  # 0=disabled, 1=optional, 2=required
```

---

## 6. Naming Conventions

### Field Naming Pattern
`field_c_{entity_prefix}_{descriptor}`

| Entity Type | Prefix | Example |
|---|---|---|
| Node | `field_c_n_` | `field_c_n_body` |
| Media | `field_c_m_` | `field_c_m_image` |
| Paragraph | `field_c_p_` | `field_c_p_title` |
| Block Content | `field_c_b_` | `field_c_b_banner` |

### Bundle Naming
All bundles prefixed with `civictheme_` (e.g., `civictheme_page`, `civictheme_accordion`)

---

## 7. Scope for Initial Implementation

### Entity Types to Support
- [x] Node
- [x] Media
- [x] Paragraph
- [x] Taxonomy Vocabulary
- [ ] Block Content (optional - lower priority)

### Field Types to Support (Phase 1)
- [x] `string` - Text field
- [x] `string_long` - Long text (plain)
- [x] `text_long` - Rich text
- [x] `boolean` - Checkbox
- [x] `list_string` - Select dropdown
- [x] `integer` - Number
- [x] `link` - Link/URL
- [x] `image` - Image upload (required for media type sources)
- [x] `file` - File upload (required for media type sources)
- [x] `entity_reference` - Reference to media/taxonomy
- [x] `entity_reference_revisions` - Paragraph reference

### Field Types to Support (Phase 2)
- [ ] `datetime` - Date picker
- [ ] `daterange` - Date range
- [ ] `list_integer` - Integer dropdown
- [ ] `webform` - Webform reference

---

## 8. Files NOT to Generate

Per the specification, the CLI will NOT generate:
- Form display configs (`core.entity_form_display.*.yml`)
- View display configs (`core.entity_view_display.*.yml`)
- Image styles
- Text formats
- Views
- Workflows

These will be managed within Drupal directly.

---

## Summary Statistics

| Type | Count |
|---|---|
| Node types | 3 |
| Media types | 6 |
| Paragraph types | 42 |
| Taxonomy vocabularies | 3 |
| Block content types | 5 |
| Unique field types | 15 |
| Field storage definitions | 105+ |
| Field instances | 300+ |
