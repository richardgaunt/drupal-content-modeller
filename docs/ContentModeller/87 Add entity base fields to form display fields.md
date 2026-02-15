## 87 Add Entity Base Fields to Form Display Fields

### Overview

When loading form display configuration, include entity base fields that can be configured in the form display. These are the core fields that exist on all entities of a type, separate from custom fields.

### Dependencies

- Ticket 79 (Implement form display)

---

## Entity Base Fields

### node (Content)

| Field Name | Type | Label | Widget | Settings |
|------------|------|-------|--------|----------|
| title | string | Title | string_textfield | `{ size: 60, placeholder: '' }` |
| status | boolean | Published | boolean_checkbox | `{ display_label: true }` |
| uid | entity_reference | Authored by | entity_reference_autocomplete | `{ match_operator: 'CONTAINS', match_limit: 10, size: 60, placeholder: '' }` |
| promote | boolean | Promoted to front page | boolean_checkbox | `{ display_label: true }` |
| sticky | boolean | Sticky at top of lists | boolean_checkbox | `{ display_label: true }` |
| moderation_state | string | Moderation state | moderation_state_default | `{}` |
| path | path | URL alias | path | `{}` |

---

### paragraph (Paragraph)

| Field Name | Type | Label | Widget | Settings |
|------------|------|-------|--------|----------|
| status | boolean | Published | boolean_checkbox | `{ display_label: true }` |

---

### taxonomy_term (Taxonomy term)

| Field Name | Type | Label | Widget | Settings |
|------------|------|-------|--------|----------|
| name | string | Name | string_textfield | `{ size: 60, placeholder: '' }` |
| description | text_long | Description | text_textarea | `{ rows: 5, placeholder: '' }` |
| status | boolean | Published | boolean_checkbox | `{ display_label: true }` |
| weight | integer | Weight | number | `{}` |
| parent | entity_reference | Term Parents | entity_reference_autocomplete | `{ match_operator: 'CONTAINS', match_limit: 10, size: 60, placeholder: '' }` |
| path | path | URL alias | path | `{}` |

---

### media (Media)

| Field Name | Type | Label | Widget | Settings |
|------------|------|-------|--------|----------|
| name | string | Name | string_textfield | `{ size: 60, placeholder: '' }` |
| status | boolean | Published | boolean_checkbox | `{ display_label: true }` |
| uid | entity_reference | Authored by | entity_reference_autocomplete | `{ match_operator: 'CONTAINS', match_limit: 10, size: 60, placeholder: '' }` |
| moderation_state | string | Moderation state | moderation_state_default | `{}` |
| path | path | URL alias | path | `{}` |

---

### block_content (Content block)

| Field Name | Type | Label | Widget | Settings |
|------------|------|-------|--------|----------|
| info | string | Block description | string_textfield | `{ size: 60, placeholder: '' }` |
| status | boolean | Published | boolean_checkbox | `{ display_label: true }` |
| reusable | boolean | Reusable | boolean_checkbox | `{ display_label: true }` |
| moderation_state | string | Moderation state | moderation_state_default | `{}` |

---

## Implementation Notes

These base fields should be included when parsing form display configuration so they can be:
- Shown/hidden in the form display
- Reordered alongside custom fields
- Moved into field groups
- Have their widgets configured

The base fields are not stored in field config YAML files - they are defined in code by the entity type. When creating a new form display or restoring a hidden base field, use the default widget and settings defined above.

### Constants to Add

```javascript
export const NODE_BASE_FIELDS = {
  title: { type: 'string', label: 'Title', widget: 'string_textfield', settings: { size: 60, placeholder: '' } },
  status: { type: 'boolean', label: 'Published', widget: 'boolean_checkbox', settings: { display_label: true } },
  uid: { type: 'entity_reference', label: 'Authored by', widget: 'entity_reference_autocomplete', settings: { match_operator: 'CONTAINS', match_limit: 10, size: 60, placeholder: '' } },
  promote: { type: 'boolean', label: 'Promoted to front page', widget: 'boolean_checkbox', settings: { display_label: true } },
  sticky: { type: 'boolean', label: 'Sticky at top of lists', widget: 'boolean_checkbox', settings: { display_label: true } },
  moderation_state: { type: 'string', label: 'Moderation state', widget: 'moderation_state_default', settings: {} },
  path: { type: 'path', label: 'URL alias', widget: 'path', settings: {} }
};
```

---

## Acceptance Criteria

- [ ] Base fields appear in form display tree view
- [ ] Base fields can be hidden/shown
- [ ] Base fields can be reordered
- [ ] Base fields can be moved to field groups
- [ ] Widget configuration works for base fields
- [ ] Default widgets/settings are used when showing hidden base fields
