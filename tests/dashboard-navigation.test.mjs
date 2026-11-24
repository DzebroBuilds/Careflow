import test from 'node:test';
import assert from 'node:assert/strict';
import { navigation, sectionLabel } from '../src/lib/dashboard.ts';
import { sectionFromSearch, sectionHref } from '../src/lib/workspace-navigation.ts';
import { operationSections } from '../src/lib/operation-sections.ts';

// Section names are a stable API: ?view= slugs and the PR #46 landing-card
// deep-links are derived from them, so they must never change spelling or
// case. Only group membership and order may change.
const expected = {
  'Today': [
    ['Readiness center', 'Dashboard', 'grid'],
    ['Weekly review', 'Weekly owner review', 'clock'],
    ['Calendar', 'Calendar', 'calendar'],
    ['Approvals', 'Approvals', 'check'],
  ],
  'Care': [
    ['Residents', 'Residents & documents', 'people'],
    ['Medication records', 'Medication documentation', 'pill'],
    ['Incidents', 'Incidents & follow-up', 'warning'],
  ],
  'Documents': [
    ['Document reader', 'OCR document reader', 'file'],
    ['Inspection binder', 'Compliance documents', 'file'],
    ['Support Documents', 'Support Documents', 'folder'],
    ['Templates', 'Templates', 'printer'],
  ],
  'Compliance': [
    ['Corrective actions', 'Corrective actions', 'shield'],
    ['House checklist', 'House checklist', 'check'],
    ['Monthly reviews', 'Monthly reviews', 'clock'],
    ['Reports', 'Reports', 'chart'],
    ['Compliance tracker', 'Compliance & files', 'shield'],
  ],
  'People & staffing': [
    ['Staff orientation', 'Staff readiness & training', 'people'],
    ['Staff directory', 'Staff directory', 'people'],
    ['Shift coverage', 'Shift coverage', 'calendar'],
    ['Time approvals', 'Time approvals', 'clock'],
    ['Expenses', 'Expenses', 'chart'],
    ['Payroll preparation', 'Payroll preparation', 'chart'],
  ],
  'Administration': [
    ['Homes', 'Homes', 'home'],
    ['Settings', 'Access & settings', 'lock'],
    ['Activity history', 'Audit log', 'clock'],
    ['Connected tools', 'Connected tools', 'grid'],
    ['QuickBooks', 'Intuit QuickBooks', 'chart'],
    ['Help', 'Help & glossary', 'file'],
  ],
  'AI workspace': [
    ['Your team', 'AI manager', 'people'],
  ],
};

const slug = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, '-');

function groupOf(section) {
  const group = navigation.find((g) => g.items.some((item) => item[0] === section));
  assert.ok(group, `${section} is in navigation`);
  return group.group;
}

test('navigation has exactly seven groups with the expected names, in order', () => {
  assert.deepEqual(navigation.map((g) => g.group), Object.keys(expected));
});

test('all 29 sections appear exactly once, with their expected label and icon', () => {
  const seen = [];
  for (const [group, items] of Object.entries(expected)) {
    const actual = navigation.find((g) => g.group === group);
    assert.ok(actual, `group ${group} exists`);
    assert.deepEqual(
      actual.items.map((item) => [...item]),
      items.map((item) => [...item]),
      `items of ${group}`,
    );
    seen.push(...items.map((item) => item[0]));
  }
  assert.equal(seen.length, 29);
  assert.equal(new Set(seen).size, 29);
});

test('no group is empty or overloaded: every group has 1–6 items', () => {
  for (const group of navigation) {
    assert.ok(group.items.length >= 1, `${group.group} is empty`);
    assert.ok(group.items.length <= 6, `${group.group} has ${group.items.length} items`);
  }
});

test('every section resolves from its ?view= slug, and unknown slugs fall back', () => {
  const sections = navigation.flatMap((g) => g.items.map((item) => item[0]));
  const slugs = sections.map(slug);
  assert.equal(new Set(slugs).size, slugs.length, 'slugs do not collide');
  for (const section of sections) {
    assert.equal(sectionFromSearch(`?view=${slug(section)}`, 'Readiness center'), section);
    assert.equal(sectionHref('/demo', '', section), `/demo?view=${slug(section)}`);
  }
  assert.equal(sectionFromSearch('?view=no-such-section', 'Readiness center'), 'Readiness center');
  assert.equal(sectionFromSearch('', 'Readiness center'), 'Readiness center');
});

test('every operation section is in navigation and the combined section list has no duplicates', () => {
  assert.deepEqual([...operationSections], [
    'Staff directory', 'Shift coverage', 'Time approvals', 'Expenses', 'Payroll preparation',
  ]);
  for (const section of operationSections) {
    assert.equal(groupOf(section), 'People & staffing');
  }
  const combined = [...new Set([...navigation.flatMap((g) => g.items.map((i) => i[0])), ...operationSections])];
  assert.equal(combined.length, 29, 'navigation + operation sections deduplicate to 29');
});

test('the old orphaned layout is gone', () => {
  const groups = navigation.map((g) => g.group);
  assert.ok(!groups.includes('Overview'), 'Overview group is gone');
  assert.ok(!groups.includes('Operations'), 'Operations group is gone');
  assert.ok(!groups.includes('People'), 'single-item People group is gone');
  assert.equal(groupOf('Compliance tracker'), 'Compliance');
  assert.equal(groupOf('Document reader'), 'Documents');
  assert.equal(groupOf('Staff orientation'), 'People & staffing');
  assert.equal(groupOf('Your team'), 'AI workspace');
});

test('sectionLabel behaviour is unchanged (workspaceLabels overrides still apply)', () => {
  assert.equal(sectionLabel('Readiness center'), 'Today');
  assert.equal(sectionLabel('Staff directory'), 'People');
  assert.equal(sectionLabel('Shift coverage'), 'Schedule');
  assert.equal(sectionLabel('Time approvals'), 'Time & approvals');
  assert.equal(sectionLabel('Your team'), 'AI manager');
});
