import { NextRequest, NextResponse } from "next/server";
import { createSession, SESSION_COOKIE_NAME } from "@/lib/auth/session";

export async function POST(req: NextRequest) {
  try {
    const { idToken } = await req.json();
    if (!idToken || typeof idToken !== "string") {
      return NextResponse.json({ error: "idToken requerido" }, { status: 400 });
    }

    let sessionCookie: string;
    try {
      sessionCookie = await createSession(idToken);
    } catch (err: any) {
      console.error("Firebase Admin Error interno (createSession):", err);
      return NextResponse.json(
        { error: "Token inválido o Firebase Admin falló", details: err?.message || String(err) },
        { status: 500 }
      );
    }

    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE_NAME, sessionCookie, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 5,
    });
    return res;
  } catch (globalError: any) {
    console.error("Error Global en /api/session:", globalError);
    return NextResponse.json(
      { error: "Error interno del servidor", details: globalError?.message || String(globalError) },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE_NAME, "", { path: "/", maxAge: 0 });
  return res;
}
