"use client";

import { Compass } from "lucide-react";

export default function PlannerView() {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700 border border-blue-200">
          <Compass className="h-5 w-5" />
        </div>
        <div>
          <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
            Track C — Jaggesh (Branch: jagesh)
          </span>
          <h2 className="mt-2 text-lg font-semibold text-slate-900">
            Job 2: &ldquo;Plan It&rdquo; — Causal Replay, Transfers &amp; Ordering Planner
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-slate-600">
            Placeholder module ready for Track C implementation inside{" "}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-800">
              /web/src/features/planner/**
            </code>{" "}
            and{" "}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-800">
              /pipeline/simulate_plan.py
            </code>
            . Outputs{" "}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-800">
              /data/simulation_default.json
            </code>{" "}
            and{" "}
            <code className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-xs text-slate-800">
              /data/backtest_summary.json
            </code>
            .
          </p>
        </div>
      </div>
    </section>
  );
}
