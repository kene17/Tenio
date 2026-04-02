import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@tenio/domain", "@tenio/contracts"]
};

export default nextConfig;
