import type { NextConfig } from "next";
import nextra from "nextra";

const withNextra = nextra({});

const nextConfig: NextConfig = {
  turbopack: {
    resolveAlias: {
      // Required for Nextra MDX components with Turbopack
      "next-mdx-import-source-file": "./mdx-components.tsx",
    },
  },
  async headers() {
    return [
      {
        // Prevent share token leakage via Referer header on share pages
        source: "/:code/:token",
        headers: [
          {
            key: "Referrer-Policy",
            value: "same-origin",
          },
        ],
      },
    ];
  },
};

export default withNextra(nextConfig);
