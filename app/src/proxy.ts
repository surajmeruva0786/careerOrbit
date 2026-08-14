import { NextRequest, NextResponse } from "next/server";

// Gates the review dashboard (which shows resume PII + lets you
// approve/reject applications) behind HTTP Basic Auth. /api/cron/*
// has its own CRON_SECRET bearer check and is excluded here (see
// matcher below) since Vercel Cron can't do interactive Basic Auth.

function unauthorized() {
  return new NextResponse("Authentication required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="CareerOrbit"' },
  });
}

export function proxy(req: NextRequest) {
  const password = process.env.DASHBOARD_PASSWORD;
  if (!password) {
    // No password configured (e.g. local dev). Fail open rather than
    // lock out a developer who hasn't set .env.local yet -- set
    // DASHBOARD_PASSWORD in Vercel before this is reachable publicly.
    return NextResponse.next();
  }

  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Basic ")) return unauthorized();

  const decoded = atob(auth.slice("Basic ".length));
  const suppliedPassword = decoded.slice(decoded.indexOf(":") + 1);
  if (suppliedPassword !== password) return unauthorized();

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api/cron).*)"],
};
