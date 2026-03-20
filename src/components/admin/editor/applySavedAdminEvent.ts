import type { Dispatch, SetStateAction } from "react";
import type { UseFormSetValue } from "react-hook-form";

import type { AdminEventResponse } from "@/db/zod";

import type { EditorFormState } from "./types";

/** After a successful save, align `savedEvent` and form `draft` with the server response. */
export function applySavedAdminEventToEditor(
  eventData: AdminEventResponse,
  setSavedEvent: Dispatch<SetStateAction<AdminEventResponse | null>>,
  setDraft: UseFormSetValue<EditorFormState>,
): void {
  setSavedEvent(eventData);
  setDraft("draft", eventData.draft);
}
