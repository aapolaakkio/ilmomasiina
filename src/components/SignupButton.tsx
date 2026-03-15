"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useAction } from "next-safe-action/hooks";

import { createSignupAction } from "@/actions/createSignup";
import { useRouter } from "@/i18n/navigation";
import type { QuotaID, UserEventResponse } from "@/models";
import { Button } from "@/components/ui/Button";

type Props = {
  event: UserEventResponse;
  registrationClosed: boolean;
  millisTillOpening: number | null;
};

export default function SignupButton({ event, registrationClosed, millisTillOpening }: Props) {
  const t = useTranslations("singleEvent");
  const router = useRouter();
  const [countdown, setCountdown] = useState(millisTillOpening ?? 0);
  const [isOpen, setIsOpen] = useState(!registrationClosed && (millisTillOpening ?? 0) <= 0);

  const { execute, isPending } = useAction(createSignupAction, {
    onSuccess: ({ data }) => {
      if (data) {
        router.push(`/signup/${data.id}/${data.editToken}`);
      }
    },
  });

  // Countdown timer
  useEffect(() => {
    if (millisTillOpening == null || millisTillOpening <= 0) return undefined;
    const start = Date.now();
    const timer = setInterval(() => {
      const remaining = Math.max(0, millisTillOpening - (Date.now() - start));
      setCountdown(remaining);
      if (remaining <= 0) {
        setIsOpen(true);
        clearInterval(timer);
      }
    }, 100);
    return () => clearInterval(timer);
  }, [millisTillOpening]);

  const isDisabled = event.registrationStartDate == null || event.registrationEndDate == null;

  const onClick = useCallback(
    (quotaId: QuotaID) => {
      if (!isOpen || isPending) return;
      execute({ quotaId });
    },
    [isOpen, isPending, execute],
  );

  if (isDisabled) return null;

  const seconds = Math.ceil(countdown / 1000);
  const showCountdown = countdown > 0 && countdown < 60000;

  return (
    <div>
      <h3 className="mb-2 text-lg font-semibold">{t("signupTitle")}</h3>
      <p className="mb-3 text-sm text-gray-600">
        {(() => {
          if (registrationClosed && countdown <= 0) return t("signupClosed");
          return isOpen ? t("signupOpen") : t("signupNotOpen");
        })()}
        {showCountdown && <span className="text-green-600">{` (${seconds} s)`}</span>}
      </p>
      {event.quotas.map((quota) => {
        const priceText = quota.price > 0 ? ` (${(quota.price / 100).toFixed(2)} \u20AC)` : "";
        return (
          <Button
            key={quota.id}
            variant="secondary"
            className="mb-2 w-full"
            disabled={!isOpen || isPending}
            onClick={() => onClick(quota.id)}
          >
            {event.quotas.length === 1 ? t("signupNow") : t("signupQuota", { quota: quota.title })}
            {priceText}
          </Button>
        );
      })}
    </div>
  );
}
