import { NextResponse, type NextRequest } from "next/server";

/** Give every browser an anonymous visitor id so we can count unique visitors (no personal data). */
export function proxy(request: NextRequest) {
  const res = NextResponse.next();
  if (!request.cookies.get("club_v")) {
    const id = crypto.randomUUID();
    // Make it visible to server components rendering this same request.
    request.cookies.set("club_v", id);
    const forwarded = NextResponse.next({ request: { headers: request.headers } });
    forwarded.cookies.set("club_v", id, {
      httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 365,
    });
    return forwarded;
  }
  return res;
}

export const config = {
  matcher: ["/((?!_next/|api/|icon.svg|manifest.webmanifest|.*\\.(?:svg|png|jpg|ico)$).*)"],
};
