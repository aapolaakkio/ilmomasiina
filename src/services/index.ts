// Service layer index - framework-agnostic business logic functions.
// These can be called from Next.js Server Components/Actions or from Fastify route handlers.

// Events
export { getEventBySlug, getEventByIdForAdmin } from "./events/getEventDetails";
export { getEventsListForUser, getEventsListForAdmin } from "./events/getEventsList";
export { getCategories } from "./events/getCategories";

// Signups
export { createSignup } from "./signups/createSignup";
export { getSignupForEdit } from "./signups/getSignupForEdit";
export { updateSignupAsUser, updateSignupAsAdmin, createSignupAsAdmin } from "./signups/updateSignup";
export { deleteSignup } from "./signups/deleteSignup";

// Admin events
export { createEvent } from "./admin/events/createEvent";
export { updateEvent } from "./admin/events/updateEvent";
export { deleteEvent } from "./admin/events/deleteEvent";

// Admin users
export { listUsers } from "./admin/users/listUsers";
export { inviteUser } from "./admin/users/inviteUser";
export { deleteUser } from "./admin/users/deleteUser";
export { resetPassword } from "./admin/users/resetPassword";
export { changePassword } from "./admin/users/changePassword";
export { createInitialUser } from "./admin/users/createInitialUser";

// Admin slugs
export { checkSlugAvailability } from "./admin/slugs/checkSlugAvailability";

// Admin audit log
export { getAuditLogItems } from "./admin/auditlog/getAuditLogs";

// Auth
export { adminLogin, renewAdminToken } from "../auth/login";

// Payment
export { startPayment } from "./payment/startPayment";
export { completePayment } from "./payment/completePayment";
export { handleStripeWebhook } from "./payment/webhook";

// Re-export audit logger utilities for creating audit loggers in Next.js context
export { internalAuditLogger } from "../auditlog";
export type { AuditLogger } from "../auditlog";

// Re-export edit token utilities
export { generateToken, verifyToken } from "./signups/editTokens";

// Re-export auth session class
export { default as AdminAuthSession } from "../auth/adminAuthSession";
export type { AdminTokenData } from "../auth/adminAuthSession";

// Re-export initial setup check
export { isInitialSetupDone } from "./admin/users/helpers";
