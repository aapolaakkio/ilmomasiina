import { z } from "zod/v4";

/** Request body for login. */
export const adminLoginBody = z.object({
  email: z.email().min(1).max(255),
  password: z.string().min(1).max(255),
});

/** Response schema for a successful login. */
export const adminLoginResponse = z.object({
  accessToken: z.string(),
});

/** Request body for login. */
export type AdminLoginBody = z.infer<typeof adminLoginBody>;
/** Response schema for a successful login. */
export type AdminLoginResponse = z.infer<typeof adminLoginResponse>;
