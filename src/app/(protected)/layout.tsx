import { redirect } from "next/navigation";
import { headers } from "next/headers";
import {
  requireSession,
  UnauthorizedError,
  ProfileNotFoundError,
  ForbiddenError,
} from "@/lib/auth/session";
import { getAllowedRolesForPath, landingPathFor } from "@/lib/auth/roles";
import { Sidebar } from "@/components/layout/Sidebar";
import { Navbar } from "@/components/layout/Navbar";
import { SignOutButton } from "@/components/layout/SignOutButton";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let session;
  try {
    session = await requireSession();
  } catch (err) {
    if (err instanceof UnauthorizedError) redirect("/login");

    if (err instanceof ProfileNotFoundError) {
      return (
        <SessionErrorScreen
          title="Perfil no encontrado"
          message="Iniciaste sesión correctamente, pero no existe un documento en Firestore (colección usuarios) cuyo ID coincida con tu UID de Firebase Authentication. Verifica en la consola de Firebase que el documento use exactamente ese UID como ID de documento, no uno autogenerado."
        />
      );
    }

    if (err instanceof ForbiddenError) {
      return (
        <SessionErrorScreen
          title="Cuenta desactivada"
          message="Esta cuenta fue desactivada. Contacta a un administrador si crees que es un error."
        />
      );
    }

    throw err;
  }

  const { usuario } = session;
  const pathname = (await headers()).get("x-pathname") ?? "";

  if (usuario.mustChangePassword && pathname !== "/cambiar-password") {
    redirect("/cambiar-password");
  }
  if (!usuario.mustChangePassword && pathname === "/cambiar-password") {
    redirect(landingPathFor(usuario.rol));
  }

  const allowedRoles = getAllowedRolesForPath(pathname);
  if (allowedRoles && !allowedRoles.includes(usuario.rol)) {
    redirect(landingPathFor(usuario.rol));
  }

  return (
    <div className="flex min-h-full flex-1">
      <Sidebar rol={usuario.rol} />
      <div className="flex flex-1 flex-col">
        <Navbar nombre={`${usuario.nombre} ${usuario.apellido}`} rol={usuario.rol} />
        <main className="flex-1 bg-paper px-6 py-8">{children}</main>
      </div>
    </div>
  );
}

function SessionErrorScreen({ title, message }: { title: string; message: string }) {
  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-paper px-6">
      <div className="max-w-md border border-rule bg-paper p-8 text-center">
        <h1 className="font-display text-2xl font-semibold text-rust">{title}</h1>
        <p className="mt-3 text-sm text-ink-muted">{message}</p>
        <div className="mt-6 flex justify-center">
          <SignOutButton>Cerrar sesión</SignOutButton>
        </div>
      </div>
    </div>
  );
}
