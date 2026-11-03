/**
 * Next.js configuration for Utsav-Connect.
 *
 * Decisions recorded in docs/decisions.md:
 *  - JavaScript only (no TypeScript configuration is present or generated).
 *  - Tailwind CSS 4 is compiled through the Turbopack loader (ADR-003).
 *  - Cache Components are intentionally NOT enabled yet (ADR-009).
 *  - Baseline security headers are applied to every response (docs/security.md).
 *
 * @type {import('next').NextConfig}
 */

const isProduction = process.env.NODE_ENV === "production";

const securityHeaders = [
  // Prevent MIME-type sniffing.
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Disallow embedding the site in frames (clickjacking protection).
  { key: "X-Frame-Options", value: "DENY" },
  // Send only the origin for cross-origin requests.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Opt out of browser features the application does not use.
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), payment=(), usb=()",
  },
  // Only in production: enforce HTTPS for one year once the site is served over TLS.
  ...(isProduction
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=31536000; includeSubDomains",
        },
      ]
    : []),
];

const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
