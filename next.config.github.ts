import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  distDir: "docs",
  basePath: "/ai-debate-platform",
  assetPrefix: "/ai-debate-platform/",
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
};

export default nextConfig;
