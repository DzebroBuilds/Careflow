'use client';
import { useMemo, useState } from 'react';
import {
  credentialExpiryLabel,
  filterEmployees,
  nearestCredentialExpiry,
  openAssignment,
  type Employee,
  type EmployeeAssignment,
  type EmployeeCredential,
} from '@/lib/staff-directory';
import type { Home } from '@/lib/workspace';

// Connected staff directory: the same directory / search / home-filter
// interaction as the /people prototype, backed by Supabase rows instead of
// local seed data. Presentational only — the parent page loads the rows
// with the Supabase client (see src/app/people/page.tsx). Fictional-data
// only; no compensation, bank, tax, or SSN column is rendered here.
export default function StaffDirectory({
  employees,
  assignments,
  credentials,
  homes,
  homeId,
  onHomeChange,
  canManage,
}: {
  employees: Employee[];
  assignments: EmployeeAssignment[];
  credentials: EmployeeCredential[];
  homes: Home[];
  homeId: string;
  onHomeChange: (homeId: string) => void;
  canManage: boolean;
}) {
  const [query, setQuery] = useState('');
  const shown = useMemo(
    () => filterEmployees(employees, query, homeId === 'all' ? null : homeId),
    [employees, query, homeId],
  );
  const homeName = (id: string | null) => homes.find((h) => h.id === id)?.name ?? 'Unmapped';
  return (
    <section className="people-card">
      <div className="people-card-head">
        <h2>Employee directory</h2>
        <span>{shown.length} employees</span>
      </div>
      <div className="people-filters">
        <input aria-label="Search employees" placeholder="Search employees..." value={query} onChange={(e) => setQuery(e.target.value)} />
        <select aria-label="Filter home" value={homeId} onChange={(e) => onHomeChange(e.target.value)}>
          <option value="all">All homes</option>
          {homes.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}
        </select>
      </div>
      <div className="people-table-wrap">
        <table>
          <thead>
            <tr><th>Employee</th><th>Role</th><th>Home</th><th>Assignment</th><th>Credential expiry</th><th>Status</th></tr>
          </thead>
          <tbody>
            {shown.map((employee) => {
              const assignment = employee.home_id ? openAssignment(assignments, employee.id, employee.home_id) : null;
              const nearest = nearestCredentialExpiry(credentials, employee.id);
              return (
                <tr key={employee.id}>
                  <td><b>{employee.display_name}</b><small>{employee.external_source ? `${employee.external_source} · ${employee.external_id}` : employee.id}</small></td>
                  <td>{employee.role_text || '—'}</td>
                  <td>{homeName(employee.home_id)}</td>
                  <td>{assignment ? `${assignment.role} · since ${assignment.start_date}` : 'No open assignment'}</td>
                  <td>{nearest ? `${nearest.credential.credential_type} · ${nearest.credential.expiry_date} (${credentialExpiryLabel(nearest.status)})` : 'No expiry on file'}</td>
                  <td><span className={'people-status ' + (employee.status === 'active' ? 'active' : '')}>{employee.status}</span></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {shown.length === 0 && <p className="people-muted">No matching employees.</p>}
      {!canManage && <p className="people-footnote">You can view this directory. Only a home owner or admin can assign staff or record credentials.</p>}
      {employees.some((e) => e.status === 'unmapped') && <p className="people-footnote">Unmapped employees came from the Intuit sandbox sync and belong to no home yet. An owner maps each one to a home and a CareFlow user before it can be assigned.</p>}
    </section>
  );
}
