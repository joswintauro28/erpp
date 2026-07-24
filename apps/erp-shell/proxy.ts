import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const BACKEND_URL = process.env.BACKEND_API_URL || "http://localhost:8000";
const IAM_URL = process.env.IAM_API_URL || "http://localhost:8002";

const CRM_PATHS = [
  "customers", "contacts", "documents", "lead-discovery", "ai-assistant",
  "quotations", "opportunities", "sales", "sales-orders", "requirements",
  "leads", "enquiries", "site-visits", "follow-ups", "tasks",
  "communications", "visit-plans", "complaints", "feedback", "reports",
];

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (!pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const path = pathname.slice("/api".length);

  // Auth requests go directly to core-iam
  let url: URL;
  if (path.startsWith("/auth/")) {
    url = new URL(`/api${path}${search}`, IAM_URL);
  } else if (CRM_PATHS.some((p) => path.startsWith(`/${p}`))) {
    // CRM paths flow through erp-service which proxies to crm-service (port 8001)
    // /crm prefix is added because erp-service's CRM router uses prefix="/crm"
    url = new URL(`/crm${path}${search}`, BACKEND_URL);
  } else {
    // All other business logic flows through erp-service aggregation gateway (port 8000)
    url = new URL(`${path}${search}`, BACKEND_URL);
  }

  const requestHeaders = new Headers(request.headers);

  return NextResponse.rewrite(url, {
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: "/api/:path*",
};
