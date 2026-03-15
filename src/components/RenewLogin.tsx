"use client";

import { useEffect } from "react";

import { renewTokenAction } from "@/actions/renewToken";
import { useRouter } from "@/i18n/navigation";

const RENEW_INTERVAL = 60 * 1000; // Check every minute

/** Auto-renews the admin auth token periodically while the page is active. */
export default function RenewLogin() {
  const router = useRouter();

  useEffect(() => {
    const renew = async () => {
      const result = await renewTokenAction();
      if (result?.serverError) {
        // Session expired or invalid — redirect to login
        router.push("/login");
      }
    };

    // Check immediately, then periodically
    renew();
    const timer = setInterval(renew, RENEW_INTERVAL);
    return () => clearInterval(timer);
  }, [router]);

  return null;
}
