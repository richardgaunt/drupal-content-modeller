# CLAUDE.md

This file provides guidance to Claude Code when working with code in this repository.

## Project Overview

Drupal Content Modeller - A CLI application that:
- Analyzes existing Drupal project configuration to discover entity types and fields
- Creates new entity bundles and fields via interactive CLI prompts
- Generates Drupal-compatible YAML configuration files

## Build/Test Commands

- **Start CLI**: `npm run start` - launches the interactive CLI
- **Run all tests**: `npm run test:all`
- **Run basic tests**: `npm run test:basic`
- **Run feature tests**: `npm run test:features`
- **Run specific test**: `npm run test -- -t "test name"`
- **Lint**: `npm run lint`
- **Lint fix**: `npm run lint:fix`

## Project Architecture

Code is structured to separate pure functions from I/O for testability:

```
src/
  cli/           # I/O: inquirer prompts, menus, console output
  commands/      # Orchestration: project, sync, list, create operations
  parsers/       # PURE: YAML string → object (configParser.js)
  generators/    # PURE: object → YAML string (bundleGenerator.js, fieldGenerator.js)
  utils/         # PURE: validation, formatting, slug generation
  io/            # I/O: file system read/write (fileSystem.js, configReader.js)
projects/        # User project storage (gitignored)
config/          # Sample CivicTheme configuration for reference
tickets/         # Ticket tracking (todo, in-progress, refining, done)
```

## Supported Entity Types

| Entity Type | Config Prefix | Field Prefix |
|-------------|---------------|--------------|
| node | `node.type` | `field_n_` |
| media | `media.type` | `field_m_` |
| paragraph | `paragraphs.paragraphs_type` | `field_p_` |
| taxonomy_term | `taxonomy.vocabulary` | `field_t_` |
| block_content | `block_content.type` | `field_b_` |

## Supported Field Types

`string`, `string_long`, `text_long`, `boolean`, `integer`, `list_string`, `list_integer`, `datetime`, `daterange`, `link`, `image`, `file`, `entity_reference`, `entity_reference_revisions`, `webform`, `email`

## Code Style Guidelines

- **Modules**: ES modules (`.mjs` extension or `"type": "module"`)
- **Formatting**: Use Prettier with 2-space indentation
- **Imports**: Group by (1) built-in modules, (2) external packages, (3) internal modules
- **Naming**: camelCase for variables/functions, PascalCase for classes
- **Pure functions**: Receive data and return data (no side effects)
- **I/O functions**: Isolated in `io/` directory, mocked in tests

## Testing Approach

- **Pure functions**: Test via direct input/output assertions
- **I/O functions**: Mock file system and inquirer in tests
- **CLI features**: Test using simulated user input sequences

## Ticket System

Implementation tickets are in `tickets/` with subdirectories for status:
- `todo/` — Not yet started
- `in-progress/` — Currently being worked on
- `refining/` — Needs further refinement
- `done/` — Completed

Move ticket files between directories to update status.

## Key Utility Functions & Registries

**IMPORTANT: Always check these modules before creating new utility functions. Reuse existing functions rather than duplicating logic.**

### Central Entity Types Registry — `src/constants/entityTypes.js`

Single source of truth for all entity type configuration. Never hardcode entity type constants elsewhere.

- `ENTITY_TYPES` — Full config object for each entity type (prefixes, modules, labels, admin paths)
- `ENTITY_ORDER` — Canonical display order: `['node', 'media', 'paragraph', 'taxonomy_term', 'block_content']`
- `getBundleConfigName(entityType, bundle)` — e.g. `('node', 'page')` → `'node.type.page'`
- `getEntityModule(entityType)` — e.g. `'node'` → `'node'`, `'paragraph'` → `'paragraphs'`
- `getEntityTypeLabel(entityType)` — Plural label, e.g. `'Content Types'`, `'Vocabularies'`
- `getEntityTypeSingularLabel(entityType)` — Singular label, e.g. `'content type'`, `'vocabulary'`
- `getEntityOverviewPage(entityType)` — Admin path description, e.g. `'Admin > Structure > Content types'`
- `getFieldPrefix(entityType)` — e.g. `'field_n_'`, `'field_p_'`
- `getEntityAdminPath(entityType, bundle)` — Full admin path for a bundle's field page
- `getBundleAdminUrls(entityType, bundle)` — Array of admin URLs for a bundle

### Shared Utilities — `src/utils/slug.js`

- `generateMachineName(label)` — Converts a human label to a Drupal machine name
- `validateMachineName(machineName)` — Validates machine name format
- `formatCardinality(cardinality)` — `1` → `'Single'`, `-1` → `'Unlimited'`, else stringified

### Project Utilities — `src/utils/project.js`

- `validateProject(project)` — Throws if project is missing or has no `configDirectory`

### CLI Utilities — `src/cli/cliUtils.js`

- `VALID_ENTITY_TYPES`, `VALID_SOURCE_TYPES`, `VALID_FIELD_TYPES` — Validation constants
- `isValidEntityType(type)`, `isValidFieldType(type)` — Validators
- `output(data, json)` — Print data as JSON or plain text
- `handleError(error)` — Print error and exit
- `logSuccess(slug)`, `logFailure(slug, errorMessage)` — Command logging
- `autoSyncProject(project)` — Silent project.json sync
- `runSyncIfRequested(project, options)` — Drush sync when `--sync` flag is passed

### Table Formatting — `src/commands/list.js`

- `createTable(columns, rows)` — Generic text table builder. Columns: `{ header, minWidth?, getValue(row) }`

### CLI File Structure

Commands and menus are split by domain into sub-modules:

```
src/cli/commands/   # helpCmd.js, projectCmds.js, bundleFieldCmds.js,
                    # formDisplayCmds.js, roleCmds.js, miscCmds.js
src/cli/menus/      # mainMenu.js, syncMenus.js, contentMenus.js,
                    # formDisplayMenus.js, roleMenus.js, storyMenus.js, reportMenus.js
```

Barrel files `src/cli/commands.js` and `src/cli/menus.js` re-export everything for backward compatibility.
