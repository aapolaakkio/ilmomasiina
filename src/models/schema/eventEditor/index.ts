import { z } from "zod/v4";

import { eventID } from "../event";
import { userID } from "../user";

/** Schema for adding an editor to an event. */
export const addEventEditorSchema = z.object({
  eventId: eventID,
  email: z.email().min(1).max(255),
});

/** Schema for removing an editor from an event. */
export const removeEventEditorSchema = z.object({
  eventId: eventID,
  userId: userID,
});

/** Schema for listing editors of an event. */
export const getEventEditorsSchema = z.object({
  eventId: eventID,
});

/** Schema for an event editor entry. */
export const eventEditorSchema = z.object({
  userId: userID,
  email: z.email(),
});

export type AddEventEditorSchema = z.infer<typeof addEventEditorSchema>;
export type RemoveEventEditorSchema = z.infer<typeof removeEventEditorSchema>;
export type GetEventEditorsSchema = z.infer<typeof getEventEditorsSchema>;
export type EventEditorSchema = z.infer<typeof eventEditorSchema>;
