import { AdminRole } from "@prisma/client";

export function canRead(role: AdminRole) {
  return [AdminRole.SUPER_ADMIN, AdminRole.ORG_ADMIN, AdminRole.OPERATOR, AdminRole.VIEWER].includes(role);
}

export function canWrite(role: AdminRole) {
  return [AdminRole.SUPER_ADMIN, AdminRole.ORG_ADMIN, AdminRole.OPERATOR].includes(role);
}

export function orgWhere(admin: { role: AdminRole; orgId: string | null }) {
  if (admin.role === AdminRole.SUPER_ADMIN) return {};
  return { orgId: admin.orgId ?? "" };
}
