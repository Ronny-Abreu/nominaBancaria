"use client";

import { useState } from "react";
import { updatePassword } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { useAuth } from "@/lib/auth/useAuth";
import { landingPathFor } from "@/lib/auth/roles";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

export default function CambiarPasswordPage() {
  const { usuario } = useAuth();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);
    try {
      if (!auth.currentUser) throw new Error("no-user");
      await updatePassword(auth.currentUser, password);

      const freshIdToken = await auth.currentUser.getIdToken(true);
      const sessionRes = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken: freshIdToken }),
      });
      if (!sessionRes.ok) throw new Error("session-refresh-failed");

      const res = await fetch("/api/me/password-changed", { method: "POST" });
      if (!res.ok) throw new Error("update-failed");
      window.location.href = usuario ? landingPathFor(usuario.rol) : "/dashboard";
    } catch {
      setError(
        "No se pudo actualizar la contraseña. Vuelve a iniciar sesión e inténtalo de nuevo."
      );
      setLoading(false);
    }
  }

  return (
    <div className="max-w-sm">
      <h1 className="font-display text-2xl font-semibold text-ink">
        Establece tu nueva contraseña
      </h1>
      <p className="mt-1 text-sm text-ink-muted">
        Por seguridad, debes cambiar la contraseña temporal antes de continuar.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
        <Input
          label="Nueva contraseña"
          type="password"
          name="password"
          autoComplete="new-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          hint="Mínimo 8 caracteres."
        />
        <Input
          label="Confirmar contraseña"
          type="password"
          name="confirm"
          autoComplete="new-password"
          required
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
        {error && (
          <p role="alert" className="text-sm text-rust">
            {error}
          </p>
        )}
        <Button type="submit" loading={loading} className="mt-2 w-full">
          Guardar y continuar
        </Button>
      </form>
    </div>
  );
}
