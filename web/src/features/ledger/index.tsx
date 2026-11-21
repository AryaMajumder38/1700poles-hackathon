"use client";

import { Layers } from "lucide-react";

export default function LedgerView() {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700 border border-amber-200">
          <Layers className="h-5 w-5" />
        </div>
        <div>
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
            Track B — Nehal (Branch: Nehal)
          </span>
          <h2 className="mt-2 text-lg font-semibold text-slate-900">
            Job 1: &ldquo;See It&rdquo; — Godown &amp; Contractor Ledger Explorer
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Placeholder module ready for Track B implementation inside{" "}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-800">
              /web/src/features/ledger/**
            </code>
            . Consume{" "}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-800">
              /data/metadata.json
            </code>
            ,{" "}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-800">
              /data/ledger_monthly.json
            </code>
            , and{" "}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-800">
              /data/contractor_stock.json
            </code>
            .
          </p>
        </div>
      </div>
    </section>
  );
}
