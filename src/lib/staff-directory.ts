// CareFlow staff directory — pure helpers shared by the /people UI and the
// Node tests (tests/staff-directory.test.mjs). No Supabase client, no
// network, no secrets here: callers load rows with the Supabase client and
// pass them in. Fictional-data only; never store compensation, bank, tax,
// or SSN data in any of these shapes.

export type EmployeeStatus = 'active' | 'inactive' | 'unmapped';
export type CredentialType = 'orientation' | 'training' | 'license' | 'other';
export type HomeRole = 'owner' | 'admin' | 'staff' | 'viewer';

export const employeeStatuses: readonly EmployeeStatus[] = ['active', 'inactive', 'unmapped'];
export const credentialTypes: readonly CredentialType[] = ['orientation', 'training', 'license', 'other'];
export const intuitExternalSource = 'intuit_sandbox';

export type Employee = {
  id: string;
  home_id: string | null;
  user_id: string | null;
  display_name: string;
  role_text: string;
  hire_date: string | null;
  status: EmployeeStatus;
  external_source: string | null;
  external_id: string | null;
  created_at: string;
};

export type EmployeeAssignment = {
  id: string;
  employee_id: string;
  home_id: string;
  role: 'admin' | 'staff' | 'viewer';
  start_date: string;
  end_date: string | null;
  assigned_by: string | null;
  created_at: string;
};

export type EmployeeCredential = {
  id: string;
  employee_id: string;
  credential_type: CredentialType;
  issued_date: string | null;
  expiry_date: string | null;
  evidence_record_id: string | null;
  created_at: string;
};

/** A validated Intuit employee row, as returned by employeeSummary() in
 *  supabase/functions/careflow-quickbooks/employees.mjs. */
export type IntuitEmployee = { id: string; name: string; active: boolean };

export type CredentialExpiryStatus = 'expired' | 'due-7' | 'due-14' | 'due-30' | 'ok';

const datePattern = /^\d{4}-\d{2}-\d{2}$/;

export function localDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** Whole days from `today` until `date`, parsed as UTC midnights so the
 *  result does not depend on the viewer's timezone. */
export function daysUntil(date: string, today: string = localDate()): number {
  if (!datePattern.test(date) || !datePattern.test(today)) throw new Error('Dates must be YYYY-MM-DD.');
  const ms = Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}

/** Credential expiry bucket, matching the reminder windows in the core
 *  workflows plan (30 / 14 / 7 days). A null expiry has no deadline. */
export function credentialExpiryStatus(expiryDate: string | null, today: string = localDate()): CredentialExpiryStatus {
  if (!expiryDate) return 'ok';
  const days = daysUntil(expiryDate, today);
  if (days < 0) return 'expired';
  if (days <= 7) return 'due-7';
  if (days <= 14) return 'due-14';
  if (days <= 30) return 'due-30';
  return 'ok';
}

export function credentialExpiryLabel(status: CredentialExpiryStatus): string {
  return status === 'expired' ? 'Expired'
    : status === 'due-7' ? 'Due within 7 days'
    : status === 'due-14' ? 'Due within 14 days'
    : status === 'due-30' ? 'Due within 30 days'
    : 'Current';
}

/** The nearest (soonest) credential expiry for one employee, or null. */
export function nearestCredentialExpiry(
  credentials: EmployeeCredential[],
  employeeId: string,
  today: string = localDate(),
): { credential: EmployeeCredential; status: CredentialExpiryStatus; days: number } | null {
  let nearest: { credential: EmployeeCredential; status: CredentialExpiryStatus; days: number } | null = null;
  for (const credential of credentials) {
    if (credential.employee_id !== employeeId || !credential.expiry_date) continue;
    const days = daysUntil(credential.expiry_date, today);
    if (!nearest || days < nearest.days) nearest = { credential, status: credentialExpiryStatus(credential.expiry_date, today), days };
  }
  return nearest;
}

/** Directory search: name, role, or id. Home filter is exact; 'All homes'
 *  (or null) keeps every row. Mirrors the /people prototype filters. */
export function filterEmployees(employees: Employee[], query: string, homeId: string | null): Employee[] {
  const needle = query.trim().toLowerCase();
  return employees.filter((employee) =>
    (homeId === null || employee.home_id === homeId)
    && (!needle || `${employee.display_name} ${employee.role_text} ${employee.id}`.toLowerCase().includes(needle)));
}

/** Read/write access for one home, from the caller's home_members role
 *  (null = no membership, e.g. a removed member). Staff and viewers read
 *  their own home only; only owner/admin write. */
export function staffAccess(homeRole: HomeRole | null): { read: boolean; write: boolean } {
  return { read: homeRole !== null, write: homeRole === 'owner' || homeRole === 'admin' };
}

/** The open assignment for one employee at one home, if any. */
export function openAssignment(
  assignments: EmployeeAssignment[],
  employeeId: string,
  homeId: string,
): EmployeeAssignment | null {
  return assignments.find((a) => a.employee_id === employeeId && a.home_id === homeId && a.end_date === null) ?? null;
}

/** Start an assignment. Throws if an open assignment already exists for
 *  that employee and home (the database partial unique index enforces the
 *  same rule). The caller inserts the returned row; this function never
 *  deletes or rewrites an existing row. */
export function startAssignment(
  assignments: EmployeeAssignment[],
  input: { id: string; employee_id: string; home_id: string; role: EmployeeAssignment['role']; start_date: string; assigned_by: string | null; created_at: string },
): EmployeeAssignment[] {
  if (!datePattern.test(input.start_date)) throw new Error('start_date must be YYYY-MM-DD.');
  if (openAssignment(assignments, input.employee_id, input.home_id)) {
    throw new Error('Employee already has an open assignment at this home. End it before starting a new one.');
  }
  return [...assignments, { ...input, end_date: null }];
}

/** End an assignment by setting end_date. The row — and every earlier
 *  assignment — stays in the list: history is retained, never deleted. */
export function endAssignment(
  assignments: EmployeeAssignment[],
  assignmentId: string,
  endDate: string,
  assignedBy: string | null,
): EmployeeAssignment[] {
  if (!datePattern.test(endDate)) throw new Error('end_date must be YYYY-MM-DD.');
  let found = false;
  const next = assignments.map((assignment) => {
    if (assignment.id !== assignmentId) return assignment;
    found = true;
    if (assignment.end_date !== null) throw new Error('Assignment has already ended.');
    if (endDate < assignment.start_date) throw new Error('end_date cannot be before start_date.');
    return { ...assignment, end_date: endDate, assigned_by: assignedBy };
  });
  if (!found) throw new Error('Assignment not found.');
  return next;
}

const compensationKeys = /salary|compensation|pay_rate|hourly_rate|bank|ssn|social_security|tax_withholding|routing|account_number/i;

/** Validate a new-employee form value before insert. Rejects compensation,
 *  bank, tax, and SSN fields outright — CareFlow v1 must never store them. */
export function validateEmployeeInput(input: unknown): { display_name: string; role_text: string; hire_date: string | null; status: EmployeeStatus } {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('Employee input must be an object.');
  for (const key of Object.keys(input)) {
    if (compensationKeys.test(key)) throw new Error(`Field "${key}" is not stored in CareFlow. Payroll data stays with the payroll provider.`);
  }
  const value = input as Record<string, unknown>;
  const displayName = typeof value.display_name === 'string' ? value.display_name.trim() : '';
  if (displayName.length < 1 || displayName.length > 200) throw new Error('display_name must be 1-200 characters.');
  const roleText = typeof value.role_text === 'string' ? value.role_text.trim() : '';
  if (roleText.length > 120) throw new Error('role_text must be at most 120 characters.');
  const hireDate = value.hire_date === null || value.hire_date === undefined ? null : value.hire_date;
  if (hireDate !== null && (typeof hireDate !== 'string' || !datePattern.test(hireDate))) throw new Error('hire_date must be YYYY-MM-DD or null.');
  const status = value.status === undefined ? 'active' : value.status;
  if (status !== 'active' && status !== 'inactive' && status !== 'unmapped') throw new Error("status must be 'active', 'inactive', or 'unmapped'.");
  return { display_name: displayName, role_text: roleText, hire_date: hireDate, status };
}

export type IntuitSyncPlan = {
  toInsert: Employee[];
  toUpdate: { id: string; display_name: string; status: EmployeeStatus }[];
  unchanged: Employee[];
};

/** Plan an Intuit sandbox sync into employees rows. Keyed on
 *  (external_source, external_id), so re-running the same sync inserts
 *  nothing: the 2 sandbox employees stay 2 rows. New rows are created
 *  with status 'unmapped', no home, and no CareFlow user until an owner
 *  explicitly maps them. A name change, or an Active flag change on a
 *  mapped row, is an update; an unmapped row keeps status 'unmapped'
 *  even if its Active flag changes. */
export function planIntuitSync(existing: Employee[], incoming: IntuitEmployee[]): IntuitSyncPlan {
  const byExternalId = new Map(existing.filter((e) => e.external_source === intuitExternalSource && e.external_id !== null).map((e) => [e.external_id as string, e]));
  const seen = new Set<string>();
  const plan: IntuitSyncPlan = { toInsert: [], toUpdate: [], unchanged: [] };
  for (const row of incoming) {
    if (seen.has(row.id)) throw new Error('Intuit returned the same employee twice. Retry the sync.');
    seen.add(row.id);
    const previous = byExternalId.get(row.id);
    if (!previous) {
      plan.toInsert.push({
        id: `intuit-${row.id}`,
        home_id: null,
        user_id: null,
        display_name: row.name,
        role_text: '',
        hire_date: null,
        status: 'unmapped',
        external_source: intuitExternalSource,
        external_id: row.id,
        created_at: new Date().toISOString(),
      });
      continue;
    }
    const nextStatus: EmployeeStatus = previous.status === 'unmapped' ? 'unmapped' : row.active ? 'active' : 'inactive';
    if (previous.display_name !== row.name || previous.status !== nextStatus) {
      plan.toUpdate.push({ id: previous.id, display_name: row.name, status: nextStatus });
    } else {
      plan.unchanged.push(previous);
    }
  }
  return plan;
}
