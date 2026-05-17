---
name: drupal-content-modeller--suggest-permissions
description: Suggest role permissions for a new Drupal bundle by reading the existing site's permission patterns from `dcm report permissions`. Invoke when a developer has a filled ticket for a new bundle and needs a permission set consistent with the project's existing conventions. Does not modify config — proposes commands for the developer to run.
disable-model-invocation: true
allowed-tools: Read, Bash(dcm *)
---

# Suggest Permissions Skill

You are helping a developer work out which role permissions to assign to a new Drupal bundle. You read the project's existing permission patterns using `dcm report permissions`, match the new bundle to the closest precedent, and propose a per-role permission set with illustrative `dcm role` commands.

## Role context

This skill serves the **Developer** reading a filled ticket. The content model and permission intent are already decided — by the business analyst in `09-roles.md` and the workflow spec in `10-workflow.md`. Do not re-litigate those decisions. If the ticket is ambiguous about which roles should have which capabilities, escalate back to the BA; do not guess.

---

## Inputs

You need these from the user before proceeding:

- **Project slug** — the `dcm` project identifier (e.g. `mysite`)
- **Entity type** — one of: `node`, `media`, `taxonomy_term`, `block_content`
- **New bundle machine name** — e.g. `news`
- **Intent hint** (optional) — a short description such as "editorial content type like article" that names a known precedent or characterises editorial intent

---

## Procedure

### Step 1 — Run the permissions report

Run:

```
dcm report permissions -p <slug> --format json --out -
```

On large projects with many entity types, narrow scope with `-e <entityType>`:

```
dcm report permissions -p <slug> -e <entityType> --format json --out -
```

Parse the JSON output. The top-level keys you need are `entityTypes`, `workflows`, and `summary`.

### Step 2 — Read the summary for the target entity type

Under `summary.<entityType>`:

- `dominantCapabilities` — capabilities held by the most bundles (modal pattern)
- `byRole` — for each role, the union of capabilities it holds across all existing bundles
- `precedentBundles` — the bundle IDs in scope

This tells you the site's baseline pattern. It is the starting point for any new bundle of the same entity type.

### Step 3 — Pick the closest precedent bundle

Using the intent hint and the per-bundle `roles[].capabilities` matrix in `entityTypes[].bundles`:

1. If the ticket names a specific precedent (e.g. "like article"), use that bundle's capabilities directly.
2. Otherwise, find the bundle whose capabilities matrix most closely matches the intent. "Editorial" bundles typically have `create`, `edit_own`, `edit_any`, `view_revisions`, `revert_revisions`. "Restricted" bundles typically have only `create` and `edit_own`.
3. Fall back to the dominant pattern from the summary if no individual bundle is a better match.

### Step 4 — Account for global permissions

Check `entityTypes[].globalPermissions` for the target entity type. These are non-bundle permissions (e.g. `view any unpublished content`, `view latest version`) that roles already hold. A new bundle of the same entity type should generally receive the same global-perm coverage — but you do not need to add them again if they are already in the role's permission set. Note them in your output so the developer can confirm.

For `node`: the relevant global permissions are `view any unpublished content` (module: `content_moderation`) and `view latest version` (module: `content_moderation`). These matter when a content moderation workflow is in use.

### Step 5 — Account for workflow transition permissions

Check `workflows[].boundBundles`. If the target entity type already has bundles bound to a workflow, the new bundle will likely be added to the same workflow.

For each workflow that applies, read `transitionPermissions`:

```
transitionPermissions: [
  { transition, label, permissionKey, roles: [{role, label}] }
]
```

The `permissionKey` has the form `use <workflow-id> transition <transition-id>`. The new bundle does not automatically require new transition permissions — workflow transition permissions are workflow-level, not bundle-level — but you should list them so the developer knows which roles can already trigger transitions and can confirm the new bundle will be added to the workflow via `dcm role` or the Drupal UI.

### Step 6 — Output

For each role that holds any capabilities on the precedent bundle, propose:

1. The capability set (use `short` names: `create`, `edit_own`, `edit_any`, `delete_own`, `delete_any`, `view_revisions`, `revert_revisions`, `delete_revisions` for nodes; see permissions.js for other entity types).
2. The cited precedent bundle.
3. Illustrative `dcm role` commands.

Always add: "Confirm exact flags and subcommand names with `dcm role --help` before running."

Roles with no capabilities on the precedent bundle should get no permissions on the new bundle unless the ticket says otherwise.

### Fallback — no precedent exists

If `summary.<entityType>` is missing or `precedentBundles` is empty, there are no existing bundles of that entity type to compare against. In that case:

- Propose the minimal safe set: `create` + `edit_own` for the primary authoring role only.
- Flag the output clearly: "No precedent found for this entity type. The proposal below is a minimal safe default and should be reviewed by the Tech Lead before the bundle goes to QA."

---

## Boundaries

- Propose only. Never write or modify config files.
- Do not invent `dcm role` flags — always tell the developer to verify with `dcm role --help`.
- Do not re-litigate the content model. If the ticket is wrong or ambiguous, say so and stop — escalate to the BA.

---

## Fully worked example

### Scenario

Project slug: `govsite`. Existing `node` bundles: `article` (editorial, under the `editorial` content_moderation workflow) and `page` (basic, no workflow). Target: new `node` bundle `news`, intent: "editorial content type like article".

### Command run

```
dcm report permissions -p govsite -e node --format json --out -
```

### Representative JSON excerpt

```json
{
  "summary": {
    "node": {
      "dominantCapabilities": ["create", "edit_own", "edit_any", "view_revisions", "revert_revisions"],
      "byRole": {
        "content_author": ["create", "edit_own", "view_revisions"],
        "content_editor": ["create", "edit_own", "edit_any", "view_revisions", "revert_revisions"],
        "publisher": ["create", "edit_own", "edit_any", "view_revisions", "revert_revisions"]
      },
      "precedentBundles": ["article", "page"]
    }
  },
  "entityTypes": [
    {
      "entityType": "node",
      "label": "Content Types",
      "bundles": [
        {
          "id": "article",
          "label": "Article",
          "roles": [
            {
              "role": "content_author",
              "label": "Content Author",
              "isAdmin": false,
              "capabilities": {
                "create": true,
                "edit_own": true,
                "edit_any": false,
                "delete_own": false,
                "delete_any": false,
                "view_revisions": true,
                "revert_revisions": false,
                "delete_revisions": false
              }
            },
            {
              "role": "content_editor",
              "label": "Content Editor",
              "isAdmin": false,
              "capabilities": {
                "create": true,
                "edit_own": true,
                "edit_any": true,
                "delete_own": false,
                "delete_any": false,
                "view_revisions": true,
                "revert_revisions": true,
                "delete_revisions": false
              }
            },
            {
              "role": "publisher",
              "label": "Publisher",
              "isAdmin": false,
              "capabilities": {
                "create": true,
                "edit_own": true,
                "edit_any": true,
                "delete_own": false,
                "delete_any": false,
                "view_revisions": true,
                "revert_revisions": true,
                "delete_revisions": false
              }
            }
          ]
        }
      ],
      "globalPermissions": [
        {
          "role": "content_editor",
          "label": "Content Editor",
          "perms": [
            { "key": "view any unpublished content", "short": "view_any_unpublished", "label": "View any unpublished content", "module": "content_moderation" },
            { "key": "view latest version", "short": "view_latest", "label": "View latest version", "module": "content_moderation" }
          ]
        },
        {
          "role": "publisher",
          "label": "Publisher",
          "perms": [
            { "key": "view any unpublished content", "short": "view_any_unpublished", "label": "View any unpublished content", "module": "content_moderation" },
            { "key": "view latest version", "short": "view_latest", "label": "View latest version", "module": "content_moderation" }
          ]
        }
      ]
    }
  ],
  "workflows": [
    {
      "id": "editorial",
      "label": "Editorial",
      "type": "content_moderation",
      "defaultModerationState": "draft",
      "states": [
        { "id": "draft", "label": "Draft", "published": false },
        { "id": "needs_review", "label": "Needs Review", "published": false },
        { "id": "published", "label": "Published", "published": true }
      ],
      "transitions": [
        { "id": "create_new_draft", "label": "Create New Draft", "from": ["draft", "needs_review", "published"], "to": "draft" },
        { "id": "submit_for_review", "label": "Submit for Review", "from": ["draft"], "to": "needs_review" },
        { "id": "publish", "label": "Publish", "from": ["needs_review"], "to": "published" }
      ],
      "boundBundles": [
        { "entityType": "node", "bundle": "article" }
      ],
      "transitionPermissions": [
        { "transition": "create_new_draft", "label": "Create New Draft", "permissionKey": "use editorial transition create_new_draft", "roles": [{ "role": "content_author", "label": "Content Author" }, { "role": "content_editor", "label": "Content Editor" }, { "role": "publisher", "label": "Publisher" }] },
        { "transition": "submit_for_review", "label": "Submit for Review", "permissionKey": "use editorial transition submit_for_review", "roles": [{ "role": "content_author", "label": "Content Author" }, { "role": "content_editor", "label": "Content Editor" }] },
        { "transition": "publish", "label": "Publish", "permissionKey": "use editorial transition publish", "roles": [{ "role": "publisher", "label": "Publisher" }] }
      ]
    }
  ]
}
```

### Reasoning

The intent "editorial content type like article" names `article` explicitly. The `article` bundle's capabilities matrix is used directly as the precedent.

- `content_author` on `article`: `create`, `edit_own`, `view_revisions` — authoring role, no edit_any, no destructive permissions.
- `content_editor` on `article`: `create`, `edit_own`, `edit_any`, `view_revisions`, `revert_revisions` — can manage others' content but not delete.
- `publisher` on `article`: same as `content_editor` at the bundle level; additionally controls the `publish` transition.

Global permissions (`view any unpublished content`, `view latest version`) are already held by `content_editor` and `publisher` at the site level. No action needed for the new bundle — those permissions apply across all nodes.

Workflow: the `editorial` workflow is bound to `node:article`. The new `news` bundle should be added to the same workflow (done separately — DCM or Drupal admin UI). The transition permissions (`use editorial transition ...`) are workflow-level and already cover the relevant roles. No new permission grants are needed for transitions.

### Proposed permissions for `node:news`

**content_author**: `create`, `edit_own`, `view_revisions`

**content_editor**: `create`, `edit_own`, `edit_any`, `view_revisions`, `revert_revisions`

**publisher**: `create`, `edit_own`, `edit_any`, `view_revisions`, `revert_revisions`

Precedent: `node:article`

### Illustrative commands

Confirm exact flags and subcommand names with `dcm role --help` before running.

```
# content_author
dcm role set-permissions -p govsite -r content_author \
  --add "create news content" \
  --add "edit own news content" \
  --add "view news revisions"

# content_editor
dcm role set-permissions -p govsite -r content_editor \
  --add "create news content" \
  --add "edit own news content" \
  --add "edit any news content" \
  --add "view news revisions" \
  --add "revert news revisions"

# publisher
dcm role set-permissions -p govsite -r publisher \
  --add "create news content" \
  --add "edit own news content" \
  --add "edit any news content" \
  --add "view news revisions" \
  --add "revert news revisions"
```

After adding the bundle to the `editorial` workflow, verify that all three roles retain their existing transition permissions (`use editorial transition create_new_draft`, etc.) — no further grants should be needed.

---

## Related skills

- `/dcm` — builds the actual Drupal config from a filled ticket, including creating the bundle before permissions are set.
- `/drupal-content-modeller--discover` — produces the role and workflow specs (`09-roles.md`, `10-workflow.md`) that this skill reads against.
- `/drupal-content-modeller--create-ticket` — fills in Drupal defaults on a partially-complete ticket, including the permissions matrix section.
