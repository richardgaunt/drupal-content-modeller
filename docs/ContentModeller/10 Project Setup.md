# 10 Project Setup

## Goal
Initialize the Node.js project with required dependencies and folder structure.

## Dependencies
- None

## Acceptance Criteria
- [ ] `package.json` exists with project name `drupal-content-modeller`
- [ ] `npm run start` executes `index.mjs`
- [ ] Dependencies installed: `inquirer`, `js-yaml`, `chalk`
- [ ] Dev dependencies: `jest` for testing
- [ ] Directory structure created:
  ```
  src/
    commands/      # CLI command handlers
    parsers/       # YAML parsing logic
    generators/    # YAML generation logic
    schemas/       # JSON schema validators
    utils/         # Helper functions
  projects/        # User project storage
  ```
- [ ] `.gitignore` includes `node_modules/` and `projects/`
- [ ] ESM modules enabled (`"type": "module"` in package.json)

## Reference Files
- Existing `package.json` if present
- `docs/ContentModeller/03 Data Structures.md` for schema reference

## Implementation Notes
- Use ES modules (`.mjs` extension or `"type": "module"`)
- Use `inquirer` for interactive prompts
- Use `js-yaml` for YAML parsing/generation
- Use `chalk` for colored terminal output
- Keep dependencies minimal

## Architecture for Testability

Structure code to separate pure functions from I/O:

```
src/
  cli/           # I/O: inquirer prompts, console output (thin layer)
  commands/      # Orchestration: calls pure functions, handles I/O
  parsers/       # PURE: parse YAML string → object (no file reads)
  generators/    # PURE: object → YAML string (no file writes)
  utils/         # PURE: slug generation, validation, formatting
  io/            # I/O: file system operations (isolated)
```

**Pure functions** (testable via input/output):
- `parseNodeType(yamlString)` → returns object
- `generateNodeType(config)` → returns YAML string
- `generateSlug(name)` → returns slug
- `validateMachineName(name)` → returns boolean

**I/O functions** (mocked in tests):
- `readYamlFile(path)` → calls fs, returns parsed object
- `writeYamlFile(path, data)` → calls fs
- `promptUser(questions)` → calls inquirer

## Tests
Test file: `tests/setup.test.js`

### Unit Tests
- [ ] `package.json has correct structure` - validates name, type, scripts exist
- [ ] `required directories exist` - src/, projects/ directories present
- [ ] `src subdirectories exist` - commands/, parsers/, generators/, utils/, io/
