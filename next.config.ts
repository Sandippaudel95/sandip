import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Runs as a Node server on Vercel. The booking system needs Server
  // Actions, cookies and middleware, none of which a static export
  // supports, so `output: "export"` was removed here.

  // Kept from the static build so existing URLs stay valid.
  trailingSlash: true,
};

export default nextConfig;
