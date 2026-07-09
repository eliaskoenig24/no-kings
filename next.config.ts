import type { NextConfig } from "next";

const securityHeaders = [
  { key: 'X-DNS-Prefetch-Control', value: 'on' },
  { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // microphone=(self): voice training records ON this origin, audio never leaves the device
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(self), geolocation=()' },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
    ];
  },
  // The platform is three pages: / explains, /twin creates, /world analyzes.
  // Old routes keep working for shared links.
  async redirects() {
    return [
      { source: '/training', destination: '/twin', permanent: true },
      { source: '/compare', destination: '/twin', permanent: true },
      { source: '/history', destination: '/twin', permanent: true },
      { source: '/network', destination: '/world', permanent: true },
      { source: '/pulse', destination: '/world', permanent: true },
      { source: '/insights', destination: '/world', permanent: true },
      { source: '/politicians', destination: '/world', permanent: true },
      { source: '/about', destination: '/', permanent: true },
      { source: '/trust', destination: '/', permanent: true },
    ];
  },
};

export default nextConfig;
