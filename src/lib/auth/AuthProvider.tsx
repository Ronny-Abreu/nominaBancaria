"use client";

import { createContext, useEffect, useRef, useState } from "react";
import type { User } from "firebase/auth";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/client";
import type { Usuario } from "@/types/user";

interface AuthContextValue {
  firebaseUser: User | null;
  usuario: Usuario | null;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextValue>({
  firebaseUser: null,
  usuario: null,
  loading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [loading, setLoading] = useState(true);
  const forcingLogoutRef = useRef(false);
  // Solo forzamos el logout si YA habíamos visto un perfil ACTIVO para este
  // usuario y luego desapareció/se desactivó. Esto evita actuar durante el
  // transitorio inicial del login (usuario aún null, sin cookie de sesión).
  const hadActiveProfileRef = useRef(false);

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setUsuario(null);
      if (!user) setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!firebaseUser) return;
    // Nuevo usuario / re-suscripción: aún no hemos confirmado un perfil activo.
    hadActiveProfileRef.current = false;
    return onSnapshot(doc(db, "usuarios", firebaseUser.uid), (snap) => {
      const u = snap.exists() ? (snap.data() as Usuario) : null;
      if (u && u.activo) hadActiveProfileRef.current = true;
      setUsuario(u);
      setLoading(false);
    });
  }, [firebaseUser]);

  // Cierre de sesión en tiempo real: el listener de arriba recibe al instante la
  // actualización de Firestore cuando RRHH/Admin desactiva o elimina la cuenta
  // mientras la pestaña sigue abierta.
  //
  // Solo actuamos si `hadActiveProfileRef` es true (ya habíamos cargado un
  // perfil activo) — así no se dispara durante el login (usuario transitoriamente
  // null antes de que exista la cookie de sesión y cargue el snapshot). Además
  // confirmamos contra /api/me/status (misma lectura vía Admin SDK que el layout)
  // antes de cerrar sesión, para no reaccionar a glitches del listener cliente.
  useEffect(() => {
    if (loading || !firebaseUser || forcingLogoutRef.current) return;
    if (!hadActiveProfileRef.current) return;
    const posibleDesactivada = usuario !== null && !usuario.activo;
    const posibleEliminada = usuario === null;
    if (!posibleDesactivada && !posibleEliminada) return;

    let cancelled = false;
    (async () => {
      const res = await fetch("/api/me/status").catch(() => null);
      if (cancelled || !res || res.ok) return; // sin respuesta o el servidor confirma que está bien: no actuamos

      if (forcingLogoutRef.current) return;
      forcingLogoutRef.current = true;

      const data: { reason?: string } | null = await res.json().catch(() => null);
      await fetch("/api/session", { method: "DELETE" }).catch(() => {});
      await signOut(auth).catch(() => {});
      const motivo =
        data?.reason === "not_found"
          ? "cuenta-eliminada"
          : data?.reason === "inactive"
            ? "cuenta-desactivada"
            : null;
      window.location.href = motivo ? `/login?motivo=${motivo}` : "/login";
    })();

    return () => {
      cancelled = true;
    };
  }, [loading, firebaseUser, usuario]);

  return (
    <AuthContext.Provider value={{ firebaseUser, usuario, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
