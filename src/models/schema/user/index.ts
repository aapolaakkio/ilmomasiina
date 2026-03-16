import { z } from "zod/v4";

export const userID = z.int().brand<"UserID">();

const userEmail = z.email().min(1).max(255);

const userRole = z.enum(["admin", "user"]);

/** Request body for inviting an admin user (adding to allowlist). */
export const userInviteSchema = z.object({
  email: userEmail,
  role: userRole.default("user"),
});

/** Schema for a user. */
export const userSchema = z.object({
  id: userID,
  email: userEmail,
  role: userRole,
});

/** Response schema for fetching a list of users. */
export const userListResponse = z.array(userSchema);

/** Path parameters necessary to fetch and manipulate users. */
export const userPathParams = z.object({
  id: userID,
});

/** User ID type. */
export type UserID = z.infer<typeof userID>;

/** Request body for inviting an admin user (adding to allowlist). */
export type UserInviteSchema = z.infer<typeof userInviteSchema>;

/** Path parameters necessary to fetch and manipulate users. */
export type UserPathParams = z.infer<typeof userPathParams>;
/** Schema for a user. */
export type UserSchema = z.infer<typeof userSchema>;
/** Response schema for fetching a list of users. */
export type UserListResponse = z.infer<typeof userListResponse>;
