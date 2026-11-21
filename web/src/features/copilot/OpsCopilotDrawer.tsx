"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bot,
  Check,
  Copy,
  Database,
  Loader2,
  Send,
  Sparkles,
  Wrench,
  X,
} from "lucide-react";

interface ToolTrace {
  tool: string;
  args: Record<string, unknown>;
  summary: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  engine?: string;
  toolTraces?: ToolTrace[];
  draftMemo?: string | null;
}

interface OpsCopilotDrawerProps {
  activeTab: "ledger" | "planner" | "sets";
}

const STARTER_PROMPTS = [
  {
    label: "Hinglish Storekeeper",
    text: "Etawah mein 3-phase box (Set 1.078) kyu ruka hai aur kahan se transfer karein?",
  },
  {
    label: "LP Pole Transfer Memo",
    text: "What transfers should we execute for PCC poles in 2023-11? Draft a dispatch note.",
  },
  {
    label: "Shared Bolt Collision",
    text: "Show me where shared bolt MNB010174 is blocking all 3 sets at once.",
  },
  {
    label: "The Bar Proof",
    text: "Summarize The Bar backtest savings for PCC poles and across all 16 SKUs.",
  },
];

function renderFormattedLines(text: string) {
  return text.split("\n").map((line, idx) => {
    const parts = line.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
    return (
      <p key={idx} className={line.trim() === "" ? "h-1.5" : "leading-relaxed"}>
        {parts.map((part, i) => {
          if (part.startsWith("**") && part.endsWith("**")) {
            return (
              <strong key={i} className="font-semibold text-slate-950">
                {part.slice(2, -2)}
              </strong>
            );
          }
          if (part.startsWith("`") && part.endsWith("`")) {
            return (
              <code
                key={i}
                className="rounded bg-slate-200/80 px-1 py-0.5 font-mono text-[11px] text-slate-900"
              >
                {part.slice(1, -1)}
              </code>
            );
          }
          return <span key={i}>{part}</span>;
        })}
      </p>
    );
  });
}

function engineBadgeLabel(engine?: string): string {
  if (!engine) return "Grounded JSON Engine";
  if (engine.startsWith("sarvam")) return `Sarvam AI • ${engine}`;
  if (engine.startsWith("gemini")) return `Gemini • ${engine}`;
  return "Local Grounded Engine (Zero-Key Mode)";
}

export default function OpsCopilotDrawer({ activeTab }: OpsCopilotDrawerProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeEngine, setActiveEngine] = useState<string | undefined>(
    undefined
  );
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Namaste! I am Lumino's **Grounded Ops Copilot**. Ask in **English, Hindi, or Hinglish** about godown stock, LP transfers, or kit bottlenecks—every number is fetched live from our verified JSON datasets (never guessed).",
    },
  ]);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const launcherRef = useRef<HTMLButtonElement | null>(null);
  const copyTimerRef = useRef<number | null>(null);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!open) {
      if (wasOpenRef.current) {
        wasOpenRef.current = false;
        launcherRef.current?.focus();
      }
      return;
    }

    wasOpenRef.current = true;
    const raf = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(raf);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!open || !scrollRef.current) return;
    const raf = window.requestAnimationFrame(() => {
      if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
      }
    });
    return () => window.cancelAnimationFrame(raf);
  }, [messages, open, sending]);

  async function sendMessage(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: trimmed,
    };
    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setInput("");
    setSending(true);

    try {
      const res = await fetch("/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activeTab,
          messages: nextHistory
            .filter((m) => m.id !== "welcome")
            .map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const data = (await res.json()) as {
        reply?: string;
        engine?: string;
        toolTraces?: ToolTrace[];
        draftMemo?: string | null;
        error?: string;
      };

      if (!res.ok || data.error) {
        throw new Error(data.error || "Copilot request failed.");
      }

      setActiveEngine(data.engine);
      setMessages((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: data.reply ?? "No response returned.",
          engine: data.engine,
          toolTraces: data.toolTraces ?? [],
          draftMemo: data.draftMemo ?? null,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `e-${Date.now()}`,
          role: "assistant",
          content: `Could not reach Ops Copilot: ${
            err instanceof Error ? err.message : "Unknown error"
          }`,
        },
      ]);
    } finally {
      setSending(false);
    }
  }

  async function handleCopyMemo(id: string, memo: string) {
    try {
      await navigator.clipboard.writeText(memo);
      if (copyTimerRef.current !== null) {
        window.clearTimeout(copyTimerRef.current);
      }
      setCopiedId(id);
      copyTimerRef.current = window.setTimeout(() => {
        setCopiedId(null);
        copyTimerRef.current = null;
      }, 2000);
    } catch {
      // Ignore clipboard failures in restricted environments
    }
  }

  return (
    <>
      {/* Floating Launcher Button */}
      {!open && (
        <button
          ref={launcherRef}
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open Lumino Ops Copilot"
          className="fixed bottom-4 right-4 z-40 inline-flex max-w-[calc(100vw-2rem)] items-center gap-2.5 rounded-full border border-slate-700 bg-slate-950 px-3.5 py-2.5 text-sm font-semibold text-white shadow-lg transition-transform hover:scale-105 hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 sm:bottom-5 sm:right-5 sm:px-4 sm:py-3 cursor-pointer"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500 text-slate-950">
            <Sparkles className="h-4 w-4" />
          </span>
          <span className="truncate">Ops Copilot</span>
          <span className="hidden rounded-full bg-emerald-500/20 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-300 sm:inline-flex">
            GROUNDED AI
          </span>
        </button>
      )}

      {/* Slide-Over Copilot Drawer */}
      {open && (
        <>
          <div
            aria-hidden="true"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 bg-slate-950/25"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="ops-copilot-title"
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col overflow-hidden border-l border-slate-200 bg-white shadow-2xl"
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between gap-2 border-b border-slate-800 bg-slate-950 px-4 py-3.5 text-white">
              <div className="flex min-w-0 items-center gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-slate-950">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <h2
                      id="ops-copilot-title"
                      className="truncate text-sm font-bold leading-none"
                    >
                      Lumino Ops Copilot
                    </h2>
                    <span className="shrink-0 rounded bg-emerald-500/20 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-emerald-300">
                      Tool-Grounded
                    </span>
                  </div>
                  <p className="mt-1 truncate font-mono text-[10px] text-slate-400">
                    {engineBadgeLabel(activeEngine)}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close Ops Copilot"
                className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Starter Prompts Strip */}
            <div className="border-b border-slate-200 bg-slate-50 px-3 py-2.5">
              <div className="mb-1.5 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                <Database className="h-3 w-3 shrink-0 text-amber-600" />
                <span className="truncate">Quick Demo Prompts (English &amp; Hinglish)</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {STARTER_PROMPTS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    disabled={sending}
                    onClick={() => sendMessage(p.text)}
                    className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:border-slate-900 hover:bg-slate-900 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Messages List */}
            <div
              ref={scrollRef}
              aria-live="polite"
              aria-label="Ops Copilot conversation"
              className="flex-1 overflow-y-auto overflow-x-hidden px-3.5 py-4 space-y-4 bg-slate-50/40 sm:px-4"
            >
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex min-w-0 flex-col gap-1.5 ${
                    m.role === "user" ? "items-end" : "items-start"
                  }`}
                >
                  {/* Verified Tool Call Chips */}
                  {m.toolTraces && m.toolTraces.length > 0 && (
                    <div className="flex max-w-full flex-wrap gap-1">
                      {m.toolTraces.map((t, idx) => (
                        <span
                          key={`${m.id}-t-${idx}`}
                          title={JSON.stringify(t.args)}
                          className="inline-flex max-w-full items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 font-mono text-[10px] font-medium text-emerald-900 break-words"
                        >
                          <Wrench className="h-2.5 w-2.5 shrink-0 text-emerald-600" />
                          <span className="min-w-0 truncate">
                            {t.tool}: {t.summary}
                          </span>
                        </span>
                      ))}
                    </div>
                  )}

                  <div
                    className={`max-w-[92%] break-words rounded-xl px-3.5 py-2.5 text-xs shadow-xs ${
                      m.role === "user"
                        ? "bg-slate-900 text-white"
                        : "border border-slate-200 bg-white text-slate-800 space-y-1"
                    }`}
                  >
                    {m.role === "user" ? m.content : renderFormattedLines(m.content)}
                  </div>

                  {/* Copyable Dispatch / Transfer Memo */}
                  {m.draftMemo && (
                    <div className="w-full max-w-[92%] overflow-hidden rounded-xl border border-amber-300 bg-amber-50/80 p-3 text-xs">
                      <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                        <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-amber-900">
                          Ready-to-Send Dispatch Note
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyMemo(m.id, m.draftMemo!)}
                          className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-2 py-1 text-[10px] font-semibold text-white hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-1 cursor-pointer"
                        >
                          {copiedId === m.id ? (
                            <>
                              <Check className="h-3 w-3 text-emerald-400" />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" />
                              Copy for WhatsApp
                            </>
                          )}
                        </button>
                      </div>
                      <pre className="overflow-x-auto whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed text-slate-900">
                        {m.draftMemo}
                      </pre>
                    </div>
                  )}
                </div>
              ))}

              {sending && (
                <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 shadow-xs">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-600" />
                  Querying verified Lumino JSON datasets...
                </div>
              )}
            </div>

            {/* Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage(input);
              }}
              className="border-t border-slate-200 bg-white p-3"
            >
              <label htmlFor="ops-copilot-input" className="sr-only">
                Ask Lumino Ops Copilot
              </label>
              <div className="flex items-center gap-2">
                <input
                  id="ops-copilot-input"
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask in English or Hinglish (e.g. Etawah 3-ph box)..."
                  disabled={sending}
                  className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-slate-900 focus:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-900"
                />
                <button
                  type="submit"
                  disabled={sending || !input.trim()}
                  aria-label="Send message"
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-900 text-amber-400 hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-900 focus-visible:ring-offset-2 disabled:opacity-40 cursor-pointer"
                >
                  <Send className="h-3.5 w-3.5" />
                </button>
              </div>
              <p className="mt-1.5 text-[10px] text-slate-400">
                Supports Sarvam AI (<code className="font-mono">sarvam-105b</code>
                ), Gemini, or built-in offline grounded tool engine.
              </p>
            </form>
          </div>
        </>
      )}
    </>
  );
}
