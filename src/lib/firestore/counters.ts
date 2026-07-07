import "server-only";
import { adminDb } from "@/lib/firebase/admin";


export async function nextSequence(name: string): Promise<number> {
  const ref = adminDb.collection("counters").doc(name);
  return adminDb.runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const current = snap.exists ? (snap.data()!.seq as number) : 0;
    const next = current + 1;
    tx.set(ref, { seq: next }, { merge: true });
    return next;
  });
}

/** Generates the next unique employee/user code, e.g. "EMP-00001". */
export async function generateCodigoEmpleado(): Promise<string> {
  const seq = await nextSequence("empleados");
  return `EMP-${String(seq).padStart(5, "0")}`;
}
