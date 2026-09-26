import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // GitHub Pages serves static files only: no SSR, API routes or server actions.
  output: "export",

  // Static export runs no image optimizer, so images ship as authored.
  images: { unoptimized: true },

  // Emit /book/index.html rather than /book.html, which Pages resolves cleanly.
  trailingSlash: true,
};

export default nextConfig;
