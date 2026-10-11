import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Allow the sandbox preview gateway to access dev server resources
  allowedDevOrigins: [
    "preview-chat-4e4aad2a-6586-4515-abec-fcc51b97c957.space-z.ai",
    "*.space-z.ai",
  ],
  // Belt-and-suspenders: never let caches hold the HTML document. force-dynamic
  // (in layout.tsx) already sets no-store on the page; this ensures even platform
  // edge layers don't serve stale HTML referencing old chunk hashes after a rebuild
  // (root cause of the recurring "client-side exception" on the preview panel).
  async headers() {
    return [
      {
        source: "/",
        headers: [
          { key: "Cache-Control", value: "no-store, no-cache, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;
