# Data Structures

## Overview

This document defines the JSON schemas for data structures used by the Content Modeller CLI. These schemas validate project configuration and generated YAML output.

---

## 1. Project Schema

Stored in `projects/project.json`

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["name", "slug", "configDirectory", "entities"],
  "properties": {
    "name": {
      "type": "string",
      "description": "Human-readable project name"
    },
    "slug": {
      "type": "string",
      "pattern": "^[a-z0-9_-]+$",
      "description": "Directory-safe project identifier"
    },
    "configDirectory": {
      "type": "string",
      "description": "Absolute path to Drupal config export directory"
    },
    "lastSync": {
      "type": "string",
      "format": "date-time",
      "description": "ISO timestamp of last configuration sync"
    },
    "entities": {
      "type": "object",
      "description": "Indexed entity data from config sync",
      "properties": {
        "node": { "$ref": "#/definitions/entityTypeData" },
        "media": { "$ref": "#/definitions/entityTypeData" },
        "paragraph": { "$ref": "#/definitions/entityTypeData" },
        "taxonomy_term": { "$ref": "#/definitions/entityTypeData" },
        "block_content": { "$ref": "#/definitions/entityTypeData" }
      }
    }
  },
  "definitions": {
    "entityTypeData": {
      "type": "object",
      "additionalProperties": {
        "$ref": "#/definitions/bundle"
      }
    },
    "bundle": {
      "type": "object",
      "required": ["id", "label"],
      "properties": {
        "id": { "type": "string" },
        "label": { "type": "string" },
        "description": { "type": "string" },
        "fields": {
          "type": "object",
          "additionalProperties": { "$ref": "#/definitions/field" }
        }
      }
    },
    "field": {
      "type": "object",
      "required": ["name", "label", "type"],
      "properties": {
        "name": { "type": "string" },
        "label": { "type": "string" },
        "type": { "type": "string" },
        "required": { "type": "boolean" },
        "cardinality": { "type": "integer" },
        "settings": { "type": "object" }
      }
    }
  }
}
```

---

## 2. Entity Type Definitions

### Supported Entity Types

```json
{
  "entityTypes": [
    {
      "id": "node",
      "label": "Content Type",
      "configPrefix": "node.type",
      "fieldPrefix": "field_c_n_"
    },
    {
      "id": "media",
      "label": "Media Type",
      "configPrefix": "media.type",
      "fieldPrefix": "field_c_m_"
    },
    {
      "id": "paragraph",
      "label": "Paragraph Type",
      "configPrefix": "paragraphs.paragraphs_type",
      "fieldPrefix": "field_c_p_"
    },
    {
      "id": "taxonomy_term",
      "label": "Vocabulary",
      "configPrefix": "taxonomy.vocabulary",
      "fieldPrefix": "field_c_t_"
    },
    {
      "id": "block_content",
      "label": "Block Type",
      "configPrefix": "block_content.type",
      "fieldPrefix": "field_c_b_"
    }
  ]
}
```

---

## 3. Bundle Schemas

### Node Type Bundle

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["name", "type"],
  "properties": {
    "langcode": { "type": "string", "default": "en" },
    "status": { "type": "boolean", "default": true },
    "dependencies": { "type": "object" },
    "name": { "type": "string", "description": "Human-readable label" },
    "type": { "type": "string", "pattern": "^[a-z_]+$", "description": "Machine name" },
    "description": { "type": "string" },
    "help": { "type": ["string", "null"] },
    "new_revision": { "type": "boolean", "default": true },
    "preview_mode": { "type": "integer", "enum": [0, 1, 2], "default": 1 },
    "display_submitted": { "type": "boolean", "default": false }
  }
}
```

### Media Type Bundle

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["id", "label", "source"],
  "properties": {
    "langcode": { "type": "string", "default": "en" },
    "status": { "type": "boolean", "default": true },
    "dependencies": { "type": "object" },
    "id": { "type": "string", "pattern": "^[a-z_]+$" },
    "label": { "type": "string" },
    "description": { "type": "string" },
    "source": {
      "type": "string",
      "enum": ["image", "file", "oembed:video"],
      "description": "Media source plugin"
    },
    "queue_thumbnail_downloads": { "type": "boolean", "default": false },
    "new_revision": { "type": "boolean", "default": true },
    "source_configuration": {
      "type": "object",
      "properties": {
        "source_field": { "type": "string" }
      }
    },
    "field_map": { "type": "object" }
  }
}
```

### Paragraph Type Bundle

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["id", "label"],
  "properties": {
    "langcode": { "type": "string", "default": "en" },
    "status": { "type": "boolean", "default": true },
    "dependencies": { "type": "object" },
    "id": { "type": "string", "pattern": "^[a-z_]+$" },
    "label": { "type": "string" },
    "icon_uuid": { "type": ["string", "null"] },
    "icon_default": { "type": ["string", "null"] },
    "description": { "type": "string" },
    "behavior_plugins": { "type": "object" }
  }
}
```

### Taxonomy Vocabulary Bundle

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["name", "vid"],
  "properties": {
    "langcode": { "type": "string", "default": "en" },
    "status": { "type": "boolean", "default": true },
    "dependencies": { "type": "object" },
    "name": { "type": "string" },
    "vid": { "type": "string", "pattern": "^[a-z_]+$" },
    "description": { "type": ["string", "null"] },
    "weight": { "type": "integer", "default": 0 },
    "new_revision": { "type": "boolean", "default": false }
  }
}
```

---

## 4. Field Schemas

### Field Storage Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["id", "field_name", "entity_type", "type"],
  "properties": {
    "langcode": { "type": "string", "default": "en" },
    "status": { "type": "boolean", "default": true },
    "dependencies": {
      "type": "object",
      "properties": {
        "module": { "type": "array", "items": { "type": "string" } }
      }
    },
    "id": { "type": "string", "description": "{entity_type}.{field_name}" },
    "field_name": { "type": "string", "pattern": "^field_[a-z_]+$" },
    "entity_type": {
      "type": "string",
      "enum": ["node", "media", "paragraph", "taxonomy_term", "block_content"]
    },
    "type": { "$ref": "#/definitions/fieldType" },
    "settings": { "type": "object" },
    "module": { "type": "string" },
    "locked": { "type": "boolean", "default": false },
    "cardinality": { "type": "integer", "default": 1, "description": "-1 for unlimited" },
    "translatable": { "type": "boolean", "default": true },
    "indexes": { "type": "object" },
    "persist_with_no_fields": { "type": "boolean", "default": false },
    "custom_storage": { "type": "boolean", "default": false }
  },
  "definitions": {
    "fieldType": {
      "type": "string",
      "enum": [
        "string",
        "string_long",
        "text_long",
        "boolean",
        "integer",
        "list_string",
        "list_integer",
        "datetime",
        "daterange",
        "link",
        "image",
        "file",
        "entity_reference",
        "entity_reference_revisions",
        "webform"
      ]
    }
  }
}
```

### Field Instance Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["id", "field_name", "entity_type", "bundle", "label", "field_type"],
  "properties": {
    "langcode": { "type": "string", "default": "en" },
    "status": { "type": "boolean", "default": true },
    "dependencies": {
      "type": "object",
      "properties": {
        "config": { "type": "array", "items": { "type": "string" } },
        "module": { "type": "array", "items": { "type": "string" } }
      }
    },
    "id": { "type": "string", "description": "{entity_type}.{bundle}.{field_name}" },
    "field_name": { "type": "string" },
    "entity_type": { "type": "string" },
    "bundle": { "type": "string" },
    "label": { "type": "string" },
    "description": { "type": "string" },
    "required": { "type": "boolean", "default": false },
    "translatable": { "type": "boolean", "default": true },
    "default_value": { "type": "array" },
    "default_value_callback": { "type": "string" },
    "settings": { "type": "object" },
    "field_type": { "type": "string" }
  }
}
```

---

## 5. Field Type Settings Reference

### String Field
```json
{
  "storage": {
    "max_length": 255,
    "is_ascii": false,
    "case_sensitive": false
  },
  "instance": {}
}
```

### List String Field
```json
{
  "storage": {
    "allowed_values": [
      { "value": "key1", "label": "Label 1" },
      { "value": "key2", "label": "Label 2" }
    ],
    "allowed_values_function": ""
  },
  "instance": {}
}
```

### Entity Reference Field
```json
{
  "storage": {
    "target_type": "taxonomy_term"
  },
  "instance": {
    "handler": "default:taxonomy_term",
    "handler_settings": {
      "target_bundles": {
        "topics": "topics"
      },
      "sort": {
        "field": "_none",
        "direction": "ASC"
      },
      "auto_create": false,
      "auto_create_bundle": ""
    }
  }
}
```

### Entity Reference Revisions (Paragraphs)
```json
{
  "storage": {
    "target_type": "paragraph"
  },
  "instance": {
    "handler": "default:paragraph",
    "handler_settings": {
      "negate": 0,
      "target_bundles": {
        "accordion": "accordion",
        "content": "content"
      },
      "target_bundles_drag_drop": {}
    }
  }
}
```

### Link Field
```json
{
  "storage": {},
  "instance": {
    "link_type": 16,
    "title": 1
  }
}
```

**Link type values:**
- `16` = Internal and external
- `17` = External only
- `1` = Internal only

**Title values:**
- `0` = Disabled
- `1` = Optional
- `2` = Required

### Image Field
```json
{
  "storage": {
    "default_image": {
      "uuid": null,
      "alt": "",
      "title": "",
      "width": null,
      "height": null
    },
    "target_type": "file",
    "display_field": false,
    "display_default": false,
    "uri_scheme": "public"
  },
  "instance": {
    "file_directory": "images/[date:custom:Y]-[date:custom:m]",
    "file_extensions": "png gif jpg jpeg svg",
    "max_filesize": "",
    "max_resolution": "",
    "min_resolution": "",
    "alt_field": true,
    "alt_field_required": true,
    "title_field": false,
    "title_field_required": false
  }
}
```

### File Field
```json
{
  "storage": {
    "target_type": "file",
    "display_field": false,
    "display_default": false,
    "uri_scheme": "public"
  },
  "instance": {
    "file_directory": "documents/[date:custom:Y]-[date:custom:m]",
    "file_extensions": "txt pdf doc docx xls xlsx ppt pptx",
    "max_filesize": "",
    "description_field": false
  }
}
```

---

## 6. Module Dependencies by Field Type

| Field Type | Module |
|---|---|
| `string` | `core` |
| `string_long` | `core` |
| `text_long` | `text` |
| `boolean` | `core` |
| `integer` | `core` |
| `list_string` | `options` |
| `list_integer` | `options` |
| `datetime` | `datetime` |
| `daterange` | `datetime_range` |
| `link` | `link` |
| `image` | `image` |
| `file` | `file` |
| `entity_reference` | `core` |
| `entity_reference_revisions` | `entity_reference_revisions` |
| `webform` | `webform` |

---

## 7. CLI Questions per Field Type

When creating a field, the CLI should ask these questions based on field type:

### All Fields
- Label (human-readable name)
- Machine name (auto-generated from label, editable)
- Description (optional)
- Required? (yes/no)
- Cardinality (1 or unlimited)

### String
- Max length (default: 255)

### List String / List Integer
- Options (key|label pairs, one per line)

### Entity Reference
- Target type (media, taxonomy_term, node)
- Target bundles (multi-select from available)

### Entity Reference Revisions
- Target bundles (multi-select paragraph types)

### Link
- Allow external URLs? (yes/no)
- Link title (disabled/optional/required)

### Image
- Allowed extensions (default: png gif jpg jpeg svg)
- Alt text required? (yes/no)
- File directory pattern

### File
- Allowed extensions (default: txt pdf doc docx xls xlsx ppt pptx)
- File directory pattern
