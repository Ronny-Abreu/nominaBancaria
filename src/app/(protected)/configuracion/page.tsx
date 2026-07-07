"use client";

import { useEffect, useState } from "react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/Table";
import type { ParametrosFiscales } from "@/types/config";

interface BracketRow {
  upTo: string; // vacío = sin tope (null)
  rate: string; // porcentaje
  base: string;
}

export default function ConfiguracionPage() {
  const [afpPct, setAfpPct] = useState("");
  const [arsPct, setArsPct] = useState("");
  const [brackets, setBrackets] = useState<BracketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/configuracion")
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        const p: ParametrosFiscales | undefined = data.parametros;
        if (!p) return;
        setAfpPct((p.afpRate * 100).toString());
        setArsPct((p.arsRate * 100).toString());
        setBrackets(
          p.isrBrackets.map((b) => ({
            upTo: b.upTo === null ? "" : String(b.upTo),
            rate: String(b.rate * 100),
            base: String(b.base),
          }))
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  function updateBracket(i: number, key: keyof BracketRow, value: string) {
    setBrackets((rows) => rows.map((r, idx) => (idx === i ? { ...r, [key]: value } : r)));
  }

  function addBracket() {
    setBrackets((rows) => [...rows, { upTo: "", rate: "0", base: "0" }]);
  }

  function removeBracket(i: number) {
    setBrackets((rows) => rows.filter((_, idx) => idx !== i));
  }

  async function handleSave() {
    setMessage(null);
    const payload = {
      afpRate: Number(afpPct) / 100,
      arsRate: Number(arsPct) / 100,
      isrBrackets: brackets.map((b) => ({
        upTo: b.upTo.trim() === "" ? null : Number(b.upTo),
        rate: Number(b.rate) / 100,
        base: Number(b.base),
      })),
    };

    setSaving(true);
    try {
      const res = await fetch("/api/configuracion", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        setMessage({ tone: "err", text: "No se pudieron guardar los parámetros. Revisa los valores." });
        return;
      }
      setMessage({ tone: "ok", text: "Parámetros fiscales actualizados. Aplican a las próximas nóminas." });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-ink-muted">
        <Spinner /> Cargando configuración…
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <h1 className="font-display text-3xl font-semibold text-ink">Parámetros fiscales</h1>
      <p className="mt-1 text-sm text-ink-muted">
        Tasas de deducción usadas por el motor de nómina. Los cambios aplican a las
        corridas futuras, no a las ya procesadas. Valores ilustrativos con fines académicos.
      </p>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Input
          label="AFP (%)"
          type="number"
          step="0.01"
          min="0"
          value={afpPct}
          onChange={(e) => setAfpPct(e.target.value)}
        />
        <Input
          label="ARS / SFS (%)"
          type="number"
          step="0.01"
          min="0"
          value={arsPct}
          onChange={(e) => setArsPct(e.target.value)}
        />
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold text-ink">Tramos ISR</h2>
          <Button variant="secondary" onClick={addBracket} className="px-2.5 py-1 text-xs">
            Agregar tramo
          </Button>
        </div>
        <p className="mt-1 text-sm text-ink-muted">
          Aplicados sobre la base imponible (bruto − AFP − ARS). Deja el tope vacío en el
          último tramo (sin límite superior). La base es el impuesto acumulado de tramos anteriores.
        </p>

        <div className="mt-4">
          <Table>
            <THead>
              <TR>
                <TH>Tope (RD$)</TH>
                <TH>Tasa (%)</TH>
                <TH>Base acumulada (RD$)</TH>
                <TH></TH>
              </TR>
            </THead>
            <TBody>
              {brackets.map((b, i) => (
                <TR key={i}>
                  <TD>
                    <input
                      type="number"
                      value={b.upTo}
                      placeholder="Sin tope"
                      onChange={(e) => updateBracket(i, "upTo", e.target.value)}
                      className="w-32 border border-rule bg-paper px-2 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass"
                    />
                  </TD>
                  <TD>
                    <input
                      type="number"
                      step="0.01"
                      value={b.rate}
                      onChange={(e) => updateBracket(i, "rate", e.target.value)}
                      className="w-24 border border-rule bg-paper px-2 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass"
                    />
                  </TD>
                  <TD>
                    <input
                      type="number"
                      step="0.01"
                      value={b.base}
                      onChange={(e) => updateBracket(i, "base", e.target.value)}
                      className="w-32 border border-rule bg-paper px-2 py-1 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass"
                    />
                  </TD>
                  <TD>
                    <button
                      onClick={() => removeBracket(i)}
                      className="text-sm font-medium text-rust hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brass"
                    >
                      Quitar
                    </button>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </div>
      </div>

      {message && (
        <p role="alert" className={`mt-5 text-sm ${message.tone === "ok" ? "text-ledger" : "text-rust"}`}>
          {message.text}
        </p>
      )}

      <div className="mt-6">
        <Button onClick={handleSave} loading={saving}>
          Guardar parámetros
        </Button>
      </div>
    </div>
  );
}
