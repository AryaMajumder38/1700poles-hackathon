"use client";

import { useEffect, useRef, useState } from "react";
import { Check, ChevronRight, Copy, Loader2, Send, X } from "lucide-react";
import { StarburstIcon } from "@/components/SteepArtwork";

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
  openEventName?: string;
}

const DEFAULT_OPEN_EVENT = "lumino:open-copilot";

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
              <strong key={i} className="font-medium text-white">
                {part.slice(2, -2)}
              </strong>
            );
          }
          if (part.startsWith("`") && part.endsWith("`")) {
            return (
              <code
                key={i}
                className="rounded-md border border-white/[0.08] bg-white/[0.07] px-1.5 py-0.5 font-mono text-xs text-[#e7e7e7]"
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
  if (!engine) return "Grounded on verified Lumino datasets";
  if (engine.startsWith("sarvam")) return `Sarvam AI · ${engine}`;
  if (engine.startsWith("gemini")) return `Gemini · ${engine}`;
  return "Local grounded engine";
}

export default function OpsCopilotDrawer({
  activeTab,
  openEventName = DEFAULT_OPEN_EVENT,
}: OpsCopilotDrawerProps) {
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
        "Ask in **English, Hindi, or Hinglish** about godown stock, LP transfers, or kit bottlenecks. Every figure is fetched from the verified Lumino datasets.",
    },
  ]);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const launcherRef = useRef<HTMLButtonElement | null>(null);
  const copyTimerRef = useRef<number | null>(null);
  const wasOpenRef = useRef(false);

  useEffect(() => {
    const handleOpenEvent = () => setOpen(true);
    window.addEventListener(openEventName, handleOpenEvent);
    return () => {
      window.removeEventListener(openEventName, handleOpenEvent);
    };
  }, [openEventName]);

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
      {/* Steep White Primary Capsule Floating Launcher */}
      {!open && (
        <button
          ref={launcherRef}
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Open Lumino Ops Copilot"
          className="fixed bottom-4 right-4 z-40 inline-flex h-10 items-center gap-2 rounded-full bg-white px-4 text-sm font-medium text-black shadow-[0_12px_32px_rgba(0,0,0,0.5)] transition-all duration-200 hover:opacity-90 active:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#121212] sm:bottom-5 sm:right-5 cursor-pointer"
        >
          <StarburstIcon className="h-3.5 w-3.5 shrink-0 text-black" />
          <span>Ask Copilot</span>
        </button>
      )}

      {/* Slide-Over Steep Dark Glass Copilot Drawer */}
      {open && (
        <>
          <div
            aria-hidden="true"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 bg-black/55 backdrop-blur-[2px]"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="ops-copilot-title"
            className="steep-drawer-in fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col overflow-hidden border-l border-white/[0.08] bg-[#161616]/95 text-[#e7e7e7] shadow-[0_25px_60px_rgba(0,0,0,0.75)] backdrop-blur-xl"
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between gap-3 border-b border-white/[0.06] px-5 py-4">
              <div className="flex min-w-0 items-center gap-2.5">
                <span
                  aria-hidden="true"
                  className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.05] text-violet-300"
                >
                  <StarburstIcon className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0">
                  <h2
                    id="ops-copilot-title"
                    className="truncate font-serif font-normal text-[21px] leading-tight tracking-[-0.01em] text-[#e7e7e7]"
                  >
                    Ops Copilot
                  </h2>
                  <p className="truncate text-xs text-[#898989]">
                    {engineBadgeLabel(activeEngine)}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close Ops Copilot"
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/[0.06] bg-white/[0.04] text-[#a0a0a0] transition-colors hover:bg-white/[0.1] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Starter Prompts Strip */}
            <div className="border-b border-white/[0.06] bg-white/[0.02] px-5 py-3">
              <div className="mb-2 text-xs font-normal text-[#898989]">
                Quick prompts
              </div>
              <div className="flex flex-wrap gap-1.5">
                {STARTER_PROMPTS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    disabled={sending}
                    onClick={() => sendMessage(p.text)}
                    className="rounded-full border border-white/[0.08] bg-white/[0.05] px-3 py-1 text-xs font-normal text-[#a0a0a0] transition-all duration-150 hover:bg-white/[0.11] hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50 cursor-pointer disabled:opacity-45"
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
              className="flex-1 space-y-4 overflow-y-auto overflow-x-hidden px-5 py-4"
            >
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex min-w-0 flex-col gap-1.5 ${
                    m.role === "user" ? "items-end" : "items-start"
                  }`}
                >
                  <div
                    className={`max-w-[90%] break-words rounded-[20px] px-4 py-2.5 text-sm ${
                      m.role === "user"
                        ? "rounded-br-md bg-white font-medium text-black"
                        : "space-y-1.5 rounded-bl-md border border-white/[0.06] bg-white/[0.05] text-[#e7e7e7]"
                    }`}
                  >
                    {m.role === "user"
                      ? m.content
                      : renderFormattedLines(m.content)}
                  </div>

                  {/* Collapsed Tool Traces */}
                  {m.toolTraces && m.toolTraces.length > 0 && (
                    <details className="group max-w-[90%] text-xs text-[#898989]">
                      <summary className="inline-flex cursor-pointer list-none items-center gap-1 rounded-full py-0.5 text-xs text-[#898989] transition-colors hover:text-[#e7e7e7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50">
                        <ChevronRight className="h-3.5 w-3.5 shrink-0 transition-transform duration-200 group-open:rotate-90" />
                        <span>
                          {m.toolTraces.length === 1
                            ? "1 tool lookup"
                            : `${m.toolTraces.length} tool lookups`}
                        </span>
                      </summary>
                      <ul className="mt-1.5 space-y-1 border-l border-white/[0.1] pl-3 text-xs text-[#a0a0a0]">
                        {m.toolTraces.map((t, idx) => (
                          <li
                            key={`${m.id}-t-${idx}`}
                            title={JSON.stringify(t.args)}
                            className="break-words"
                          >
                            <span className="font-mono text-[#e7e7e7]">
                              {t.tool}
                            </span>
                            <span className="mx-1.5 text-white/25">·</span>
                            <span>{t.summary}</span>
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}

                  {/* Copyable Dispatch / Transfer Memo */}
                  {m.draftMemo && (
                    <div className="w-full max-w-[90%] overflow-hidden rounded-[16px] border border-white/[0.08] bg-[#121212]/90 p-3.5 text-xs">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-xs font-medium text-[#e7e7e7]">
                          Dispatch note
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyMemo(m.id, m.draftMemo!)}
                          className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.06] px-3 py-1 text-xs font-medium text-[#e7e7e7] transition-colors hover:bg-white/[0.12] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50 cursor-pointer"
                        >
                          {copiedId === m.id ? (
                            <>
                              <Check className="h-3.5 w-3.5 text-emerald-400" />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy className="h-3.5 w-3.5 text-[#a0a0a0]" />
                              Copy
                            </>
                          )}
                        </button>
                      </div>
                      <pre className="mt-2.5 overflow-x-auto whitespace-pre-wrap break-words border-t border-white/[0.06] pt-2.5 font-mono text-xs leading-relaxed text-[#d0d0d0]">
                        {m.draftMemo}
                      </pre>
                    </div>
                  )}
                </div>
              ))}

              {sending && (
                <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.05] px-3.5 py-2 text-xs text-[#a0a0a0]">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-300" />
                  Querying verified datasets...
                </div>
              )}
            </div>

            {/* Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage(input);
              }}
              className="border-t border-white/[0.06] bg-[#161616]/90 px-4 py-3.5"
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
                  placeholder="Ask in English or Hinglish..."
                  disabled={sending}
                  className="h-10 min-w-0 flex-1 rounded-full border border-white/[0.09] bg-[#121212] px-4 text-sm text-[#e7e7e7] placeholder:text-[#666666] transition-colors focus:border-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50"
                />
                <button
                  type="submit"
                  disabled={sending || !input.trim()}
                  aria-label="Send message"
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-black transition-all duration-200 hover:opacity-90 active:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-400/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#161616] disabled:opacity-35 cursor-pointer"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </form>
          </div>
        </>
      )}
    </>
  );
}
