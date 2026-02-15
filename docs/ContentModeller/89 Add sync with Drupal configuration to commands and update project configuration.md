# 89 Add sync with Drupal configuration to commands

## Goal
Add ability to sync configuration changes with a running Drupal site using drush, including a `--sync` flag on relevant commands.

## Dependencies
- None

## Acceptance Criteria
- [x] Project configuration includes `drupalRoot` (path to Drupal installation)
- [x] Project configuration includes `drushCommand` (command prefix, default: "drush")
- [x] Creating/editing a project prompts for drupal root and drush command
- [x] "Sync with Drupal" menu item runs `drush cim -y && drush cex -y`
- [x] `--sync` flag available on bundle and field commands
- [x] CLI commands with `--sync` run drush sync after completing operation
- [x] Sync command handles errors gracefully

## Implementation Plan

### Phase 1: Update Project Data Structure

**Files to modify:**
- `src/utils/project.js` - Add `drupalRoot` and `drushCommand` to project object
- `src/cli/prompts.js` - Add validation for drupal root path
- `src/cli/menus.js` - Update `handleCreateProject` and `handleEditProject` to prompt for new fields

**Project object additions:**
```javascript
{
  // existing fields...
  drupalRoot: '/path/to/drupal',  // Root of Drupal installation
  drushCommand: 'drush'           // Command to run drush: 'drush', 'ahoy drush', 'ddev drush', etc.
}
```

### Phase 2: Create Drush Sync Function

**Files to create:**
- `src/commands/drush.js` - Drush command execution functions

**Functions:**
```javascript
// Run drush import then export (ensures UUIDs and third-party settings are captured)
export async function syncWithDrupal(project) {
  // 1. Change to drupal root
  // 2. Run: {drushCommand} cim -y
  // 3. Run: {drushCommand} cex -y
  // 4. Return success/failure
}

// Check if drush is available
export async function checkDrushAvailable(project) {
  // Run: {drushCommand} status
  // Return boolean
}
```

### Phase 3: Add Interactive Menu Option

**Files to modify:**
- `src/cli/prompts.js` - Add "Sync with Drupal" to PROJECT_MENU_CHOICES
- `src/cli/menus.js` - Add `handleDrushSync` handler

**Menu flow:**
1. Select "Sync with Drupal"
2. Show status: "Running drush cim..."
3. Show status: "Running drush cex..."
4. Show success/error message

### Phase 4: Add --sync Flag to Commands

**Files to modify:**
- `index.mjs` - Add `--sync` option to bundle and field commands
- `src/cli/commands.js` - Update command handlers to check for sync flag

**Commands to add --sync:**
- `dcm bundle create`
- `dcm field create`
- `dcm field edit`
- `dcm form-display *` (all form display commands)
- `dcm role create`
- `dcm role add-permission`
- `dcm role remove-permission`
- `dcm role set-permissions`

### Phase 5: Add CLI Command for Manual Sync

**Add to index.mjs:**
```bash
dcm drush sync --project <slug>
dcm drush status --project <slug>
```

## Reference Files
- `src/utils/project.js` - Project object creation
- `src/commands/project.js` - Project management
- `src/cli/menus.js` - Interactive menu handlers
- `index.mjs` - CLI command definitions

## Tests

Test file: `tests/drush.test.mjs`

### Unit Tests
- [ ] `syncWithDrupal returns success when drush commands succeed`
- [ ] `syncWithDrupal returns error when drush cim fails`
- [ ] `syncWithDrupal returns error when drush cex fails`
- [ ] `checkDrushAvailable returns true when drush is available`
- [ ] `checkDrushAvailable returns false when drush is not available`

### Integration Tests
- [ ] `Project with drupalRoot and drushCommand saves correctly`
- [ ] `--sync flag triggers drush sync after command`

## Notes
- Always run `cim` then `cex` to capture UUID generation and third-party settings
- The drush command should be run from the Drupal root directory
- Common drush prefixes: `drush`, `ahoy drush`, `ddev drush`, `lando drush`, `fin drush`
