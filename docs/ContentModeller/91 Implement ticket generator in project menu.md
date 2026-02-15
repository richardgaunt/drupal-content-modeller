# 91 Implement ticket generator in project menu

## Overview

Part of the process for generating content types is writing the tickets to be approved by clients.

When I go to "Project Menu" - I can see an option to Add / Edit Story

Then I can create a new story.
The story data will be generated into a `<project-directory>/stories/create-<bundle>-<entity_type>.md`

---

## Implementation Plan

### Reusable Components from Existing Code

The following components from `src/cli/menus.js` and other modules can be reused:

#### 1. Bundle Questions (from `handleCreateBundle`)

| Question | Source | Reusable Function/Constant |
|----------|--------|---------------------------|
| Entity type selection | `menus.js:1547-1550` | `ENTITY_TYPE_CHOICES` constant |
| Label input | `menus.js:1552-1560` | Inline validation (extract to `prompts.js`) |
| Machine name | `menus.js:1562-1567` | `generateMachineName()` from `bundleGenerator.js`, `validateBundleMachineName()` from `create.js` |
| Description | `menus.js:1569-1571` | Simple input (no validation needed) |
| Media source type | `menus.js:1574-1579` | `MEDIA_SOURCE_CHOICES` constant |

#### 2. Field Questions (from `handleCreateField`)

| Question | Source | Reusable Function/Constant |
|----------|--------|---------------------------|
| Field type selection | `menus.js:1661-1664` | `FIELD_TYPES` from `fieldGenerator.js` |
| Field label input | `menus.js:1739-1747` | Inline validation (extract to `prompts.js`) |
| Field machine name | `menus.js:1749-1755` | `generateFieldName()` from `fieldGenerator.js`, `validateFieldMachineName()` from `create.js` |
| Description/help text | `menus.js:1757-1760` | Simple input |
| Required | `menus.js:1762-1769` | Yes/No select |
| Cardinality | `menus.js:1771-1778` | Single/Unlimited select |
| Type-specific settings | `menus.js:1781` | `getTypeSpecificSettings()` function |

#### 3. Utility Functions for Report/Ticket Generation

| Function | Source | Purpose |
|----------|--------|---------|
| `getFieldOtherInfo(field)` | `reportGenerator.js:123-149` | Generate "Other" column (references, max length, etc.) |
| `formatCardinality(value)` | `reportGenerator.js:114-116` | Format cardinality display |
| `getPermissionsForBundle()` | `permissions.js:84-91` | Generate permission list for a bundle |
| `NODE_PERMISSIONS` etc. | `permissions.js` | Permission templates by entity type |

### New Questions Needed (Story-Specific)

These questions are unique to the story generator:

| Question | Type | Purpose |
|----------|------|---------|
| Purpose of content type | Text input | For user story: "So that I can `<purpose>`" |
| Select roles for permissions | Multi-select | Choose which roles to include in permission table |
| Permission matrix per role | Checkbox grid or series of selects | Define Yes/No/N/A for each role |

### Recommended Refactoring

To maximize reuse, extract these into `src/cli/prompts.js`:

```javascript
// New exports to add to prompts.js
export async function promptBundleLabel() { ... }
export async function promptBundleMachineName(project, entityType, label) { ... }
export async function promptFieldLabel() { ... }
export async function promptFieldMachineName(entityType, label) { ... }
export async function promptRequired() { ... }
export async function promptCardinality() { ... }
export async function promptDescription() { ... }
```

### New Files to Create

1. `src/generators/storyGenerator.js` - Pure functions for generating story markdown
2. `src/commands/story.js` - Story CRUD operations
3. `src/parsers/storyParser.js` - Parse story JSON back to data structure
4. Menu handler in `menus.js` - `handleStoryMenu()`, `handleCreateStory()`, `handleEditStory()`

### Persistent Storage

Stories should be saved as JSON files so users can:
- Exit the story creation flow at any point
- Resume editing later
- Edit individual sections (bundle info, fields, permissions)

**Storage Location:** `<project-dir>/stories/<bundle-machine-name>.json`

**Workflow:**
1. User selects "Manage Stories" from Project Menu
2. Shows list of existing stories + "Create new story" option
3. Selecting existing story shows edit menu:
   - Edit bundle info (label, description, purpose)
   - Add/Edit/Remove fields
   - Edit permissions
   - Generate markdown (exports to `.md`)
   - Delete story
4. User can exit at any time; progress is auto-saved to JSON

### Story Generator Functions

```javascript
// src/generators/storyGenerator.js

export function generateStoryTitle(bundleLabel, entityType) { ... }
export function generateUserStory(bundleLabel, purpose) { ... }
export function generateFieldsTable(fields) { ... }
export function generatePermissionsTable(roles, permissions) { ... }
export function generateFullStory(storyData) { ... }
```

```javascript
// src/commands/story.js

export async function saveStory(project, story) { ... }
export async function loadStory(project, bundleMachineName) { ... }
export async function listStories(project) { ... }
export async function deleteStory(project, bundleMachineName) { ... }
export async function exportStoryToMarkdown(project, story) { ... }
```

### Data Structure for Story (JSON)

```javascript
{
  // Metadata
  version: 1,
  createdAt: '2026-02-15T10:30:00.000Z',
  updatedAt: '2026-02-15T11:45:00.000Z',
  status: 'draft', // 'draft' | 'complete' | 'exported'

  // Bundle info
  entityType: 'node',
  bundle: {
    label: 'News',
    machineName: 'news',
    description: ''
  },

  // User story
  purpose: 'manage job listings',

  // Fields (ordered array)
  fields: [
    {
      label: 'Classification',
      name: 'field_n_classification',
      type: 'string',
      description: '',
      cardinality: 1,
      required: false,
      settings: { max_length: 255 }
    },
    // ...
  ],

  // Permissions matrix
  permissions: {
    administrator: { create: true, edit_own: true, edit_any: true, delete_own: true, delete_any: true },
    site_administrator: { create: true, edit_own: true, edit_any: true, delete_own: true, delete_any: true },
    content_approver: { create: false, edit_own: false, edit_any: false, delete_own: false, delete_any: false },
    content_author: { create: true, edit_own: true, edit_any: true, delete_own: true, delete_any: true }
  },

  // Export history
  exports: [
    { exportedAt: '2026-02-15T12:00:00.000Z', path: 'stories/create-news-node.md' }
  ]
}
```

### Story Edit Menu Structure

```
Manage Stories
├── Create new story
├── News (draft) [Last edited: 15 Feb 2026]
│   ├── Edit bundle info
│   │   ├── Entity type: node
│   │   ├── Label: News
│   │   ├── Machine name: news
│   │   ├── Description: (empty)
│   │   └── Purpose: provide information of current events
│   ├── Manage fields (13 fields)
│   │   ├── Add field
│   │   ├── Tagline (string)
│   │   ├── Category (string)
│   │   ├── ... [Edit / Delete / Reorder]
│   ├── Edit permissions
│   │   └── [Role x Permission matrix]
│   ├── Generate markdown
│   └── Delete story
└── Back
```

---

## Acceptance Criteria

### Menu & Navigation
- [ ] New menu option "Manage Stories" appears in Project Menu
- [ ] Stories menu shows list of existing stories + "Create new story"
- [ ] Selecting a story shows edit sub-menu

### Persistent Storage
- [ ] Stories are saved as JSON to `<project-dir>/stories/<bundle>.json`
- [ ] Story progress is auto-saved after each section completion
- [ ] User can exit at any point and resume editing later
- [ ] Story JSON is human-readable and can be manually edited if needed

### Story Creation/Editing
- [ ] Edit bundle info (entity type, label, machine name, description, purpose)
- [ ] Add/Edit/Remove fields with full field configuration
- [ ] Edit permissions matrix for selected roles
- [ ] Fields can be reordered

### Export
- [ ] "Generate markdown" exports to `<project-dir>/stories/create-<bundle>-<entity_type>.md`
- [ ] Generated markdown matches the template format below

### Code Reuse
- [ ] Story generator reuses existing prompt functions (extracted to `prompts.js`)
- [ ] Field configuration reuses `getTypeSpecificSettings()` from menus.js
- [ ] Permission generation reuses functions from `permissions.js`

---

## Template Reference

These tickets take the following template:

## Example story

**The title of the story will be: Create <bundle> <entity type> **

## User Story

As a Site Owner  
I want a content of the type `<Content type Label>` on my new site  
So that I can `<purpose of the content type>`


## Acceptance Criteria


**AC 1 - New <bundle> exists ** 

Given I am a site administrator
When I go to the <Entity type overview page>
Then I see `<Bundle>`

**AC3 - New content type has the following fields**

  
| Field Name | Machine Name | Field Type | Description | Cardinality | Required | Other                                              |  
|------------|--------------|------------|-------------|-------------|----------|----------------------------------------------------|
| Attachment | `field_n_attachment` | entity_reference_revisions | - | Unlimited | No | References: civictheme_attachment (paragraph type) |  
| Closing date | `field_n_closing_date` | datetime | - | 1 | No | -                                                  |  
| Contact  | `field_n_contact` | string | - | 1 | No | Max: 255                                           |  
| Description | `field_n_description` | text_long | - | 1 | No | -                                                  |  
| Division | `field_n_division` | entity_reference | - | 1 | No | References: division (vocabulary)                  |  
| Employment type | `field_n_employment_type` | string | Full time, part time, casual etc… | 1 | No | Max: 255                                           |  
| Job title | `field_n_job_title` | string | - | 1 | No | Max: 255                                           |  
| Location | `field_n_location` | string | - | 1 | No | Max: 255                                           |  
| Salary range | `field_n_salary_range` | string | - | 1 | No | Max: 255                                           |  


**AC 3 - Permissions**  
GIVEN I’m an Administrator  
WHEN I review permissions for content of the type `<Bundle>`  
THEN the following permissions are needed:

|                         |                   |                        |                      |                    |
| ----------------------- | ----------------- | ---------------------- | -------------------- | ------------------ |
| **Permission**          | **Administrator** | **Site Administrator** | **Content Approver** | **Content Author** |
| **Create new content**  | Yes               | Yes                    | No                   | Yes                |
| **Delete any content**  | Yes               | Yes                    | No                   | Yes                |
| **Delete own content**  | Yes               | Yes                    | No                   | Yes                |
| **Edit any content**    | Yes               | Yes                    | No                   | Yes                |
| **Edit own content**    | Yes               | Yes                    | No                   | Yes                |
| **Publish any content** | Yes               | Yes                    | Yes                  | Yes                |
| **Publish own content** | Yes               | Yes                    | N/A                  | Yes                |

*Note: Publish any content and publish own content are workflow permissions and need to be manually configured with workflows*

