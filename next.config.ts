import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  devIndicators: false,
  images: {
    domains: ["misteruni.s3.eu-central-1.amazonaws.com"],
  },
};

export default nextConfig;