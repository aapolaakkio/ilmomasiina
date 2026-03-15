import { createSigner, createVerifier, SignerSync, VerifierSync } from "fast-jwt";

import type { UserID, UserSchema } from "@/models";

import { env } from "@/env";
import { BadSession } from "./errors";

export interface AdminTokenData {
  user: UserID;
  email: UserSchema["email"];
}

export default class AdminAuthSession {
  /** Session lifetime in seconds */
  static TTL = env.NODE_ENV === "development" ? 365 * 24 * 60 * 60 : 60 * 60 * 3;

  private readonly sign: typeof SignerSync;
  private readonly verify: typeof VerifierSync;

  constructor(secret: string) {
    this.sign = createSigner({
      key: secret,
      expiresIn: AdminAuthSession.TTL * 1000,
    });
    this.verify = createVerifier({
      key: secret,
      maxAge: AdminAuthSession.TTL * 1000,
    });
  }

  /**
   * Creates a session token (JWT)
   */
  createSession(user: { id: number; email: string }): string {
    return this.sign({ user: user.id, email: user.email });
  }

  /**
   * Verifies a raw JWT token string.
   * Throws a BadSession error if session is not valid.
   */
  verifyToken(token: string): AdminTokenData {
    if (!token) {
      throw new BadSession("Missing authorization token");
    }

    try {
      const data = this.verify(token);
      return { user: parseInt(data.user) as UserID, email: data.email || "" };
    } catch {
      throw new BadSession("Invalid session");
    }
  }
}
