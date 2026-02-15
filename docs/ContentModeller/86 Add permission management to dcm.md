## 86 Add Permission Management to DCM

### Overview

Add the ability to manage user roles and content permissions within DCM. This allows creating/editing roles and assigning bundle-specific permissions for content operations (create, edit, delete, revisions).

### Dependencies

- Ticket 67 (CLI commands structure)

---

## Permission Tables by Entity Type

### Node Permissions

| Permission Key | Label | Description |
|----------------|-------|-------------|
| `create {bundle} content` | Create new content | |
| `edit own {bundle} content` | Edit own content | Anonymous users can edit any content created by anonymous |
| `edit any {bundle} content` | Edit any content | |
| `delete own {bundle} content` | Delete own content | Anonymous users can delete any content created by anonymous |
| `delete any {bundle} content` | Delete any content | |
| `view {bundle} revisions` | View revisions | Also requires permission to view content |
| `revert {bundle} revisions` | Revert revisions | Also requires permission to edit content |
| `delete {bundle} revisions` | Delete revisions | Also requires permission to delete content |

---

### Media Permissions

| Permission Key | Label |
|----------------|-------|
| `create {bundle} media` | Create new media |
| `edit own {bundle} media` | Edit own media |
| `edit any {bundle} media` | Edit any media |
| `delete own {bundle} media` | Delete own media |
| `delete any {bundle} media` | Delete any media |
| `view any {bundle} media revisions` | View any media revision pages |
| `revert any {bundle} media revisions` | Revert media revisions |
| `delete any {bundle} media revisions` | Delete media revisions |

---

### Taxonomy Term Permissions

| Permission Key | Label | Description |
|----------------|-------|-------------|
| `create terms in {vocabulary}` | Create terms | |
| `edit terms in {vocabulary}` | Edit terms | |
| `delete terms in {vocabulary}` | Delete terms | |
| `view term revisions in {vocabulary}` | View term revisions | |
| `revert term revisions in {vocabulary}` | Revert term revisions | Also requires permission to edit term |
| `delete term revisions in {vocabulary}` | Delete term revisions | Also requires permission to delete term |

---

### Block Content Permissions

| Permission Key | Label |
|----------------|-------|
| `create {bundle} block content` | Create new content block |
| `edit any {bundle} block content` | Edit content block |
| `delete any {bundle} block content` | Delete content block |
| `view any {bundle} block content history` | View content block history pages |
| `revert any {bundle} block content revisions` | Revert content block revisions |
| `delete any {bundle} block content revisions` | Delete content block revisions |

---

### Paragraph Permissions

Paragraphs do not have specific permissions - they inherit from the parent entity they are attached to.

---

## Role Configuration Structure

Roles are stored in `user.role.{role_id}.yml` files with this structure:

```yaml
langcode: en
status: true
dependencies:
  config:
    - node.type.article
    - media.type.image
  module:
    - node
    - media
id: content_editor
label: 'Content Editor'
weight: -5
is_admin: false
permissions:
  - 'create article content'
  - 'edit own article content'
  - 'delete own article content'
```

---

## Implementation Plan

### Phase 1: Role Parsing and Constants

**Files to create:**

#### 1. `src/constants/permissions.js`
Define permission patterns for each entity type:

```javascript
export const NODE_PERMISSIONS = [
  { key: 'create {bundle} content', label: 'Create new content' },
  { key: 'edit own {bundle} content', label: 'Edit own content' },
  { key: 'edit any {bundle} content', label: 'Edit any content' },
  { key: 'delete own {bundle} content', label: 'Delete own content' },
  { key: 'delete any {bundle} content', label: 'Delete any content' },
  { key: 'view {bundle} revisions', label: 'View revisions' },
  { key: 'revert {bundle} revisions', label: 'Revert revisions' },
  { key: 'delete {bundle} revisions', label: 'Delete revisions' }
];

// Similar for MEDIA_PERMISSIONS, TAXONOMY_PERMISSIONS, BLOCK_CONTENT_PERMISSIONS
```

Helper functions:
- `getPermissionsForBundle(entityType, bundle)` - Returns permission list for a bundle
- `getPermissionLabel(entityType, permissionKey)` - Returns human-readable label
- `parsePermissionKey(permission)` - Extract entity type and bundle from permission string

#### 2. `src/parsers/roleParser.js`
Parse role YAML files:

- `parseRole(config)` - Extract id, label, is_admin, permissions from config
- `filterBundlePermissions(permissions, entityType, bundle)` - Get permissions for specific bundle
- `groupPermissionsByBundle(permissions, entityType)` - Group permissions by bundle

#### 3. `src/generators/roleGenerator.js`
Generate role YAML:

- `generateRole(roleData)` - Generate complete role YAML
- `generateRoleDependencies(permissions, project)` - Calculate config/module dependencies
- `addPermissions(roleData, permissions)` - Add permissions to role
- `removePermissions(roleData, permissions)` - Remove permissions from role

---

### Phase 2: Role I/O and Commands

**Files to create/modify:**

#### 4. `src/io/configReader.js` (modify)
Add role reading functions:

- `readRole(configPath, roleId)` - Read and parse role file
- `roleExists(configPath, roleId)` - Check if role exists
- `listRoles(configPath)` - List all role files

#### 5. `src/commands/role.js`
Role orchestration:

- `loadRole(project, roleId)` - Load role from project
- `saveRole(project, role)` - Save role to project config
- `createRole(project, { label, id, isAdmin })` - Create new role
- `deleteRole(project, roleId)` - Delete role file
- `updateRolePermissions(project, roleId, add, remove)` - Update permissions
- `getRolePermissionsForBundle(role, entityType, bundle)` - Get current permissions
- `listRoles(project)` - List all roles in project

---

### Phase 3: Interactive Menus

**Files to modify:**

#### 6. `src/cli/prompts.js`
Add menu choices:

```javascript
{ value: 'manage-roles', name: 'Manage roles' }
```

Add prompt helpers:
- `getRoleChoices(roles)` - Format roles for selection
- `getPermissionChoices(permissions, currentPermissions)` - Format permissions with checkboxes

#### 7. `src/cli/menus.js`
Add menu handlers:

- `handleManageRoles(project)` - Role management submenu
- `handleCreateRole(project)` - Create role flow
- `handleEditRole(project, roleId)` - Edit role flow
- `handleEditPermissions(project, roleId)` - Permission editing flow

**Role Menu Flow:**
```
Manage Roles
├── Create new role
├── Edit role: {role_name}
│   ├── Edit role label
│   ├── Edit permissions
│   │   ├── Select entity type
│   │   │   ├── Edit all {entity_type} permissions
│   │   │   └── Select bundle
│   │   │       └── [Multi-select permission checkboxes]
│   │   └── Back
│   └── Back
├── Delete role
└── Back
```

---

### Phase 4: CLI Commands

**Files to modify:**

#### 8. `src/cli/commands.js`
Add command handlers:

- `cmdRoleCreate` - Create role
- `cmdRoleList` - List roles
- `cmdRoleView` - View role permissions
- `cmdRoleDelete` - Delete role
- `cmdRoleAddPermission` - Add permissions to role
- `cmdRoleRemovePermission` - Remove permissions from role

#### 9. `index.mjs`
Add commander configuration:

```bash
# Role commands
dcm role create --project <slug> --label "Content Editor" [--name <id>] [--is-admin]
dcm role list --project <slug> [--json]
dcm role view --project <slug> --role <id> [--json]
dcm role delete --project <slug> --role <id> [--force]

# Permission commands
dcm role add-permission --project <slug> --role <id> --entity-type <type> --bundle <bundle> --permissions <perm1,perm2,...>
dcm role remove-permission --project <slug> --role <id> --permissions <perm1,perm2,...>
dcm role set-permissions --project <slug> --role <id> --entity-type <type> --bundle <bundle> --permissions <perm1,perm2,...>
```

---

### Phase 5: Sync Integration

**Files to modify:**

#### 10. `src/commands/sync.js`
Update sync to include roles:

- Parse `user.role.*.yml` files during sync
- Store role summaries in project.roles
- Track role count in sync summary

---

## Test Specifications

### Unit Tests

- `tests/permissions.test.mjs` - Permission constant tests
- `tests/roleParser.test.mjs` - Role parsing tests
- `tests/roleGenerator.test.mjs` - Role generation tests
- `tests/role.test.mjs` - Role command tests

### Test Cases

1. Parse role YAML correctly
2. Generate valid role YAML
3. Calculate dependencies correctly
4. Add/remove permissions
5. Handle missing roles
6. Validate role names
7. List roles in project
8. Permission grouping by bundle

---

## Acceptance Criteria

- [ ] Role YAML files parsed correctly
- [ ] New roles can be created with proper YAML structure
- [ ] Permissions can be added/removed from roles
- [ ] Interactive menu allows permission selection per bundle
- [ ] CLI commands work for all role operations
- [ ] Sync includes roles in project data
- [ ] Dependencies calculated correctly for role files
- [ ] Tests cover all new functionality

---

## Example CLI Usage

```bash
# Create a new role
dcm role create -p my-site -l "Content Editor" -n content_editor

# List roles
dcm role list -p my-site

# View role permissions
dcm role view -p my-site -r content_editor

# Add permissions for a node bundle
dcm role add-permission -p my-site -r content_editor \
  -e node -b article \
  --permissions "create,edit_own,edit_any,delete_own"

# Add all permissions for a media bundle
dcm role add-permission -p my-site -r content_editor \
  -e media -b image \
  --permissions "all"

# Remove specific permission
dcm role remove-permission -p my-site -r content_editor \
  --permissions "delete any article content"
```

---

## Interactive Flow Example

```
? Select an action: Manage roles
? Select a role action:
  > Create new role
    Edit role
    Delete role
    Back

? Role label: Content Editor
? Machine name: (content_editor)
? Is this an admin role? No

Role "Content Editor" created.

? Select a role action: Edit role
? Select role: Content Editor
? Select action:
  > Edit permissions
    Edit label
    Back

? Select entity type:
  > node (Content)
    media (Media)
    taxonomy_term (Taxonomy)
    block_content (Block)
    Back

? Select bundle or all:
  > All node bundles
    article (Article)
    page (Page)
    Back

? Select permissions for "article":
  [x] Create new content
  [x] Edit own content
  [ ] Edit any content
  [x] Delete own content
  [ ] Delete any content
  [ ] View revisions
  [ ] Revert revisions
  [ ] Delete revisions

Permissions updated for role "Content Editor".
```
