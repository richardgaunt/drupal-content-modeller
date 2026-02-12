
## 73 Add support for datetime_range field type

### Research

**Reference files:**
- `config/field.storage.node.field_c_n_date_range.yml`
- `config/field.field.node.civictheme_event.field_c_n_date_range.yml`

**Finding:** This ticket refers to adding support for the `datetime_range` module, but the actual Drupal field type is `daterange`. The `datetime_range` is the module name, not the field type.

**Field storage schema (from reference file):**
```yaml
langcode: en
status: true
dependencies:
  module:
    - datetime_range
    - node
id: node.field_c_n_date_range
field_name: field_c_n_date_range
entity_type: node
type: daterange          # <-- field type is 'daterange'
settings:
  datetime_type: datetime
module: datetime_range   # <-- module is 'datetime_range'
locked: false
cardinality: 1
translatable: true
indexes: {}
persist_with_no_fields: false
custom_storage: false
```

### Status: ALREADY IMPLEMENTED

This functionality was implemented as part of **Ticket 72** which added both:
- `datetime` field type (module: `datetime`)
- `daterange` field type (module: `datetime_range`)

**Current implementation includes:**
1. `FIELD_MODULES` mapping: `daterange: 'datetime_range'`
2. `FIELD_TYPES` UI option: `{ value: 'daterange', name: 'Date range' }`
3. `getStorageSettings` handling for `daterange`
4. `getDatetimeSettings` function for `datetime_type` setting
5. CLI prompt for "Date only" vs "Date and time"
6. Full test coverage

### No Additional Work Required

This ticket can be closed as the functionality is complete.
