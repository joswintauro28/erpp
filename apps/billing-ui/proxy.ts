import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const IAM_URL = process.env.IAM_API_URL || "http://localhost:8002";
const BILLING_URL = process.env.BILLING_API_URL || "http://localhost:8003";

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
    url = new URL(`/api${path}${search}`, BILLING_URL);
  }

  const requestHeaders = new Headers(request.headers);
  return NextResponse.rewrite(url, {
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: "/api/:path*",
};
