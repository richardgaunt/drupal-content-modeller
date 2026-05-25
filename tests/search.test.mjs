import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { execFile } from 'child_process';
import { promisify } from 'util';

import {
  parseSearchServers,
  parseSearchIndexes,
  parseSingleSearchIndex,
  parseSearchBoundViews
} from '../src/io/configReader.js';
import {
  generateSearchReportData,
  formatSearchReportMarkdown
} from '../src/generators/searchReport.js';
import { getIndexableProperties } from '../src/commands/search.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesPath = join(__dirname, 'fixtures');
const dcmPath = join(__dirname, '..', 'index.mjs');
const execFileAsync = promisify(execFile);

async function runDcm(...args) {
  const { stdout, stderr } = await execFileAsync('node', [dcmPath, ...args], {
    timeout: 10000,
    env: { ...process.env, NODE_ENV: 'test' }
  });
  return { stdout, stderr };
}

describe('Search Config Reader (I/O against fixtures)', () => {
  test('parseSearchServers reads the test server', async () => {
    const servers = await parseSearchServers(fixturesPath);
    expect(servers).toHaveLength(1);
    expect(servers[0].id).toBe('test_db');
    expect(servers[0].label).toBe('Test Database Server');
    expect(servers[0].backend).toBe('search_api_db');
    expect(servers[0].status).toBe(true);
  });

  test('parseSearchIndexes reads the test index with fields and bundles', async () => {
    const indexes = await parseSearchIndexes(fixturesPath);
    expect(indexes).toHaveLength(1);
    const index = indexes[0];
    expect(index.id).toBe('test_content');
    expect(index.server).toBe('test_db');
    expect(index.tracker).toBe('default');
    expect(index.bundles).toEqual(['test_page']);
    expect(index.languages.sort()).toEqual(['und', 'zxx']);
    expect(index.fieldCount).toBe(4);
  });

  test('parseSingleSearchIndex returns processed and nested-paragraph field paths', async () => {
    const index = await parseSingleSearchIndex(fixturesPath, 'test_content');
    expect(index).not.toBeNull();
    const body = index.fields.find(f => f.name === 'body');
    expect(body.propertyPath).toBe('field_body:processed');
    const panel = index.fields.find(f => f.name === 'panel_title');
    expect(panel.propertyPath).toBe('field_n_components:entity:field_p_title');
    expect(index.processors.map(p => p.id).sort()).toEqual(['add_url', 'html_filter', 'rendered_item']);
  });

  test('parseSingleSearchIndex returns null for unknown id', async () => {
    expect(await parseSingleSearchIndex(fixturesPath, 'nope')).toBeNull();
  });

  test('parseSearchBoundViews finds the search view with index + displays', async () => {
    const views = await parseSearchBoundViews(fixturesPath);
    expect(views).toHaveLength(1);
    const view = views[0];
    expect(view.id).toBe('test_search');
    expect(view.indexId).toBe('test_content');

    const def = view.displays.find(d => d.displayId === 'default');
    expect(def.exposedFilters.map(f => f.identifier)).toEqual(['keys']);
    expect(def.rowViewModes).toEqual([
      { datasourceId: 'entity:node', bundle: 'test_page', viewMode: 'teaser' }
    ]);

    const page = view.displays.find(d => d.displayId === 'page_1');
    expect(page.path).toBe('search');
  });
});

describe('Search Report Generator', () => {
  function buildSources() {
    return Promise.all([
      parseSearchServers(fixturesPath),
      parseSearchIndexes(fixturesPath),
      parseSearchBoundViews(fixturesPath)
    ]).then(([servers, indexes, views]) => ({ servers, indexes, views }));
  }

  test('generateSearchReportData groups views under their index', async () => {
    const sources = await buildSources();
    const data = generateSearchReportData({ slug: 'demo' }, sources, {});
    expect(data.project).toBe('demo');
    expect(data.summary.serverCount).toBe(1);
    expect(data.summary.indexCount).toBe(1);
    expect(data.summary.viewCount).toBe(1);

    const index = data.indexes[0];
    expect(index.id).toBe('test_content');
    expect(index.views).toHaveLength(1);
    expect(index.views[0].id).toBe('test_search');
  });

  test('formatSearchReportMarkdown renders servers, fields and views', async () => {
    const sources = await buildSources();
    const data = generateSearchReportData({ slug: 'demo' }, sources, {});
    const md = formatSearchReportMarkdown(data);
    expect(md).toContain('# Search API Configuration Report');
    expect(md).toContain('Test Database Server');
    expect(md).toContain('`field_body:processed`');
    expect(md).toContain('`field_n_components:entity:field_p_title`');
    expect(md).toContain('Search Views');
    expect(md).toContain('test_search');
  });

  test('formatSearchReportMarkdown handles empty config', () => {
    const data = generateSearchReportData({ slug: 'demo' }, { servers: [], indexes: [], views: [] }, {});
    const md = formatSearchReportMarkdown(data);
    expect(md).toContain('_No Search API servers defined._');
    expect(md).toContain('_No Search API indexes defined._');
  });
});

describe('getIndexableProperties (command orchestration)', () => {
  const project = {
    entities: {
      node: {
        page: {
          fields: {
            field_n_body: { name: 'field_n_body', label: 'Body', type: 'text_long', settings: {} },
            field_n_ref: {
              name: 'field_n_ref',
              label: 'Ref',
              type: 'entity_reference_revisions',
              settings: { handler_settings: { target_bundles: { card: 'card' } } }
            }
          }
        }
      },
      paragraph: {
        card: {
          fields: {
            field_p_title: { name: 'field_p_title', label: 'Card Title', type: 'string', settings: {} }
          }
        }
      }
    }
  };

  test('traverses an :entity: hop and emits :processed', () => {
    const props = getIndexableProperties(project, 'node', 'page', 2);
    const paths = props.map(p => p.propertyPath);
    expect(paths).toContain('field_n_body');
    expect(paths).toContain('field_n_body:processed');
    expect(paths).toContain('field_n_ref:entity:field_p_title');
  });
});

describe('Search CLI integration', () => {
  test('dcm search --help lists subcommands', async () => {
    const { stdout } = await runDcm('search', '--help');
    expect(stdout).toMatch(/server/);
    expect(stdout).toMatch(/index/);
    expect(stdout).toMatch(/view/);
    expect(stdout).toMatch(/indexable/);
  });

  test('dcm search index --help lists list/show/fields', async () => {
    const { stdout } = await runDcm('search', 'index', '--help');
    expect(stdout).toMatch(/list/);
    expect(stdout).toMatch(/show/);
    expect(stdout).toMatch(/fields/);
  });

  test('dcm report --help includes search subcommand', async () => {
    const { stdout } = await runDcm('report', '--help');
    expect(stdout).toMatch(/search/);
  });

  test('dcm search server list exits non-zero when --project missing', async () => {
    let err;
    try {
      await runDcm('search', 'server', 'list');
    } catch (e) {
      err = e;
    }
    expect(err).toBeDefined();
    const out = `${err.stderr || ''}${err.stdout || ''}`;
    expect(out).toMatch(/--project is required|required option/i);
  });

  test('dcm search indexable exits non-zero when --entity missing', async () => {
    let err;
    try {
      await runDcm('search', 'indexable', '-p', 'nope-project');
    } catch (e) {
      err = e;
    }
    expect(err).toBeDefined();
    const out = `${err.stderr || ''}${err.stdout || ''}`;
    expect(out).toMatch(/--entity|required option/i);
  });
});
