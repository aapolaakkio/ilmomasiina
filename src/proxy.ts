import createMiddleware from "next-intl/middleware";
import { NextRequest, NextResponse } from "next/server";

import { routing } from "./i18n/routing";
const handleI18nRouting = createMiddleware(routing);

export function proxy(request: NextRequest) {
  const i18nResponse = handleI18nRouting(request);
  const pathname = i18nResponse.headers.get("x-middleware-rewrite")
    ? new URL(i18nResponse.headers.get("x-middleware-rewrite") as string).pathname
    : request.nextUrl.pathname;
  const withoutLocale = pathname.replace(/^\/(fi|en|sv)(?=\/|$)/, "") || "/";

  // Skip login and setup pages — they don't require auth
  if (withoutLocale === "/login" || withoutLocale === "/setup") {
    return i18nResponse;
  }

  // Verify Auth.js session cookie on /admin routes
  if (withoutLocale.startsWith("/admin")) {
    // Auth.js uses different cookie names in dev vs prod
    const sessionToken =
      request.cookies.get("__Secure-authjs.session-token")?.value || request.cookies.get("authjs.session-token")?.value;

    if (!sessionToken) {
      const locale = pathname.split("/")[1];
      const validLocales = ["fi", "en", "sv"];
      const loginPath = locale && validLocales.includes(locale) ? `/${locale}/login` : "/fi/login";
      const loginUrl = new URL(loginPath, request.url);
      return NextResponse.redirect(loginUrl);
    }
  }

  return i18nResponse;
}

export const config = {
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
