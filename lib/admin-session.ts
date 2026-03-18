import crypto from "crypto";
import { AdminRole } from "@prisma/client";
import { env } from "@/lib/env";

export const ADMIN_SESSION_COOKIE = "admin_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 8;

export type SessionPayload = {
  sub: string;
  email: string;
  role: AdminRole;
  orgId: string | null;
  exp: number;
};

function sign(value: string) {
  return crypto.createHmac("sha256", env.ADMIN_SESSION_SECRET).update(value).digest("base64url");
}

export function createAdminSessionToken(payload: Omit<SessionPayload, "exp">) {
  const fullPayload: SessionPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };

  const encoded = Buffer.from(JSON.stringify(fullPayload)).toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

export function verifyAdminSessionToken(token: string): SessionPayload | null {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;

  const expectedSignature = sign(encoded);
  const sigA = Buffer.from(signature);
  const sigB = Buffer.from(expectedSignature);

  if (sigA.length !== sigB.length) return null;
  if (!crypto.timingSafeEqual(sigA, sigB)) return null;

  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf-8")) as SessionPayload;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}
