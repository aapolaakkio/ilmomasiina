import { createVerifier } from "fast-jwt";
import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";

import { SESSION_TTL } from "./auth/constants";
import { routing } from "./i18n/routing";
const handleI18nRouting = createMiddleware(routing);

function verifyToken(token: string): boolean {
  const secret = process.env.FEATHERS_AUTH_SECRET;
  if (!secret) return false;
  try {
    const verify = createVerifier({ key: secret, maxAge: SESSION_TTL * 1000 });
    verify(token);
    return true;
  } catch {
    return false;
  }
}

export function proxy(request: NextRequest) {
  const i18nResponse = handleI18nRouting(request);
  const pathname = i18nResponse.headers.get("x-middleware-rewrite")
    ? new URL(i18nResponse.headers.get("x-middleware-rewrite") as string).pathname
    : request.nextUrl.pathname;
  const withoutLocale = pathname.replace(/^\/(fi|en)(?=\/|$)/, "") || "/";

  // Skip login and setup pages — they don't require auth
  if (withoutLocale === "/login" || withoutLocale === "/setup") {
    return i18nResponse;
  }

  // Verify admin auth cookie on /admin routes
  if (withoutLocale.startsWith("/admin")) {
    const token = request.cookies.get("admin_token")?.value;
    if (!token || !verifyToken(token)) {
      const locale = pathname.split("/")[1];
      const loginPath = locale && (locale === "fi" || locale === "en") ? `/${locale}/login` : "/fi/login";
      const loginUrl = new URL(loginPath, request.url);
      const response = NextResponse.redirect(loginUrl);
      if (token) {
        response.cookies.delete("admin_token");
      }
      return response;
    }
  }

  return i18nResponse;
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
