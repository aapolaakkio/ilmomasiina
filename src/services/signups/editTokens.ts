import { createHash, createHmac } from "crypto";

import type { SignupID } from "@/db/schema";

import { env } from "@/env";

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

function generateLegacyToken(signupId: SignupID) {
  const data = Buffer.from(`${signupId}${env.EDIT_TOKEN_SALT}`, "utf-8");
  return createHash("md5").update(data).digest().toString("hex");
}

export function generateToken(signupId: SignupID) {
  const key = Buffer.from(env.NEW_EDIT_TOKEN_SECRET!, "utf-8");
  const data = Buffer.from(signupId, "utf-8");
  const mac = createHmac("sha256", key).update(data).digest();
  return encodeBase32Rfc4648(mac).substring(0, 13).toLowerCase();
}

export function verifyToken(signupId: SignupID, token: string) {
  let expectedToken;
  if (token && env.EDIT_TOKEN_SALT && token.length === 32) {
    expectedToken = generateLegacyToken(signupId);
  } else {
    expectedToken = generateToken(signupId);
  }
  return token === expectedToken;
}
