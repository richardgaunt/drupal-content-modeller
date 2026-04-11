---
name: drupal-content-modeller--ticket-template
description: Generate a pre-filled QA ticket template for a specific Drupal entity type and bundle. Uses dcm to pull real field data from a project and creates a ticket markdown that the user can review and edit.
disable-model-invocation: true
allowed-tools: Read, Write, Bash(dcm *)
---

# Ticket Template Generator Skill

You generate a QA ticket markdown file for a specific entity type and bundle from a dcm project. The ticket is pre-filled with real field data but left in a state where the user can review and modify it before finalising.

## Step 1: Identify the project

Run `dcm project list --json` to get available projects. If the user specified a project, use it. Otherwise ask them to pick one.

## Step 2: Identify the entity type and bundle

If the user specified an entity type and bundle, use them. Otherwise:

1. Run `dcm bundle list -p <project> --json` to show available bundles grouped by entity type.
2. Ask the user which entity type and bundle they want a ticket for.

## Step 3: Choose approach

There are two modes depending on whether the bundle already exists in the project:

### Mode A: Bundle exists in the project (pre-filled with real data)

If the bundle exists in the project, use real data. Run:

```bash
dcm report entity -p <project> -e <entity-type> --json
dcm project view -p <project> --json
```

From the JSON report data, extract for the target bundle:
- **Bundle label and description**
- **Fields**: name, label, type, widget, description, cardinality, required, other info
- **Permissions**: role permission matrix
- **Admin URLs**: edit form, manage fields, etc.
- **Form display widgets**: the actual widget assigned to each field

Then build the ticket using this data (see Step 4).

### Mode B: Bundle does not exist yet (blank template)

If the bundle doesn't exist yet, generate a blank template using dcm:

```bash
dcm report templates -e <entity-type> -l "<Label>" -m <machine_name> [-n <ticket_number>] [-u <base_url>] -o <output_dir>
```

This generates a template with the correct structure, admin URLs, add paths, and base fields pre-filled. The user fills in the custom fields.

You can also generate generic templates for all entity types:

```bash
dcm report templates -o <output_dir>
```

After generating a blank template, offer to help the user fill in the fields using the `/drupal-content-modeller--create-ticket` skill.

## Step 4: Build the ticket (Mode A only)

Generate a markdown file with this structure:

```markdown
# <number> - Create <Label> <entity type label>

<!-- entity_type: <entity_type> -->
<!-- bundle: <bundle_machine_name> -->
<!-- project: <project_slug> -->

## AC - Create entity type

Given I am an administrator
When I go to [<Label> configuration](<edit_form_url>)
Then the <entity type label> "<Label>" exists and is configured

## AC - Fields are configured as follows

Given I am a <role with create permission>
When I add a <entity type label> ([Add new <Label>](<add_url>))

Then I can see the following fields:

| Check | Field Name | Machine Name | Field Type | Widget | Description | Cardinality | Required | Other |
|-------|------------|--------------|------------|--------|-------------|-------------|----------|-------|
| <input type="checkbox"> | ... | ... | ... | ... | ... | ... | ... | ... |

## AC - Permissions are configured to the following

The following <entity type label> permissions are configured as follows:

| Role | Create | Edit own | Edit any | Delete own | Delete any |
|------|--------|----------|----------|------------|------------|
| ... | ... | ... | ... | ... | ... |

## Dependencies

- [ticket name](ticket_filename)
```

### Key rules for building the ticket:

**Base fields** — Include key base fields at the top of the fields table:
- node: Title
- media: Name
- taxonomy_term: Name, Description
- block_content: Block description

**Widget format** — Show as `Label (machine_name)`, e.g. `Textfield (string_textfield)`

**Add URL paths** by entity type:
- node: `/node/add/{bundle}`
- media: `/media/add/{bundle}`
- taxonomy_term: `/admin/structure/taxonomy/manage/{bundle}/add`
- block_content: `/block/add/{bundle}`
- paragraph: (none — use "When I edit a paragraph type" instead)

**Role** — Use the first non-admin role that has create permission for the bundle.

**Dependencies** — List any bundles referenced via entity_reference or entity_reference_revisions fields. Format as `entityType:bundle` pairs.

## Step 5: Ask where to save

Suggest a default path like `<project_tickets_dir>/<number> - Create <Label> <entity_type_label>.md`.

Ask the user:
- What ticket number to use (suggest the next available)
- Where to save the file

## Step 6: Write the file

Save the ticket and confirm the path to the user.

## Important Rules

- **Use real data from the project** — don't guess field types or widgets when the project has them.
- **Include all custom fields** from the bundle, sorted alphabetically by label.
- **The ticket should be ready to use as-is** but the user may want to edit it — that's expected.
- **If the bundle has no fields yet** (newly created), generate the template with just the base fields and empty rows for the user to fill in.
