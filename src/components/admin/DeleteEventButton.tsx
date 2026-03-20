"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

import { deleteEventAction } from "@/actions/deleteEvent";
import { useRouter } from "@/i18n/navigation";
import type { EventID } from "@/db/schema";
import { Button } from "@/components/ui/Button";

export default function DeleteEventButton({ eventId }: { eventId: EventID }) {
  const router = useRouter();
  const t = useTranslations("adminEvents");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!window.confirm(t("deleteConfirm"))) return;
    setDeleting(true);
    setError(null);
    try {
      const result = await deleteEventAction({ eventId });
      if (result?.serverError) {
        setError(result.serverError);
      } else {
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("deleteFailed"));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <span className="inline-flex flex-col items-start gap-0.5">
      <Button variant="danger" size="small" disabled={deleting} onClick={handleDelete}>
        {t("delete")}
      </Button>
      {error && <span className="max-w-[140px] text-xs text-red-600">{error}</span>}
    </span>
  );
}
