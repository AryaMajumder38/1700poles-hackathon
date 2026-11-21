"use client";

import { GitCompareArrows } from "lucide-react";

export default function SetsView() {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
          <GitCompareArrows className="h-5 w-5" />
        </div>
        <div>
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
            Track D — Manish (Branch: Manish)
          </span>
          <h2 className="mt-2 text-lg font-semibold text-slate-900">
            Job 3: &ldquo;Match Sets&rdquo; — Kit Balance &amp; Bottleneck Diagnostics
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Placeholder module ready for Track D implementation inside{" "}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-800">
              /web/src/features/sets/**
            </code>{" "}
            and{" "}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-800">
              /pipeline/analyze_sets.py
            </code>
            . Outputs{" "}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-800">
              /data/sets_imbalance.json
            </code>
            .
          </p>
        </div>
      </div>
    </section>
  );
}
