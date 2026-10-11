import { NextResponse, type NextRequest } from "next/server";
import { decrypt } from "@/lib/auth/session";

// Optimistic gate only: pages and the data layer re-check the session and the role themselves.
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const session = await decrypt(req.cookies.get("session")?.value);
  if (!session && pathname !== "/login") return NextResponse.redirect(new URL("/login", req.url));
  if (session && pathname === "/login") return NextResponse.redirect(new URL("/", req.url));
  return NextResponse.next();
}

export const config = { matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|ico|woff2)$).*)"] };
