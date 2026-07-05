"use client";

import { useAuth } from "@/lib/auth/useAuth";
import type { Rol } from "@/types/user";

export function RoleGate({
  allow,
  children,
}: {
  allow: Rol[];
  children: React.ReactNode;
}) {
  const { usuario } = useAuth();
  if (!usuario || !allow.includes(usuario.rol)) return null;
  return <>{children}</>;
}
