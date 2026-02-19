---
name: dcm
description: Use the Drupal Content Modeller (dcm) CLI to generate Drupal configuration from ticket requirements. Invoke when the user wants to create content types, bundles, fields, form displays, roles, or other Drupal content model configuration using dcm.
disable-model-invocation: true
allowed-tools: Bash(dcm *)
---

# Drupal Content Modeller (dcm) Skill

You are helping the user generate Drupal configuration using the `dcm` CLI tool.

## Step 0: Learn the tool

Before doing anything else, run the following commands to understand the current dcm capabilities:

```
dcm help --json
dcm help bundle --json
dcm help field --json
dcm help form-display --json
dcm help role --json
dcm help project --json
dcm help drush --json
dcm help report --json
```

Use the output from these commands as your reference for all available commands, options, field types, and valid values. Do NOT rely on any hardcoded reference — always use the live help output.

## Step 1: Ask which project to use

Run `dcm project list --json` to get available projects. Present the list to the user and ask them to pick one. If only one project exists, confirm it with the user.

## Step 2: Ask for the ticket or requirements

Ask the user to paste the ticket text, requirements, or description of what content types, fields, and configuration they need. Wait for them to provide this before proceeding.

## Step 3: Analyse the requirements

Read the provided text and determine what needs to be created:
- **Bundles** (content types, media types, paragraph types, vocabularies, block types)
- **Fields** on each bundle (with correct types, cardinality, required flags, etc.)
- **Form displays** (field groups, tab layouts, widget configuration)
- **Roles and permissions** (if mentioned)

## Step 4: Check existing configuration

Run `dcm bundle list -p <project> --json` and `dcm field list -p <project> -e <type> --json` as needed to understand what already exists, so you don't duplicate bundles or fields.

## Step 5: Present the plan for confirmation

Before running any create/edit commands, present a clear summary to the user listing every `dcm` command you intend to run, grouped by category (bundles, fields, form display, roles). Example:

```
Project: <project-slug>

I'll run the following dcm commands:

Bundles:
  1. dcm bundle create -p <project> -e node -l "Article"
  2. dcm bundle create -p <project> -e paragraph -l "Hero Banner"

Fields:
  3. dcm field create -p <project> -e node -b article -t string -l "Subtitle"
  4. dcm field create -p <project> -e node -b article -t entity_reference_revisions -l "Components" --target-bundles "hero_banner" --cardinality -1

Form Display:
  5. dcm form-display create -p <project> -e node -b article
```

**Wait for user confirmation before executing any commands.**

## Step 6: Execute commands sequentially

Run each `dcm` command one at a time. If any command fails, stop and report the error before continuing.

## Step 7: Verify and report

After all commands complete, run `dcm field list` and/or `dcm form-display view` to verify the results and show the user what was created.

## Important Rules

- **Always confirm the plan with the user before running create/edit commands.**
- **Never use `--sync` flag** — let the user decide when to sync to Drupal.
- Use `--json` flag on list/query commands for reliable parsing.
- Run commands sequentially, not in parallel.
- If a bundle or field already exists, skip it and note that in the summary.
- When the ticket is ambiguous about field types or cardinality, make a reasonable Drupal-standard choice and flag it in the plan for the user to confirm.
