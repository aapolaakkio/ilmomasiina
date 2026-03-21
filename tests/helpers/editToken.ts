import { createHmac } from "crypto";

const BASE32_RFC4648_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

function encodeBase32Rfc4648(bytes: Uint8Array) {
  let output = "";
  let buffer = 0;
  let bitsInBuffer = 0;

  for (const byte of bytes) {
    buffer = (buffer << 8) | byte;
    bitsInBuffer += 8;

    while (bitsInBuffer >= 5) {
      const index = (buffer >> (bitsInBuffer - 5)) & 0b11111;
      output += BASE32_RFC4648_ALPHABET[index];
      bitsInBuffer -= 5;
    }
  }

  if (bitsInBuffer > 0) {
    const index = (buffer << (5 - bitsInBuffer)) & 0b11111;
    output += BASE32_RFC4648_ALPHABET[index];
  }

  return output;
}

/** Generate an edit token for a signup ID. Matches the logic in src/services/signups/editTokens.ts. */
export function generateEditToken(signupId: string): string {
  const secret = process.env.NEW_EDIT_TOKEN_SECRET;
  if (!secret) {
    throw new Error("NEW_EDIT_TOKEN_SECRET is not set");
  }
  const key = Buffer.from(secret, "utf-8");
  const data = Buffer.from(signupId, "utf-8");
  const mac = createHmac("sha256", key).update(data).digest();
  return encodeBase32Rfc4648(mac).substring(0, 13).toLowerCase();
}
