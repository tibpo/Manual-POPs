import { NextResponse } from "next/server";
import { POPS } from "@/data/pops";
import { THEMES } from "@/data/themes";
import { TI_TICKET_URL, type CommandSnippet } from "@/lib/aiAssistantEngine";

// Eleva o limite de execução na Vercel (inclusive no plano gratuito Hobby) de 10s para 60s, evitando corte (504) ao analisar prints de tela detalhados
export const maxDuration = 60;

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

interface EndpointCallResult {
  ok: boolean;
  status: number;
  payload: InteractionApiResponse | null;
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

const SYSTEM_INSTRUCTION = `Você é a IA Especialista e Guia de Autoajuda da TI ECOVIS BPO (especialista sênior em Windows 10/11, Microsoft 365, Outlook, Teams, Excel, Word, OneDrive, Redes/Wi-Fi, Monitores, Impressoras, Certificados Digitais A1/A3, Navegadores e Sistemas/ERP).

=====================================================================
PROTOCOLO N° 1 — QUANDO O USUÁRIO ENVIAR UM PRINT / IMAGEM DA TELA (PRIORIDADE MÁXIMA):
=====================================================================
1. LEITURA ÓPTICA RIGOROSA (OCR EXATO, LETRA POR LETRA):
   - Inspecione cada detalhe da imagem enviada: título da janela, texto completo da caixa de erro, códigos exatos (ex.: 0x8004de40, 0x80070005, ERR_CONNECTION_TIMED_OUT, DNS_PROBE_FINISHED_NXDOMAIN, HTTP 403/500, mensagens do Outlook, Excel, OneDrive, Windows ou ERP), botões visíveis e ícones da barra de tarefas.
   - NUNCA chute nem invente um texto que não está escrito na imagem. Leia exatamente os caracteres reais exibidos.

2. TRANSCRIÇÃO FIEL OBRIGATÓRIA NO CAMPO "screenTranscription":
   - Sempre que houver imagem/print, preencha OBRIGATORIAMENTE o campo "screenTranscription" transcrevendo de forma fiel e literal o nome do programa/tela e a mensagem/código exato do erro que aparece na imagem.
   - Exemplo: "Microsoft Outlook — Erro (0x8004010F): O arquivo de dados do Outlook não pode ser acessado."
   - Se a mensagem na tela estiver em inglês, transcreva exatamente o texto original em inglês e coloque a tradução clara entre parênteses logo em seguida.
   - Se o print mostrar uma tela sem caixa de erro explícita (ex.: uma configuração, um ícone estranho ou uma tela em branco/travada), descreva com precisão cirúrgica o que está visível na tela em "screenTranscription".

3. ZERO DÚVIDA / ZERO HESITAÇÃO — ENTREGUE A MELHOR SOLUÇÃO IMEDIATAMENTE:
   - Diante de um print com erro, aviso ou problema visível, NUNCA fique em dúvida e NÃO use "responseMode": "investigate"!
   - Use SEMPRE "responseMode": "solve" (ou "escalate" se o print mostrar pedido de senha de Administrador UAC, BitLocker, conta bloqueada ou falha exclusiva de servidor).
   - Em "content": explique com total segurança, clareza e linguagem simples (acessível até para um leigo) o que causou exatamente aquele erro do print. Evite palavras inseguras como "talvez seja", "não tenho certeza" ou "parece ser".
   - Em "steps": entregue imediatamente o MELHOR passo a passo prático e definitivo para resolver aquele erro exato — dizendo inclusive em qual botão da própria janela do print o usuário deve clicar primeiro (ex.: "Clique em 'OK' / 'Fechar' nessa janelinha do erro") e cada clique seguinte em ordem lógica.
   - Em "commands": sempre que um comando seguro de CMD ou Executar (Win + R) resolver ou acelerar o conserto daquele erro específico do print (ex.: limpar cache SSL, resetar OneDrive, renovar IP/DNS, modo seguro do Outlook/Excel, limpar fila de impressão), inclua-o já pronto para copiar!

=====================================================================
PROTOCOLO N° 2 — CONVERSA SEM IMAGEM (USUÁRIOS LEIGOS ATÉ AVANÇADOS):
=====================================================================
1. SE O RELATO EM TEXTO FOR MUITO VAGO (ex.: "não consigo trabalhar", "parou tudo", "não sei explicar") -> USE "responseMode": "investigate":
   - Acolha com empatia e faça APENAS 1 pergunta visual simples por vez (ex.: "O mouse ainda mexe ou a tela inteira congelou?", "Isso acontece no e-mail (Outlook), no navegador ou no computador todo?").
   - Deixe "steps": [], "commands": [] e "popCodes": [] enquanto investiga, e crie de 2 a 4 botões curtos em "quickReplies" na voz do usuário para ele responder com 1 clique (lembrando que ele também pode apertar Win + Shift + S e colar um print com Ctrl + V!).

2. SE O PROBLEMA EM TEXTO JÁ ESTIVER CLARO -> USE "responseMode": "solve":
   - Mastigue toda a solução diretamente no chat sem mandar o usuário leigo "ir ler o manual".
   - Traduza termos técnicos para referências visuais fáceis ("no cantinho inferior direito perto do relógio", "segure a tecla da janelinha do Windows junto com a letra R").

=====================================================================
REGRAS DE SEGURANÇA CORPORATIVA ECOVIS BPO (OBRIGATÓRIAS):
=====================================================================
1. Os colaboradores NÃO possuem senha de Administrador no Windows (UAC). Sugira apenas comandos que rodam com usuário comum: ipconfig /flushdns, ipconfig /release, ipconfig /renew, ping, nslookup, gpupdate /force, hostname, whoami, %temp%, cleanmgr, %localappdata%\\Microsoft\\OneDrive\\onedrive.exe /reset, %localappdata%\\Microsoft\\OneDrive\\onedrive.exe, inetcpl.cpl, certmgr.msc, ncpa.cpl, control printers, outlook.exe /safe, outlook.exe /resetnavpane, excel.exe /safe, wsreset.exe, ms-settings:appsfeatures, ms-settings:display, ms-settings:privacy-microphone, ms-settings:sound, Win + Ctrl + Shift + B.
2. NUNCA sugira comandos destrutivos (del /s, rd /s, rmdir /s, format, diskpart, reg delete), nunca peça senhas e nunca oriente desativar antivírus, firewall ou BitLocker.
3. Quando o erro exigir permissão de Administrador, instalação de programa, inclusão em grupo/pasta no servidor ou reparo físico, use "responseMode": "escalate", marque "suggestTicket": true, preencha "diagnosedIssue" com o erro exato e oriente abrir chamado em ${TI_TICKET_URL}.
4. Só inclua códigos em "popCodes" (máx. 2 entre POP-001 e POP-038) se o POP tratar diretamente do mesmo assunto. Caso contrário, retorne "popCodes": [].

BASE DE CONHECIMENTO COMPLETA DOS 38 POPS OFICIAIS DA ECOVIS BPO:
${FULL_POPS_KNOWLEDGE_BASE}`;

const RESPONSE_JSON_SCHEMA = {
  type: "object",
  properties: {
    responseMode: {
      type: "string",
      enum: ["investigate", "solve", "escalate"],
      description:
        "Para prints de erro use SEMPRE 'solve' (ou 'escalate' se exigir TI/Admin). Use 'investigate' apenas quando não houver erro claro e precisar de 1 pergunta simples.",
    },
    screenTranscription: {
      type: "string",
      description:
        "OBRIGATÓRIO quando houver imagem/print: transcrição literal e exata da janela, código e mensagem de erro lida na tela. Vazio '' se não houver imagem.",
    },
    content: {
      type: "string",
      description:
        "Explicação direta, segura, acolhedora e sem jargões difíceis sobre a causa do problema e como vamos resolver.",
    },
    steps: {
      type: "array",
      items: { type: "string" },
      description:
        "Passos práticos, completos e visuais na ordem exata de execução para resolver o problema.",
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
      description:
        "Comandos seguros (sem exigir Admin) para CMD ou Executar (Win+R) quando aplicáveis.",
    },
    quickReplies: {
      type: "array",
      items: { type: "string" },
      description:
        "2 a 4 botões curtos de resposta rápida escritos na voz do colaborador.",
    },
    popCodes: {
      type: "array",
      items: { type: "string" },
      description:
        "Códigos POP-001 a POP-038 apenas quando diretamente relacionados ao mesmo assunto.",
    },
    diagnosedIssue: {
      type: "string",
      description:
        "Resumo técnico curto (incluindo código do erro se houver) para eventual abertura de chamado na TI.",
    },
    suggestTicket: {
      type: "boolean",
      description:
        "true quando exigir ação da equipe de TI ou caso o erro seja administrativo/físico.",
    },
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

function cleanJsonEnvelope(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith("```")) {
    return trimmed
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/, "")
      .trim();
  }
  return trimmed;
}

function buildInputBlocks(params: {
  promptText: string;
  image?: { base64Data: string; mimeType: string } | null;
  modelName: string;
}): Array<Record<string, string>> {
  const { promptText, image, modelName } = params;

  if (!image) {
    return [{ type: "text", text: promptText }];
  }

  // Usa resolução "ultra_high" (2240 tokens visuais dedicados a leitura de telas/OCR) na linha Gemini 4 e "high" na linha Gemini 3
  const mediaResolution = modelName.startsWith("gemini-4-")
    ? "ultra_high"
    : "high";

  // Na análise de telas, posicionar a imagem ANTES da instrução melhora a precisão do OCR
  return [
    {
      type: "image",
      data: image.base64Data,
      mime_type: image.mimeType,
      resolution: mediaResolution,
    },
    {
      type: "text",
      text: promptText,
    },
  ];
}

async function callInteractionsEndpoint(params: {
  apiKey: string;
  model: string;
  inputBlocks: Array<Record<string, string>>;
  hasImage: boolean;
  previousInteractionId?: string | null;
}): Promise<EndpointCallResult> {
  const { apiKey, model, inputBlocks, hasImage, previousInteractionId } =
    params;

  const isGemini4 = model.startsWith("gemini-4-");
  const isGemini3 = model.startsWith("gemini-3.");

  // Em prints de erro, usa raciocínio mais profundo ("high" no Gemini 4 / "medium" no Gemini 3) para ler cada caractere e validar a melhor solução sem hesitar
  const thinkingLevel = isGemini4
    ? hasImage
      ? "high"
      : "medium"
    : isGemini3
    ? hasImage
      ? "medium"
      : "low"
    : undefined;

  const requestBody: Record<string, unknown> = {
    model,
    system_instruction: SYSTEM_INSTRUCTION,
    input:
      inputBlocks.length === 1 && inputBlocks[0].type === "text"
        ? inputBlocks[0].text
        : inputBlocks,
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

  if (previousInteractionId) {
    requestBody.previous_interaction_id = previousInteractionId;
  }

  try {
    const res = await fetch(
      "https://generativelanguage.googleapis.com/v1/interactions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": apiKey,
        },
        body: JSON.stringify(requestBody),
        signal: AbortSignal.timeout(hasImage ? 26000 : 16000),
      }
    );

    if (!res.ok) {
      // Caso algum formato específico de imagem rejeite "ultra_high" (400), tenta imediatamente em "high" no mesmo modelo Gemini 4
      if (
        hasImage &&
        res.status === 400 &&
        inputBlocks.some((b) => b.resolution === "ultra_high")
      ) {
        const highResBlocks = inputBlocks.map((b) =>
          b.type === "image" ? { ...b, resolution: "high" } : b
        );
        const retryRes = await fetch(
          "https://generativelanguage.googleapis.com/v1/interactions",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-goog-api-key": apiKey,
            },
            body: JSON.stringify({
              ...requestBody,
              input: highResBlocks,
            }),
            signal: AbortSignal.timeout(24000),
          }
        );
        if (retryRes.ok) {
          const retryPayload =
            (await retryRes.json()) as InteractionApiResponse;
          return { ok: true, status: retryRes.status, payload: retryPayload };
        }
      }
      return { ok: false, status: res.status, payload: null };
    }

    const payload = (await res.json()) as InteractionApiResponse;
    return { ok: true, status: res.status, payload };
  } catch {
    return { ok: false, status: 0, payload: null };
  }
}

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

  const rawMessage = (body.message ?? "").trim().slice(0, 2000);
  const rawImage = body.image;
  const hasValidImage = Boolean(
    rawImage &&
      typeof rawImage.base64Data === "string" &&
      rawImage.base64Data.length > 50 &&
      rawImage.base64Data.length <= 7_500_000 &&
      typeof rawImage.mimeType === "string" &&
      ALLOWED_IMAGE_MIME_TYPES.has(rawImage.mimeType)
  );

  if (!rawMessage && !hasValidImage) {
    return NextResponse.json({ fallback: true, reason: "empty_message" });
  }

  const effectiveUserMessage = hasValidImage
    ? rawMessage
      ? `Analise atentamente este print da tela junto com meu relato: "${rawMessage}". Primeiro transcreva literalmente em "screenTranscription" tudo o que o erro/tela mostra (incluindo códigos e nome da janela) e em seguida me dê a solução mais certeira passo a passo, sem ficar em dúvida.`
      : `Analise atentamente este print da minha tela. Leia letra por letra e transcreva fielmente em "screenTranscription" a mensagem, título da janela e qualquer código de erro exibido, explique de forma simples o que significa e já me entregue a melhor solução passo a passo completa (use responseMode="solve" ou "escalate").`
    : rawMessage;

  const contextNote = body.currentPopCode
    ? `[Contexto opcional: o colaborador está com ${body.currentPopCode} aberto ao fundo, mas ignore se o print/dúvida for sobre outro assunto]\n`
    : "";

  const history = Array.isArray(body.history) ? body.history.slice(-8) : [];
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
          .slice(0, 1000)}`
    );

  const singleTurnText = `${contextNote}${effectiveUserMessage}`;
  const fullStatelessText =
    priorTurns.length > 0
      ? `Histórico recente da conversa:\n${priorTurns.join(
          "\n\n"
        )}\n\n---\n${contextNote}Solicitação atual do Colaborador: ${effectiveUserMessage}`
      : singleTurnText;

  const validImageObj =
    hasValidImage && rawImage?.base64Data && rawImage?.mimeType
      ? { base64Data: rawImage.base64Data, mimeType: rawImage.mimeType }
      : null;

  const modelsToTry = resolveModelQueue(process.env.GEMINI_MODEL);
  const previousInteractionId = body.previousInteractionId?.trim() || null;
  let lastErrorStatus = 0;

  for (let idx = 0; idx < modelsToTry.length; idx++) {
    const modelName = modelsToTry[idx];

    try {
      let payload: InteractionApiResponse | null = null;

      // Quando há imagem, envia direto o histórico textual leve + apenas a imagem atual em ultra_high (evita reprocessar imagens antigas e estourar cota/tempo)
      if (!hasValidImage && idx === 0 && previousInteractionId) {
        const statefulResult = await callInteractionsEndpoint({
          apiKey,
          model: modelName,
          inputBlocks: buildInputBlocks({
            promptText: singleTurnText,
            image: null,
            modelName,
          }),
          hasImage: false,
          previousInteractionId,
        });

        if (statefulResult.ok && statefulResult.payload) {
          payload = statefulResult.payload;
        } else {
          lastErrorStatus = statefulResult.status;
          // Se foi limite de taxa (429) ou falha 5xx no servidor, pula imediatamente para o próximo modelo gratuito sem perder tempo no mesmo modelo!
          if (statefulResult.status === 429 || statefulResult.status >= 500) {
            continue;
          }
        }
      }

      if (!payload) {
        const statelessResult = await callInteractionsEndpoint({
          apiKey,
          model: modelName,
          inputBlocks: buildInputBlocks({
            promptText: fullStatelessText,
            image: validImageObj,
            modelName,
          }),
          hasImage: hasValidImage,
          previousInteractionId: null,
        });

        if (statelessResult.ok && statelessResult.payload) {
          payload = statelessResult.payload;
        } else {
          lastErrorStatus = statelessResult.status;
          continue;
        }
      }

      const rawJsonText = extractInteractionJsonText(payload);
      if (!rawJsonText) {
        continue;
      }

      const parsed = JSON.parse(
        cleanJsonEnvelope(rawJsonText)
      ) as GeminiStructuredReply;

      if (!parsed.content || typeof parsed.content !== "string") {
        continue;
      }

      const responseMode: "investigate" | "solve" | "escalate" =
        parsed.responseMode === "investigate" ||
        parsed.responseMode === "solve" ||
        parsed.responseMode === "escalate"
          ? parsed.responseMode
          : "solve";

      const safeScreenTranscription =
        typeof parsed.screenTranscription === "string" &&
        parsed.screenTranscription.trim().length > 0
          ? parsed.screenTranscription.trim().slice(0, 600)
          : undefined;

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
        screenTranscription: safeScreenTranscription,
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
        interactionId: !hasValidImage && typeof payload.id === "string"
          ? payload.id
          : undefined,
      });
    } catch {
      continue;
    }
  }

  return NextResponse.json({
    fallback: true,
    reason: lastErrorStatus === 429 ? "rate_limited" : "upstream_unavailable",
  });
}
