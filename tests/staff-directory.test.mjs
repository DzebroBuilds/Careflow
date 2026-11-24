import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  credentialExpiryStatus,
  credentialExpiryLabel,
  nearestCredentialExpiry,
  filterEmployees,
  staffAccess,
  openAssignment,
  startAssignment,
  endAssignment,
  validateEmployeeInput,
  planIntuitSync,
  intuitExternalSource,
} from '../src/lib/staff-directory.ts';

const today = '2026-11-23';
const homeA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
const homeB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

function employee(overrides = {}) {
  return {
    id: 'e1', home_id: homeA, user_id: null, display_name: 'Jordan Lee', role_text: 'Care coordinator',
    hire_date: '2026-01-15', status: 'active', external_source: null, external_id: null,
    created_at: '2026-11-23T00:00:00.000Z', ...overrides,
  };
}

test('credential expiry buckets are 30 / 14 / 7 days, with expired and no-deadline cases', () => {
  assert.equal(credentialExpiryStatus('2026-12-23', today), 'due-30');
  assert.equal(credentialExpiryStatus('2026-12-24', today), 'ok');
  assert.equal(credentialExpiryStatus('2026-12-07', today), 'due-14');
  assert.equal(credentialExpiryStatus('2026-11-30', today), 'due-7');
  assert.equal(credentialExpiryStatus('2026-11-23', today), 'due-7');
  assert.equal(credentialExpiryStatus('2026-11-22', today), 'expired');
  assert.equal(credentialExpiryStatus(null, today), 'ok');
  assert.equal(credentialExpiryLabel('due-7'), 'Due within 7 days');
  assert.equal(credentialExpiryLabel('expired'), 'Expired');
});

test('nearest credential expiry picks the soonest deadline for one employee only', () => {
  const credentials = [
    { id: 'c1', employee_id: 'e1', credential_type: 'training', issued_date: '2026-01-01', expiry_date: '2026-12-20', evidence_record_id: null, created_at: today },
    { id: 'c2', employee_id: 'e1', credential_type: 'license', issued_date: '2026-01-01', expiry_date: '2026-11-28', evidence_record_id: null, created_at: today },
    { id: 'c3', employee_id: 'e2', credential_type: 'license', issued_date: '2026-01-01', expiry_date: '2026-11-24', evidence_record_id: null, created_at: today },
  ];
  const nearest = nearestCredentialExpiry(credentials, 'e1', today);
  assert.equal(nearest.credential.id, 'c2');
  assert.equal(nearest.status, 'due-7');
  assert.equal(nearest.days, 5);
  assert.equal(nearestCredentialExpiry(credentials, 'nobody', today), null);
});

test('ending an assignment retains history: the row stays, end_date is set, re-ending fails', () => {
  const assignments = [
    { id: 'a1', employee_id: 'e1', home_id: homeA, role: 'staff', start_date: '2026-01-15', end_date: null, assigned_by: 'owner', created_at: today },
  ];
  const ended = endAssignment(assignments, 'a1', '2026-11-23', 'owner');
  assert.equal(ended.length, 1);
  assert.equal(ended[0].end_date, '2026-11-23');
  assert.equal(ended[0].start_date, '2026-01-15');
  assert.throws(() => endAssignment(ended, 'a1', '2026-11-24', 'owner'), /already ended/);
  assert.throws(() => endAssignment(assignments, 'a1', '2026-01-01', 'owner'), /before start_date/);
  assert.throws(() => endAssignment(assignments, 'missing', '2026-11-23', 'owner'), /not found/);
  assert.equal(assignments[0].end_date, null);
});

test('a second open assignment at the same home is rejected, but a new one may start after the old one ends', () => {
  const assignments = [
    { id: 'a1', employee_id: 'e1', home_id: homeA, role: 'staff', start_date: '2026-01-15', end_date: null, assigned_by: 'owner', created_at: today },
  ];
  assert.equal(openAssignment(assignments, 'e1', homeA)?.id, 'a1');
  assert.equal(openAssignment(assignments, 'e1', homeB), null);
  assert.throws(
    () => startAssignment(assignments, { id: 'a2', employee_id: 'e1', home_id: homeA, role: 'staff', start_date: '2026-11-23', assigned_by: 'owner', created_at: today }),
    /already has an open assignment/,
  );
  const ended = endAssignment(assignments, 'a1', '2026-11-22', 'owner');
  const restarted = startAssignment(ended, { id: 'a2', employee_id: 'e1', home_id: homeA, role: 'admin', start_date: '2026-11-23', assigned_by: 'owner', created_at: today });
  assert.equal(restarted.length, 2);
  assert.equal(restarted[1].role, 'admin');
});

test('Intuit sync is idempotent: re-running inserts nothing and never duplicates the sandbox employees', () => {
  const incoming = [
    { id: '1', name: 'Sandbox One', active: true },
    { id: '2', name: 'Sandbox Two', active: true },
  ];
  const first = planIntuitSync([], incoming);
  assert.equal(first.toInsert.length, 2);
  assert.equal(first.toUpdate.length, 0);
  for (const row of first.toInsert) {
    assert.equal(row.status, 'unmapped');
    assert.equal(row.home_id, null);
    assert.equal(row.user_id, null);
    assert.equal(row.external_source, intuitExternalSource);
  }
  // Simulate the rows now existing, then run the same sync again.
  const second = planIntuitSync(first.toInsert, incoming);
  assert.equal(second.toInsert.length, 0);
  assert.equal(second.toUpdate.length, 0);
  assert.equal(second.unchanged.length, 2);
  // A renamed sandbox employee is an update, not a new row.
  const renamed = planIntuitSync(first.toInsert, [{ id: '1', name: 'Sandbox One Renamed', active: true }, incoming[1]]);
  assert.equal(renamed.toInsert.length, 0);
  assert.deepEqual(renamed.toUpdate, [{ id: first.toInsert[0].id, display_name: 'Sandbox One Renamed', status: 'unmapped' }]);
  // A deactivated mapped employee becomes inactive; an unmapped one stays unmapped.
  const mapped = [{ ...first.toInsert[0], status: 'active', home_id: homeA }];
  const deactivated = planIntuitSync(mapped, [{ id: '1', name: 'Sandbox One', active: false }]);
  assert.deepEqual(deactivated.toUpdate, [{ id: mapped[0].id, display_name: 'Sandbox One', status: 'inactive' }]);
  assert.throws(() => planIntuitSync([], [{ id: '1', name: 'A', active: true }, { id: '1', name: 'A', active: true }]), /same employee twice/);
});

test('home isolation: a removed member reads nothing, staff read only their own home', () => {
  assert.deepEqual(staffAccess(null), { read: false, write: false });
  assert.deepEqual(staffAccess('viewer'), { read: true, write: false });
  assert.deepEqual(staffAccess('staff'), { read: true, write: false });
  assert.deepEqual(staffAccess('admin'), { read: true, write: true });
  assert.deepEqual(staffAccess('owner'), { read: true, write: true });
  const rows = [employee({ id: 'e1', home_id: homeA }), employee({ id: 'e2', display_name: 'Morgan Rivera', home_id: homeB })];
  assert.deepEqual(filterEmployees(rows, '', homeA).map((e) => e.id), ['e1']);
  assert.deepEqual(filterEmployees(rows, 'morgan', null).map((e) => e.id), ['e2']);
  assert.deepEqual(filterEmployees(rows, 'care coordinator', null).map((e) => e.id), ['e1']);
  assert.deepEqual(filterEmployees(rows, 'no match', null), []);
});

test('employee input rejects compensation, bank, tax, and SSN fields outright', () => {
  assert.deepEqual(validateEmployeeInput({ display_name: ' Jordan Lee ', role_text: 'Care coordinator', hire_date: '2026-01-15' }), {
    display_name: 'Jordan Lee', role_text: 'Care coordinator', hire_date: '2026-01-15', status: 'active',
  });
  for (const bad of [
    { display_name: 'Jordan Lee', salary: 50000 },
    { display_name: 'Jordan Lee', compensation: 'hourly' },
    { display_name: 'Jordan Lee', bank_account: '123' },
    { display_name: 'Jordan Lee', ssn: '123-45-6789' },
    { display_name: 'Jordan Lee', tax_withholding: 'single' },
    { display_name: ' ' },
    { display_name: 'Jordan Lee', status: 'fired' },
    { display_name: 'Jordan Lee', hire_date: '15/01/2026' },
    { display_name: 'Jordan Lee', role_text: 'x'.repeat(121) },
  ]) assert.throws(() => validateEmployeeInput(bad));
});

test('migration creates the staff tables with RLS and no compensation columns', async () => {
  const sql = await readFile(new URL('../supabase/migrations/20261123130000_staff_directory.sql', import.meta.url), 'utf8');
  for (const required of [
    'create table public.employees',
    'create table public.employee_home_assignments',
    'create table public.employee_credentials',
    'employees_external_idx',
    'employee_assignments_open_idx',
    'enable row level security',
    'employee_read', 'employee_create', 'employee_update',
    'assignment_read', 'assignment_create', 'assignment_update',
    'credential_read', 'credential_create', 'credential_update',
    'audit_assignment',
    "'unmapped'",
  ]) assert.ok(sql.includes(required), `migration is missing: ${required}`);
  // Column-name tokens only: the migration's comments legitimately use
  // words like "compensation" and "salary" to say what is NOT stored, so
  // strip full-line SQL comments first, then assert no such column can
  // be created in the actual DDL.
  const ddl = sql.split('\n').filter((line) => !line.trimStart().startsWith('--')).join('\n').toLowerCase();
  for (const forbidden of ['salary', 'compensation', 'bank', 'ssn', 'social_security', 'tax_withholding', 'routing', 'pay_rate']) {
    assert.ok(!ddl.includes(forbidden), `migration DDL must not contain a ${forbidden} column`);
  }
});
