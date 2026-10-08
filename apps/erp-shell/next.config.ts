import type { NextConfig } from "next";
import path from "path";

const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: http://localhost:*",
  "font-src 'self' data:",
  "connect-src 'self' http://localhost:* https://*.datavex.ai wss:",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Content-Security-Policy", value: csp },
];

const nextConfig: NextConfig = {
  basePath: process.env.NEXT_PUBLIC_BASE_PATH || "",
  skipTrailingSlashRedirect: true,
  output: "standalone",
  outputFileTracingRoot: path.resolve(__dirname, "../.."),
  headers: async () => [
    { source: "/(.*)", headers: securityHeaders },
  ],
  rewrites: async () => [
    {
      source: "/api/auth/:path*",
      destination: "http://core-iam:8002/api/auth/:path*",
    },
    {
      source: "/api/ai/:path*",
      destination: "http://ai-service:8005/api/ai/:path*",
    },
    {
      source: "/api/files/:path*",
      destination: "http://erp-service:8000/api/files/:path*",
    },
    {
      source: "/api/:path*",
      destination: "http://erp-service:8000/:path*",
    },
  ],
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts"],
  },
  turbopack: {
    root: path.resolve(__dirname, "../.."),
  },
};

export default nextConfig;