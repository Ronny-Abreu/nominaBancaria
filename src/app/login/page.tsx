"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";
import { auth } from "@/lib/firebase/client";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";

const RESET_GENERIC_MSG =
  "Si el correo está registrado, enviamos instrucciones para restablecer la contraseña.";

const MOTIVO_MSG: Record<string, string> = {
  "cuenta-desactivada": "Tu cuenta fue desactivada. Contacta a un administrador.",
  "cuenta-eliminada": "Tu cuenta fue eliminada. Contacta a un administrador.",
  "sesion-revocada":
    "Tu cuenta presentó una actividad inusual, comunícate con el administrador para que te suministre la nueva contraseña.",
};

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageInner />
    </Suspense>
  );
}

function LoginPageInner() {
  const searchParams = useSearchParams();
  const motivoMsg = MOTIVO_MSG[searchParams.get("motivo") ?? ""] ?? null;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [resetMode, setResetMode] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMsg, setResetMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await credential.user.getIdToken();
      const res = await fetch("/api/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ idToken }),
      });
      if (!res.ok) throw new Error("session-failed");
      window.location.href = "/dashboard";
    } catch {
      setError("Correo o contraseña incorrectos.");
      setLoading(false);
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setResetMsg(null);
    setResetLoading(true);
    // Enviamos el correo (Firebase) y dejamos traza de auditoría en paralelo.
    // Cualquiera de los dos puede fallar sin cambiar el mensaje genérico que
    // ve el usuario, para no revelar si el correo existe.
    await Promise.allSettled([
      sendPasswordResetEmail(auth, email),
      fetch("/api/auth/reset-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      }),
    ]);
    setResetMsg(RESET_GENERIC_MSG);
    setResetLoading(false);
  }

  return (
    <div className="flex min-h-full flex-1">
      <div className="relative hidden w-1/2 flex-col justify-between overflow-hidden bg-ink px-12 py-14 text-paper lg:flex">
        <GuillochePattern />
        <div className="relative z-10">
          <p className="font-mono text-xs tracking-[0.3em] text-paper/60 uppercase">
            Simulación de pago
          </p>
          <h1 className="mt-3 font-display text-5xl font-semibold leading-[1.05] tracking-tight">
            Nómina
            <br />
            Bancaria
          </h1>
        </div>
        <p className="relative z-10 max-w-sm font-mono text-sm leading-relaxed text-paper/70">
          Registro de empleados, cálculo de deducciones y distribución de
          recibos de pago — todo en un solo lugar.
        </p>
      </div>

      <div className="flex flex-1 items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <h1 className="font-display text-3xl font-semibold text-ink">Nómina Bancaria</h1>
          </div>
          {motivoMsg && (
            <p role="alert" className="mb-4 border border-rust/40 bg-rust/10 px-3 py-2 text-sm text-rust">
              {motivoMsg}
            </p>
          )}
          <h2 className="font-display text-2xl font-semibold text-ink">
            {resetMode ? "Restablecer contraseña" : "Iniciar sesión"}
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            {resetMode
              ? "Ingresa tu correo y te enviaremos un enlace para crear una nueva contraseña."
              : "Ingresa con las credenciales provistas por RRHH."}
          </p>

          {resetMode ? (
            <form onSubmit={handleReset} className="mt-8 flex flex-col gap-4">
              <Input
                label="Correo electrónico"
                type="email"
                name="reset-email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              {resetMsg && (
                <p role="status" className="text-sm text-ledger">
                  {resetMsg}
                </p>
              )}
              <Button type="submit" loading={resetLoading} className="mt-2 w-full">
                Enviar instrucciones
              </Button>
              <button
                type="button"
                onClick={() => {
                  setResetMode(false);
                  setResetMsg(null);
                }}
                className="text-sm font-medium text-ledger hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass"
              >
                ← Volver a iniciar sesión
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-4">
              <Input
                label="Correo electrónico"
                type="email"
                name="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Input
                label="Contraseña"
                type="password"
                name="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {error && (
                <p role="alert" className="text-sm text-rust">
                  {error}
                </p>
              )}
              <Button type="submit" loading={loading} className="mt-2 w-full">
                Entrar
              </Button>
              <button
                type="button"
                onClick={() => {
                  setResetMode(true);
                  setError(null);
                }}
                className="text-sm font-medium text-ledger hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass"
              >
                ¿Olvidaste tu contraseña?
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

function GuillochePattern() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute -right-24 -top-24 h-[420px] w-[420px] opacity-[0.18]"
      viewBox="0 0 400 400"
      fill="none"
    >
      {Array.from({ length: 9 }).map((_, i) => (
        <circle
          key={i}
          cx="200"
          cy="200"
          r={40 + i * 20}
          stroke="var(--color-brass)"
          strokeWidth="1"
        />
      ))}
    </svg>
  );
}
