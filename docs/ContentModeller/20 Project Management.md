# 20 Project Management

## Goal
Implement create, load, save, and list functionality for projects.

## Dependencies
- 10 Project Setup

## Acceptance Criteria
- [ ] `createProject(name, configDir)` creates a new project:
  - Validates project name is not empty
  - Converts name to slug (lowercase, spaces to hyphens)
  - Checks slug doesn't already exist
  - Validates configDir exists and contains `.yml` files
  - Creates `projects/{slug}/project.json`
  - Returns project object
- [ ] `loadProject(slug)` loads an existing project:
  - Reads `projects/{slug}/project.json`
  - Returns project object or throws if not found
- [ ] `saveProject(project)` saves project state:
  - Writes to `projects/{slug}/project.json`
  - Preserves all project data
- [ ] `listProjects()` returns array of available projects:
  - Scans `projects/` directory
  - Returns `[{name, slug, lastSync}]` for each
- [ ] `deleteProject(slug)` removes a project:
  - Deletes `projects/{slug}/` directory
  - Returns success/failure

## Reference Files
- `docs/ContentModeller/03 Data Structures.md` - Project schema

## Implementation Notes
- Store in `src/commands/project.js`
- Use `fs/promises` for async file operations
- Validate against JSON schema before saving
- Slug generation: `"My Project"` → `"my-project"`
- Create `projects/` directory if it doesn't exist

## Example Project Structure
```json
{
  "name": "CivicTheme Site",
  "slug": "civictheme-site",
  "configDirectory": "/path/to/config",
  "lastSync": null,
  "entities": {
    "node": {},
    "media": {},
    "paragraph": {},
    "taxonomy_term": {}
  }
}
```

## Tests
Test file: `tests/project.test.js`

Use a temporary directory for test fixtures (cleaned up after each test).

### Unit Tests
- [ ] `createProject creates valid project structure` - returns correct object shape
- [ ] `createProject generates correct slug` - "My Project" → "my-project"
- [ ] `createProject rejects empty name` - throws error for empty/whitespace name
- [ ] `createProject rejects duplicate slug` - throws if project exists
- [ ] `createProject validates config directory exists` - throws for invalid path
- [ ] `createProject validates config has yml files` - throws for empty directory
- [ ] `loadProject returns project data` - loads saved project correctly
- [ ] `loadProject throws for missing project` - error for non-existent slug
- [ ] `saveProject writes project.json` - file contains correct data
- [ ] `saveProject preserves all fields` - no data loss on save
- [ ] `listProjects returns empty array when no projects` - handles empty state
- [ ] `listProjects returns all projects` - finds multiple projects
- [ ] `deleteProject removes project directory` - directory no longer exists
- [ ] `deleteProject returns false for missing project` - handles non-existent

