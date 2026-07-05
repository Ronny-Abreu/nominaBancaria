"use client";

import { createContext, useEffect, useState } from "react";
import type { User } from "firebase/auth";
import { onAuthStateChanged } from "firebase/auth";
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

  useEffect(() => {
    return onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setUsuario(null);
      if (!user) setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!firebaseUser) return;
    return onSnapshot(doc(db, "usuarios", firebaseUser.uid), (snap) => {
      setUsuario(snap.exists() ? (snap.data() as Usuario) : null);
      setLoading(false);
    });
  }, [firebaseUser]);

  return (
    <AuthContext.Provider value={{ firebaseUser, usuario, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
