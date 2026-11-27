import { NextResponse } from "next/server";
import { POPS } from "@/data/pops";
import { THEMES } from "@/data/themes";
import { TI_TICKET_URL, type CommandSnippet } from "@/lib/aiAssistantEngine";

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

// Base completa dos 38 POPs (com todos os passos detalhados) para que o Gemini traduza o conhecimento ao usuário leigo sem mandá-lo "ir ler o manual"
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

const SYSTEM_INSTRUCTION = `Você é a IA Guia de Autoajuda da TI ECOVIS BPO (especialista em Windows 10/11, Microsoft 365, Outlook, Teams, Excel, Word, OneDrive, Redes/Wi-Fi, Monitores, Impressoras, Certificados Digitais A1/A3 e Sistemas/ERP).

SUA MISSÃO PRINCIPAL (FOCO EM COLABORADORES LEIGOS E DIAGNÓSTICO INTELIGENTE):
Muitos colaboradores são totalmente leigos em informática: não sabem nomes técnicos, não entendem manuais formais e muitas vezes dizem frases vagas como "meu computador parou", "sumiu tudo", "apareceu um negócio estranho na tela", "não consigo trabalhar" ou "não sei por onde começar".
O seu papel é agir como um colega paciente, acolhedor e brilhante da TI sentado ao lado dessa pessoa:

1. COMO AGIR QUANDO O PROBLEMA AINDA ESTÁ VAGO OU CONFUSO -> USE "responseMode": "investigate":
   - NÃO despeje listas gigantes nem tente adivinhar no escuro!
   - Acolha com empatia e faça APENAS 1 (no máximo 2) perguntas visuais e super simples do dia a dia para descobrir o que realmente está acontecendo (ex.: "O ponteiro do mouse ainda se mexe na tela ou travou tudo?", "Esse erro aparece dentro do e-mail, na internet ou na tela toda?", "Olhando bem no cantinho inferior direito da tela, pertinho do relógio, tem um desenho de globo cortado ou nuvenzinha com X vermelho?").
   - Deixe "steps": [], "commands": [] e "popCodes": [] enquanto estiver investigando.
   - Preencha SEMPRE "quickReplies" com 2 a 4 respostas curtas escritas em primeira pessoa na voz do usuário (ex.: ["Só o Outlook travou", "A tela inteira congelou", "Apareceu uma janelinha de erro", "Vou colar um print da tela"]) para que o usuário leigo possa responder apenas clicando!
   - Quando fizer sentido (ex.: janela de erro desconhecida), lembre gentilmente que ele pode colar uma captura/foto da tela aqui no chat com Ctrl + V (ou clicando no ícone de câmera 📷).

2. COMO AGIR QUANDO IDENTIFICAR O PROBLEMA -> USE "responseMode": "solve":
   - NUNCA mande o usuário leigo "ir ler o POP"! Você já conhece todo o conteúdo dos 38 POPs abaixo e muito mais: mastigue e explique tudo de forma calorosa, humana e direta na conversa.
   - TRADUZA TODO "TECNIQUÊS" PARA REFERÊNCIAS VISUAIS SIMPLES:
     * Em vez de "Área de notificação / Bandeja do sistema" -> diga "no cantinho inferior direito da tela, bem perto do relógio".
     * Em vez de "Pressione Win + R" -> diga "aperte a tecla com o desenho da janelinha do Windows (perto da barra de espaço) junto com a letra R".
     * Em vez de "Barra de navegação / Faixa de opções" -> descreva onde olhar na tela ("na coluna da esquerda", "nos botões lá no topo").
   - Adapte a profundidade ao perfil do usuário:
     * Se o usuário for leigo: dê de 2 a 4 passos curtos e visuais em "steps", sem assustar, e ofereça "quickReplies" úteis como ["Deu certo, resolveu!", "Não achei esse botão, explica mais devagar", "Apareceu outra mensagem"].
     * Se o usuário pedir algo avançado (CMD, resetar IP, etc.) OU se o passo básico não tiver funcionado: inclua os comandos seguros no array "commands" (eles aparecem com botão 'Copiar' pronto e tutorial visual automático na tela!).
   - Se o usuário enviou uma IMAGEM / PRINT da tela: leia cuidadosamente o que aparece na imagem, traduza em linguagem simples o que aquela mensagem ou tela significa ("Fique tranquilo! Vi aqui no seu print que...") e diga exatamente onde clicar.

3. QUANDO ENCAMINHAR PARA A EQUIPE DE TI -> USE "responseMode": "escalate":
   - Se o problema exigir senha de Administrador (UAC), instalação de programa, liberação de permissão em pasta/grupo de e-mail no servidor, certificado vencido, chave BitLocker ou defeito físico: explique com transparência e tranquilidade por que a TI precisa fazer essa liberação, marque "suggestTicket": true e oriente clicar em "Copiar resumo" + "Abrir Chamado TI" (${TI_TICKET_URL}).
   - Sempre preencha "diagnosedIssue" com uma frase técnica clara resumindo o problema identificado (isso vai direto para o texto copiado do chamado, ajudando o usuário leigo que não saberia explicar para a TI!).

REGRAS DE SEGURANÇA CORPORATIVA E COERÊNCIA (OBRIGATÓRIAS):
1. Colaboradores NÃO têm senha de Administrador no Windows. Só indique comandos que rodam com usuário padrão: ipconfig /flushdns, ipconfig /release, ipconfig /renew, ping, nslookup, gpupdate /force, hostname, whoami, %temp%, cleanmgr, %localappdata%\\Microsoft\\OneDrive\\onedrive.exe /reset, %localappdata%\\Microsoft\\OneDrive\\onedrive.exe, inetcpl.cpl, certmgr.msc, ncpa.cpl, control printers, outlook.exe /safe, outlook.exe /resetnavpane, excel.exe /safe, wsreset.exe, ms-settings:appsfeatures, ms-settings:display, ms-settings:privacy-microphone, ms-settings:sound, Win + Ctrl + Shift + B.
2. PROIBIDO sugerir comandos destrutivos (del /s, rd /s, rmdir /s, format, diskpart, reg delete, edição manual arriscada no regedit), pedir senhas ou mandar desativar antivírus/firewall/BitLocker.
3. COERÊNCIA TOTAL: Responda estritamente ao assunto real do usuário. Só inclua códigos em "popCodes" (máx. 2) quando já souber o problema e o POP tratar exatamente do mesmo tema. Caso contrário, envie "popCodes": [].

BASE DE CONHECIMENTO COMPLETA DOS 38 POPS OFICIAIS DA ECOVIS BPO:
${FULL_POPS_KNOWLEDGE_BASE}`;

const RESPONSE_JSON_SCHEMA = {
  type: "object",
  properties: {
    responseMode: {
      type: "string",
      enum: ["investigate", "solve", "escalate"],
      description:
        "Use 'investigate' para fazer 1 pergunta simples quando o relato for vago; 'solve' para entregar passos claros de solução; 'escalate' quando exigir atuação da TI.",
    },
    content: {
      type: "string",
      description:
        "Resposta conversacional, empática, clara e sem jargões técnicos difíceis, em português do Brasil.",
    },
    steps: {
      type: "array",
      items: { type: "string" },
      description:
        "Lista curta de passos práticos e visuais (vazio [] quando responseMode for 'investigate').",
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
        "Comandos opcionais seguros (sem exigir Admin) para CMD ou Executar (Win+R).",
    },
    quickReplies: {
      type: "array",
      items: { type: "string" },
      description:
        "2 a 4 botões curtos de resposta rápida escritos na voz do colaborador para facilitar o próximo clique.",
    },
    popCodes: {
      type: "array",
      items: { type: "string" },
      description:
        "Códigos oficiais (POP-001 a POP-038) apenas quando diretamente aplicáveis ao problema já identificado.",
    },
    diagnosedIssue: {
      type: "string",
      description:
        "Resumo técnico objetivo de 1 linha do problema diagnosticado até o momento para eventual chamado de TI.",
    },
    suggestTicket: {
      type: "boolean",
      description:
        "true quando precisar abrir chamado com a TI ou após esgotar tentativas seguras.",
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
  if (!cleaned) return defaults;

  // Substitui automaticamente modelos legados/descontinuados (2.5 / 2.0 / 1.5) pelo Gemini 4 Hydrogen gratuito
  if (/^gemini-(1\.|2\.)/i.test(cleaned)) {
    return defaults;
  }
  return Array.from(new Set([cleaned, ...defaults]));
}

function extractInteractionJsonText(payload: InteractionApiResponse): string | null {
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

async function callInteractionsEndpoint(params: {
  apiKey: string;
  model: string;
  inputBlocks: Array<Record<string, string>>;
  previousInteractionId?: string | null;
}): Promise<InteractionApiResponse | null> {
  const { apiKey, model, inputBlocks, previousInteractionId } = params;
  const thinkingLevel = model.startsWith("gemini-4-") ? "medium" : "low";

  const requestBody: Record<string, unknown> = {
    model,
    system_instruction: SYSTEM_INSTRUCTION,
    input:
      inputBlocks.length === 1 && inputBlocks[0].type === "text"
        ? inputBlocks[0].text
        : inputBlocks,
    generation_config: {
      thinking_level: thinkingLevel,
    },
    response_format: {
      type: "text",
      mime_type: "application/json",
      schema: RESPONSE_JSON_SCHEMA,
    },
  };

  if (previousInteractionId) {
    requestBody.previous_interaction_id = previousInteractionId;
  }

  const res = await fetch(
    "https://generativelanguage.googleapis.com/v1/interactions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": apiKey,
      },
      body: JSON.stringify(requestBody),
    }
  );

  if (!res.ok) {
    return null;
  }

  return (await res.json()) as InteractionApiResponse;
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
      rawImage.base64Data.length <= 6_500_000 &&
      typeof rawImage.mimeType === "string" &&
      ALLOWED_IMAGE_MIME_TYPES.has(rawImage.mimeType)
  );

  if (!rawMessage && !hasValidImage) {
    return NextResponse.json({ fallback: true, reason: "empty_message" });
  }

  const effectiveUserMessage =
    rawMessage ||
    "Enviei uma imagem/print da minha tela porque não sei explicar o erro. Pode ver o que está aparecendo e me guiar passo a passo de forma bem simples?";

  const contextNote = body.currentPopCode
    ? `[Contexto opcional da tela: o colaborador está visualizando ${body.currentPopCode} no portal, mas ignore caso a dúvida seja sobre outro assunto]\n`
    : "";

  const history = Array.isArray(body.history) ? body.history.slice(-10) : [];
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
          .slice(0, 1200)}`
    );

  const currentTurnBlocks: Array<Record<string, string>> = [
    {
      type: "text",
      text: `${contextNote}${effectiveUserMessage}`,
    },
  ];

  const statelessTurnBlocks: Array<Record<string, string>> = [
    {
      type: "text",
      text:
        priorTurns.length > 0
          ? `Histórico recente da conversa:\n${priorTurns.join(
              "\n\n"
            )}\n\n---\n${contextNote}Nova mensagem do Colaborador: ${effectiveUserMessage}`
          : `${contextNote}${effectiveUserMessage}`,
    },
  ];

  if (hasValidImage && rawImage?.base64Data && rawImage?.mimeType) {
    const imgBlock = {
      type: "image",
      data: rawImage.base64Data,
      mime_type: rawImage.mimeType,
    };
    currentTurnBlocks.push(imgBlock);
    statelessTurnBlocks.push(imgBlock);
  }

  const modelsToTry = resolveModelQueue(process.env.GEMINI_MODEL);
  const previousInteractionId = body.previousInteractionId?.trim() || null;

  for (let idx = 0; idx < modelsToTry.length; idx++) {
    const modelName = modelsToTry[idx];

    try {
      let payload: InteractionApiResponse | null = null;

      // Na primeira tentativa, aproveita o estado nativo da Interactions API (previous_interaction_id)
      if (idx === 0 && previousInteractionId) {
        payload = await callInteractionsEndpoint({
          apiKey,
          model: modelName,
          inputBlocks: currentTurnBlocks,
          previousInteractionId,
        });
      }

      // Se não havia sessão prévia (ou se expirou/trocou de modelo), envia com o histórico consolidado
      if (!payload) {
        payload = await callInteractionsEndpoint({
          apiKey,
          model: modelName,
          inputBlocks: statelessTurnBlocks,
          previousInteractionId: null,
        });
      }

      if (!payload) {
        continue;
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
          ? parsed.diagnosedIssue.trim().slice(0, 180)
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
        interactionId:
          typeof payload.id === "string" ? payload.id : undefined,
      });
    } catch {
      continue;
    }
  }

  return NextResponse.json({ fallback: true, reason: "upstream_unavailable" });
}
