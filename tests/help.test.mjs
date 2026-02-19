import { execFile } from 'child_process';
import { promisify } from 'util';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

import {
  PROJECT_HELP,
  BUNDLE_HELP,
  FIELD_HELP,
  FIELD_CREATE_HELP,
  FORM_DISPLAY_HELP,
  ROLE_HELP,
  DRUSH_HELP,
  REPORT_HELP,
  ADMIN_HELP
} from '../src/cli/help/index.js';

const execFileAsync = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));
const dcmPath = join(__dirname, '..', 'index.mjs');

/**
 * Helper to run dcm CLI and capture output
 */
async function runDcm(...args) {
  const { stdout, stderr } = await execFileAsync('node', [dcmPath, ...args], {
    timeout: 10000,
    env: { ...process.env, NODE_ENV: 'test' }
  });
  return { stdout, stderr };
}

// ============================================
// Unit Tests - Help Text Modules
// ============================================

describe('Help Text Modules', () => {
  test('PROJECT_HELP contains examples', () => {
    expect(PROJECT_HELP).toContain('Examples:');
    expect(PROJECT_HELP).toContain('dcm project create');
  });

  test('BUNDLE_HELP contains entity types', () => {
    expect(BUNDLE_HELP).toContain('node');
    expect(BUNDLE_HELP).toContain('media');
    expect(BUNDLE_HELP).toContain('paragraph');
    expect(BUNDLE_HELP).toContain('taxonomy_term');
    expect(BUNDLE_HELP).toContain('block_content');
  });

  test('FIELD_HELP contains all field types', () => {
    const fieldTypes = [
      'string', 'string_long', 'text_long', 'boolean', 'integer',
      'list_string', 'list_integer', 'datetime', 'daterange',
      'link', 'image', 'file', 'entity_reference',
      'entity_reference_revisions', 'webform'
    ];
    for (const type of fieldTypes) {
      expect(FIELD_HELP).toContain(type);
    }
  });

  test('FIELD_HELP contains field name prefixes', () => {
    expect(FIELD_HELP).toContain('field_n_');
    expect(FIELD_HELP).toContain('field_m_');
    expect(FIELD_HELP).toContain('field_p_');
    expect(FIELD_HELP).toContain('field_t_');
    expect(FIELD_HELP).toContain('field_b_');
  });

  test('FIELD_CREATE_HELP contains type-specific options', () => {
    expect(FIELD_CREATE_HELP).toContain('--max-length');
    expect(FIELD_CREATE_HELP).toContain('--allowed-values');
    expect(FIELD_CREATE_HELP).toContain('--target-type');
    expect(FIELD_CREATE_HELP).toContain('--target-bundles');
    expect(FIELD_CREATE_HELP).toContain('--datetime-type');
    expect(FIELD_CREATE_HELP).toContain('--file-extensions');
    expect(FIELD_CREATE_HELP).toContain('--alt-required');
    expect(FIELD_CREATE_HELP).toContain('--link-type');
    expect(FIELD_CREATE_HELP).toContain('--title-option');
  });

  test('ROLE_HELP contains permission short names', () => {
    expect(ROLE_HELP).toContain('create');
    expect(ROLE_HELP).toContain('edit_own');
    expect(ROLE_HELP).toContain('edit_any');
    expect(ROLE_HELP).toContain('delete_own');
    expect(ROLE_HELP).toContain('delete_any');
    expect(ROLE_HELP).toContain('view_revisions');
    expect(ROLE_HELP).toContain('revert_revisions');
    expect(ROLE_HELP).toContain('delete_revisions');
  });

  test('FORM_DISPLAY_HELP contains group format types', () => {
    expect(FORM_DISPLAY_HELP).toContain('tabs');
    expect(FORM_DISPLAY_HELP).toContain('tab');
    expect(FORM_DISPLAY_HELP).toContain('details');
    expect(FORM_DISPLAY_HELP).toContain('fieldset');
  });

  test('FORM_DISPLAY_HELP contains workflow steps', () => {
    expect(FORM_DISPLAY_HELP).toContain('Workflow:');
    expect(FORM_DISPLAY_HELP).toContain('form-display create');
    expect(FORM_DISPLAY_HELP).toContain('form-display view');
  });

  test('DRUSH_HELP contains prerequisites', () => {
    expect(DRUSH_HELP).toContain('drupalRoot');
    expect(DRUSH_HELP).toContain('drush');
    expect(DRUSH_HELP).toContain('Notes:');
  });

  test('REPORT_HELP contains examples', () => {
    expect(REPORT_HELP).toContain('dcm report entity');
    expect(REPORT_HELP).toContain('dcm report project');
  });

  test('ADMIN_HELP contains examples', () => {
    expect(ADMIN_HELP).toContain('dcm admin links');
  });
});

// ============================================
// Integration Tests - CLI Help Output
// ============================================

describe('CLI Help Output', () => {
  test('dcm help outputs concise introduction', async () => {
    const { stdout } = await runDcm('help');
    expect(stdout).toContain('Drupal Content Modeller');
    expect(stdout).toContain('Key Concepts:');
    expect(stdout).toContain('Typical Workflow:');
    expect(stdout).toContain('Commands:');
    expect(stdout).toContain('Getting detailed help:');
    expect(stdout).toContain('dcm help <command>');
  });

  test('dcm help all outputs full COMMANDS.md reference', async () => {
    const { stdout } = await runDcm('help', 'all');
    expect(stdout).toContain('CLI Commands Reference');
    expect(stdout).toContain('Overview');
    expect(stdout).toContain('Command Structure');
    expect(stdout).toContain('Project Commands');
    expect(stdout).toContain('Field Commands');
  });

  test('dcm help --json outputs lightweight command index', async () => {
    const { stdout } = await runDcm('help', '--json');
    const parsed = JSON.parse(stdout);
    expect(parsed).toHaveProperty('name', 'dcm');
    expect(parsed).toHaveProperty('description');
    expect(parsed).toHaveProperty('commands');
    expect(Array.isArray(parsed.commands)).toBe(true);

    const commandNames = parsed.commands.map(c => c.name);
    expect(commandNames).toContain('project');
    expect(commandNames).toContain('bundle');
    expect(commandNames).toContain('field');
    expect(commandNames).toContain('form-display');
    expect(commandNames).toContain('role');
    expect(commandNames).toContain('drush');
    expect(commandNames).toContain('report');
    expect(commandNames).toContain('admin');

    // Each entry has name, description, and how to get detailed help
    const fieldCmd = parsed.commands.find(c => c.name === 'field');
    expect(fieldCmd).toHaveProperty('description');
    expect(fieldCmd).toHaveProperty('help', 'dcm help field --json');

    // Should NOT include full subcommands/options at root level
    expect(fieldCmd).not.toHaveProperty('subcommands');
    expect(fieldCmd).not.toHaveProperty('options');
  });

  test('dcm help field --json includes full details with examples', async () => {
    const { stdout } = await runDcm('help', 'field', '--json');
    const parsed = JSON.parse(stdout);

    expect(parsed).toHaveProperty('examples');
    expect(parsed.examples.length).toBeGreaterThan(0);
    expect(parsed).toHaveProperty('validValues');
    expect(parsed.validValues.find(v => v.label === 'Field Types')).toBeDefined();
    expect(parsed).toHaveProperty('subcommands');

    const createCmd = parsed.subcommands.find(c => c.name === 'create');
    expect(createCmd).toHaveProperty('options');
    expect(createCmd.options.length).toBeGreaterThan(5);
    expect(createCmd).toHaveProperty('examples');
    expect(createCmd).toHaveProperty('validValues');

    const typeOptions = createCmd.validValues.find(v => v.label === 'Field Types and Type-Specific Options');
    expect(typeOptions).toBeDefined();
    expect(typeOptions.values.find(v => v.name === 'entity_reference')).toBeDefined();

    const requiredOpts = createCmd.options.filter(o => o.required);
    expect(requiredOpts.length).toBeGreaterThan(0);
  });

  test('dcm help field --json outputs structured field command', async () => {
    const { stdout } = await runDcm('help', 'field', '--json');
    const parsed = JSON.parse(stdout);
    expect(parsed).toHaveProperty('name', 'field');
    expect(parsed).toHaveProperty('examples');
    expect(parsed).toHaveProperty('validValues');
    expect(parsed).toHaveProperty('subcommands');

    const subNames = parsed.subcommands.map(c => c.name);
    expect(subNames).toContain('create');
    expect(subNames).toContain('list');
    expect(subNames).toContain('edit');
  });

  test('dcm help project shows project help with examples', async () => {
    const { stdout } = await runDcm('help', 'project');
    expect(stdout).toContain('Project management commands');
    expect(stdout).toContain('create');
    expect(stdout).toContain('list');
    expect(stdout).toContain('sync');
    expect(stdout).toContain('Examples:');
  });

  test('dcm project --help includes enhanced help text', async () => {
    const { stdout } = await runDcm('project', '--help');
    expect(stdout).toContain('Examples:');
    expect(stdout).toContain('config-path');
  });

  test('dcm field --help includes field types list', async () => {
    const { stdout } = await runDcm('field', '--help');
    expect(stdout).toContain('Field Types:');
    expect(stdout).toContain('entity_reference_revisions');
    expect(stdout).toContain('Field Name Prefixes');
  });

  test('dcm field create --help includes type-specific options', async () => {
    const { stdout } = await runDcm('field', 'create', '--help');
    expect(stdout).toContain('Field Types and Type-Specific Options:');
    expect(stdout).toContain('--max-length');
    expect(stdout).toContain('--allowed-values');
  });

  test('dcm role --help includes permission short names', async () => {
    const { stdout } = await runDcm('role', '--help');
    expect(stdout).toContain('Permission Short Names');
    expect(stdout).toContain('edit_own');
    expect(stdout).toContain('delete_any');
  });

  test('dcm bundle --help includes entity type values', async () => {
    const { stdout } = await runDcm('bundle', '--help');
    expect(stdout).toContain('Entity Types:');
    expect(stdout).toContain('taxonomy_term');
    expect(stdout).toContain('block_content');
  });

  test('dcm form-display --help includes workflow and group formats', async () => {
    const { stdout } = await runDcm('form-display', '--help');
    expect(stdout).toContain('Workflow:');
    expect(stdout).toContain('Group Format Types:');
    expect(stdout).toContain('list-widgets');
  });

  test('dcm drush --help includes prerequisites', async () => {
    const { stdout } = await runDcm('drush', '--help');
    expect(stdout).toContain('drupalRoot');
    expect(stdout).toContain('Workflow:');
  });

  test('dcm report --help includes examples', async () => {
    const { stdout } = await runDcm('report', '--help');
    expect(stdout).toContain('Examples:');
    expect(stdout).toContain('dcm report entity');
  });

  test('dcm admin --help includes examples', async () => {
    const { stdout } = await runDcm('admin', '--help');
    expect(stdout).toContain('Examples:');
    expect(stdout).toContain('dcm admin links');
  });
});
