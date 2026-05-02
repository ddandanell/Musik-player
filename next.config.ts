import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // pg and the Prisma driver adapter rely on Node.js native bindings that
  // must not be bundled by Next.js / Webpack. Listing them here tells the
  // bundler to treat them as external CJS modules on the server side.
  serverExternalPackages: ["pg", "pg-native", "@prisma/adapter-pg"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**.supabase.co" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "i.pravatar.cc" },
    ],
  },
};

export default nextConfig;
