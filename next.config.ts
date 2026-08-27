import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";
const codespacesDomain = process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN?.trim();
const codespacesOriginPattern = codespacesDomain ? `*.${codespacesDomain}` : null;

const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProduction ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self' data:",
  "connect-src 'self' ws: wss:",
  "frame-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  ...(isProduction ? [{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }] : []),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: { remotePatterns: [{ protocol: "https", hostname: "images.unsplash.com" }] },
  ...(codespacesOriginPattern
    ? {
        allowedDevOrigins: [codespacesOriginPattern],
        experimental: {
          serverActions: {
            allowedOrigins: [codespacesOriginPattern],
          },
        },
      }
    : {}),
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};

export default nextConfig;
