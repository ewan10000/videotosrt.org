import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    unoptimized: true
  },
  async redirects() {
    return [
      {
        source: "/privacy",
        destination: "/privacy-policy",
        permanent: true
      },
      {
        source: "/terms",
        destination: "/terms-of-service",
        permanent: true
      },
      {
        source: "/faq",
        destination: "/#faq",
        permanent: true
      }
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline' https://plausible.io https://www.googletagmanager.com https://www.google-analytics.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://www.google-analytics.com https://avatars.githubusercontent.com; font-src 'self' data:; connect-src 'self' https://videotosrt-backend.ewan0862.workers.dev https://plausible.io https://www.google-analytics.com https://region1.google-analytics.com; media-src 'self' blob: https:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
          },
          {
            key: "X-Frame-Options",
            value: "DENY"
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload"
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff"
          },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin"
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()"
          }
        ]
      }
    ];
  }
};

export default nextConfig;
