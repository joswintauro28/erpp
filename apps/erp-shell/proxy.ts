import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const BACKEND_URL = process.env.BACKEND_API_URL || "http://127.0.0.1:8000";
const IAM_URL = process.env.IAM_API_URL || "http://127.0.0.1:8002";
const BILLING_URL = process.env.BILLING_API_URL || "http://127.0.0.1:8003";
const INVENTORY_URL = process.env.INVENTORY_API_URL || "http://127.0.0.1:8004";

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (!pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const path = pathname.slice("/api".length);
  
  let url: URL;
  if (path.startsWith("/auth/")) {
    url = new URL(`/api${path}${search}`, IAM_URL);
  } else if (path.startsWith("/invoices") || path.startsWith("/payments") || path.startsWith("/accounts") || path.startsWith("/expenses") || path.startsWith("/ledger") || path.startsWith("/reports") || path === "/dashboard/billing") {
    url = new URL(`/api${path}${search}`, BILLING_URL);
  } else if (path.startsWith("/products") || path.startsWith("/warehouses") || path.startsWith("/stock") || path.startsWith("/suppliers") || path.startsWith("/purchase-orders") || path.startsWith("/serial-numbers") || path === "/dashboard/inventory") {
    url = new URL(`${path}${search}`, INVENTORY_URL);
  } else {
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
