import type { Dispatch, SetStateAction } from "react";

import type { AdminEventResponse } from "@/db/zod";

import type { EditorFormState } from "./types";

/** After a successful save, align `savedEvent` and form `draft` with the server response. */
export function applySavedAdminEventToEditor(
  eventData: AdminEventResponse,
  setSavedEvent: Dispatch<SetStateAction<AdminEventResponse | null>>,
  setForm: Dispatch<SetStateAction<EditorFormState>>,
): void {
  setSavedEvent(eventData);
  setForm((prev) => ({ ...prev, draft: eventData.draft }));
}
