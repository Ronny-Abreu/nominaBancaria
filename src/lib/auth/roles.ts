import type { Rol } from "@/types/user";

export const ROLES: Rol[] = ["admin", "rrhh", "empleado"];

export function isRrhhOrAdmin(rol: Rol | null | undefined): boolean {
  return rol === "rrhh" || rol === "admin";
}

export function isAdmin(rol: Rol | null | undefined): boolean {
  return rol === "admin";
}

export function canAssignRol(callerRol: Rol, targetRol: Rol): boolean {
  if (callerRol === "admin") return true;
  if (callerRol === "rrhh") return targetRol === "empleado";
  return false;
}

export function landingPathFor(rol: Rol): string {
  if (rol === "empleado") return "/mi-perfil";
  return "/dashboard";
}

const PATH_ROLES: Array<{ prefix: string; roles: Rol[] }> = [
  { prefix: "/dashboard", roles: ["admin", "rrhh"] },
  { prefix: "/empleados", roles: ["admin", "rrhh"] },
  { prefix: "/nomina", roles: ["admin", "rrhh"] },
  { prefix: "/usuarios", roles: ["admin"] },
  { prefix: "/mi-perfil", roles: ["empleado"] },
];

/** Returns null when the path has no role restriction. */
export function getAllowedRolesForPath(pathname: string): Rol[] | null {
  const match = PATH_ROLES.find((entry) => pathname.startsWith(entry.prefix));
  return match ? match.roles : null;
}
