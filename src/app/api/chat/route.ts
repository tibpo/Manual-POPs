import { NextResponse } from "next/server";
import { POPS } from "@/data/pops";
import { THEMES } from "@/data/themes";
import { TI_TICKET_URL, type CommandSnippet } from "@/lib/aiAssistantEngine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const API_REVISION_HEADER = "2026-05-20";

interface IncomingHistoryItem {
  role: "assistant" | "user";
  content: string;
}

interface IncomingImagePayload {
  base64Data?: string;
  mimeType?: string;
}

interface ChatRequestBody {
  message?: string;
  currentPopCode?: string | null;
  previousInteractionId?: string | null;
  history?: IncomingHistoryItem[];
  image?: IncomingImagePayload | null;
}

interface GeminiStructuredReply {
  responseMode?: "investigate" | "solve" | "escalate";
  screenTranscription?: string;
  content: string;
  steps?: string[];
  commands?: CommandSnippet[];
  quickReplies?: string[];
  popCodes?: string[];
  diagnosedIssue?: string;
  suggestTicket?: boolean;
}

interface InteractionContentBlock {
  type?: string;
  text?: string;
}

interface InteractionStep {
  type?: string;
  content?: InteractionContentBlock[];
}

interface InteractionApiResponse {
  id?: string;
  status?: string;
  output_text?: string;
  steps?: InteractionStep[];
}

interface GenerateContentPart {
  text?: string;
  thought?: boolean;
}

interface GenerateContentResponse {
  candidates?: Array<{
    content?: {
      parts?: GenerateContentPart[];
    };
  }>;
}

interface RawModelAttemptResult {
  ok: boolean;
  status: number;
  rawJsonText: string | null;
  interactionId?: string;
  provider?: "gemini-interactions" | "vertex-express";
  errorSnippet?: string;
  authKeyRejectedByDeveloperApi?: boolean;
}

const VALID_POP_CODES = new Set(POPS.map((p) => p.code));
const ALLOWED_IMAGE_MIME_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

function stripHtmlForPrompt(raw: string): string {
  return raw
    .replace(/<kbd>(.*?)<\/kbd>/gi, "[$1]")
    .replace(/<[^>]+>/g, "")
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

// Índice enxuto para chamadas com print (reduz drasticamente a latência de entrada para responder abaixo de 5 segundos na Vercel!)
const COMPACT_POPS_INDEX = POPS.map(
  (p) => `${p.code}: ${p.title} (${p.goal})`
).join("\n");

// Base completa detalhada dos 38 POPs para conversas em texto
const FULL_POPS_KNOWLEDGE_BASE = POPS.map((p) => {
  const theme = THEMES.find((t) => t.id === p.themeId);
  const stepsSummary = p.steps
    .map(
      (s, idx) =>
        `   ${idx + 1}. ${s.lead}: ${stripHtmlForPrompt(s.text)}`
    )
    .join("\n");
  return `[${p.code}] (${theme ? theme.name : `Tema ${p.themeId}`}) ${
    p.title
  } — Objetivo: ${p.goal}\n${stepsSummary}`;
}).join("\n\n");

function buildSystemInstruction(hasImage: boolean): string {
  const catalogSection = hasImage
    ? `ÍNDICE DOS 38 POPS DO PORTAL (associe em "popCodes" apenas se tiver relação direta):\n${COMPACT_POPS_INDEX}`
    : `BASE COMPLETA DOS 38 POPS OFICIAIS DA ECOVIS BPO:\n${FULL_POPS_KNOWLEDGE_BASE}`;

  return `Você é a IA Especialista e Guia de Autoajuda da TI ECOVIS BPO (Windows 10/11, Microsoft 365, Outlook, Teams, Excel, Word, OneDrive, Redes/Wi-Fi, Monitores, Impressoras, Certificados Digitais A1/A3 e Sistemas/ERP).

PROTOCOLO N° 1 — QUANDO HOUVER IMAGEM / PRINT DA TELA (PRIORIDADE MÁXIMA):
1. LEITURA PRECISA DA IMAGEM:
   - Leia com atenção tudo o que aparece na imagem: título da janela, mensagem do erro, códigos (0x..., ERR_..., HTTP 403/500, avisos do Outlook, Excel, OneDrive, Windows ou navegador) e botões disponíveis.
   - NUNCA invente elementos que não estejam visíveis na tela e NÃO repita/transcreva blocos crus do texto da tela sem necessidade.
2. ZERO DÚVIDA — ENTREGUE A MELHOR SOLUÇÃO COMPLETA NA HORA:
   - Diante de um print com erro ou falha visível, NUNCA fique em dúvida e NÃO use "responseMode": "investigate"! Use SEMPRE "solve" (ou "escalate" se exigir senha de Administrador/TI).
   - Em "content": explique com segurança e linguagem simples (acessível até para leigos) o que significa esse erro e a causa dele.
   - Em "steps": entregue imediatamente o passo a passo mais eficaz para resolver de vez, dizendo em qual botão da janela clicar e o que fazer em seguida.
   - Em "commands": inclua comandos seguros copiáveis (CMD ou Win + R) sempre que ajudarem a destravar esse erro mais rápido.

PROTOCOLO N° 2 — CONVERSA EM TEXTO (USUÁRIOS LEIGOS ATÉ AVANÇADOS):
1. Se o relato em texto for vago ("não consigo trabalhar", "sumiu tudo", "não sei explicar") -> use "responseMode": "investigate", faça APENAS 1 pergunta visual simples, deixe "steps": [] e crie 2 a 4 opções clicáveis curtas em "quickReplies" na voz do usuário.
2. Se o problema já estiver claro -> use "responseMode": "solve", explique de forma humana sem mandar ler o manual e traduza jargões ("no cantinho inferior direito perto do relógio", "tecla da janelinha do Windows + letra R").

REGRAS DE SEGURANÇA CORPORATIVA ECOVIS BPO:
1. Colaboradores NÃO têm senha de Administrador (UAC). Só sugira comandos de usuário padrão: ipconfig /flushdns, ipconfig /release, ipconfig /renew, ping, nslookup, gpupdate /force, hostname, whoami, %temp%, cleanmgr, %localappdata%\\Microsoft\\OneDrive\\onedrive.exe /reset, %localappdata%\\Microsoft\\OneDrive\\onedrive.exe, inetcpl.cpl, certmgr.msc, ncpa.cpl, control printers, outlook.exe /safe, outlook.exe /resetnavpane, excel.exe /safe, wsreset.exe, ms-settings:appsfeatures, ms-settings:display, ms-settings:privacy-microphone, ms-settings:sound, Win + Ctrl + Shift + B.
2. PROIBIDO comandos destrutivos (del /s, rd /s, rmdir /s, format, diskpart, reg delete), pedir senhas ou desativar antivírus/firewall/BitLocker.
3. Se exigir senha de Administrador, instalação, liberação em servidor ou reparo físico, use "responseMode": "escalate", "suggestTicket": true e indique abrir chamado em ${TI_TICKET_URL}.

FORMATO JSON OBRIGATÓRIO DE RESPOSTA:
{
  "responseMode": "solve",
  "content": "Explicação simples, segura e direta em português",
  "steps": ["Passo 1 claro", "Passo 2 claro"],
  "commands": [{"label": "Título curto", "whereToRun": "cmd", "command": "ipconfig /flushdns", "explanation": "O que faz em 1 frase"}],
  "quickReplies": ["Deu certo!", "Ainda não resolveu"],
  "popCodes": [],
  "diagnosedIssue": "Resumo técnico curto do problema/erro",
  "suggestTicket": false
}

${catalogSection}`;
}

// Schema enxuto compatível com decodificação rápida sem risco de erro 400 por aninhamento excessivo
const RESPONSE_JSON_SCHEMA = {
  type: "object",
  properties: {
    responseMode: {
      type: "string",
      enum: ["investigate", "solve", "escalate"],
    },
    content: { type: "string" },
    steps: {
      type: "array",
      items: { type: "string" },
    },
    commands: {
      type: "array",
      items: {
        type: "object",
        properties: {
          label: { type: "string" },
          whereToRun: { type: "string", enum: ["cmd", "run"] },
          command: { type: "string" },
          explanation: { type: "string" },
        },
        required: ["label", "whereToRun", "command", "explanation"],
      },
    },
    quickReplies: {
      type: "array",
      items: { type: "string" },
    },
    popCodes: {
      type: "array",
      items: { type: "string" },
    },
    diagnosedIssue: { type: "string" },
    suggestTicket: { type: "boolean" },
  },
  required: ["responseMode", "content", "suggestTicket"],
};

const FORBIDDEN_COMMAND_PATTERNS = [
  /\bdel\s+\/[sqf]/i,
  /\brd\s+\/s/i,
  /\brmdir\s+\/s/i,
  /\bformat\s+[a-z]:/i,
  /\bdiskpart\b/i,
  /\breg\s+delete\b/i,
  /\bbcdedit\b/i,
  /\bnetsh\s+advfirewall\s+set\b/i,
];

function isSafeCorporateCommand(cmd: string): boolean {
  const trimmed = cmd.trim();
  if (!trimmed || trimmed.length > 220) return false;
  return !FORBIDDEN_COMMAND_PATTERNS.some((rx) => rx.test(trimmed));
}

function resolveModelQueue(rawEnvModel?: string): string[] {
  const defaults = [
    "gemini-4-hydrogen",
    "gemini-3.5-flash-lite",
    "gemini-3.1-flash-lite",
  ];
  const cleaned = rawEnvModel?.trim();
  if (!cleaned || /^gemini-(1\.|2\.)/i.test(cleaned)) {
    return defaults;
  }
  return Array.from(new Set([cleaned, ...defaults]));
}

function extractInteractionJsonText(
  payload: InteractionApiResponse
): string | null {
  if (Array.isArray(payload.steps) && payload.steps.length > 0) {
    const collectedTexts: string[] = [];
    for (let i = payload.steps.length - 1; i >= 0; i--) {
      const step = payload.steps[i];
      if (step?.type === "model_output" && Array.isArray(step.content)) {
        const stepText = step.content
          .filter(
            (part) =>
              (part?.type === "text" || !part?.type) &&
              typeof part?.text === "string"
          )
          .map((part) => part.text!)
          .join("");
        if (stepText) {
          collectedTexts.unshift(stepText);
        }
      } else if (collectedTexts.length > 0) {
        break;
      }
    }
    if (collectedTexts.length > 0) {
      return collectedTexts.join("").trim();
    }
  }

  if (typeof payload.output_text === "string" && payload.output_text.trim()) {
    return payload.output_text.trim();
  }

  return null;
}

function parseStructuredReplySafely(raw: string): GeminiStructuredReply | null {
  const trimmed = raw.trim();
  const stripped = trimmed.startsWith("```")
    ? trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim()
    : trimmed;

  try {
    return JSON.parse(stripped) as GeminiStructuredReply;
  } catch {
    const firstBrace = stripped.indexOf("{");
    const lastBrace = stripped.lastIndexOf("}");
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      try {
        return JSON.parse(
          stripped.slice(firstBrace, lastBrace + 1)
        ) as GeminiStructuredReply;
      } catch {
        return null;
      }
    }
    return null;
  }
}

async function callInteractionsApi(params: {
  apiKey: string;
  model: string;
  systemInstruction: string;
  promptText: string;
  image?: { base64Data: string; mimeType: string } | null;
  previousInteractionId?: string | null;
}): Promise<RawModelAttemptResult> {
  const {
    apiKey,
    model,
    systemInstruction,
    promptText,
    image,
    previousInteractionId,
  } = params;

  const isGemini4 = model.startsWith("gemini-4-");
  const isGemini3 = model.startsWith("gemini-3.");

  // Mantém thinking_level="low" em chamadas com print para garantir resposta rápida (< 5s) sem estourar o limite de 10s da Vercel Hobby
  const thinkingLevel = isGemini4
    ? image
      ? "low"
      : "medium"
    : isGemini3
    ? "low"
    : undefined;

  const inputPayload = image
    ? [
        {
          type: "image",
          data: image.base64Data,
          mime_type: image.mimeType,
          resolution: "high",
        },
        {
          type: "text",
          text: promptText,
        },
      ]
    : promptText;

  const requestBody: Record<string, unknown> = {
    model,
    system_instruction: systemInstruction,
    input: inputPayload,
    response_format: {
      type: "text",
      mime_type: "application/json",
      schema: RESPONSE_JSON_SCHEMA,
    },
  };

  if (thinkingLevel) {
    requestBody.generation_config = {
      thinking_level: thinkingLevel,
    };
  }

  if (previousInteractionId && !image) {
    requestBody.previous_interaction_id = previousInteractionId;
  }

  // Usa o cabeçalho oficial Api-Revision exigido pelo novo formato de response_format e steps
  const endpoints = [
    "https://generativelanguage.googleapis.com/v1beta/interactions",
    "https://generativelanguage.googleapis.com/v1/interactions",
  ];

  let lastStatus = 0;
  let lastSnippet = "";
  let authKeyRejected = false;

  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
          "Api-Revision": API_REVISION_HEADER,
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(image ? 7800 : 8500),
      });

      if (res.ok) {
        const payload = (await res.json()) as InteractionApiResponse;
        const jsonText = extractInteractionJsonText(payload);
        if (jsonText) {
          return {
            ok: true,
            status: 200,
            rawJsonText: jsonText,
            provider: "gemini-interactions",
            interactionId:
              typeof payload.id === "string" ? payload.id : undefined,
          };
        }
      } else {
        lastStatus = res.status;
        const errText = await res.text().catch(() => "");
        lastSnippet = errText.slice(0, 160);

        if (
          apiKey.startsWith("AQ.") &&
          (res.status === 400 || res.status === 401 || res.status === 403) &&
          /api_key_invalid|api key not valid|unauthenticated|permission_denied|credentials|invalid api key/i.test(
            errText
          )
        ) {
          authKeyRejected = true;
          break;
        }

        // Se for 429 (cota por minuto) ou 401/403, não repete no segundo endpoint do mesmo modelo
        if (res.status === 429 || res.status === 401 || res.status === 403) {
          break;
        }
      }
    } catch (err) {
      lastStatus = 504;
      lastSnippet = err instanceof Error ? err.name : "timeout";
      break;
    }
  }

  return {
    ok: false,
    status: lastStatus,
    rawJsonText: null,
    errorSnippet: lastSnippet,
    authKeyRejectedByDeveloperApi: authKeyRejected,
  };
}

// Suporte automático caso a chave AQ.* tenha sido emitida via Vertex AI Express Mode (aiplatform.googleapis.com)
async function callVertexExpressApi(params: {
  apiKey: string;
  systemInstruction: string;
  promptText: string;
  image?: { base64Data: string; mimeType: string } | null;
}): Promise<RawModelAttemptResult> {
  const { apiKey, systemInstruction, promptText, image } = params;

  const userParts: Array<Record<string, unknown>> = [];
  if (image) {
    userParts.push({
      inlineData: {
        mimeType: image.mimeType,
        data: image.base64Data,
      },
    });
  }
  userParts.push({ text: promptText });

  const requestBody = {
    systemInstruction: {
      parts: [{ text: systemInstruction }],
    },
    contents: [
      {
        role: "user",
        parts: userParts,
      },
    ],
    generationConfig: {
      temperature: 0.2,
      responseMimeType: "application/json",
    },
  };

  const vertexEndpoints = [
    "https://aiplatform.googleapis.com/v1beta1/publishers/google/models/gemini-3.1-flash-lite-preview:generateContent",
    "https://aiplatform.googleapis.com/v1/publishers/google/models/gemini-2.5-flash:generateContent",
    "https://aiplatform.googleapis.com/v1/publishers/google/models/gemini-2.5-flash-lite:generateContent",
  ];

  let lastStatus = 0;
  let lastSnippet = "";

  for (const url of vertexEndpoints) {
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(image ? 8200 : 8800),
      });

      if (res.ok) {
        const payload = (await res.json()) as GenerateContentResponse;
        const parts = payload.candidates?.[0]?.content?.parts;
        if (Array.isArray(parts) && parts.length > 0) {
          const textOut = parts
            .filter((p) => !p.thought && typeof p.text === "string")
            .map((p) => p.text!)
            .join("")
            .trim();
          if (textOut) {
            return {
              ok: true,
              status: 200,
              rawJsonText: textOut,
              provider: "vertex-express",
            };
          }
        }
      } else {
        lastStatus = res.status;
        const errText = await res.text().catch(() => "");
        lastSnippet = errText.slice(0, 160);
        if (res.status === 401 || res.status === 403 || res.status === 429) {
          break;
        }
      }
    } catch (err) {
      lastStatus = 504;
      lastSnippet = err instanceof Error ? err.name : "timeout";
      break;
    }
  }

  return {
    ok: false,
    status: lastStatus,
    rawJsonText: null,
    errorSnippet: lastSnippet,
  };
}

const GOOGLE_AUTH_KEY_REGEX = /AQ\.[0-9A-Za-z._-]{25,120}/;
const GOOGLE_STD_KEY_REGEX = /AIza[0-9A-Za-z_-]{30,50}/;

function cleanApiKeyCandidate(raw?: string | null): string | null {
  if (!raw) return null;
  const unquoted = raw
    .trim()
    .replace(/^["'`]+|["'`]+$/g, "")
    .replace(/^(?:Manual_POPs_Ecovis|GEMINI_API_KEY|GOOGLE_API_KEY|Bearer)\s*[=:]?\s*/i, "")
    .trim();

  const authMatch = unquoted.match(GOOGLE_AUTH_KEY_REGEX);
  if (authMatch) return authMatch[0];

  const stdMatch = unquoted.match(GOOGLE_STD_KEY_REGEX);
  if (stdMatch) return stdMatch[0];

  // Rejeita caminhos de pastas do Windows/OneDrive ou URLs caso haja variável com nome similar
  if (unquoted.length >= 25 && !/[\s\\/:]/.test(unquoted)) {
    return unquoted;
  }
  return null;
}

function resolveServerGeminiApiKey(): {
  key: string | null;
  source: string | null;
} {
  const explicitEntries: Array<[string, string | undefined]> = [
    ["Manual_POPs_Ecovis", process.env.Manual_POPs_Ecovis],
    ["MANUAL_POPS_ECOVIS", process.env.MANUAL_POPS_ECOVIS],
    ["manual_pops_ecovis", process.env.manual_pops_ecovis],
    [
      "NEXT_PUBLIC_Manual_POPs_Ecovis",
      process.env.NEXT_PUBLIC_Manual_POPs_Ecovis,
    ],
    [
      "NEXT_PUBLIC_MANUAL_POPS_ECOVIS",
      process.env.NEXT_PUBLIC_MANUAL_POPS_ECOVIS,
    ],
    ["GEMINI_API_KEY", process.env.GEMINI_API_KEY],
    ["NEXT_PUBLIC_GEMINI_API_KEY", process.env.NEXT_PUBLIC_GEMINI_API_KEY],
    ["GOOGLE_API_KEY", process.env.GOOGLE_API_KEY],
    [
      "GOOGLE_GENERATIVE_AI_API_KEY",
      process.env.GOOGLE_GENERATIVE_AI_API_KEY,
    ],
    ["GOOGLE_GENAI_API_KEY", process.env.GOOGLE_GENAI_API_KEY],
    ["GEMINI_KEY", process.env.GEMINI_KEY],
    ["API_KEY", process.env.API_KEY],
  ];

  for (const [name, rawVal] of explicitEntries) {
    const cleaned = cleanApiKeyCandidate(rawVal);
    if (cleaned) {
      return { key: cleaned, source: name };
    }
  }

  for (const [envKey, envVal] of Object.entries(process.env)) {
    const upper = envKey.trim().toUpperCase();
    if (
      upper.includes("MANUAL_POPS") ||
      upper.includes("GEMINI") ||
      upper.includes("GOOGLE_API")
    ) {
      const cleaned = cleanApiKeyCandidate(envVal);
      if (cleaned) {
        return { key: cleaned, source: envKey };
      }
    }

    const authFromVal = envVal?.match(GOOGLE_AUTH_KEY_REGEX);
    if (authFromVal) {
      return { key: authFromVal[0], source: envKey };
    }

    const stdFromVal = envVal?.match(GOOGLE_STD_KEY_REGEX);
    if (stdFromVal) {
      return { key: stdFromVal[0], source: envKey };
    }

    const authFromKeyName = envKey.match(GOOGLE_AUTH_KEY_REGEX);
    if (authFromKeyName) {
      return { key: authFromKeyName[0], source: "env_key_column" };
    }

    const stdFromKeyName = envKey.match(GOOGLE_STD_KEY_REGEX);
    if (stdFromKeyName) {
      return { key: stdFromKeyName[0], source: "env_key_column" };
    }
  }

  return { key: null, source: null };
}

export async function GET(request: Request) {
  const detected = resolveServerGeminiApiKey();
  const url = new URL(request.url);

  if (url.searchParams.get("ping") === "1" && detected.key) {
    const sys = buildSystemInstruction(true);
    const prompt = "Responda com um JSON curto confirmando que está online.";
    let pingTest = await callInteractionsApi({
      apiKey: detected.key,
      model: "gemini-4-hydrogen",
      systemInstruction: sys,
      promptText: prompt,
      image: null,
      previousInteractionId: null,
    });

    if (
      !pingTest.ok &&
      detected.key.startsWith("AQ.") &&
      (pingTest.authKeyRejectedByDeveloperApi ||
        pingTest.status === 400 ||
        pingTest.status === 401 ||
        pingTest.status === 403)
    ) {
      pingTest = await callVertexExpressApi({
        apiKey: detected.key,
        systemInstruction: sys,
        promptText: prompt,
        image: null,
      });
    }

    return NextResponse.json({
      keyConfiguredOnServer: true,
      detectedEnvSource: detected.source,
      keyType: detected.key.startsWith("AQ.") ? "google_auth_key" : "standard",
      provider: pingTest.provider ?? null,
      pingOk: pingTest.ok,
      pingStatus: pingTest.status,
      pingError: pingTest.errorSnippet ?? null,
    });
  }

  return NextResponse.json({
    keyConfiguredOnServer: Boolean(detected.key),
    detectedEnvSource: detected.source,
    keyType: detected.key?.startsWith("AQ.")
      ? "google_auth_key"
      : detected.key
      ? "standard"
      : null,
    runtime: "nodejs",
  });
}

export async function POST(request: Request) {
  let body: ChatRequestBody;
  try {
    body = (await request.json()) as ChatRequestBody;
  } catch {
    return NextResponse.json({ fallback: true, reason: "invalid_json" });
  }

  const serverDetected = resolveServerGeminiApiKey();
  const apiKey = serverDetected.key;

  if (!apiKey) {
    return NextResponse.json({ fallback: true, reason: "missing_api_key" });
  }

  const rawMessage = (body.message ?? "").trim().slice(0, 2000);
  const rawImage = body.image;
  const hasValidImage = Boolean(
    rawImage &&
      typeof rawImage.base64Data === "string" &&
      rawImage.base64Data.length > 50 &&
      rawImage.base64Data.length <= 5_500_000 &&
      typeof rawImage.mimeType === "string" &&
      ALLOWED_IMAGE_MIME_TYPES.has(rawImage.mimeType)
  );

  if (!rawMessage && !hasValidImage) {
    return NextResponse.json({ fallback: true, reason: "empty_message" });
  }

  const effectiveUserMessage = hasValidImage
    ? rawMessage
      ? `Analise este print da tela junto com meu relato: "${rawMessage}". Explique de forma simples o que está acontecendo e entregue a melhor solução passo a passo sem ficar em dúvida.`
      : `Analise este print da minha tela, explique de forma simples o que causou esse erro/aviso e entregue imediatamente a melhor solução passo a passo completa (responseMode="solve" ou "escalate").`
    : rawMessage;

  const contextNote = body.currentPopCode
    ? `[Contexto opcional: ${body.currentPopCode} aberto ao fundo]\n`
    : "";

  const history = Array.isArray(body.history) ? body.history.slice(-6) : [];
  const priorTurns = history
    .slice(0, -1)
    .filter(
      (m) =>
        m &&
        typeof m.content === "string" &&
        m.content.trim().length > 0 &&
        !m.content.startsWith("Olá! Sou a IA")
    )
    .map(
      (m) =>
        `${m.role === "assistant" ? "Assistente TI" : "Colaborador"}: ${m.content
          .trim()
          .slice(0, 700)}`
    );

  const singleTurnText = `${contextNote}${effectiveUserMessage}`;
  const fullStatelessText =
    priorTurns.length > 0
      ? `Histórico recente:\n${priorTurns.join(
          "\n\n"
        )}\n\n---\n${contextNote}Mensagem atual: ${effectiveUserMessage}`
      : singleTurnText;

  const validImageObj =
    hasValidImage && rawImage?.base64Data && rawImage?.mimeType
      ? { base64Data: rawImage.base64Data, mimeType: rawImage.mimeType }
      : null;

  const systemInstruction = buildSystemInstruction(hasValidImage);
  const modelsToTry = resolveModelQueue(process.env.GEMINI_MODEL);
  const previousInteractionId = body.previousInteractionId?.trim() || null;

  const formatValidatedReply = (
    parsed: GeminiStructuredReply,
    interactionId?: string
  ) => {
    const responseMode: "investigate" | "solve" | "escalate" =
      parsed.responseMode === "investigate" ||
      parsed.responseMode === "solve" ||
      parsed.responseMode === "escalate"
        ? parsed.responseMode
        : "solve";

    const safeCommands =
      responseMode !== "investigate" && Array.isArray(parsed.commands)
        ? parsed.commands
            .filter(
              (c) =>
                c &&
                typeof c.label === "string" &&
                typeof c.command === "string" &&
                typeof c.explanation === "string" &&
                (c.whereToRun === "cmd" || c.whereToRun === "run") &&
                isSafeCorporateCommand(c.command)
            )
            .slice(0, 4)
        : undefined;

    const safeSteps =
      responseMode !== "investigate" && Array.isArray(parsed.steps)
        ? parsed.steps
            .filter((s) => typeof s === "string" && s.trim().length > 0)
            .map((s) => s.trim())
            .slice(0, 6)
        : undefined;

    const safeQuickReplies = Array.isArray(parsed.quickReplies)
      ? parsed.quickReplies
          .filter(
            (q) =>
              typeof q === "string" &&
              q.trim().length >= 2 &&
              q.trim().length <= 75
          )
          .map((q) => q.trim())
          .slice(0, 4)
      : undefined;

    const safePopCodes =
      responseMode !== "investigate" && Array.isArray(parsed.popCodes)
        ? parsed.popCodes
            .filter((code) => typeof code === "string")
            .map((code) => code.trim().toUpperCase())
            .filter((code) => VALID_POP_CODES.has(code))
            .slice(0, 2)
        : undefined;

    const safeDiagnosedIssue =
      typeof parsed.diagnosedIssue === "string" &&
      parsed.diagnosedIssue.trim().length > 0
        ? parsed.diagnosedIssue.trim().slice(0, 220)
        : undefined;

    return NextResponse.json({
      responseMode,
      content: parsed.content.trim(),
      steps: safeSteps && safeSteps.length > 0 ? safeSteps : undefined,
      commands:
        safeCommands && safeCommands.length > 0 ? safeCommands : undefined,
      quickReplies:
        safeQuickReplies && safeQuickReplies.length > 0
          ? safeQuickReplies
          : undefined,
      popCodes:
        safePopCodes && safePopCodes.length > 0 ? safePopCodes : undefined,
      diagnosedIssue: safeDiagnosedIssue,
      suggestTicket:
        responseMode === "investigate"
          ? false
          : responseMode === "escalate" || Boolean(parsed.suggestTicket),
      interactionId: !hasValidImage ? interactionId : undefined,
    });
  };

  let lastStatus = 0;
  let lastErrorSnippet = "";
  let developerApiRejectedAuthKey = false;
  const routeStartMs = Date.now();

  for (let idx = 0; idx < modelsToTry.length; idx++) {
    // Evita ultrapassar a janela de execução da função Serverless
    if (Date.now() - routeStartMs > 22000) {
      break;
    }

    const modelName = modelsToTry[idx];
    const usePrevId = !hasValidImage && idx === 0 && Boolean(previousInteractionId);

    const attempt = await callInteractionsApi({
      apiKey,
      model: modelName,
      systemInstruction,
      promptText: usePrevId ? singleTurnText : fullStatelessText,
      image: validImageObj,
      previousInteractionId: usePrevId ? previousInteractionId : null,
    });

    let finalAttempt = attempt;

    // Se falhou apenas por previous_interaction_id expirado (400/404 em texto), reenvia sem previous_interaction_id
    if (
      !finalAttempt.ok &&
      !finalAttempt.authKeyRejectedByDeveloperApi &&
      usePrevId &&
      (finalAttempt.status === 400 || finalAttempt.status === 404)
    ) {
      finalAttempt = await callInteractionsApi({
        apiKey,
        model: modelName,
        systemInstruction,
        promptText: fullStatelessText,
        image: validImageObj,
        previousInteractionId: null,
      });
    }

    if (!finalAttempt.ok || !finalAttempt.rawJsonText) {
      lastStatus = finalAttempt.status;
      lastErrorSnippet = finalAttempt.errorSnippet ?? "";
      if (finalAttempt.authKeyRejectedByDeveloperApi) {
        developerApiRejectedAuthKey = true;
        break;
      }
      continue;
    }

    const parsed = parseStructuredReplySafely(finalAttempt.rawJsonText);
    if (!parsed || !parsed.content || typeof parsed.content !== "string") {
      lastStatus = 422;
      continue;
    }

    return formatValidatedReply(parsed, finalAttempt.interactionId);
  }

  // Se a chave for AQ.* (Google Cloud / Vertex Express ou Authorization Key) e a API generativelanguage recusou (400/401/403), tenta imediatamente via Vertex AI Express Mode
  if (
    apiKey.startsWith("AQ.") &&
    (developerApiRejectedAuthKey ||
      lastStatus === 400 ||
      lastStatus === 401 ||
      lastStatus === 403)
  ) {
    const vertexAttempt = await callVertexExpressApi({
      apiKey,
      systemInstruction,
      promptText: fullStatelessText,
      image: validImageObj,
    });

    if (vertexAttempt.ok && vertexAttempt.rawJsonText) {
      const parsed = parseStructuredReplySafely(vertexAttempt.rawJsonText);
      if (parsed && parsed.content && typeof parsed.content === "string") {
        return formatValidatedReply(parsed, undefined);
      }
      lastStatus = 422;
    } else {
      lastStatus = vertexAttempt.status;
      lastErrorSnippet = vertexAttempt.errorSnippet ?? lastErrorSnippet;
    }
  }

  return NextResponse.json({
    fallback: true,
    reason:
      lastStatus === 429
        ? "rate_limited"
        : lastStatus === 400 || lastStatus === 401 || lastStatus === 403
        ? `api_rejected_${lastStatus}`
        : `upstream_${lastStatus || "timeout"}`,
    detail: lastErrorSnippet ? lastErrorSnippet.slice(0, 100) : undefined,
  });
}
