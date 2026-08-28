import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const BACKEND_URL = process.env.BACKEND_API_URL || "http://localhost:8000";
const IAM_URL = process.env.IAM_API_URL || "http://localhost:8002";
const AI_URL = process.env.AI_API_URL || "http://localhost:8005";

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (!pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const path = pathname.slice("/api".length);

  let url: URL;
  if (path.startsWith("/auth/")) {
    // Auth endpoints go to core-iam (preserves /api prefix)
    url = new URL(`/api${path}${search}`, IAM_URL);
  } else if (path.startsWith("/ai/")) {
    // AI endpoints go to ai-service (port 8005, preserves /api prefix)
    url = new URL(`/api${path}${search}`, AI_URL);
  } else if (path.startsWith("/files/")) {
    // File endpoints require /api prefix (router uses prefix="/api/files")
    url = new URL(`/api${path}${search}`, BACKEND_URL);
  } else {
    // All domain requests (products, warehouses, stock, invoices, payments, CRM, etc.)
    // flow through erp-service (port 8000) as the Central API Gateway & Aggregator
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
