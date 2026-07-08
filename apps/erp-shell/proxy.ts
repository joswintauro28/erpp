import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const BACKEND_URL = process.env.BACKEND_API_URL || "http://127.0.0.1:8000";
const IAM_URL = process.env.IAM_API_URL || "http://127.0.0.1:8002";

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  // Intercept all requests starting with /api/
  if (!pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // Extract path following /api (e.g. /auth/login or /dashboard/stats)
  const path = pathname.slice("/api".length);
  
  let url: URL;
  if (path.startsWith("/auth/")) {
    // NestJS core-iam runs with the global "/api" prefix (e.g., http://localhost:8002/api/auth/...)
    url = new URL(`/api${path}${search}`, IAM_URL);
  } else {
    // FastAPI backend mounts routers at the root without "/api" prefix (e.g., http://localhost:8000/dashboard/...)
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
