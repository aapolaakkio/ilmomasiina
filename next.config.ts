import "./src/env";

import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  output: "standalone",
  cacheComponents: true,

  experimental: {
    rootParams: true,
    inlineCss: true,
    globalNotFound: true,
  },
  // Server external packages that shouldn't be bundled
  serverExternalPackages: ["drizzle-orm", "pg", "bcrypt", "nodemailer", "stripe"],
  allowedDevOrigins: ["127.0.0.1"],
};

const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
