"use client";

import { useTransition } from "react";

import { useRouter } from "@/i18n/navigation";

type Props = {
  showPast: boolean;
  labelUpcoming: string;
  labelPast: string;
  className: string;
};

/**
 * Client navigation avoids an extra prefetch round-trip that duplicate `GET /admin` logs
 * showed when using {@link Link} for the past/upcoming toggle (prefetch + click).
 */
export default function AdminEventsPastToggle({ showPast, labelUpcoming, labelPast, className }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const handleClick = () => {
    startTransition(() => {
      router.replace(showPast ? "/admin" : "/admin?past=1");
    });
  };

  return (
    <button type="button" className={className} disabled={pending} aria-busy={pending} onClick={handleClick}>
      {showPast ? labelUpcoming : labelPast}
    </button>
  );
}
