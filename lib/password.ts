import "server-only";
import { randomBytes, scrypt as scryptCb, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCb) as (pw: string, salt: Buffer, len: number) => Promise<Buffer>;

/** Format: scrypt$<salt b64>$<hash b64> */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scrypt(password, salt, 64);
  return `scrypt$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export async function checkPassword(password: string, stored: string | null): Promise<boolean> {
  // Always do the work, so timing doesn't reveal whether the account exists.
  const [algo, saltB64, hashB64] = (stored ?? "scrypt$AAAAAAAAAAAAAAAAAAAAAA==$").split("$");
  if (algo !== "scrypt") return false;
  const expected = Buffer.from(hashB64 ?? "", "base64");
  const actual = await scrypt(password, Buffer.from(saltB64, "base64"), 64);
  return !!stored && expected.length === actual.length && timingSafeEqual(expected, actual);
}
