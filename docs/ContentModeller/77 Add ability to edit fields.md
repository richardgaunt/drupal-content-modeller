
## 77 Add ability to edit field instances

### Description

Add the ability to edit existing field instance properties after creation. This allows users to update field configuration without having to delete and recreate fields.

### Editable Properties

**All field types:**
- Label
- Description
- Required

**Entity reference fields (entity_reference, entity_reference_revisions):**
- Target bundles

### Implementation

#### 1. Added menu item in `src/cli/prompts.js`

Added "Edit field instance" to `PROJECT_MENU_CHOICES`:

```javascript
{ value: 'edit-field', name: 'Edit field instance' },
```

#### 2. Added `updateField` function in `src/commands/create.js`

New function to update existing field instance files:

```javascript
export async function updateField(project, entityType, bundle, fieldName, updates) {
  // Read existing YAML
  // Update fields: label, description, required
  // For entity_reference: update target_bundles and drag_drop settings
  // Write updated YAML
  // Re-sync project entities
}
```

**Parameters:**
- `project` - Project object
- `entityType` - Entity type (node, media, etc.)
- `bundle` - Bundle machine name
- `fieldName` - Field machine name
- `updates` - Object with properties to update:
  - `label` (string)
  - `description` (string)
  - `required` (boolean)
  - `targetBundles` (string[]) - for entity reference fields

#### 3. Added `handleEditField` function in `src/cli/menus.js`

Interactive flow:
1. Select entity type
2. Select bundle (with search)
3. Select field (with search)
4. Edit label (default: current value)
5. Edit description (default: current value)
6. Edit required (default: current value)
7. For entity reference fields: select target bundles (checkboxes, pre-selected with current bundles)

### Files Changed

- `src/cli/prompts.js` - Added menu item
- `src/cli/menus.js` - Added handler and case in switch
- `src/commands/create.js` - Added `updateField` function
- `tests/cli.test.mjs` - Updated menu count test
- `tests/fieldGenerator.test.mjs` - Added 7 tests for `updateField`

### Test Coverage

Added tests for:
- Updates field label
- Updates field description
- Updates field required status
- Updates entity_reference target bundles
- Throws for invalid project
- Throws for missing field file
- Updates multiple fields at once

### User Flow Example

```
Test Project - What would you like to do?
> Edit field instance

Select entity type:
> node (5 bundles)

Select bundle (type to search):
> news

Select field (type to search):
> field_n_featured_image - entity_reference

Edit field instance
Press Enter to keep current value

Label: [Featured Image]
Description: [The main image for this news item]
Required? [No]
Select target media bundles:
  [x] civictheme_image
  [ ] civictheme_remote_video

Field "field_n_featured_image" updated successfully!
Updated file: field.field.node.news.field_n_featured_image.yml
```

### Acceptance Criteria

- [x] New "Edit field instance" menu option added
- [x] Can select entity type, bundle, and field
- [x] Can edit label, description, required
- [x] Can edit target bundles for entity reference fields
- [x] Project re-syncs after update
- [x] All tests pass (398 tests)
