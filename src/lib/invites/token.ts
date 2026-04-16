import { randomBytes } from "node:crypto";

/**
 * URL-safe 128-bit token suitable for an invite link. 16 bytes encoded
 * base64url is 22 chars — collision-resistant for our purposes and short
 * enough to paste into iMessage.
 */
export function generateInviteToken(): string {
  return randomBytes(16).toString("base64url");
}
