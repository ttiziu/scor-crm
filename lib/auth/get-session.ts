import { getSessionCookie } from "./cookies";
import { verifyToken } from "./jwt";
import type { JWTPayload } from "./jwt";

export type Session = JWTPayload;

export async function getSession(request: Request): Promise<Session | null> {
  const token = getSessionCookie(request);
  if (!token) return null;
  return verifyToken(token);
}
