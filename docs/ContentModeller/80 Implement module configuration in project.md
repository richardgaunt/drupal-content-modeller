## 80 Implement module configuration in project

**Status:** Completed

### Description

When we create a project or sync, the system checks to see if the following modules are enabled in the `<config_directory>/core.extension.yml`.

The following recommended modules:
- node
- media
- taxonomy
- block_content
- paragraphs
- content_moderation

It checks for these modules and reports back on which of these modules is not enabled.

It tells the user that to use this program effectively these modules should be enabled.

Then allows user to select which modules to enable with a multi-select radio selection.

This updates `<config_directory>/core.extension.yml` for these missing modules.

We can also access this menu through the project menu with "Enable required modules" which shows the user which modules are enabled and which are missing.

### Acceptance Criteria

- [x] System checks for recommended modules when creating a project
- [x] System checks for recommended modules when syncing a project
- [x] Missing modules are reported to the user
- [x] User can select which modules to enable via multi-select
- [x] Selected modules are added to `core.extension.yml`
- [x] "Enable required modules" menu option is available in the project menu
- [x] When all modules are enabled, the menu shows "All strongly recommended content modules are enabled"

### Implementation Details

#### Files Modified

1. **src/parsers/configParser.js**
   - Added `RECOMMENDED_MODULES` constant with the list of recommended modules
   - Added `parseEnabledModules(config)` - extracts module names from core.extension.yml
   - Added `getMissingRecommendedModules(enabledModules)` - returns list of missing recommended modules
   - Added `generateUpdatedExtensionConfig(config, modulesToEnable)` - generates updated YAML with new modules enabled

2. **src/io/configReader.js**
   - Added `getCoreExtensionPath(configPath)` - returns path to core.extension.yml
   - Added `coreExtensionExists(configPath)` - checks if core.extension.yml exists
   - Added `readCoreExtension(configPath)` - reads and parses core.extension.yml
   - Added `getEnabledModules(configPath)` - returns list of enabled modules
   - Added `checkRecommendedModules(configPath)` - returns object with enabled and missing modules
   - Added `enableModules(configPath, modulesToEnable)` - writes updated config with new modules

3. **src/commands/sync.js**
   - Added `checkProjectModules(project)` - checks recommended modules in a project
   - Added `enableProjectModules(project, modulesToEnable)` - enables modules in project config
   - Added `allRecommendedModulesEnabled(project)` - checks if all recommended modules are enabled
   - Added `getRecommendedModules()` - returns list of recommended modules

4. **src/cli/prompts.js**
   - Added `enable-modules` choice to `PROJECT_MENU_CHOICES`

5. **src/cli/menus.js**
   - Updated `handleSync()` to check for missing modules after sync completes
   - Added `checkAndPromptForModules(project)` - prompts user to enable missing modules
   - Added `handleEnableModules(project)` - handles "Enable required modules" menu action
   - Added case handler for `enable-modules` in `showProjectMenu()`
   - Integrated module checking into `handleCreateProject()` flow

6. **tests/cli.test.mjs**
   - Updated menu test to expect 13 options (was 12)
   - Added check for `enable-modules` value in menu choices

7. **tests/configParser.test.mjs**
   - Added tests for `RECOMMENDED_MODULES`
   - Added tests for `parseEnabledModules`
   - Added tests for `getMissingRecommendedModules`
   - Added tests for `generateUpdatedExtensionConfig`
   - Added I/O tests for `coreExtensionExists`, `readCoreExtension`, `getEnabledModules`
   - Added I/O tests for `checkRecommendedModules`, `enableModules`

#### User Flow

1. **On project creation:**
   - After project is created, system checks for missing recommended modules
   - If modules are missing, user is prompted with options:
     - "Select which modules to enable" (multi-select checkbox)
     - "Enable all missing modules"
     - "Skip for now"
   - Selected modules are added to core.extension.yml

2. **On project sync:**
   - After sync completes, system checks for missing recommended modules
   - Same prompt flow as project creation

3. **From project menu "Enable required modules":**
   - Shows a checklist of all recommended modules with status (✓ enabled, ✗ missing)
   - If all modules are enabled, shows "All strongly recommended content modules are enabled"
   - Otherwise, prompts to enable missing modules

#### Technical Notes

- The `core.extension.yml` file uses the format `module_name: weight` where weight is typically 0
- When enabling modules, they are added with weight 0
- Modules are sorted alphabetically when written to ensure consistent formatting
- If `core.extension.yml` doesn't exist, a new file is created with the selected modules
