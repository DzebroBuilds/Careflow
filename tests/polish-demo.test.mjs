// Polish demo tests: landing-card deep links + workspace preload list.
// Node-only, no browser, no network, no API calls. Reads the source files
// as text and asserts on the mapping the landing page actually ships.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

// The six landing workspace cards, in display order. House oversight
// legitimately stays on /demo (Readiness center is the /demo default).
const expectedAreas = [
  ['Staff readiness', '/demo/staff'],
  ['Document follow-up', '/demo/ocr'],
  ['Open actions', '/demo?view=corrective-actions'],
  ['Weekly owner brief', '/demo?view=weekly-review'],
  ['House oversight', '/demo'],
  ['Review packets', '/demo?view=reports'],
];

// The nine lazily-loaded demo sections in src/components/workspace.tsx.
const expectedPreloads = [
  './operations-demo',
  './quickbooks-connection',
  './resident-workspace',
  './resident-document-editor',
  './connected-tools',
  './team-lab',
  './manager-chat',
  './compliance-tracker',
  './dashboard-views',
];

test('landing cards link to six distinct destinations', () => {
  const source = readFileSync(join(root, 'src/components/business-home.tsx'), 'utf8');
  const areasLine = source.split('\n').find((line) => line.startsWith('const areas='));
  assert.ok(areasLine, 'areas array not found in business-home.tsx');
  // Each area tuple ends with its destination href as the 4th element.
  const hrefs = [...areasLine.matchAll(/,'(\/demo[^']*)'\]/g)].map((m) => m[1]);
  assert.deepEqual(hrefs, expectedAreas.map(([, href]) => href));
  assert.equal(new Set(hrefs).size, 6, 'all six cards must have distinct hrefs');
  for (const [title] of expectedAreas) {
    assert.ok(areasLine.includes(`'${title}'`), `missing card: ${title}`);
  }
  assert.ok(
    source.includes('{areas.map(([icon,title,copy,href])=><Link href={href}'),
    'cards must render each area href, not a hard-coded /demo',
  );
  assert.ok(
    !source.includes('<Link href="/demo" className="site-area-card"'),
    'no card may hard-code /demo',
  );
});

test('workspace preload patch lists all nine dynamic sections', () => {
  const patch = readFileSync(join(root, 'workspace-preload.patch.txt'), 'utf8');
  for (const path of expectedPreloads) {
    assert.ok(
      patch.includes(`void import('${path}')`),
      `preload list is missing ${path}`,
    );
  }
  assert.ok(patch.includes('requestIdleCallback'), 'preload must be idle-time');
  assert.ok(patch.includes('setTimeout(preload,800)'), 'preload needs a setTimeout fallback');
});

test('compact loading skeleton keeps its accessible status', () => {
  const patch = readFileSync(join(root, 'workspace-preload.patch.txt'), 'utf8');
  // The patch quotes the OLD snippet verbatim, so check only the NEW
  // FeatureLoading block (between "New:" and "What changed and why:").
  const newBlock = patch.split('New:')[1].split('What changed and why:')[0];
  assert.ok(newBlock.includes('role="status"'), 'FeatureLoading must keep role=status');
  assert.ok(newBlock.includes('aria-live="polite"'), 'FeatureLoading must keep aria-live=polite');
  assert.ok(newBlock.includes('Loading workspace tools…'), 'screen-reader text must be kept');
  assert.ok(!newBlock.includes('<p>Loading workspace tools…</p>'), 'visible loading text must be removed');
  assert.ok(newBlock.includes('<span style='), 'text must be visually hidden, not deleted');
});
