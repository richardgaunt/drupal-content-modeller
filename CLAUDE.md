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
docs/            # Tickets and documentation in Obsidian format
```

## Supported Entity Types

| Entity Type | Config Prefix | Field Prefix |
|-------------|---------------|--------------|
| node | `node.type` | `field_c_n_` |
| media | `media.type` | `field_c_m_` |
| paragraph | `paragraphs.paragraphs_type` | `field_c_p_` |
| taxonomy_term | `taxonomy.vocabulary` | `field_c_t_` |
| block_content | `block_content.type` | `field_c_b_` |

## Supported Field Types

`string`, `string_long`, `text_long`, `boolean`, `integer`, `list_string`, `list_integer`, `datetime`, `daterange`, `link`, `image`, `file`, `entity_reference`, `entity_reference_revisions`, `webform`

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

Implementation tickets are in `docs/ContentModeller/`. Ticket format:
- `##` Ticket Number + Title
- Dependencies on other tickets
- Acceptance criteria as checkboxes
- Implementation notes
- Test specifications
