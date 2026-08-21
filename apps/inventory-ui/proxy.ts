import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const IAM_URL = process.env.IAM_API_URL || "http://localhost:8002";
const INVENTORY_URL = process.env.INVENTORY_API_URL || "http://localhost:8004";
const ERP_URL = process.env.ERP_API_URL || "http://localhost:8000";

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (!pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const path = pathname.slice("/api".length);

  let url: URL;
  if (path.startsWith("/auth/")) {
    url = new URL(`/api${path}${search}`, IAM_URL);
  } else if (path.startsWith("/files/")) {
    url = new URL(`/api${path}${search}`, ERP_URL);
  } else {
    url = new URL(`${path}${search}`, INVENTORY_URL);
  }

  const requestHeaders = new Headers(request.headers);
  return NextResponse.rewrite(url, {
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: "/api/:path*",
};
