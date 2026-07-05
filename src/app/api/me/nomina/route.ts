import { NextResponse } from "next/server";
import { requireSession, UnauthorizedError } from "@/lib/auth/session";
import { adminDb } from "@/lib/firebase/admin";
import type { NominaRun, NominaItem } from "@/types/nomina";

export async function GET() {
  let session;
  try {
    session = await requireSession();
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    throw err;
  }

  const runsSnap = await adminDb.collection("nominaRuns").orderBy("createdAt", "desc").get();
  const runs = runsSnap.docs.map((d) => d.data() as NominaRun);

  const itemSnaps = await Promise.all(
    runs.map((run) =>
      adminDb.collection("nominaRuns").doc(run.runId).collection("items").doc(session.uid).get()
    )
  );

  const historial = runs
    .map((run, i) => {
      const itemSnap = itemSnaps[i];
      if (!itemSnap.exists) return null;
      const item = itemSnap.data() as NominaItem;
      return {
        runId: run.runId,
        periodo: run.periodo,
        estado: item.estado,
        salarioNeto: item.salarioNeto,
        emailEnviadoAt: item.emailEnviadoAt,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  return NextResponse.json({ historial });
}
