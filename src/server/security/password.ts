import "server-only";
import bcrypt from "bcryptjs";
const WORK_FACTOR = 12;

export async function hashPassword(password: string): Promise<string> {
  if (bcrypt.truncates(password)) throw new Error("Password exceeds bcrypt's 72-byte input limit");
  return bcrypt.hash(password, WORK_FACTOR);
}

export async function verifyPassword(password: string, encoded: string): Promise<boolean> {
  if (!encoded.startsWith("$2") || bcrypt.truncates(password)) return false;
  return bcrypt.compare(password, encoded);
}
