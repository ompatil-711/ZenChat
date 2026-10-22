import type { NextConfig } from "next";
import { PHASE_PRODUCTION_BUILD, PHASE_PRODUCTION_SERVER } from "next/constants";
import { resolveBackendUrls } from "./config/backend-urls.mjs";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
};

export default function configureNext(phase: string): NextConfig {
  // Fail before compiling rather than shipping requests to a visitor's device.
  if (phase === PHASE_PRODUCTION_BUILD || phase === PHASE_PRODUCTION_SERVER) {
    resolveBackendUrls({
      userUrl: process.env.NEXT_PUBLIC_USER_BACKEND_URL,
      chatUrl: process.env.NEXT_PUBLIC_CHAT_BACKEND_URL,
      production: true,
    });
  }
  return nextConfig;
}
