"use client";

import { useTranslations } from "next-intl";
import { useAction } from "next-safe-action/hooks";

import { deleteEventAction } from "@/actions/deleteEvent";
import { useRouter } from "@/i18n/navigation";
import { firstAmongHookErrors, isHookActionPending } from "@/lib/safeActionHook";
import type { EventID } from "@/db/schema";
import { Button } from "@/components/ui/Button";

export default function DeleteEventButton({ eventId }: { eventId: EventID }) {
  const router = useRouter();
  const t = useTranslations("adminEvents");

  const {
    execute,
    status: deleteEventStatus,
    result,
  } = useAction(deleteEventAction, {
    onSuccess: () => {
      router.refresh();
    },
  });

  const handleDelete = () => {
    if (!window.confirm(t("deleteConfirm"))) return;
    if (isHookActionPending(deleteEventStatus)) return;
    execute({ eventId });
  };

  const errorMessage = firstAmongHookErrors([{ status: deleteEventStatus, result, fallback: t("deleteFailed") }]);

  return (
    <span className="inline-flex flex-col items-start gap-0.5">
      <Button variant="danger" size="small" actionStatus={deleteEventStatus} onClick={handleDelete}>
        {t("delete")}
      </Button>
      {errorMessage && <span className="max-w-[140px] text-xs text-red-600">{errorMessage}</span>}
    </span>
  );
}
