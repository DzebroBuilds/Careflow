// Pure role rules, shared by the server data layer, pages, navigation and tests.
export type Role = "AGENCY" | "OWNER" | "MANAGER" | "DSP" | "AUDITOR";

export type Permission =
  | "view:overview" | "view:today" | "view:residents" | "view:staff" | "view:medications" | "view:monthly"
  | "view:incidents" | "view:audit" | "view:homes" | "view:agency" | "upload:monthly";

const ALL_CLIENT: Permission[] = [
  "view:overview", "view:today", "view:residents", "view:staff", "view:medications", "view:monthly",
  "view:incidents", "view:audit", "view:homes",
];

export const PERMISSIONS: Record<Role, readonly Permission[]> = {
  AGENCY: [...ALL_CLIENT, "view:agency", "upload:monthly"],
  OWNER: [...ALL_CLIENT, "upload:monthly"],
  MANAGER: [...ALL_CLIENT, "upload:monthly"],
  // Floor staff: their own house's day-to-day work, no staff files, audit view or other houses.
  DSP: ["view:today", "view:residents", "view:medications", "view:monthly", "view:incidents", "upload:monthly"],
  // Read-only across every house.
  AUDITOR: ALL_CLIENT,
};

export const can = (role: Role, p: Permission) => PERMISSIONS[role].includes(p);

/** Roles that only ever see one house. */
export const isHomeScoped = (role: Role) => role === "MANAGER" || role === "DSP";

/** Which home keys a user may see. `all` is every home in their organization. */
export function allowedHomes(role: Role, homeKey: string | null, all: readonly string[]): string[] {
  if (!isHomeScoped(role)) return [...all];
  return homeKey && all.includes(homeKey) ? [homeKey] : []; // fail closed when a scoped user has no home
}

export const ROLE_LABEL: Record<Role, string> = {
  AGENCY: "Agency", OWNER: "Owner", MANAGER: "House manager", DSP: "Direct support", AUDITOR: "Auditor",
};

/** First page each role should land on. */
export const landingPage = (role: Role) => (role === "AGENCY" ? "/agency" : can(role, "view:overview") ? "/" : "/today");
