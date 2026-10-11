import "server-only";
import { redirect } from "next/navigation";
import { can, landingPage, type Permission } from "./permissions";
import { getSession } from "./session";

export async function requireUser() {
  const u = await getSession();
  if (!u) redirect("/login");
  return u;
}

/** Use at the top of a page. Sends signed-out users to login and under-privileged users to their landing page. */
export async function requirePermission(p: Permission) {
  const u = await requireUser();
  if (!can(u.role, p)) redirect(landingPage(u.role));
  return u;
}
