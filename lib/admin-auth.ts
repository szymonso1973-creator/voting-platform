import crypto from "crypto";
import { cookies } from "next/headers";
import { AdminRole } from "@prisma/client";
import { db } from "@/lib/prisma";

const ADMIN_SESSION_COOKIE = "admin_session";
const SESSION_TTL_SECONDS = 60 * 60 * 8;

type SessionPayload = {
  sub: string;
  email: string;
  role: AdminRole;
  orgId: string | null;
  exp: number;
};

function getSessionSecret() {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error("MISSING_ADMIN_SESSION_SECRET");
  return secret;
}

export function hashPassword(password: string) {
  const salt = process.env.ADMIN_PASSWORD_SALT ?? "admin-password-salt";
  return crypto.pbkdf2Sync(password, salt, 100000, 64, "sha512").toString("hex");
}

function sign(value: string) {
  return crypto.createHmac("sha256", getSessionSecret()).update(value).digest("base64url");
}

export function createAdminSessionToken(payload: Omit<SessionPayload, "exp">) {
  const fullPayload: SessionPayload = { ...payload, exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS };
  const encoded = Buffer.from(JSON.stringify(fullPayload)).toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

export function verifyAdminSessionToken(token: string): SessionPayload | null {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;
  if (sign(encoded) !== signature) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf-8")) as SessionPayload;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export async function authenticateAdmin(email: string, password: string) {
  const admin = await db.adminUser.findUnique({ where: { email: email.toLowerCase().trim() }, include: { organization: true } });
  if (!admin || !admin.isActive) throw new Error("INVALID_CREDENTIALS");
  if (hashPassword(password) !== admin.passwordHash) throw new Error("INVALID_CREDENTIALS");
  await db.adminUser.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } });
  return admin;
}

export async function setAdminSessionCookie(admin: { id: string; email: string; role: AdminRole; orgId: string | null; }) {
  const token = createAdminSessionToken({ sub: admin.id, email: admin.email, role: admin.role, orgId: admin.orgId });
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: SESSION_TTL_SECONDS });
}

export async function clearAdminSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, "", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", expires: new Date(0) });
}

export async function getAdminSessionFromCookie() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (!raw) return null;
  const payload = verifyAdminSessionToken(raw);
  if (!payload) return null;
  return db.adminUser.findUnique({ where: { id: payload.sub }, include: { organization: true } });
}

export async function requireAdmin(allowedRoles?: AdminRole[]) {
  const admin = await getAdminSessionFromCookie();
  if (!admin || !admin.isActive) throw new Error("UNAUTHORIZED");
  if (allowedRoles && !allowedRoles.includes(admin.role)) throw new Error("FORBIDDEN");
  return admin;
}
