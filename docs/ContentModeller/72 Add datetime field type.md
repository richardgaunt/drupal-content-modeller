
## 72 Add datetime field type

### Research

**Reference files:**
- `config/field.storage.paragraph.field_c_p_date.yml` - datetime storage (date only)
- `config/field.field.paragraph.civictheme_slider_slide.field_c_p_date.yml` - datetime instance
- `config/field.storage.paragraph.field_c_p_date_range.yml` - daterange storage

**Datetime field storage schema:**
```yaml
langcode: en
status: true
dependencies:
  module:
    - datetime
id: paragraph.field_c_p_date
field_name: field_c_p_date
entity_type: paragraph
type: datetime
settings:
  datetime_type: date  # or 'datetime' for date+time
module: datetime
locked: false
cardinality: 1
translatable: true
indexes: {}
persist_with_no_fields: false
custom_storage: false
```

**Daterange field storage schema:**
```yaml
langcode: en
status: true
dependencies:
  module:
    - datetime_range
id: paragraph.field_c_p_date_range
field_name: field_c_p_date_range
entity_type: paragraph
type: daterange
settings:
  datetime_type: datetime  # or 'date' for date only
module: datetime_range
locked: false
cardinality: 1
translatable: true
indexes: {}
persist_with_no_fields: false
custom_storage: false
```

**Key settings:**
- `datetime_type`: `date` (date only) or `datetime` (date + time)
- Instance settings: empty `{}`

### Implementation Changes

1. **fieldGenerator.js**
   - Add `datetime` and `daterange` to `FIELD_TYPES` array
   - Add `getDatetimeSettings(options)` function for storage settings
   - Update `getStorageSettings` to handle `datetime` and `daterange`

2. **menus.js**
   - Add datetime_type prompt in `getTypeSpecificSettings` for datetime/daterange fields

3. **Tests**
   - Add tests for `getDatetimeSettings`
   - Add tests for datetime/daterange storage generation

### Acceptance Criteria

- [ ] `datetime` field type available in field creation menu
- [ ] `daterange` field type available in field creation menu
- [ ] User prompted for datetime_type (Date only vs Date and time)
- [ ] Generated YAML matches Drupal schema
- [ ] All tests pass
