import Link from "next/link";
import type { Rol } from "@/types/user";

interface NavItem {
  href: string;
  label: string;
  roles: Rol[];
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", roles: ["admin", "rrhh"] },
  { href: "/empleados", label: "Empleados", roles: ["admin", "rrhh"] },
  { href: "/nomina", label: "Nómina", roles: ["admin", "rrhh"] },
  { href: "/nomina/historial", label: "Historial de nómina", roles: ["admin", "rrhh"] },
  { href: "/usuarios", label: "Usuarios", roles: ["admin"] },
  { href: "/configuracion", label: "Configuración", roles: ["admin"] },
  { href: "/auditoria", label: "Auditoría", roles: ["admin"] },
  { href: "/mi-perfil", label: "Mi perfil", roles: ["empleado"] },
];

export function Sidebar({ rol }: { rol: Rol }) {
  const items = NAV_ITEMS.filter((item) => item.roles.includes(rol));

  return (
    <aside className="hidden w-56 shrink-0 flex-col bg-ink px-5 py-6 text-paper md:flex">
      <span className="font-display text-lg font-semibold tracking-tight">
        Nómina Bancaria
      </span>
      <nav className="mt-8 flex flex-col gap-1">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="px-3 py-2 text-sm font-medium text-paper/80 transition-colors hover:bg-paper/10 hover:text-paper focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
