import { AdminRole } from "@prisma/client";

export function canRead(role: AdminRole): boolean {
  return (
    role === AdminRole.SUPER_ADMIN ||
    role === AdminRole.ORG_ADMIN ||
    role === AdminRole.OPERATOR ||
    role === AdminRole.VIEWER
  );
}

export function canWrite(role: AdminRole): boolean {
  return (
    role === AdminRole.SUPER_ADMIN ||
    role === AdminRole.ORG_ADMIN ||
    role === AdminRole.OPERATOR
  );
}

export function orgWhere(admin: { role: AdminRole; orgId: string | null }) {
  if (admin.role === AdminRole.SUPER_ADMIN) {
    return {};
  }

  return {
    orgId: admin.orgId ?? "",
  };
}