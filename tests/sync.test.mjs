import { mkdtemp, rm, writeFile } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

import { setProjectsDir } from '../src/io/fileSystem';
import { createProject, loadProject } from '../src/commands/project';
import { syncProject, getSyncSummary } from '../src/commands/sync';

describe('Sync Configuration', () => {
  let tempDir;
  let tempConfigDir;

  beforeEach(async () => {
    // Create temp directories for testing
    tempDir = await mkdtemp(join(tmpdir(), 'dcm-test-'));
    tempConfigDir = await mkdtemp(join(tmpdir(), 'dcm-config-'));

    // Set projects directory to temp directory
    setProjectsDir(tempDir);
  });

  afterEach(async () => {
    // Reset projects directory
    setProjectsDir(null);

    // Cleanup temp directories
    await rm(tempDir, { recursive: true, force: true });
    await rm(tempConfigDir, { recursive: true, force: true });
  });

  async function createTestConfig() {
    // Create sample config files
    await writeFile(join(tempConfigDir, 'node.type.page.yml'), `
langcode: en
status: true
name: Page
type: page
description: 'A page content type.'
new_revision: true
`);

    await writeFile(join(tempConfigDir, 'node.type.article.yml'), `
langcode: en
status: true
name: Article
type: article
description: 'An article content type.'
new_revision: true
`);

    await writeFile(join(tempConfigDir, 'media.type.image.yml'), `
langcode: en
status: true
id: image
label: Image
description: 'Image media type.'
source: image
`);

    await writeFile(join(tempConfigDir, 'paragraphs.paragraphs_type.text.yml'), `
langcode: en
status: true
id: text
label: Text
description: 'Text paragraph.'
`);

    await writeFile(join(tempConfigDir, 'taxonomy.vocabulary.tags.yml'), `
langcode: en
status: true
name: Tags
vid: tags
description: 'Tags vocabulary.'
`);

    await writeFile(join(tempConfigDir, 'field.storage.node.field_body.yml'), `
langcode: en
status: true
id: node.field_body
field_name: field_body
entity_type: node
type: text_long
cardinality: 1
`);

    await writeFile(join(tempConfigDir, 'field.storage.node.field_tags.yml'), `
langcode: en
status: true
id: node.field_tags
field_name: field_tags
entity_type: node
type: entity_reference
cardinality: -1
settings:
  target_type: taxonomy_term
`);

    await writeFile(join(tempConfigDir, 'field.field.node.page.field_body.yml'), `
langcode: en
status: true
id: node.page.field_body
field_name: field_body
entity_type: node
bundle: page
label: Body
required: false
field_type: text_long
`);

    await writeFile(join(tempConfigDir, 'field.field.node.page.field_tags.yml'), `
langcode: en
status: true
id: node.page.field_tags
field_name: field_tags
entity_type: node
bundle: page
label: Tags
required: true
field_type: entity_reference
`);

    await writeFile(join(tempConfigDir, 'field.field.node.article.field_body.yml'), `
langcode: en
status: true
id: node.article.field_body
field_name: field_body
entity_type: node
bundle: article
label: Body
required: true
field_type: text_long
`);
  }

  describe('syncProject', () => {
    test('updates project.entities', async () => {
      await createTestConfig();
      const project = await createProject('Test Project', tempConfigDir);

      await syncProject(project);

      const loaded = await loadProject('test-project');
      expect(loaded.entities).toBeDefined();
      expect(loaded.entities.node).toBeDefined();
    });

    test('finds all entity types', async () => {
      await createTestConfig();
      const project = await createProject('Test Project', tempConfigDir);

      await syncProject(project);

      const loaded = await loadProject('test-project');
      expect(loaded.entities.node).toBeDefined();
      expect(loaded.entities.media).toBeDefined();
      expect(loaded.entities.paragraph).toBeDefined();
      expect(loaded.entities.taxonomy_term).toBeDefined();
    });

    test('merges storage and instance data', async () => {
      await createTestConfig();
      const project = await createProject('Test Project', tempConfigDir);

      await syncProject(project);

      const loaded = await loadProject('test-project');
      const bodyField = loaded.entities.node.page.fields.field_body;

      expect(bodyField.label).toBe('Body'); // from instance
      expect(bodyField.type).toBe('text_long'); // from storage
      expect(bodyField.cardinality).toBe(1); // from storage
      expect(bodyField.required).toBe(false); // from instance
    });

    test('sets lastSync timestamp', async () => {
      await createTestConfig();
      const project = await createProject('Test Project', tempConfigDir);

      const before = new Date();
      await syncProject(project);
      const after = new Date();

      const loaded = await loadProject('test-project');
      const lastSync = new Date(loaded.lastSync);

      expect(lastSync.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(lastSync.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    test('returns correct summary', async () => {
      await createTestConfig();
      const project = await createProject('Test Project', tempConfigDir);

      const summary = await syncProject(project);

      expect(summary.bundlesFound).toBe(5); // 2 node + 1 media + 1 paragraph + 1 taxonomy
      expect(summary.fieldsFound).toBe(3); // 2 on page + 1 on article
    });

    test('handles empty config directory', async () => {
      // Create empty config dir with just a placeholder yml
      await writeFile(join(tempConfigDir, 'placeholder.yml'), 'empty: true');

      const project = await createProject('Test Project', tempConfigDir);

      const summary = await syncProject(project);

      expect(summary.bundlesFound).toBe(0);
      expect(summary.fieldsFound).toBe(0);
    });

    test('handles partial configs', async () => {
      // Create a valid config and an invalid one
      await writeFile(join(tempConfigDir, 'node.type.good.yml'), `
langcode: en
status: true
name: Good
type: good
`);
      await writeFile(join(tempConfigDir, 'node.type.bad.yml'), 'invalid: yaml: content:');

      const project = await createProject('Test Project', tempConfigDir);

      // Should not throw, should skip bad file
      const summary = await syncProject(project);

      expect(summary.bundlesFound).toBe(1);
    });

    test('preserves existing project data', async () => {
      await createTestConfig();
      const project = await createProject('Test Project', tempConfigDir);

      await syncProject(project);

      const loaded = await loadProject('test-project');
      expect(loaded.name).toBe('Test Project');
      expect(loaded.slug).toBe('test-project');
      expect(loaded.configDirectory).toBe(tempConfigDir);
    });

    test('throws for invalid project', async () => {
      await expect(syncProject(null)).rejects.toThrow('Invalid project');
      await expect(syncProject({})).rejects.toThrow('Invalid project');
    });
  });

  describe('getSyncSummary', () => {
    test('returns zeros for unsynced project', () => {
      const project = { entities: null };
      const summary = getSyncSummary(project);

      expect(summary.totalBundles).toBe(0);
      expect(summary.totalFields).toBe(0);
    });

    test('counts bundles and fields correctly', async () => {
      await createTestConfig();
      const project = await createProject('Test Project', tempConfigDir);
      await syncProject(project);

      const loaded = await loadProject('test-project');
      const summary = getSyncSummary(loaded);

      expect(summary.node).toBe(2);
      expect(summary.media).toBe(1);
      expect(summary.paragraph).toBe(1);
      expect(summary.taxonomy_term).toBe(1);
      expect(summary.totalBundles).toBe(5);
      expect(summary.totalFields).toBe(3);
    });
  });
});
