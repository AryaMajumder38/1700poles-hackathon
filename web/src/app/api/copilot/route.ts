import { NextResponse } from "next/server";
import {
  COPILOT_TOOL_DEFINITIONS,
  executeCopilotTool,
  runLocalGroundedFallback,
  type ToolTrace,
} from "@/features/copilot/tools";

interface IncomingMessage {
  role: "user" | "assistant";
  content: string;
}

interface CopilotRequestBody {
  messages?: IncomingMessage[];
  activeTab?: string;
}

const SYSTEM_PROMPT = `You are the Lumino Industries Grounded Ops Copilot for the Kanpur RDSS ("1,700 Poles") power-line supply chain.
STRICT RULES:
1. NEVER invent, guess, or estimate inventory numbers. ALWAYS call one or more provided tools to read verified numbers from Lumino's pre-aggregated JSONs before answering.
2. ALWAYS include the exact Unit of Measure (PCS, NOS, SET, KG, MT, KM, MTR) beside every quantity, and NEVER sum raw quantities across different items or UOMs.
3. Only reference the 6 active Kanpur godowns (Auraiya, Dehat, Etawah, Farrukhabad, Kannauj, Nagar). Never treat KANPUR CLOSER as an active godown.
4. Reply concisely in the same language the user writes in (English, Hindi, or Hinglish).
5. When a transfer, rebalance, or vendor hold is recommended, include a clean copy-ready dispatch note enclosed between <<<MEMO>>> and <<<END_MEMO>>> tags so the storekeeper can copy-paste it directly into WhatsApp/Email.`;

function extractDraftMemo(text: string): {
  cleanReply: string;
  draftMemo: string | null;
} {
  const match = text.match(/<<<MEMO>>>([\s\S]*?)<<<END_MEMO>>>/);
  if (!match) return { cleanReply: text.trim(), draftMemo: null };
  const draftMemo = match[1].trim();
  const cleanReply = text.replace(match[0], "").trim();
  return { cleanReply, draftMemo };
}

interface OpenAIMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | null;
  tool_call_id?: string;
  tool_calls?: {
    id: string;
    type: "function";
    function: { name: string; arguments: string };
  }[];
}

async function runSarvamToolLoop(
  apiKey: string,
  history: IncomingMessage[]
): Promise<{
  reply: string;
  engine: string;
  toolTraces: ToolTrace[];
  draftMemo: string | null;
}> {
  const model = process.env.SARVAM_MODEL || "sarvam-105b";
  const endpoint =
    process.env.SARVAM_API_URL || "https://api.sarvam.ai/v1/chat/completions";

  const messages: OpenAIMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history.slice(-8).map((m) => ({ role: m.role, content: m.content })),
  ];

  const tools = COPILOT_TOOL_DEFINITIONS.map((t) => ({
    type: "function" as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    },
  }));

  const toolTraces: ToolTrace[] = [];

  for (let step = 0; step < 4; step++) {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-subscription-key": apiKey,
      },
      body: JSON.stringify({
        model,
        messages,
        tools,
        tool_choice: "auto",
        temperature: 0.2,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Sarvam API ${res.status}: ${errText.slice(0, 200)}`);
    }

    const payload = (await res.json()) as {
      choices?: {
        message?: {
          content?: string | null;
          tool_calls?: {
            id: string;
            type: "function";
            function: { name: string; arguments: string };
          }[];
        };
      }[];
    };

    const msg = payload.choices?.[0]?.message;
    if (!msg) throw new Error("Empty response from Sarvam API.");

    if (msg.tool_calls && msg.tool_calls.length > 0) {
      messages.push({
        role: "assistant",
        content: msg.content ?? null,
        tool_calls: msg.tool_calls,
      });

      for (const tc of msg.tool_calls) {
        let parsedArgs: Record<string, unknown> = {};
        try {
          parsedArgs = JSON.parse(tc.function.arguments || "{}");
        } catch {
          parsedArgs = {};
        }
        const executed = executeCopilotTool(tc.function.name, parsedArgs);
        toolTraces.push(executed.trace);
        messages.push({
          role: "tool",
          tool_call_id: tc.id,
          content: JSON.stringify(executed.data),
        });
      }
      continue;
    }

    const { cleanReply, draftMemo } = extractDraftMemo(msg.content ?? "");
    return {
      reply: cleanReply || "Done.",
      engine: `sarvam (${model})`,
      toolTraces,
      draftMemo,
    };
  }

  throw new Error("Sarvam tool loop exceeded max steps.");
}

async function runGeminiToolLoop(
  apiKey: string,
  history: IncomingMessage[]
): Promise<{
  reply: string;
  engine: string;
  toolTraces: ToolTrace[];
  draftMemo: string | null;
}> {
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(
    apiKey
  )}`;

  type GeminiPart =
    | { text: string }
    | { functionCall: { name: string; args?: Record<string, unknown> } }
    | { functionResponse: { name: string; response: { result: unknown } } };

  const contents: { role: "user" | "model"; parts: GeminiPart[] }[] = history
    .slice(-8)
    .map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

  const functionDeclarations = COPILOT_TOOL_DEFINITIONS.map((t) => ({
    name: t.name,
    description: t.description,
    parameters: t.parameters,
  }));

  const toolTraces: ToolTrace[] = [];

  for (let step = 0; step < 4; step++) {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents,
        tools: [{ functionDeclarations }],
        generationConfig: { temperature: 0.2 },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Gemini API ${res.status}: ${errText.slice(0, 200)}`);
    }

    const payload = (await res.json()) as {
      candidates?: { content?: { parts?: GeminiPart[] } }[];
    };

    const parts = payload.candidates?.[0]?.content?.parts ?? [];
    const fnCalls = parts.filter(
      (p): p is { functionCall: { name: string; args?: Record<string, unknown> } } =>
        "functionCall" in p
    );

    if (fnCalls.length > 0) {
      contents.push({ role: "model", parts });
      const responseParts: GeminiPart[] = fnCalls.map((fc) => {
        const executed = executeCopilotTool(
          fc.functionCall.name,
          fc.functionCall.args ?? {}
        );
        toolTraces.push(executed.trace);
        return {
          functionResponse: {
            name: fc.functionCall.name,
            response: { result: executed.data },
          },
        };
      });
      contents.push({ role: "user", parts: responseParts });
      continue;
    }

    const text = parts
      .filter((p): p is { text: string } => "text" in p)
      .map((p) => p.text)
      .join("\n");
    const { cleanReply, draftMemo } = extractDraftMemo(text);
    return {
      reply: cleanReply || "Done.",
      engine: `gemini (${model})`,
      toolTraces,
      draftMemo,
    };
  }

  throw new Error("Gemini tool loop exceeded max steps.");
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CopilotRequestBody;
    const messages = Array.isArray(body.messages) ? body.messages : [];
    const latestUser = [...messages].reverse().find((m) => m.role === "user");

    if (!latestUser || !latestUser.content.trim()) {
      return NextResponse.json(
        { error: "Please enter a question for the Ops Copilot." },
        { status: 400 }
      );
    }

    const sarvamKey = process.env.SARVAM_API_KEY?.trim();
    const geminiKey = process.env.GEMINI_API_KEY?.trim();

    if (sarvamKey) {
      try {
        const result = await runSarvamToolLoop(sarvamKey, messages);
        return NextResponse.json(result);
      } catch (err) {
        console.error("Sarvam call failed, falling back:", err);
      }
    }

    if (geminiKey) {
      try {
        const result = await runGeminiToolLoop(geminiKey, messages);
        return NextResponse.json(result);
      } catch (err) {
        console.error("Gemini call failed, falling back:", err);
      }
    }

    const local = runLocalGroundedFallback(latestUser.content);
    return NextResponse.json({
      ...local,
      engine: "local-grounded",
    });
  } catch (err) {
    return NextResponse.json(
      {
        error:
          err instanceof Error
            ? err.message
            : "Unexpected error in Ops Copilot route.",
      },
      { status: 500 }
    );
  }
}
