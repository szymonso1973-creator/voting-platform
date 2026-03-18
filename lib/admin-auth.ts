import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { AdminRole } from "@prisma/client";
import { createAdminSessionToken, verifyAdminSessionToken, ADMIN_SESSION_COOKIE, SESSION_TTL_SECONDS } from "@/lib/admin-session";
import { db } from "@/lib/prisma";

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}

export async function authenticateAdmin(email: string, password: string) {
  const normalizedEmail = email.toLowerCase().trim();

  const admin = await db.adminUser.findUnique({
    where: { email: normalizedEmail },
    include: { organization: true },
  });

  if (!admin || !admin.isActive) {
    throw new Error("INVALID_CREDENTIALS");
  }

  const ok = await verifyPassword(password, admin.passwordHash);
  if (!ok) {
    throw new Error("INVALID_CREDENTIALS");
  }

  await db.adminUser.update({
    where: { id: admin.id },
    data: { lastLoginAt: new Date() },
  });

  return admin;
}

export async function setAdminSessionCookie(admin: { id: string; email: string; role: AdminRole; orgId: string | null }) {
  const token = createAdminSessionToken({
    sub: admin.id,
    email: admin.email,
    role: admin.role,
    orgId: admin.orgId,
  });

  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function clearAdminSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(0),
  });
}

export async function getAdminSessionFromCookie() {
  const cookieStore = await cookies();
  const raw = cookieStore.get(ADMIN_SESSION_COOKIE)?.value;
  if (!raw) return null;

  const payload = verifyAdminSessionToken(raw);
  if (!payload) return null;

  const admin = await db.adminUser.findUnique({
    where: { id: payload.sub },
    include: { organization: true },
  });

  if (!admin || !admin.isActive) return null;
  return admin;
}

export async function requireAdmin(allowedRoles?: AdminRole[]) {
  const admin = await getAdminSessionFromCookie();

  if (!admin) {
    throw new Error("UNAUTHORIZED");
  }

  if (allowedRoles && !allowedRoles.includes(admin.role)) {
    throw new Error("FORBIDDEN");
  }

  return admin;
}
