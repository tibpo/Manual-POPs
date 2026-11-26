import { POPS } from "@/data/pops";
import { THEMES } from "@/data/themes";
import type { PopItem } from "@/types/pop";

export const TI_TICKET_URL = "https://ti.ecobpoti.cloud/abrir";

export interface ChatActionPop {
  code: string;
  title: string;
  goal: string;
}

export interface ChatMessage {
  id: string;
  role: "assistant" | "user";
  content: string;
  steps?: string[];
  recommendedPops?: ChatActionPop[];
  suggestTicket?: boolean;
  askResolutionFeedback?: boolean;
  timestamp: number;
}

interface ExtraKnowledgeTopic {
  id: string;
  title: string;
  triggers: string[];
  intro: string;
  steps: string[];
  relatedPopCodes?: string[];
  escalateNote: string;
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s/-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const STOPWORDS = new Set([
  "como",
  "para",
  "meu",
  "minha",
  "meus",
  "esta",
  "estao",
  "estou",
  "com",
  "sem",
  "uma",
  "uns",
  "umas",
  "dos",
  "das",
  "nos",
  "nas",
  "por",
  "que",
  "qual",
  "quais",
  "isso",
  "esse",
  "essa",
  "este",
  "esta",
  "fazer",
  "preciso",
  "quero",
  "ajuda",
  "problema",
  "erro",
  "duvida",
  "site",
  "muito",
  "mais",
  "quando",
  "onde",
  "pelo",
  "pela",
]);

// Base expandida para dúvidas comuns na ECOVIS BPO que vão além dos 38 POPs do site
const EXTRA_KNOWLEDGE_BASE: ExtraKnowledgeTopic[] = [
  {
    id: "certificado-digital",
    title: "Certificado Digital (A1 / A3 / Token / e-CNPJ / e-CPF)",
    triggers: [
      "certificado",
      "token",
      "ecnpj",
      "e-cnpj",
      "ecpf",
      "e-cpf",
      "a1",
      "a3",
      "receita",
      "ecac",
      "e-cac",
      "sefaz",
      "assinador",
      "serpro",
      "valid",
      "certisign",
      "soluti",
    ],
    intro:
      "Esse tema não está nos 38 POPs padrão, mas separei as verificações rápidas para Certificado Digital:",
    steps: [
      "Se for Token/Cartão A3: desconecte e conecte em outra porta USB direta do notebook (evite hubs USB) e verifique se o gerenciador SafeNet/TokenAdmin reconhece o dispositivo.",
      "Feche todas as janelas do navegador, abra uma janela normal (não anônima) ou teste no Microsoft Edge / Google Chrome selecionando o certificado correto no aviso.",
      "Se o certificado for A1 (arquivo) e aparecer vencido ou não listado no navegador, pressione Win + R, digite certmgr.msc > Pessoal > Certificados para conferir a validade.",
      "Caso precise instalar um novo certificado A1 ou renovar permissão, abra chamado informando o nome da empresa/cliente e seu patrimônio.",
    ],
    relatedPopCodes: ["POP-018", "POP-034"],
    escalateNote:
      "Se o certificado estiver vencido ou pedir senha de administrador para instalar cadeia/driver, acione a TI pelo botão abaixo.",
  },
  {
    id: "impressora-scanner",
    title: "Impressora ou Scanner não funciona",
    triggers: [
      "impressora",
      "imprimir",
      "impressao",
      "scanner",
      "escanear",
      "digitalizar",
      "fila de impressao",
      "papel",
      "toner",
    ],
    intro:
      "Problemas de impressão/digitalização não possuem um POP exclusivo no catálogo, mas você pode testar este checklist rápido:",
    steps: [
      "Confirme se você está conectado na rede Wi-Fi corporativa correta do escritório (impressoras de rede não funcionam no 4G ou em redes de visitantes).",
      "Em Configurações > Bluetooth e dispositivos > Impressoras e scanners, verifique se a impressora aparece como 'Offline' ou com documentos presos na fila.",
      "Reinicie o Windows pelo menu Iniciar > Reiniciar (isso destrava o serviço de Spooler de impressão na maioria dos casos).",
    ],
    relatedPopCodes: ["POP-005", "POP-029"],
    escalateNote:
      "Se precisar mapear uma nova impressora de setor ou se houver erro físico/toner no equipamento, abra chamado informando o setor/andar.",
  },
  {
    id: "sistemas-erp-acesso",
    title: "Sistemas Internos, ERP, Domínio, Senha Bloqueada ou Erro de Acesso",
    triggers: [
      "erp",
      "dominio",
      "sistema",
      "acesso negado",
      "bloqueado",
      "permissao",
      "login",
      "portal",
      "403",
      "500",
      "502",
      "sessao expirada",
      "citrix",
      "remoto",
      "area de trabalho remota",
      "rdp",
      "pasta de rede",
      "mapeamento",
    ],
    intro:
      "Para falhas em sistemas internos, ERP ou pastas de rede, realize estes testes antes de acionar o suporte:",
    steps: [
      "Se estiver fora do escritório (home office/cliente), confirme se a VPN corporativa está conectada — sem ela, pastas de rede e sistemas internos não abrem.",
      "Se for sistema web dando erro de login ou tela em branco, teste abrir em uma janela anônima (Ctrl + Shift + N) para descartar cache corrompido.",
      "Se sua conta bloqueou por tentativas de senha ou você precisa de liberação de acesso/perfil, somente a equipe de TI pode desbloquear.",
    ],
    relatedPopCodes: ["POP-021", "POP-034", "POP-033"],
    escalateNote:
      "Tire um print da tela inteira (Win + Shift + S) mostrando o horário e o erro exato e anexe no chamado.",
  },
  {
    id: "instalacao-admin",
    title: "Instalação de Programas ou Permissão de Administrador",
    triggers: [
      "instalar",
      "instalacao",
      "programa novo",
      "software",
      "administrador",
      "admin",
      "uac",
      "pede senha",
      "atualizar programa",
      "licenca",
    ],
    intro:
      "Por política de segurança da ECOVIS BPO, a instalação de softwares e permissões de Administrador são realizadas pela TI:",
    steps: [
      "Nunca baixe instaladores de sites não oficiais para evitar riscos de malware.",
      "Abra um chamado informando: (1) nome exato do programa, (2) finalidade no trabalho e (3) etiqueta de patrimônio/hostname do seu notebook.",
      "A equipe técnica pode conectar remotamente e concluir a instalação em poucos minutos.",
    ],
    relatedPopCodes: ["POP-033", "POP-020"],
    escalateNote:
      "Use o botão abaixo para copiar o resumo e abrir a solicitação diretamente no portal da TI.",
  },
  {
    id: "outlook-email-teams",
    title: "Problemas no Outlook, E-mail ou Microsoft Teams",
    triggers: [
      "outlook",
      "caixa de entrada",
      "nao envia",
      "nao recebe",
      "assinatura",
      "teams",
      "camera",
      "webcam",
      "compartilhar tela",
      "reuniao travando",
    ],
    intro:
      "Para falhas no Outlook ou Microsoft Teams, siga este roteiro prático:",
    steps: [
      "Se o Outlook não sincroniza e-mails: verifique no rodapé direito da janela se aparece 'Trabalhando Offline' (na aba Enviar/Receber, desmarque 'Trabalhar Offline') e teste o acesso via navegador (Outlook Web) para confirmar a internet.",
      "Se o Teams estiver travando ou sem câmera/áudio: encerre completamente o Teams clicando com o botão direito no ícone dele perto do relógio > Sair, e abra novamente.",
      "Durante reuniões pesadas com vídeo, pause o OneDrive por 2 horas para liberar banda de internet.",
    ],
    relatedPopCodes: ["POP-027", "POP-037", "POP-031"],
    escalateNote:
      "Persistindo o erro de sincronização ou perfil no Outlook/Teams, abra um chamado para reparo do pacote Office.",
  },
  {
    id: "perifericos-teclado-mouse",
    title: "Teclado, Mouse, Bluetooth ou Periféricos com Falha",
    triggers: [
      "mouse",
      "teclado",
      "tecla",
      "bluetooth",
      "usb nao reconhece",
      "headset",
      "fone",
      "touchpad",
      "duplo clique",
      "acento",
      "desconfigurado",
    ],
    intro:
      "Para falhas em teclado, mouse ou acessórios conectados ao notebook:",
    steps: [
      "Se o teclado estiver trocando acentos/pontuação: pressione Win + Espaço para alternar o idioma de entrada para 'Português (Brasil ABNT2)'.",
      "Se for mouse/headset USB: teste em outra porta USB direta do notebook e desconecte hubs externos.",
      "Se for Bluetooth: desligue e ligue o Bluetooth nas Configurações Rápidas (canto inferior direito) e verifique a carga/pilha do acessório.",
    ],
    relatedPopCodes: ["POP-010", "POP-027", "POP-005"],
    escalateNote:
      "Caso alguma tecla física tenha parado de funcionar ou o acessório esteja com defeito físico, solicite substituição/avaliação à TI.",
  },
  {
    id: "tela-azul-erro-critico",
    title: "Tela Azul (BSOD) ou Desligamento Repentino",
    triggers: [
      "tela azul",
      "bsod",
      "desligou sozinho",
      "reiniciou sozinho",
      "erro critico",
      "reparo automatico",
      "bitlocker",
      "chave de recuperacao",
    ],
    intro:
      "Atenção: falhas de Tela Azul, Reparo Automático ou pedido de chave BitLocker exigem cuidado:",
    steps: [
      "Se pedir Chave de Recuperação do BitLocker: não formate nem tente restaurar por conta própria — tire uma foto da tela com o celular mostrando o ID da chave e acione a TI imediatamente.",
      "Se o notebook desligou sozinho durante o uso: verifique se a base estava abafada/superaquecendo e se o carregador original está firme na tomada.",
      "Anote o horário exato da queda para o analista consultar o Visualizador de Eventos do Windows.",
    ],
    relatedPopCodes: ["POP-014", "POP-032", "POP-034"],
    escalateNote:
      "Acione a TI com foto/print do código de parada exibido na tela para diagnóstico de hardware ou driver.",
  },
];

function scorePopMatch(pop: PopItem, queryNorm: string, tokens: string[]): number {
  let score = 0;
  const codeNorm = normalize(pop.code);
  const titleNorm = normalize(pop.title);
  const goalNorm = normalize(pop.goal);
  const kwNorm = normalize(pop.keywords);
  const stepsNorm = normalize(
    pop.steps.map((s) => `${s.lead} ${s.text}`).join(" ")
  );

  if (queryNorm.includes(codeNorm)) {
    score += 40;
  }

  for (const token of tokens) {
    if (token.length < 2) continue;
    const stem = token.length >= 5 ? token.slice(0, 5) : token;

    if (kwNorm.includes(token)) score += 9;
    else if (stem.length >= 4 && kwNorm.includes(stem)) score += 6;

    if (titleNorm.includes(token)) score += 8;
    else if (stem.length >= 4 && titleNorm.includes(stem)) score += 5;

    if (goalNorm.includes(token)) score += 5;

    if (stepsNorm.includes(token)) score += 2;
  }

  return score;
}

function isUnresolvedOrEscalationIntent(queryNorm: string): boolean {
  const patterns = [
    "nao resolveu",
    "nao funcionou",
    "ja tentei",
    "ja fiz",
    "continua",
    "persiste",
    "nao deu certo",
    "nao consegui",
    "nao achei",
    "nao encontrei",
    "nao tem no site",
    "abrir chamado",
    "falar com ti",
    "falar com suporte",
    "atendente",
    "humano",
    "continua igual",
    "ainda esta",
  ];
  return patterns.some((p) => queryNorm.includes(p));
}

function isPositiveConfirmation(queryNorm: string): boolean {
  const exactOrShort = [
    "resolveu",
    "funcionou",
    "deu certo",
    "consegui",
    "obrigado",
    "obrigada",
    "valeu",
    "perfeito",
    "show",
    "otimo",
  ];
  return (
    queryNorm.length <= 45 &&
    exactOrShort.some((p) => queryNorm.includes(p)) &&
    !queryNorm.includes("nao")
  );
}

export function buildTicketSummary(
  messages: ChatMessage[],
  currentPopCode: string | null
): string {
  const userTexts = messages
    .filter((m) => m.role === "user")
    .map((m) => m.content.trim())
    .filter(Boolean);

  const suggestedCodes = Array.from(
    new Set(
      [
        ...(currentPopCode ? [currentPopCode] : []),
        ...messages.flatMap((m) =>
          (m.recommendedPops ?? []).map((p) => p.code)
        ),
      ].filter(Boolean)
    )
  );

  const mainIssue =
    userTexts.length > 0
      ? userTexts.join(" | ")
      : "Solicitação de suporte via Assistente de Autoajuda (Portal POPs TI)";

  const checkedPops =
    suggestedCodes.length > 0
      ? suggestedCodes.join(", ")
      : "Nenhum POP específico aplicável ao caso";

  return [
    "Resumo de Pré-Atendimento (Assistente IA • Portal POPs TI)",
    `• Relato / Dúvida: ${mainIssue}`,
    `• POPs já verificados: ${checkedPops}`,
    "• Patrimônio / Hostname do equipamento: [informar aqui]",
    "• Impacto no trabalho: [Parcial / Impedido de trabalhar]",
    "• Print do erro (Win + Shift + S): [anexar no chamado]",
  ].join("\n");
}

function getContextualLevel2Advice(popCode: string): string[] {
  const pop = POPS.find((p) => p.code === popCode);
  if (!pop) {
    return [
      "Salve seus arquivos abertos e execute Iniciar > Ligar/Desligar > Reiniciar (evite apenas Desligar).",
      "Capture um print da tela inteira com Win + Shift + S mostrando o erro ou sintoma.",
      "Anote o número de patrimônio/hostname do notebook para que a TI possa acessar remotamente.",
    ];
  }

  switch (pop.themeId) {
    case 1:
      return [
        "Confirme se você usou Iniciar > Reiniciar (e não Desligar) e se há pelo menos 15% livre no Disco C:.",
        "Abra o Gerenciador de Tarefas (Ctrl + Shift + Esc > aba Desempenho) e tire um print (Win + Shift + S) para anexar no chamado — isso mostra à TI se o gargalo é RAM, SSD ou CPU.",
      ];
    case 3:
      return [
        "Se houver qualquer suspeita de clique em link malicioso ou vazamento de credencial, mantenha o Wi-Fi desligado e comunique a TI imediatamente.",
        "Não apague e-mails ou mensagens suspeitas antes da análise técnica; tire print da tela para evidência.",
      ];
    case 4:
      return [
        "Se o erro for no OneDrive e continuar após reiniciar o aplicativo, confira se o arquivo não está aberto por outro colega simultaneamente ou com caminho muito longo.",
        "Se for monitor externo piscando mesmo em 50 Hz, teste outro cabo HDMI/USB-C ou outra entrada do monitor e informe no chamado.",
      ];
    default:
      return [
        "Capture um print completo da tela de erro usando Win + Shift + S.",
        "Informe o número de patrimônio do notebook ao abrir o chamado para agilizar o acesso remoto da TI.",
      ];
  }
}

export async function generateAssistantReply(params: {
  userText: string;
  history: ChatMessage[];
  currentPopCode: string | null;
}): Promise<Omit<ChatMessage, "id" | "timestamp">> {
  const { userText, history, currentPopCode } = params;

  // Hook opcional caso a TI configure futuramente um endpoint externo (NEXT_PUBLIC_AI_CHAT_ENDPOINT)
  const externalEndpoint = process.env.NEXT_PUBLIC_AI_CHAT_ENDPOINT;
  if (externalEndpoint) {
    try {
      const response = await fetch(externalEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: userText,
          currentPopCode,
          history: history.slice(-8).map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });
      if (response.ok) {
        const data = (await response.json()) as {
          content?: string;
          steps?: string[];
          popCodes?: string[];
          suggestTicket?: boolean;
        };
        if (data.content) {
          const recommendedPops = (data.popCodes ?? [])
            .map((code) => POPS.find((p) => p.code === code))
            .filter((p): p is PopItem => Boolean(p))
            .map((p) => ({ code: p.code, title: p.title, goal: p.goal }));

          return {
            role: "assistant",
            content: data.content,
            steps: data.steps,
            recommendedPops,
            suggestTicket: data.suggestTicket ?? true,
            askResolutionFeedback: recommendedPops.length > 0,
          };
        }
      }
    } catch {
      // Fallback transparente para o motor especialista integrado
    }
  }

  const queryNorm = normalize(userText);
  const tokens = queryNorm
    .split(" ")
    .filter((t) => t.length >= 2 && !STOPWORDS.has(t));

  // 1. Confirmação positiva ("resolveu!", "deu certo", "obrigado")
  if (isPositiveConfirmation(queryNorm)) {
    return {
      role: "assistant",
      content:
        "Excelente! Fico feliz que tenha resolvido. Se surgir qualquer outra dúvida ou precisar consultar outro procedimento, é só mandar aqui!",
      suggestTicket: false,
      askResolutionFeedback: false,
    };
  }

  // POPs já recomendados anteriormente na conversa para evitar repetição em loop
  const previouslySuggestedCodes = new Set(
    history.flatMap((m) => (m.recommendedPops ?? []).map((p) => p.code))
  );

  // Detecta menção explícita a um POP (ex.: "POP-036")
  const explicitPopMatch = userText.toUpperCase().match(/POP[- ]?(\d{1,3})/);
  const explicitPopCode = explicitPopMatch
    ? `POP-${explicitPopMatch[1].padStart(3, "0")}`
    : null;

  // 2. Caso o usuário diga que "não resolveu", "já tentei", "não achei no site" ou peça chamado
  if (isUnresolvedOrEscalationIntent(queryNorm)) {
    const refPop =
      explicitPopCode ??
      currentPopCode ??
      Array.from(previouslySuggestedCodes).pop() ??
      null;

    const level2Steps = refPop
      ? getContextualLevel2Advice(refPop)
      : [
          "Execute uma reinicialização limpa pelo menu Iniciar > Ligar/Desligar > Reiniciar (caso ainda não tenha feito).",
          "Tire um print da tela inteira com Win + Shift + S mostrando a mensagem ou comportamento do erro.",
          "Clique em 'Copiar resumo p/ chamado' abaixo para já levar todo o histórico preenchido ao portal da TI.",
        ];

    const supportPops = ["POP-034", "POP-033"]
      .filter((c) => c !== refPop)
      .map((code) => POPS.find((p) => p.code === code))
      .filter((p): p is PopItem => Boolean(p))
      .map((p) => ({ code: p.code, title: p.title, goal: p.goal }));

    return {
      role: "assistant",
      content: refPop
        ? `Entendi! Como o procedimento ${refPop} não resolveu por completo, vamos fazer uma checagem complementar e já deixar tudo pronto para o atendimento técnico da TI:`
        : "Sem problemas! Quando o procedimento padrão não resolve ou não cobre seu caso específico, recomendo estes passos finais antes de encaminhar para a equipe técnica:",
      steps: level2Steps,
      recommendedPops: supportPops,
      suggestTicket: true,
      askResolutionFeedback: false,
    };
  }

  // 3. Verifica base estendida (assuntos fora dos 38 POPs: Certificado Digital, Impressora, ERP/Acesso, Instalação Admin, Outlook/Teams, etc.)
  let bestExtraTopic: ExtraKnowledgeTopic | null = null;
  let bestExtraScore = 0;

  for (const topic of EXTRA_KNOWLEDGE_BASE) {
    let score = 0;
    for (const trig of topic.triggers) {
      const trigNorm = normalize(trig);
      if (queryNorm.includes(trigNorm)) {
        score += trigNorm.includes(" ") ? 18 : 12;
      }
    }
    if (score > bestExtraScore) {
      bestExtraScore = score;
      bestExtraTopic = topic;
    }
  }

  // Pontua todos os 38 POPs
  const scoredPops = POPS.map((pop) => ({
    pop,
    score: scorePopMatch(pop, queryNorm, tokens),
  }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  // Se o tópico extra tiver alta aderência (ex: impressora, certificado digital, instalar programa, ERP)
  if (bestExtraTopic && bestExtraScore >= 12) {
    const relatedPops = (bestExtraTopic.relatedPopCodes ?? [])
      .map((code) => POPS.find((p) => p.code === code))
      .filter((p): p is PopItem => Boolean(p))
      .map((p) => ({ code: p.code, title: p.title, goal: p.goal }));

    return {
      role: "assistant",
      content: `${bestExtraTopic.intro}\n\n${bestExtraTopic.escalateNote}`,
      steps: bestExtraTopic.steps,
      recommendedPops: relatedPops,
      suggestTicket: true,
      askResolutionFeedback: true,
    };
  }

  // 4. Se encontrou POPs diretamente aderentes à dúvida do usuário
  const unseenMatches = scoredPops.filter(
    (item) => !previouslySuggestedCodes.has(item.pop.code)
  );
  const topMatches = (unseenMatches.length > 0 ? unseenMatches : scoredPops).slice(
    0,
    3
  );

  if (topMatches.length > 0 && topMatches[0].score >= 8) {
    const primary = topMatches[0].pop;
    const theme = THEMES.find((t) => t.id === primary.themeId);
    const plainQuickSteps = primary.steps.slice(0, 3).map((s) => s.lead);

    return {
      role: "assistant",
      content: `Encontrei o melhor caminho no manual (${primary.code}${
        theme ? ` • Tema ${theme.num}` : ""
      }): "${primary.title}". Veja o resumo rápido dos passos ou clique no card abaixo para abrir o guia completo com ilustrações:`,
      steps: plainQuickSteps,
      recommendedPops: topMatches.map(({ pop }) => ({
        code: pop.code,
        title: pop.title,
        goal: pop.goal,
      })),
      suggestTicket: false,
      askResolutionFeedback: true,
    };
  }

  // 5. Fallback inteligente quando a dúvida não consta nos POPs ou precisa de mais detalhes
  return {
    role: "assistant",
    content:
      "Não encontrei um POP exato com esses termos no catálogo, mas posso te ajudar! Me conte um pouco mais (ex.: qual programa/sistema apresenta erro, se aparece alguma mensagem na tela ou se é lentidão/rede) — ou, se preferir, já abra um chamado direto com a TI usando o atalho abaixo:",
    steps: [
      "Informe qual aplicativo, site ou equipamento está falhando (ex.: OneDrive, Monitor, Wi-Fi, ERP, Impressora, Certificado).",
      "Se aparecer código ou aviso de erro na tela, use Win + Shift + S para tirar um print antes de fechar a janela.",
    ],
    recommendedPops: [
      {
        code: "POP-034",
        title: "Como coletar informações de um erro",
        goal: "Para agilizar o atendimento técnico",
      },
      {
        code: "POP-033",
        title: "Como abrir um chamado de TI",
        goal: "Para padronizar solicitações de suporte",
      },
    ],
    suggestTicket: true,
    askResolutionFeedback: false,
  };
}
