# 40 CLI Interface

## Goal
Implement the main CLI menu system using inquirer for interactive prompts.

## Dependencies
- 10 Project Setup
- 20 Project Management

## Acceptance Criteria
- [ ] `npm run start` launches the CLI
- [ ] Main menu displays:
  ```
  ? What would you like to do?
  ❯ Create project
    Load project
    Exit
  ```
- [ ] "Create project" flow:
  1. Prompt: "Project name?"
  2. Validate name not empty, no existing project with same slug
  3. Prompt: "Configuration directory path?"
  4. Validate directory exists and contains `.yml` files
  5. Create project and show success message
  6. Return to project menu
- [ ] "Load project" flow:
  1. List available projects (or show "No projects found")
  2. User selects a project
  3. Show project menu
- [ ] Project menu displays:
  ```
  ? [Project Name] - What would you like to do?
  ❯ Sync configuration
    List entity types
    List fields of entity
    List fields of bundle
    Create a bundle
    Create a field
    Back to main menu
  ```
- [ ] "Back to main menu" returns to main menu
- [ ] "Exit" cleanly exits the process
- [ ] Ctrl+C exits cleanly at any prompt

## Reference Files
- `index.mjs` - entry point
- inquirer documentation

## Implementation Notes
- Store menu logic in `src/cli/menus.js`
- Store prompts in `src/cli/prompts.js`
- Use `inquirer` for all prompts
- Use `chalk` for colored output:
  - Green for success messages
  - Red for errors
  - Cyan for info
- Keep menus in a loop until user exits
- Handle errors gracefully, show message and return to menu

## Menu Flow Diagram
```
Main Menu
├── Create project → (prompts) → Project Menu
├── Load project → (select) → Project Menu
└── Exit

Project Menu
├── Sync configuration → (action) → Project Menu
├── List entity types → (display) → Project Menu
├── List fields of entity → (select, display) → Project Menu
├── List fields of bundle → (select, select, display) → Project Menu
├── Create a bundle → (prompts) → Project Menu
├── Create a field → (prompts) → Project Menu
└── Back to main menu → Main Menu
```

## Tests
Test file: `tests/cli.test.js`

Mock `inquirer` prompts to simulate user input without interactive terminal.

### Unit Tests - Menu Generation
- [ ] `getMainMenuChoices returns correct options` - Create, Load, Exit present
- [ ] `getProjectMenuChoices returns correct options` - all 7 options present
- [ ] `getProjectMenuChoices includes project name` - title shows project name

### Unit Tests - Validation
- [ ] `validateProjectName rejects empty string` - returns error message
- [ ] `validateProjectName rejects whitespace only` - returns error message
- [ ] `validateProjectName accepts valid name` - returns true
- [ ] `validateConfigDirectory rejects non-existent path` - returns error
- [ ] `validateConfigDirectory rejects empty directory` - returns error
- [ ] `validateConfigDirectory accepts valid config dir` - returns true

### Unit Tests - Slug Generation
- [ ] `generateSlug converts spaces to hyphens` - "My Project" → "my-project"
- [ ] `generateSlug lowercases` - "MyProject" → "myproject"
- [ ] `generateSlug removes special characters` - "My Project!" → "my-project"
