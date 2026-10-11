import "server-only";
import { timingSafeEqual } from "node:crypto";
import type { Role } from "./permissions";

// Demo accounts only. Replace with the `users` + `memberships` tables (Argon2 hashes, MFA) before any real client.
export interface DemoUser { id: string; email: string; name: string; role: Role; home: string | null }

export const DEMO_USERS: readonly DemoUser[] = [
  { id: "u-agency", email: "agency@careflow.demo", name: "Dave (Agency)", role: "AGENCY", home: null },
  { id: "u-owner", email: "owner@nwsl.demo", name: "Maya Brandt", role: "OWNER", home: null },
  { id: "u-mgr", email: "manager.alder@nwsl.demo", name: "Priya Natarajan", role: "MANAGER", home: "A" },
  { id: "u-dsp", email: "dsp.birch@nwsl.demo", name: "Rosa Delgado", role: "DSP", home: "B" },
  { id: "u-audit", email: "auditor@nwsl.demo", name: "Sam Whitfield", role: "AUDITOR", home: null },
];

const demoPassword = () => process.env.DEMO_PASSWORD ?? "careflow-demo";

export function checkLogin(email: string, password: string): DemoUser | null {
  const user = DEMO_USERS.find((u) => u.email === email.trim().toLowerCase()) ?? null;
  // Always compare, so timing doesn't reveal whether the email exists.
  const a = Buffer.from(password.padEnd(64).slice(0, 64));
  const b = Buffer.from(demoPassword().padEnd(64).slice(0, 64));
  const ok = timingSafeEqual(a, b) && password.length === demoPassword().length;
  return user && ok ? user : null;
}

export const findUser = (id: string) => DEMO_USERS.find((u) => u.id === id) ?? null;
