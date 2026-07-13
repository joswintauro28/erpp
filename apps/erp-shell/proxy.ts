import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const BACKEND_URL = process.env.BACKEND_API_URL || "http://127.0.0.1:8000";
const IAM_URL = process.env.IAM_API_URL || "http://127.0.0.1:8002";

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
  } else {
    // All business logic flows through the erp-service aggregation gateway
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
