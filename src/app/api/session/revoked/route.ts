import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/session";

// El layout redirige aquí cuando detecta SessionRevokedError.
// Este route handler puede modificar cookies, borra la sesión revocada
// y redirige a /login con el motivo.
export async function GET(req: Request) {
  const url = new URL("/login?motivo=sesion-revocada", req.url);
  const res = NextResponse.redirect(url);
  res.cookies.set(SESSION_COOKIE_NAME, "", { path: "/", maxAge: 0 });
  return res;
}
