import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const BACKEND_URL = process.env.BACKEND_API_URL || "http://localhost:8000";
const IAM_URL = process.env.IAM_API_URL || "http://localhost:8002";

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (!pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const path = pathname.slice("/api".length);

  let url: URL;
  if (path.startsWith("/auth/")) {
    url = new URL(`/api${path}${search}`, IAM_URL);
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
