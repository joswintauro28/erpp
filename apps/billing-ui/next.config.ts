import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  skipTrailingSlashRedirect: true,
  output: "standalone",
  outputFileTracingRoot: path.resolve(__dirname, "../.."),
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts"],
  },
  turbopack: {
    root: path.resolve(__dirname, "../.."),
  },
};

export default nextConfig;
