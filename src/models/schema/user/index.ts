import { z } from "zod/v4";

export const userID = z.int().brand<"UserID">();

const userEmail = z.email().min(1).max(255);
const password = z.string().min(1).max(255);

/** Request body for creating an admin user. */
export const userCreateSchema = z.object({
  email: userEmail,
  password,
});

/** Request body for inviting an admin user. */
export const userInviteSchema = z.object({
  email: userEmail,
});

/** Request body for changing the user's own password. */
export const userChangePasswordSchema = z.object({
  oldPassword: password,
  newPassword: password,
});

/** Schema for a user. */
export const userSchema = z.object({
  id: userID,
  email: userEmail,
});

/** Response schema for fetching a list of users. */
export const userListResponse = z.array(userSchema);

/** Path parameters necessary to fetch and manipulate users. */
export const userPathParams = z.object({
  id: userID,
});

/** User ID type. */
export type UserID = z.infer<typeof userID>;

/** Request body for creating an admin user. */
export type UserCreateSchema = z.infer<typeof userCreateSchema>;
/** Request body for inviting an admin user. */
export type UserInviteSchema = z.infer<typeof userInviteSchema>;
/** Request body for changing the user's own password. */
export type UserChangePasswordSchema = z.infer<typeof userChangePasswordSchema>;

/** Path parameters necessary to fetch and manipulate users. */
export type UserPathParams = z.infer<typeof userPathParams>;
/** Schema for a user. */
export type UserSchema = z.infer<typeof userSchema>;
/** Response schema for fetching a list of users. */
export type UserListResponse = z.infer<typeof userListResponse>;
