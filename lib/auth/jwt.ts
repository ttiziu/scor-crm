import * as jose from "jose";

const COOKIE_MAX_AGE_SEC = 60 * 60 * 24 * 7; // 7 días

export type JWTPayload = {
  userId: string;
  tenantId: string;
  username: string;
  role: string;
  exp: number;
};

const getSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error("JWT_SECRET must be set and at least 16 characters");
  }
  return new TextEncoder().encode(secret);
};

export async function createToken(payload: Omit<JWTPayload, "exp">): Promise<string> {
  const secret = getSecret();
  return await new jose.SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${COOKIE_MAX_AGE_SEC}s`)
    .sign(secret);
}

export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const secret = getSecret();
    const { payload } = await jose.jwtVerify(token, secret);
    return payload as unknown as JWTPayload;
  } catch {
    return null;
  }
}
