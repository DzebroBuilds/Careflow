# Proposed database schema + role matrix

**Status: AWAITING APPROVAL — do not run `prisma migrate` until signed off.**

This document is the contract for Step 1. After approval we will materialize it as `prisma/schema.prisma` + SQL RLS policies and migrate.

---

## Design decisions (reversible vs not)

| Decision | Proposal | Reversibility |
|----------|----------|---------------|
| Tenant key | `organization_id` UUID on every tenant table | Hard once data lands |
| Soft delete | `deleted_at` on residents, homes, users, docs | Medium |
| Money | Stripe IDs on `HomeSubscription`; no card data in DB | Medium |
| IDs | UUID v4 primary keys everywhere | Hard |
| Naming | Prisma camelCase models; DB `snake_case` via `@map` | Medium |
| Audit | Append-only `audit_events`; app sets `app.current_org_id` / `app.current_user_id` session vars for RLS | Hard once product depends on it |
| Compliance score | Computed at read time initially (view or service); optional `home_compliance_snapshots` later | Easy |

---

## Open choices — please decide before migrate

1. **Auth provider:** Auth.js (credentials + TOTP MFA) vs AWS Cognito vs Clerk? Affects `users` / session tables.
2. **Billing in v1 schema:** Include Stripe subscription tables now, or stub `Home.subscriptionStatus` enum only?
3. **Resident external IDs:** Store ODDS/eXPRS client number as a field, or internal UUID only?
4. **Project path:** `C:\Users\Dawit\Projects\oregon-compliance-tracker` OK?

---

## Entity overview

```
Organization 1──* Home 1──* Resident
      │              │
      │              ├──* Medication ──* MedicationOrderReview
      │              ├──* Incident
      │              ├──* ComplianceDocument
      │              ├──* RiskChangeForm
      │              ├──* MonthlyTrackingPeriod ──* MonthlyTrackingItem
      │              ├──* HouseChecklistRun ──* HouseChecklistItem
      │              └──* HomeSubscription
      │
      ├──* Membership (User ↔ Org + Role)
      ├──* StaffProfile ──* StaffCredential / StaffTraining
      └──* AuditEvent
```

Global (non-tenant): `User` (login identity). Tenant binding is `Membership`.

---

## Enums

```prisma
enum Role {
  OWNER
  MANAGER
  DSP
  AUDITOR
}

enum SubscriptionStatus {
  TRIALING
  ACTIVE
  PAST_DUE
  CANCELED
  UNPAID
}

enum CredentialType {
  CPR_FIRST_AID
  MEDICATION_ADMIN
  CRIMINAL_HISTORY_CHECK
  DRIVER_LICENSE
  FOOD_HANDLER
  OTHER
}

enum TrainingType {
  ODDS_CORE
  ISP_SPECIFIC
  BEHAVIOR_SUPPORT
  ABUSE_NEGLECT
  EMERGENCY_PREPAREDNESS
  OTHER
}

enum IncidentSeverity {
  LOW
  MEDIUM
  HIGH
  CRITICAL
}

enum IncidentStatus {
  DRAFT
  SUBMITTED
  UNDER_REVIEW
  CLOSED
}

enum DocumentType {
  LICENSE
  POLICY
  INSPECTION
  FIRE_SAFETY
  INSURANCE
  OTHER
}

enum ReviewStatus {
  PENDING
  COMPLETE
  OVERDUE
}

enum ChecklistItemStatus {
  PASS
  FAIL
  NA
  PENDING
}

enum AuditAction {
  VIEW
  CREATE
  UPDATE
  DELETE
  EXPORT
}

enum AttentionSeverity {
  OVERDUE
  DUE_SOON
  INFO
}
```

---

## Tables (Prisma-shaped)

### Identity & tenancy

```prisma
model User {
  id             String    @id @default(uuid()) @db.Uuid
  email          String    @unique @db.Citext
  name           String?
  passwordHash   String?   @map("password_hash") // null if SSO-only
  mfaEnabled     Boolean   @default(false) @map("mfa_enabled")
  mfaSecretEnc   String?   @map("mfa_secret_enc") // encrypted at rest; never log
  emailVerifiedAt DateTime? @map("email_verified_at")
  lastLoginAt    DateTime? @map("last_login_at")
  deletedAt      DateTime? @map("deleted_at")
  createdAt      DateTime  @default(now()) @map("created_at")
  updatedAt      DateTime  @updatedAt @map("updated_at")

  memberships Membership[]
  auditEvents AuditEvent[] @relation("Actor")

  @@map("users")
}

model Organization {
  id        String    @id @default(uuid()) @db.Uuid
  name      String
  slug      String    @unique
  timezone  String    @default("America/Los_Angeles")
  deletedAt DateTime? @map("deleted_at")
  createdAt DateTime  @default(now()) @map("created_at")
  updatedAt DateTime  @updatedAt @map("updated_at")

  memberships Membership[]
  homes       Home[]
  // ...all tenant children via organizationId

  @@map("organizations")
}

model Membership {
  id             String    @id @default(uuid()) @db.Uuid
  organizationId String    @map("organization_id") @db.Uuid
  userId         String    @map("user_id") @db.Uuid
  role           Role
  // Optional home scope: null = all homes in org (typical for OWNER/AUDITOR)
  homeId         String?   @map("home_id") @db.Uuid
  invitedAt      DateTime? @map("invited_at")
  acceptedAt     DateTime? @map("accepted_at")
  deletedAt      DateTime? @map("deleted_at")
  createdAt      DateTime  @default(now()) @map("created_at")
  updatedAt      DateTime  @updatedAt @map("updated_at")

  organization Organization @relation(fields: [organizationId], references: [id])
  user         User         @relation(fields: [userId], references: [id])
  home         Home?        @relation(fields: [homeId], references: [id])

  @@unique([organizationId, userId, homeId])
  @@index([organizationId])
  @@map("memberships")
}
```

### Homes & billing

```prisma
model Home {
  id               String    @id @default(uuid()) @db.Uuid
  organizationId   String    @map("organization_id") @db.Uuid
  name             String
  licenseNumber    String?   @map("license_number")
  addressLine1     String?   @map("address_line1")
  addressLine2     String?   @map("address_line2")
  city             String?
  state            String    @default("OR")
  postalCode       String?   @map("postal_code")
  capacity         Int?
  isActive         Boolean   @default(true) @map("is_active")
  deletedAt        DateTime? @map("deleted_at")
  createdAt        DateTime  @default(now()) @map("created_at")
  updatedAt        DateTime  @updatedAt @map("updated_at")

  organization Organization @relation(...)
  subscription HomeSubscription?
  residents    Resident[]
  // staff assignments, incidents, docs, etc.

  @@index([organizationId])
  @@map("homes")
}

model HomeSubscription {
  id                   String             @id @default(uuid()) @db.Uuid
  organizationId       String             @map("organization_id") @db.Uuid
  homeId               String             @unique @map("home_id") @db.Uuid
  status               SubscriptionStatus @default(TRIALING)
  stripeCustomerId     String?            @map("stripe_customer_id")
  stripeSubscriptionId String?            @map("stripe_subscription_id")
  stripePriceId        String?            @map("stripe_price_id")
  currentPeriodStart   DateTime?          @map("current_period_start")
  currentPeriodEnd     DateTime?          @map("current_period_end")
  cancelAtPeriodEnd    Boolean            @default(false) @map("cancel_at_period_end")
  createdAt            DateTime           @default(now()) @map("created_at")
  updatedAt            DateTime           @updatedAt @map("updated_at")

  @@index([organizationId])
  @@map("home_subscriptions")
}
```

### Residents (PHI — audited)

```prisma
model Resident {
  id               String    @id @default(uuid()) @db.Uuid
  organizationId   String    @map("organization_id") @db.Uuid
  homeId           String    @map("home_id") @db.Uuid
  // Display initials or preferred name for UI; legal name restricted
  preferredName    String    @map("preferred_name")
  legalNameEnc     String?   @map("legal_name_enc") // optional encrypted
  dateOfBirth      DateTime? @map("date_of_birth") @db.Date
  externalClientId String?   @map("external_client_id") // ODDS/eXPRS — open question
  moveInDate       DateTime? @map("move_in_date") @db.Date
  moveOutDate      DateTime? @map("move_out_date") @db.Date
  isActive         Boolean   @default(true) @map("is_active")
  deletedAt        DateTime? @map("deleted_at")
  createdAt        DateTime  @default(now()) @map("created_at")
  updatedAt        DateTime  @updatedAt @map("updated_at")

  @@index([organizationId, homeId])
  @@map("residents")
}
```

### Staff credentials & training

```prisma
model StaffProfile {
  id             String    @id @default(uuid()) @db.Uuid
  organizationId String    @map("organization_id") @db.Uuid
  userId         String?   @map("user_id") @db.Uuid // null if tracked person has no login
  homeId         String?   @map("home_id") @db.Uuid // primary home; null = floats
  displayName    String    @map("display_name")
  jobTitle       String?   @map("job_title")
  hireDate       DateTime? @map("hire_date") @db.Date
  isActive       Boolean   @default(true) @map("is_active")
  deletedAt      DateTime? @map("deleted_at")
  createdAt      DateTime  @default(now()) @map("created_at")
  updatedAt      DateTime  @updatedAt @map("updated_at")

  credentials StaffCredential[]
  trainings   StaffTraining[]

  @@index([organizationId])
  @@map("staff_profiles")
}

model StaffCredential {
  id             String         @id @default(uuid()) @db.Uuid
  organizationId String         @map("organization_id") @db.Uuid
  staffProfileId String         @map("staff_profile_id") @db.Uuid
  type           CredentialType
  label          String?
  issuedOn       DateTime?      @map("issued_on") @db.Date
  expiresOn      DateTime?      @map("expires_on") @db.Date
  documentId     String?        @map("document_id") @db.Uuid
  notes          String?
  createdAt      DateTime       @default(now()) @map("created_at")
  updatedAt      DateTime       @updatedAt @map("updated_at")

  @@index([organizationId, expiresOn])
  @@map("staff_credentials")
}

model StaffTraining {
  id             String       @id @default(uuid()) @db.Uuid
  organizationId String       @map("organization_id") @db.Uuid
  staffProfileId String       @map("staff_profile_id") @db.Uuid
  type           TrainingType
  title          String
  completedOn    DateTime?    @map("completed_on") @db.Date
  expiresOn      DateTime?    @map("expires_on") @db.Date
  hours          Decimal?     @db.Decimal(5, 2)
  documentId     String?      @map("document_id") @db.Uuid
  createdAt      DateTime     @default(now()) @map("created_at")
  updatedAt      DateTime     @updatedAt @map("updated_at")

  @@index([organizationId, expiresOn])
  @@map("staff_trainings")
}
```

### Medications & order reviews

```prisma
model Medication {
  id               String    @id @default(uuid()) @db.Uuid
  organizationId   String    @map("organization_id") @db.Uuid
  homeId           String    @map("home_id") @db.Uuid
  residentId       String    @map("resident_id") @db.Uuid
  name             String
  dosage           String?
  route            String?
  frequency        String?
  prescribingMd    String?   @map("prescribing_md")
  isActive         Boolean   @default(true) @map("is_active")
  startDate        DateTime? @map("start_date") @db.Date
  endDate          DateTime? @map("end_date") @db.Date
  createdAt        DateTime  @default(now()) @map("created_at")
  updatedAt        DateTime  @updatedAt @map("updated_at")

  reviews MedicationOrderReview[]

  @@index([organizationId, residentId])
  @@map("medications")
}

model MedicationOrderReview {
  id             String       @id @default(uuid()) @db.Uuid
  organizationId String       @map("organization_id") @db.Uuid
  medicationId   String       @map("medication_id") @db.Uuid
  homeId         String       @map("home_id") @db.Uuid
  residentId     String       @map("resident_id") @db.Uuid
  dueOn          DateTime     @map("due_on") @db.Date
  completedOn    DateTime?    @map("completed_on") @db.Date
  status         ReviewStatus @default(PENDING)
  reviewedById   String?      @map("reviewed_by_id") @db.Uuid
  notes          String?
  createdAt      DateTime     @default(now()) @map("created_at")
  updatedAt      DateTime     @updatedAt @map("updated_at")

  @@index([organizationId, dueOn, status])
  @@map("medication_order_reviews")
}
```

### Incidents

```prisma
model Incident {
  id             String           @id @default(uuid()) @db.Uuid
  organizationId String           @map("organization_id") @db.Uuid
  homeId         String           @map("home_id") @db.Uuid
  residentId     String?          @map("resident_id") @db.Uuid
  title          String
  description    String
  occurredAt     DateTime         @map("occurred_at")
  severity       IncidentSeverity
  status         IncidentStatus   @default(DRAFT)
  reportedById   String?          @map("reported_by_id") @db.Uuid
  closedAt       DateTime?        @map("closed_at")
  createdAt      DateTime         @default(now()) @map("created_at")
  updatedAt      DateTime         @updatedAt @map("updated_at")

  @@index([organizationId, homeId, occurredAt])
  @@map("incidents")
}
```

### Compliance documents

```prisma
model ComplianceDocument {
  id             String       @id @default(uuid()) @db.Uuid
  organizationId String       @map("organization_id") @db.Uuid
  homeId         String?      @map("home_id") @db.Uuid // null = org-wide
  type           DocumentType
  title          String
  storageKey     String       @map("storage_key") // S3 key; no PHI in filename
  mimeType       String       @map("mime_type")
  byteSize       Int          @map("byte_size")
  effectiveOn    DateTime?    @map("effective_on") @db.Date
  expiresOn      DateTime?    @map("expires_on") @db.Date
  uploadedById   String?      @map("uploaded_by_id") @db.Uuid
  deletedAt      DateTime?    @map("deleted_at")
  createdAt      DateTime     @default(now()) @map("created_at")
  updatedAt      DateTime     @updatedAt @map("updated_at")

  @@index([organizationId, expiresOn])
  @@map("compliance_documents")
}
```

### Risk change forms

```prisma
model RiskChangeForm {
  id             String    @id @default(uuid()) @db.Uuid
  organizationId String    @map("organization_id") @db.Uuid
  homeId         String    @map("home_id") @db.Uuid
  residentId     String    @map("resident_id") @db.Uuid
  summary        String
  changeDetails  String    @map("change_details")
  effectiveOn    DateTime  @map("effective_on") @db.Date
  submittedAt    DateTime? @map("submitted_at")
  submittedById  String?   @map("submitted_by_id") @db.Uuid
  acknowledgedAt DateTime? @map("acknowledged_at")
  createdAt      DateTime  @default(now()) @map("created_at")
  updatedAt      DateTime  @updatedAt @map("updated_at")

  @@index([organizationId, homeId])
  @@map("risk_change_forms")
}
```

### Monthly tracking

```prisma
model MonthlyTrackingPeriod {
  id             String   @id @default(uuid()) @db.Uuid
  organizationId String   @map("organization_id") @db.Uuid
  homeId         String   @map("home_id") @db.Uuid
  yearMonth      String   @map("year_month") // "2026-10"
  dueOn          DateTime @map("due_on") @db.Date
  completedAt    DateTime? @map("completed_at")
  createdAt      DateTime @default(now()) @map("created_at")
  updatedAt      DateTime @updatedAt @map("updated_at")

  items MonthlyTrackingItem[]

  @@unique([homeId, yearMonth])
  @@index([organizationId])
  @@map("monthly_tracking_periods")
}

model MonthlyTrackingItem {
  id             String    @id @default(uuid()) @db.Uuid
  organizationId String    @map("organization_id") @db.Uuid
  periodId       String    @map("period_id") @db.Uuid
  label          String
  isComplete     Boolean   @default(false) @map("is_complete")
  completedAt    DateTime? @map("completed_at")
  notes          String?
  createdAt      DateTime  @default(now()) @map("created_at")
  updatedAt      DateTime  @updatedAt @map("updated_at")

  @@index([organizationId, periodId])
  @@map("monthly_tracking_items")
}
```

### House checklist

```prisma
model HouseChecklistTemplate {
  id             String   @id @default(uuid()) @db.Uuid
  organizationId String   @map("organization_id") @db.Uuid
  homeId         String?  @map("home_id") @db.Uuid // null = org default
  name           String
  isActive       Boolean  @default(true) @map("is_active")
  createdAt      DateTime @default(now()) @map("created_at")
  updatedAt      DateTime @updatedAt @map("updated_at")

  templateItems HouseChecklistTemplateItem[]

  @@index([organizationId])
  @@map("house_checklist_templates")
}

model HouseChecklistTemplateItem {
  id             String   @id @default(uuid()) @db.Uuid
  organizationId String   @map("organization_id") @db.Uuid
  templateId     String   @map("template_id") @db.Uuid
  sortOrder      Int      @map("sort_order")
  label          String
  isRequired     Boolean  @default(true) @map("is_required")
  createdAt      DateTime @default(now()) @map("created_at")

  @@map("house_checklist_template_items")
}

model HouseChecklistRun {
  id             String    @id @default(uuid()) @db.Uuid
  organizationId String    @map("organization_id") @db.Uuid
  homeId         String    @map("home_id") @db.Uuid
  templateId     String    @map("template_id") @db.Uuid
  runOn          DateTime  @map("run_on") @db.Date
  completedAt    DateTime? @map("completed_at")
  completedById  String?   @map("completed_by_id") @db.Uuid
  createdAt      DateTime  @default(now()) @map("created_at")
  updatedAt      DateTime  @updatedAt @map("updated_at")

  items HouseChecklistItem[]

  @@index([organizationId, homeId, runOn])
  @@map("house_checklist_runs")
}

model HouseChecklistItem {
  id             String              @id @default(uuid()) @db.Uuid
  organizationId String              @map("organization_id") @db.Uuid
  runId          String              @map("run_id") @db.Uuid
  label          String
  status         ChecklistItemStatus @default(PENDING)
  notes          String?
  createdAt      DateTime            @default(now()) @map("created_at")
  updatedAt      DateTime            @updatedAt @map("updated_at")

  @@map("house_checklist_items")
}
```

### Audit log (append-only)

```prisma
model AuditEvent {
  id             String      @id @default(uuid()) @db.Uuid
  organizationId String      @map("organization_id") @db.Uuid
  actorUserId    String?     @map("actor_user_id") @db.Uuid
  action         AuditAction
  resourceType   String      @map("resource_type") // e.g. "resident", "medication"
  resourceId     String?     @map("resource_id") @db.Uuid
  // Never store raw PHI in metadata — IDs, field names, counts only
  metadata       Json        @default("{}")
  ipAddress      String?     @map("ip_address")
  userAgent      String?     @map("user_agent")
  createdAt      DateTime    @default(now()) @map("created_at")

  @@index([organizationId, createdAt])
  @@index([organizationId, resourceType, resourceId])
  @@map("audit_events")
}
```

---

## Postgres RLS strategy

1. Enable RLS on every table that has `organization_id`.
2. Policy pattern (SELECT/INSERT/UPDATE/DELETE):

```sql
USING (organization_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid)
WITH CHECK (organization_id = NULLIF(current_setting('app.current_org_id', true), '')::uuid)
```

3. App connection role: non-superuser `oct_app` — cannot bypass RLS.
4. Migrations / admin role: `oct_owner` for Prisma migrate only.
5. Session setup on each request: `SET LOCAL app.current_org_id` and `app.current_user_id`.
6. `audit_events`: INSERT allowed for org; UPDATE/DELETE denied for app role.
7. Defense in depth: Prisma middleware also injects `organizationId` on every query.

---

## Role permission matrix

| Capability | Owner | Manager | DSP | Auditor |
|------------|:-----:|:-------:|:---:|:-------:|
| Manage billing / subscriptions | CRUD | — | — | — |
| Manage org settings | CRUD | R | — | R |
| Invite/remove users & assign roles | CRUD | CRU (no Owner role) | — | — |
| Homes | CRUD | CRU | R (assigned) | R |
| Residents | CRUD | CRUD | RU (assigned home) | R |
| Staff credentials / training | CRUD | CRUD | R | R |
| Medications / order reviews | CRUD | CRUD | CRU | R |
| Incidents | CRUD | CRUD | CRU | R |
| Compliance documents | CRUD | CRUD | R | R |
| Risk change forms | CRUD | CRUD | CRU | R |
| Monthly tracking | CRUD | CRUD | CRU | R |
| House checklist | CRUD | CRUD | CRU | R |
| Dashboard / compliance score | R | R | R (assigned) | R |
| Export resident data | Y | Y | — | Y (read-only export) |
| View audit log | Y | Y (own org) | — | Y |
| Impersonate / break-glass | — | — | — | — (future) |

Legend: C=create R=read U=update D=delete Y=allowed —=denied

**Notes**
- Auditor is read-only except audit-trail views; cannot mutate clinical/compliance records.
- DSP is scoped to `Membership.homeId` when set.
- Every resident VIEW/UPDATE/EXPORT writes an `AuditEvent`.
- Notifications (email/SMS) may include home name + generic due counts only — never resident names or meds.

---

## Out of scope for this schema pass

- Notification message bodies / templates
- S3 bucket Terraform
- Full Auth.js / Cognito table set (depends on auth choice)
- Computed compliance score persistence (service layer first)

---

## Approval checklist

Reply with:
- [ ] Approve schema as proposed, **or** list changes
- [ ] Auth choice (1)
- [ ] Billing tables now vs stub (2)
- [ ] External client ID field yes/no (3)
- [ ] Path OK (4)
