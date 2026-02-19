# 97 Add Comprehensive CLI Help for AI Agents

## Goal

Provide rich, detailed help output from the `dcm` CLI so that AI agents can discover and correctly use all commands without external documentation.

## Dependencies

- None

## Background

AI agents using `dcm` need to discover available commands, their options, valid values, and usage patterns purely from CLI output. Commander.js auto-generates basic `--help` output (option names + brief descriptions), but this is insufficient for agents to understand:
- Which field types are available and their type-specific options
- Valid values for enum-like options (entity types, widget types, permission short names)
- Practical usage examples showing real workflows
- How commands relate to each other (e.g. create bundle before creating fields)

## Approach: Commander.js `.addHelpText()` + `dcm help` Command

Commander.js provides two mechanisms we should use together:

### 1. `dcm help` command — Full reference output

Add a top-level `help` command that outputs the complete CLI reference. This gives AI agents a single command to learn everything.

**Implementation:** Bundle `COMMANDS.md` content into the package at build/install time by reading it from a known path relative to `import.meta.url`. This is more maintainable than embedding a giant string literal.

```javascript
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

program
  .command('help')
  .description('Show full CLI reference documentation')
  .argument('[command]', 'Command group to show help for')
  .action((command) => {
    if (!command) {
      // Output full COMMANDS.md
      const helpText = readFileSync(join(__dirname, 'COMMANDS.md'), 'utf-8');
      console.log(helpText);
    } else {
      // Delegate to commander's built-in help for the specific command
      program.commands.find(c => c.name() === command)?.help();
    }
  });
```

### 2. `.addHelpText('after', ...)` — Enhanced per-command help

Use Commander's `addHelpText` API to append contextual examples, valid values, and workflow tips to each command group's `--help` output. This way `dcm project --help`, `dcm field --help`, etc. all show richer information.

```javascript
fieldCmd.addHelpText('after', `
Field Types:
  string                    Plain text (single line)
  string_long               Plain text (multi-line)
  text_long                 Formatted text (HTML)
  boolean                   True/false
  integer                   Whole number
  list_string               Select list (text keys)
  list_integer              Select list (integer keys)
  datetime                  Date/time
  daterange                 Date range
  link                      URL/link
  image                     Image file
  file                      File upload
  entity_reference          Reference to entity
  entity_reference_revisions  Paragraph reference
  webform                   Webform reference

Examples:
  $ dcm field create -p my-site -e node -b article -t string -l "Subtitle"
  $ dcm field create -p my-site -e node -b article -t entity_reference_revisions \\
      -l "Components" --target-bundles "hero,text_block" --cardinality -1
  $ dcm field list -p my-site -e node -b article --json
`);
```

### Why this approach over alternatives

| Approach | Pros | Cons |
|----------|------|------|
| **`.addHelpText()` (chosen)** | Uses Commander's built-in API; help stays with `--help`; no custom rendering; easy to maintain per-command | Help text strings live in index.mjs |
| Custom `--verbose-help` flag | Could show more/less detail | Non-standard; agents won't know to use it |
| Separate `dcm docs` command only | Single entry point | Agents need to parse a huge blob; per-command help stays sparse |
| Override `.helpInformation()` | Full control | Fragile across Commander versions; more code |

The recommended approach combines both: `dcm help` for full reference discovery, and `.addHelpText()` for contextual per-command help.

## Acceptance Criteria

- [ ] `COMMANDS.md` begins with an introduction section explaining what dcm is, the Drupal content model domain, and the typical workflow
- [ ] `dcm help` outputs the full CLI reference (COMMANDS.md content)
- [ ] `dcm help project` outputs project-specific help (equivalent to `dcm project --help`)
- [ ] `dcm project --help` shows enhanced help with examples beyond the default Commander output
- [ ] `dcm bundle --help` shows enhanced help including entity type valid values and examples
- [ ] `dcm field --help` shows enhanced help including field types list, type-specific options, and examples
- [ ] `dcm field create --help` shows enhanced help including field types and type-specific option details
- [ ] `dcm form-display --help` shows enhanced help including widget workflow examples
- [ ] `dcm role --help` shows enhanced help including permission short names and examples
- [ ] `dcm drush --help` shows enhanced help including prerequisites and workflow
- [ ] `dcm report --help` shows enhanced help with examples
- [ ] `dcm admin --help` shows enhanced help with examples
- [ ] All existing `--help` behavior continues to work (Commander auto-generated content is preserved, not replaced)
- [ ] `dcm help --json` outputs help text as JSON (`{ "help": "..." }`) for machine parsing
- [ ] Tests pass for new functionality

## Reference Files

- `COMMANDS.md` - Full CLI reference that `dcm help` should output
- `index.mjs` - Where all commands are registered; where `.addHelpText()` calls will be added
- `src/cli/commands.js` - Command handler functions (new `cmdHelp` handler goes here)

## Implementation Notes

### Add introduction to COMMANDS.md

COMMANDS.md currently jumps straight into command syntax. Add an introduction section at the top that gives an AI agent (or new user) enough context to understand the domain before reading commands. This should cover:

**What dcm is:**
- A CLI tool for designing and generating Drupal content models as YAML configuration files
- Works offline — no running Drupal instance needed (generates config files that can be imported later)
- Can also sync with a live Drupal site via drush integration

**Key domain concepts:**
- **Project** — A workspace representing one Drupal site. Contains all bundles, fields, roles, and config. Identified by a slug (e.g. `my-site`).
- **Entity type** — A Drupal content category. Supported: `node` (content), `media`, `paragraph`, `taxonomy_term`, `block_content`.
- **Bundle** — A specific type within an entity type (e.g. "Article" is a bundle of entity type `node`). Has a machine name and label.
- **Field** — A data field on a bundle (e.g. "Subtitle" string field on Article). Field names are auto-prefixed per entity type (`field_n_` for nodes, `field_m_` for media, etc.).
- **Form display** — Controls how fields appear on the edit form. Supports widgets, field groups (tabs, fieldsets), ordering, and hiding fields.
- **Role** — A user role with permissions for CRUD operations on bundles.

**Typical workflow:**
1. Create a project (`dcm project create`)
2. Optionally sync existing Drupal config (`dcm project sync`)
3. Create bundles (`dcm bundle create`)
4. Add fields to bundles (`dcm field create`)
5. Configure form display (`dcm form-display create`, then customize)
6. Set up roles and permissions (`dcm role create`, `dcm role add-permission`)
7. Generate reports (`dcm report project`)
8. Optionally sync to Drupal (`dcm drush sync`)

**Output format:**
- All commands support `--json` (`-j`) for machine-readable JSON output
- Without `--json`, commands output human-readable formatted text

This introduction should be concise (aim for ~40-50 lines of markdown) — enough for an agent to orient itself, not a full tutorial.

### Help text per command group

Each command group should have an `addHelpText('after', ...)` block with:

1. **Valid values** for enum-like options (entity types, field types, widget types, permission names)
2. **2-3 practical examples** showing common workflows
3. **Key notes** (e.g. "media bundles require --source-type", "field names are auto-prefixed per entity type")

### Specific help content by command group

**`projectCmd`:**
- Examples: create, list, sync, edit, delete
- Note about config-path pointing to Drupal's config/sync directory

**`bundleCmd`:**
- Entity types: `node`, `media`, `paragraph`, `taxonomy_term`, `block_content`
- Note: media requires `--source-type`
- Examples: create node, create media, create paragraph

**`fieldCmd` and `fieldCmd.command('create')`:**
- Full field types list with descriptions
- Type-specific options mapping (which options apply to which types)
- Examples: string, entity_reference, image, list_string

**`formDisplayCmd`:**
- Workflow: create → reorder → set-widget → groups
- Widget type examples
- Group format types: `tabs`, `tab`, `details`, `fieldset`

**`roleCmd`:**
- Permission short names table
- Entity types that support permissions
- Examples: create role, add permissions, set permissions

**`drushCmd`:**
- Prerequisites: drupalRoot configured, drush available
- Workflow: when to use sync

### Reading COMMANDS.md

Use path relative to `import.meta.url` so it works regardless of how the package is installed:

```javascript
const __dirname = dirname(fileURLToPath(import.meta.url));
const commandsPath = join(__dirname, 'COMMANDS.md');
```

### JSON support for `dcm help`

When `--json` flag is used with `dcm help`, output structured JSON:

```json
{
  "help": "# CLI Commands Reference\n\n..."
}
```

This allows AI agents to programmatically parse the help output.

## Tests

Test file: `tests/help.test.js`

### Unit Tests

- [ ] `dcm help outputs full COMMANDS.md content` - Run command, verify output contains key sections from COMMANDS.md
- [ ] `dcm help project delegates to project help` - Run command, verify output contains project subcommands
- [ ] `dcm help --json outputs JSON format` - Run command, verify valid JSON with help key
- [ ] `dcm project --help includes enhanced help text` - Verify output contains examples section
- [ ] `dcm field --help includes field types list` - Verify output contains all field types
- [ ] `dcm field create --help includes type-specific options` - Verify output includes field type / option mapping
- [ ] `dcm role --help includes permission short names` - Verify output contains permission table
- [ ] `dcm bundle --help includes entity type valid values` - Verify output contains entity types list
- [ ] `dcm form-display --help includes workflow examples` - Verify output contains group format types

**Testing Pattern:** Test by spawning `dcm` as a child process with appropriate arguments and asserting on stdout content. Alternatively, use Commander's `parseAsync` with a custom output stream.

## Questions

- Should `dcm help` strip markdown formatting (e.g. render as plain text) or output raw markdown? Raw markdown is recommended since AI agents parse markdown natively, and it preserves tables and code blocks.
- Should the per-command help text be extracted into separate files (e.g. `src/cli/help/field.txt`) to keep `index.mjs` clean, or kept inline? Separate files are recommended for maintainability.
