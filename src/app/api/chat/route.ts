import { NextResponse } from "next/server";
import { POPS } from "@/data/pops";
import { TI_TICKET_URL, type CommandSnippet } from "@/lib/aiAssistantEngine";

interface IncomingHistoryItem {
  role: "assistant" | "user";
  content: string;
}

interface ChatRequestBody {
  message?: string;
  currentPopCode?: string | null;
  history?: IncomingHistoryItem[];
}

interface GeminiStructuredReply {
  content: string;
  steps?: string[];
  commands?: CommandSnippet[];
  popCodes?: string[];
  suggestTicket?: boolean;
}

const VALID_POP_CODES = new Set(POPS.map((p) => p.code));

const POP_CATALOG_SUMMARY = POPS.map(
  (p) => `${p.code} (Tema ${p.themeId}): ${p.title} — Objetivo: ${p.goal}`
).join("\n");

const SYSTEM_INSTRUCTION = `Você é o Assistente IA Especialista de Suporte de TI da ECOVIS BPO, integrado ao Portal Interativo de POPs (Windows 10 / 11 e Microsoft 365).

SEU PAPEL E TOM DE VOZ:
- Ajude colaboradores desde dúvidas de uso diário (Outlook, Grupos do Microsoft 365, Excel, Word, Teams, OneDrive, Windows) até diagnósticos técnicos intermediários/avançados (CMD, Executar Win+R, rede/IP/DNS, Certificado Digital A1/A3, ERP/Sistemas, Impressoras e Periféricos).
- Tenha profundidade técnica real de um analista Nível 2 Sênior, mas explique SEMPRE com linguagem simples, acolhedora, direta e fácil de seguir para qualquer colaborador.

REGRA CRÍTICA DE COERÊNCIA E PRECISÃO (ZERO RESPOSTAS SEM SENTIDO):
1. Responda ESTRITAMENTE à ferramenta, tela ou sintoma exato que o colaborador perguntou.
2. NUNCA invente relação com outro assunto desconexo (exemplo: se a pergunta for sobre a guia "Grupos" não aparecer no Outlook, pastas do Outlook ou recursos do Excel, NUNCA responda sobre falha de Wi-Fi ou limpeza de disco).
3. Só inclua códigos em "popCodes" quando o POP realmente tratar do MESMO assunto da pergunta. Se nenhum dos 38 POPs cobrir diretamente a dúvida (como dúvidas específicas de menus do Outlook, Excel, sistemas ERP ou impressoras), retorne "popCodes": [] e entregue a solução completa passo a passo em "content" e "steps".

REGRAS DE SEGURANÇA CORPORATIVA (OBRIGATÓRIAS):
1. Os colaboradores NÃO possuem senha de Administrador do Windows (UAC). Sugira apenas comandos e atalhos que funcionam com usuário padrão (ex.: ipconfig /flushdns, ipconfig /release, ipconfig /renew, ping, nslookup, gpupdate /force, hostname, whoami, %temp%, cleanmgr, %localappdata%\\Microsoft\\OneDrive\\onedrive.exe /reset, inetcpl.cpl, certmgr.msc, ncpa.cpl, control printers, outlook.exe /safe, outlook.exe /resetnavpane, excel.exe /safe, wsreset.exe, ms-settings:appsfeatures, ms-settings:display, ms-settings:privacy-microphone, Win + Ctrl + Shift + B).
2. NUNCA sugira comandos destrutivos (del /s, rd /s, format, diskpart, reg delete, edição arriscada no regedit), NUNCA peça senhas e NUNCA oriente desativar antivírus, firewall ou BitLocker.
3. Se a solução exigir permissão de Administrador (ex.: instalar software, netsh winsock reset, sfc /scannow, incluir usuário em Grupo de e-mail/permissão no servidor, desbloquear conta ou defeito físico), explique com transparência e marque "suggestTicket": true orientando abrir chamado em ${TI_TICKET_URL}.
4. Quando fornecer comandos de CMD ou Executar (Win + R), coloque-os no array "commands" indicando "whereToRun": "cmd" (Prompt de Comando) ou "run" (atalho Win + R), com "label" curto e "explanation" simples tranquilizando o usuário.

CATÁLOGO OFICIAL DOS 38 POPS DO PORTAL ECOVIS BPO:
${POP_CATALOG_SUMMARY}

RESPONDA EXCLUSIVAMENTE EM JSON VÁLIDO seguindo este formato:
{
  "content": "Explicação principal clara, precisa e empática em português",
  "steps": ["Passo 1 claro e objetivo", "Passo 2 claro e objetivo"],
  "commands": [
    {
      "label": "Passo opcional — Título curto da ação",
      "whereToRun": "cmd",
      "command": "comando exato",
      "explanation": "Explicação simples em 1 frase do que isso faz"
    }
  ],
  "popCodes": [],
  "suggestTicket": false
}`;

const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    content: { type: "STRING" },
    steps: {
      type: "ARRAY",
      items: { type: "STRING" },
    },
    commands: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          label: { type: "STRING" },
          whereToRun: { type: "STRING", enum: ["cmd", "run"] },
          command: { type: "STRING" },
          explanation: { type: "STRING" },
        },
        required: ["label", "whereToRun", "command", "explanation"],
      },
    },
    popCodes: {
      type: "ARRAY",
      items: { type: "STRING" },
    },
    suggestTicket: { type: "BOOLEAN" },
  },
  required: ["content", "suggestTicket"],
};

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json({ fallback: true, reason: "missing_api_key" });
  }

  let body: ChatRequestBody;
  try {
    body = (await request.json()) as ChatRequestBody;
  } catch {
    return NextResponse.json({ fallback: true, reason: "invalid_json" });
  }

  const userMessage = (body.message ?? "").trim().slice(0, 1200);
  if (!userMessage) {
    return NextResponse.json({ fallback: true, reason: "empty_message" });
  }

  const history = Array.isArray(body.history) ? body.history.slice(-8) : [];
  const contextNote = body.currentPopCode
    ? `[Nota de contexto: o colaborador está com a tela aberta em ${body.currentPopCode}, mas só cite esse POP se tiver relação real com a pergunta dele]\n`
    : "";

  // Converte histórico para o formato multi-turn estritamente alternado (user <-> model) exigido pelo Google Gemini
  const rawTurns: Array<{ role: "user" | "model"; text: string }> = [
    ...history
      .slice(0, -1)
      .filter((m) => m.content && m.content.trim().length > 0)
      .map((m) => ({
        role: (m.role === "assistant" ? "model" : "user") as "user" | "model",
        text: m.content.trim().slice(0, 1500),
      })),
    {
      role: "user",
      text: `${contextNote}${userMessage}`,
    },
  ];

  while (rawTurns.length > 1 && rawTurns[0].role !== "user") {
    rawTurns.shift();
  }

  const contents: Array<{ role: "user" | "model"; parts: Array<{ text: string }> }> = [];
  for (const turn of rawTurns) {
    const last = contents[contents.length - 1];
    if (last && last.role === turn.role) {
      last.parts[0].text = `${last.parts[0].text}\n\n${turn.text}`;
    } else {
      contents.push({
        role: turn.role,
        parts: [{ text: turn.text }],
      });
    }
  }

  const preferredModel = process.env.GEMINI_MODEL?.trim();
  const modelsToTry = preferredModel
    ? [preferredModel, "gemini-2.5-flash", "gemini-2.0-flash"]
    : ["gemini-2.5-flash", "gemini-2.0-flash"];

  const uniqueModels = Array.from(new Set(modelsToTry));

  for (const modelName of uniqueModels) {
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        modelName
      )}:generateContent?key=${encodeURIComponent(apiKey)}`;

      const geminiRes = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: SYSTEM_INSTRUCTION }],
          },
          contents,
          generationConfig: {
            temperature: 0.25,
            maxOutputTokens: 2500,
            responseMimeType: "application/json",
            responseSchema: RESPONSE_SCHEMA,
          },
        }),
      });

      if (!geminiRes.ok) {
        continue;
      }

      const payload = (await geminiRes.json()) as {
        candidates?: Array<{
          content?: { parts?: Array<{ text?: string }> };
        }>;
      };

      const rawText =
        payload.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
      if (!rawText) {
        continue;
      }

      const parsed = JSON.parse(rawText) as GeminiStructuredReply;
      if (!parsed.content || typeof parsed.content !== "string") {
        continue;
      }

      const safeCommands = Array.isArray(parsed.commands)
        ? parsed.commands
            .filter(
              (c) =>
                c &&
                typeof c.label === "string" &&
                typeof c.command === "string" &&
                typeof c.explanation === "string" &&
                (c.whereToRun === "cmd" || c.whereToRun === "run")
            )
            .slice(0, 5)
        : undefined;

      const safeSteps = Array.isArray(parsed.steps)
        ? parsed.steps
            .filter((s) => typeof s === "string" && s.trim().length > 0)
            .slice(0, 6)
        : undefined;

      const safePopCodes = Array.isArray(parsed.popCodes)
        ? parsed.popCodes
            .filter((code) => typeof code === "string")
            .map((code) => code.trim().toUpperCase())
            .filter((code) => VALID_POP_CODES.has(code))
            .slice(0, 3)
        : undefined;

      return NextResponse.json({
        content: parsed.content.trim(),
        steps: safeSteps && safeSteps.length > 0 ? safeSteps : undefined,
        commands:
          safeCommands && safeCommands.length > 0 ? safeCommands : undefined,
        popCodes:
          safePopCodes && safePopCodes.length > 0 ? safePopCodes : undefined,
        suggestTicket: Boolean(parsed.suggestTicket),
      });
    } catch {
      // Tenta o próximo modelo na fila antes de acionar fallback local
      continue;
    }
  }

  return NextResponse.json({ fallback: true, reason: "upstream_unavailable" });
}
