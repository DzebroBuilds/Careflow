// Fake-data seed for the demo. Safe to re-run: it wipes and recreates the demo organization.
// Run with the OWNER connection (superuser bypasses RLS), e.g. `npm run db:seed`.
import { PrismaClient, type CareDocStatus, type CareDocType, type MonthlyFileType, type MonthlyFileStatus, type RiskCategory, type CredentialType } from "@prisma/client";
import { BAD_MONTHLY, DISCREPANCY_TEMPLATES, HOMES, RESIDENTS, STAFF } from "../src/lib/demo-data";
import { daysBetween, scoreHome, type CareDocStatus as ScoreDoc, type MonthlyStatus } from "../src/lib/compliance/scoring";

const prisma = new PrismaClient();
const TODAY = new Date(2026, 9, 10);
const addDays = (n: number) => new Date(TODAY.getFullYear(), TODAY.getMonth(), TODAY.getDate() + n);

const DOC_ORDER: CareDocType[] = ["RIT", "ISP", "PRMS", "SAFETY_PLAN", "PBSP"];
const DOC_STATUS: Record<string, CareDocStatus> = { o: "CURRENT", d: "REVIEW_DUE", x: "CONFLICT", m: "MISSING" };
const RISK: Record<string, RiskCategory> = {
  Elopement: "ELOPEMENT", Aspiration: "ASPIRATION", Falls: "FALLS", Seizure: "SEIZURE",
  "Medication refusal": "MEDICATION_REFUSAL", "Self-injury": "SELF_INJURY",
};
const DOC_NAME: Record<string, CareDocType> = { RIT: "RIT", ISP: "ISP", PRMS: "PRMS", PBSP: "PBSP", "Safety Plan": "SAFETY_PLAN" };
const MONTHLY: { key: string; type: MonthlyFileType }[] = [
  { key: "MAR", type: "MAR" }, { key: "ONA", type: "ONA" }, { key: "Safety Plan", type: "SAFETY_PLAN" },
];
const SLOT: Record<string, string[]> = { AM: ["8:00 AM"], BID: ["8:00 AM", "8:00 PM"], TID: ["8:00 AM", "2:00 PM", "8:00 PM"], bedtime: ["9:00 PM"], PM: ["6:00 PM"], PRN: [] };

function parseMed(s: string) {
  const [left, freq] = s.split(" · ");
  const m = left.match(/^(.*?)(?:\s+(\d[\d.,]*\s?(?:mg|mcg|IU)))?$/);
  return { name: m?.[1] ?? left, dosage: m?.[2] ?? null, frequency: freq, slots: SLOT[freq] ?? [], isPrn: freq === "PRN" };
}

async function main() {
  if (process.env.NODE_ENV === "production") throw new Error("Refusing to seed in production");
  // Demo database only: wipe everything so the seed is repeatable.
  await prisma.$executeRawUnsafe("TRUNCATE organizations CASCADE");
  const org = await prisma.organization.create({
    data: { name: "Northwest Supported Living (demo)", slug: "demo-northwest-homes", subscriptionStatus: "ACTIVE" },
  });
  const orgId = org.id;

  const homes: Record<string, string> = {};
  for (const h of HOMES) {
    const home = await prisma.home.create({ data: { organizationId: orgId, name: h.name, capacity: h.beds, city: "Portland" } });
    homes[h.key] = home.id;
  }

  const period: Record<string, string> = {};
  for (const h of HOMES) {
    const p = await prisma.monthlyTrackingPeriod.create({
      data: { organizationId: orgId, homeId: homes[h.key], yearMonth: "2026-09", dueOn: addDays(-5) },
    });
    period[h.key] = p.id;
  }

  const scoreInputs: Record<string, { docs: ScoreDoc[]; tracking: { status: MonthlyStatus }[]; open: number; creds: number[] }> = {};
  for (const h of HOMES) scoreInputs[h.key] = { docs: [], tracking: [], open: 0, creds: [] };

  for (const [ri, r] of RESIDENTS.entries()) {
    const homeId = homes[r.home];
    const res = await prisma.resident.create({
      data: { organizationId: orgId, homeId, preferredName: r.id, roomLabel: r.room, moveInDate: new Date(r.since, 5, 1) },
    });
    await prisma.residentRiskFlag.createMany({
      data: r.flags.map((f) => ({ organizationId: orgId, residentId: res.id, category: RISK[f] })),
    });
    await prisma.medication.createMany({
      data: r.meds.map((m) => ({ organizationId: orgId, homeId, residentId: res.id, ...parseMed(m) })),
    });

    for (const [i, type] of DOC_ORDER.entries()) {
      const st = DOC_STATUS[r.docs[i]];
      const version = st === "MISSING" ? 0 : 1 + ((ri + i) % 4);
      const age = st === "REVIEW_DUE" ? 340 : 6 + ((ri * 7 + i * 11) % 80);
      const rd = await prisma.residentDocument.create({
        data: { organizationId: orgId, homeId, residentId: res.id, type, status: st, currentVersion: version, reviewDueOn: addDays(365 - age) },
      });
      for (let v = 1; v <= version; v++) {
        await prisma.documentVersion.create({
          data: {
            organizationId: orgId, residentDocumentId: rd.id, version: v, gateStatus: "PASSED", uploadedByLabel: v === version ? "Compliance Team" : "Facility staff",
            note: v === 1 ? "Initial upload" : "Scheduled review", createdAt: addDays(-age - (version - v) * 60),
          },
        });
      }
      scoreInputs[r.home].docs.push(st as ScoreDoc);
    }

    for (let k = 0; k < r.openDiscrepancies; k++) {
      const t = DISCREPANCY_TEMPLATES[(ri + k) % 6];
      await prisma.riskDiscrepancy.create({
        data: {
          organizationId: orgId, homeId, residentId: res.id, risk: RISK[t.risk], kind: t.kind === "miss" ? "MISSING_SECTION" : "CONFLICT",
          sourceDoc: DOC_NAME[t.docs[0]], targetDoc: DOC_NAME[t.docs[1]], summary: t.text, proposedFix: t.fix,
        },
      });
      scoreInputs[r.home].open++;
    }

    for (const [ti, t] of MONTHLY.entries()) {
      const bad = (BAD_MONTHLY[r.home as keyof typeof BAD_MONTHLY] as Record<string, string> | undefined)?.[`${r.id}:${t.key}`];
      const status: MonthlyFileStatus = bad === "missing" ? "MISSING" : bad === "rejected" ? "REJECTED" : "VERIFIED";
      const at = addDays(-(1 + ((ri + ti * 3) % 8)));
      const mf = await prisma.monthlyFile.create({
        data: {
          organizationId: orgId, periodId: period[r.home], homeId, residentId: res.id, yearMonth: "2026-09", type: t.type,
          status, currentVersion: status === "MISSING" ? 0 : 1, dueOn: addDays(-5),
        },
      });
      if (status !== "MISSING") {
        const slug = t.key.replace(" ", "");
        await prisma.documentVersion.create({
          data: {
            organizationId: orgId, monthlyFileId: mf.id, version: 1, uploadedByLabel: "Facility staff", createdAt: at,
            gateStatus: status === "VERIFIED" ? "PASSED" : "REJECTED",
            failedFields: status === "REJECTED" ? ["Staff signature (p.2)", "Date of review"] : [],
            originalName: `${slug}_${r.id}_2026-09${status === "REJECTED" ? "_unsigned" : ""}.pdf`,
            note: status === "VERIFIED" ? "Passed gatekeeper" : "Rejected by gatekeeper",
          },
        });
      }
      scoreInputs[r.home].tracking.push({ status });
    }
  }

  const CRED: { key: "cpr" | "background" | "medAdmin"; type: CredentialType }[] = [
    { key: "cpr", type: "CPR_FIRST_AID" }, { key: "background", type: "CRIMINAL_HISTORY_CHECK" }, { key: "medAdmin", type: "MEDICATION_ADMIN" },
  ];
  for (const s of STAFF) {
    const sp = await prisma.staffProfile.create({
      data: { organizationId: orgId, homeId: homes[s.home], displayName: s.name, jobTitle: s.role },
    });
    await prisma.staffTraining.create({
      data: { organizationId: orgId, staffProfileId: sp.id, type: "ODDS_CORE", title: "Annual training hours", hours: s.trainingHours, completedOn: addDays(-30) },
    });
    for (const c of CRED) {
      await prisma.staffCredential.create({
        data: { organizationId: orgId, staffProfileId: sp.id, type: c.type, expiresOn: addDays(s[c.key]) },
      });
      scoreInputs[s.home].creds.push(daysBetween(TODAY, addDays(s[c.key])));
    }
  }

  for (const h of HOMES) {
    const i = scoreInputs[h.key];
    const sc = scoreHome({ careDocStatuses: i.docs, tracking: i.tracking.map((t) => ({ status: t.status })), openDiscrepancies: i.open, credentialDaysLeft: i.creds });
    await prisma.homeSummary.create({
      data: {
        organizationId: orgId, homeId: homes[h.key], docsScore: sc.docs, trackingScore: sc.tracking, riskScore: sc.risk,
        staffScore: sc.staff, totalScore: sc.total, openItems: i.open + i.tracking.filter((t) => t.status !== "VERIFIED").length,
      },
    });
    console.log(`${h.name}: ${sc.total}`);
  }
}

main().finally(() => prisma.$disconnect());
