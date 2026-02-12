# 63 Create Edit Project Functionality

## Goal
Add `base_url` property to projects and create an "Edit project" menu option.

## Dependencies
- 20 Project Management
- 40 CLI Interface

## Requirements

### Create new property for project
Add `base_url` for a project. This should be entered when creating a project.

### Create ability to edit project
A menu item "Edit project" in the project menu that allows editing:
- Name
- Config Directory
- Base URL of the project

Fields should be populated with current values. When finished, update project.json.

---

## Implementation Plan

### Part 1: Add `base_url` to Project Creation

**Files to modify:**

1. **`src/utils/project.js`** - Update `createProjectObject()`:
   - Add `baseUrl` parameter
   - Include in returned object: `baseUrl: baseUrl || ''`

2. **`src/cli/prompts.js`** - Add new prompt function:
   ```javascript
   export async function promptBaseUrl(defaultValue = '') {
     return input({
       message: 'Base URL of the project (e.g., https://example.com):',
       default: defaultValue,
       validate: (value) => {
         if (!value) return true; // Optional field
         try {
           new URL(value);
           return true;
         } catch {
           return 'Please enter a valid URL';
         }
       }
     });
   }
   ```

3. **`src/commands/project.js`** - Update `createProject()`:
   - Accept `baseUrl` as third parameter
   - Pass to `createProjectObject(name, slug, configDir, baseUrl)`

4. **`src/cli/menus.js`** - Update create project flow in `showMainMenu()`:
   - After config directory prompt, add: `const baseUrl = await promptBaseUrl();`
   - Pass to `createProject(name, configDir, baseUrl)`

### Part 2: Add Edit Project Menu Option

**Files to modify:**

1. **`src/cli/prompts.js`** - Add edit prompts:
   ```javascript
   export async function promptEditProject(project) {
     const name = await input({
       message: 'Project name:',
       default: project.name,
       validate: (v) => v.trim() ? true : 'Name is required'
     });

     const configDirectory = await input({
       message: 'Configuration directory:',
       default: project.configDirectory,
       validate: validateConfigDirectory
     });

     const baseUrl = await promptBaseUrl(project.baseUrl || '');

     return { name, configDirectory, baseUrl };
   }
   ```

2. **`src/commands/project.js`** - Add `updateProject()` function:
   ```javascript
   export async function updateProject(project, updates) {
     const updatedProject = {
       ...project,
       name: updates.name,
       configDirectory: updates.configDirectory,
       baseUrl: updates.baseUrl
     };

     // If name changed, slug may need updating
     if (updates.name !== project.name) {
       const newSlug = generateSlug(updates.name);
       if (newSlug !== project.slug) {
         // Handle slug change: rename directory, update slug
         updatedProject.slug = newSlug;
         await renameProjectDirectory(project.slug, newSlug);
       }
     }

     await saveProject(updatedProject);
     return updatedProject;
   }
   ```

3. **`src/io/fileSystem.js`** - Add `renameProjectDirectory()`:
   ```javascript
   export async function renameProjectDirectory(oldSlug, newSlug) {
     const oldPath = getProjectPath(oldSlug);
     const newPath = getProjectPath(newSlug);
     await fs.rename(oldPath, newPath);
   }
   ```

4. **`src/cli/menus.js`** - Add "Edit project" to project menu:
   - Add choice: `{ name: 'Edit project', value: 'edit' }`
   - Add case handler:
     ```javascript
     case 'edit':
       const updates = await promptEditProject(project);
       project = await updateProject(project, updates);
       console.log(chalk.green('Project updated successfully'));
       break;
     ```

### Part 3: Schema Update

**Files to modify:**

1. **`docs/ContentModeller/03 Data Structures.md`** - Update Project Schema:
   - Add `baseUrl` property:
     ```json
     "baseUrl": {
       "type": "string",
       "format": "uri",
       "description": "Base URL of the Drupal site"
     }
     ```

---

## Acceptance Criteria

- [ ] New projects prompt for base URL during creation
- [ ] `project.json` includes `baseUrl` property
- [ ] "Edit project" menu option appears in project menu
- [ ] Edit form pre-populates with current values
- [ ] Saving updates writes to project.json
- [ ] Name changes update the project slug and directory if needed
- [ ] URL validation allows empty value (optional) or valid URL

## Tests

Test file: `tests/project-edit.test.js`

### Unit Tests
- [ ] `createProjectObject includes baseUrl` - baseUrl in returned object
- [ ] `updateProject updates all fields` - name, configDirectory, baseUrl updated
- [ ] `updateProject handles slug change` - directory renamed when name changes
- [ ] `promptBaseUrl accepts empty string` - optional field
- [ ] `promptBaseUrl validates URL format` - rejects invalid URLs
- [ ] `promptBaseUrl accepts valid URL` - passes validation
