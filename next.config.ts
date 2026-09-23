import type { NextConfig } from "next";
import { PHASE_DEVELOPMENT_SERVER } from "next/constants";

const nextConfig = (phase: string): NextConfig => {
  const isDev = phase === PHASE_DEVELOPMENT_SERVER;

  return {
    distDir: isDev ? ".next-dev" : ".next",
    images: {
      dangerouslyAllowSVG: true,
      contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
      remotePatterns: [
        {
          protocol: 'https',
          hostname: 'picsum.photos',
        },
        {
          protocol: 'https',
          hostname: '**.mptccloud.gov.kh',
        },
        {
          protocol: 'https',
          hostname: 'mptc.obsv3.kh-gov-1.mptccloud.gov.kh',
        },
        {
          protocol: 'https',
          hostname: 'obsv3.kh-gov-1.mptccloud.gov.kh',
        },
        {
          protocol: 'https',
          hostname: 'i.ibb.co',
        },
        {
          protocol: 'https',
          hostname: 'upload.wikimedia.org',
        },
        {
          protocol: 'https',
          hostname: 'moj.gov.kh',
        },
        {
          protocol: 'https',
          hostname: 'lh3.googleusercontent.com',
        },
        {
          protocol: 'https',
          hostname: 'encrypted-tbn0.gstatic.com',
        },
      ],
    },
  };
};

export default nextConfig;
