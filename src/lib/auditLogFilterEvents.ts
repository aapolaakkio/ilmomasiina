import { AuditEvent } from "@/db/schema";

/** Values shown in the audit log action filter dropdown (message keys under `auditLog`). */
export const AUDIT_LOG_FILTER_EVENTS: { value: AuditEvent; labelKey: string }[] = [
  { value: AuditEvent.CREATE_EVENT, labelKey: "actions.createEvent" },
  { value: AuditEvent.EDIT_EVENT, labelKey: "actions.editEvent" },
  { value: AuditEvent.PUBLISH_EVENT, labelKey: "actions.publishEvent" },
  { value: AuditEvent.UNPUBLISH_EVENT, labelKey: "actions.unpublishEvent" },
  { value: AuditEvent.DELETE_EVENT, labelKey: "actions.deleteEvent" },
  { value: AuditEvent.CREATE_SIGNUP, labelKey: "actions.createSignup" },
  { value: AuditEvent.EDIT_SIGNUP, labelKey: "actions.editSignup" },
  { value: AuditEvent.DELETE_SIGNUP, labelKey: "actions.deleteSignup" },
  { value: AuditEvent.PROMOTE_SIGNUP, labelKey: "actions.promoteSignup" },
  { value: AuditEvent.CREATE_USER, labelKey: "actions.createUser" },
  { value: AuditEvent.DELETE_USER, labelKey: "actions.deleteUser" },
];
