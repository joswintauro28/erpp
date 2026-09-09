import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const IAM_URL = process.env.IAM_API_URL || "http://localhost:8002";
const CRM_URL = process.env.CRM_API_URL || "http://localhost:8001";
const ERP_URL = process.env.ERP_API_URL || "http://localhost:8000";
const AI_URL = process.env.AI_API_URL || "http://localhost:8005";

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (!pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  let path = pathname.slice("/api".length);

  if (path.startsWith("/v1")) {
    path = path.slice(3);
  }
  if (path.startsWith("/crm")) {
    path = path.slice(4);
  }

  let url: URL;
  if (path.startsWith("/auth/")) {
    url = new URL(`/api${path}${search}`, IAM_URL);
  } else if (path.startsWith("/ai/")) {
    url = new URL(`/api${path}${search}`, AI_URL);
  } else if (path === "/files" || path.startsWith("/files/")) {
    url = new URL(`/api${path}${search}`, ERP_URL);
  } else {
    url = new URL(`/api${path}${search}`, CRM_URL);
  }

  const requestHeaders = new Headers(request.headers);
  return NextResponse.rewrite(url, {
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: "/api/:path*",
};
