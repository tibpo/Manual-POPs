import { POPS } from "@/data/pops";
import { THEMES } from "@/data/themes";
import type { PopItem } from "@/types/pop";

export const TI_TICKET_URL = "https://ti.ecobpoti.cloud/abrir";

export interface ChatActionPop {
  code: string;
  title: string;
  goal: string;
}

export interface CommandSnippet {
  label: string;
  whereToRun: "cmd" | "run";
  command: string;
  explanation: string;
}

export interface ChatMessage {
  id: string;
  role: "assistant" | "user";
  content: string;
  steps?: string[];
  commands?: CommandSnippet[];
  recommendedPops?: ChatActionPop[];
  advancedPlaybookId?: string;
  suggestTicket?: boolean;
  askResolutionFeedback?: boolean;
  isAdvancedResponse?: boolean;
  timestamp: number;
}

interface AdvancedPlaybook {
  id: string;
  title: string;
  triggers: string[];
  relatedPopCodes: string[];
  intro: string;
  commands?: CommandSnippet[];
  steps?: string[];
  safetyNote: string;
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9%\s/_.-]/g, " ")
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

// Base de Diagnóstico Técnico Avançado (Nível 2) traduzida de forma simples e segura (sem exigir senha de Admin)
const ADVANCED_PLAYBOOKS: AdvancedPlaybook[] = [
  {
    id: "rede-ip-dns",
    title: "Reset de Rede, Renovação de IP e Limpeza de DNS via CMD",
    triggers: [
      "resetar ip",
      "renovar ip",
      "ipconfig",
      "flushdns",
      "dns",
      "resetar rede",
      "cmd rede",
      "cmd internet",
      "conectado sem internet",
      "conectado mas nao navega",
      "site nao abre",
      "dns_probe",
      "ping",
      "conflito de ip",
      "internet oscilando",
      "sem acesso a rede",
    ],
    relatedPopCodes: ["POP-029", "POP-021"],
    intro:
      "Vamos fazer uma renovação limpa da sua conexão pelo Prompt de Comando (CMD). É super seguro, não apaga nada no computador e resolve conflitos de IP e sites que não carregam:",
    commands: [
      {
        label: "Passo 1 — Limpar endereços antigos travados (DNS)",
        whereToRun: "cmd",
        command: "ipconfig /flushdns",
        explanation:
          "Apaga o cache de rotas antigas de sites que ficam presas no Windows.",
      },
      {
        label: "Passo 2 — Liberar o IP atual com falha",
        whereToRun: "cmd",
        command: "ipconfig /release",
        explanation:
          "Desconecta por alguns segundos o endereço antigo que estava travado no roteador.",
      },
      {
        label: "Passo 3 — Pedir um novo IP limpo ao roteador",
        whereToRun: "cmd",
        command: "ipconfig /renew",
        explanation:
          "Aguarde de 5 a 10 segundos até aparecerem os novos números de IPv4 na tela.",
      },
      {
        label: "Passo 4 — Testar se a comunicação voltou",
        whereToRun: "cmd",
        command: "ping 8.8.8.8 -n 4",
        explanation:
          "Se aparecer 'Resposta de 8.8.8.8' (0% de perda), sua conexão já está funcionando!",
      },
    ],
    safetyNote:
      "Se na etapa 4 aparecer 'Esgotado o tempo limite' ou 'Falha geral', o bloqueio está no roteador/provedor externo — basta clicar em Abrir Chamado abaixo.",
  },
  {
    id: "onedrive-reset-profundo",
    title: "Redefinição Profunda (Hard Reset) do OneDrive",
    triggers: [
      "resetar onedrive",
      "redefinir onedrive",
      "onedrive /reset",
      "processando alteracoes",
      "onedrive travado",
      "onedrive congelado",
      "onedrive nao abre",
      "sincronizacao travou",
      "nuvem nao aparece",
    ],
    relatedPopCodes: ["POP-036", "POP-037", "POP-028"],
    intro:
      "Quando o OneDrive trava em 'Processando alterações' ou não sincroniza mesmo fechando normalmente, você pode rodar o comando oficial de redefinição da Microsoft (não apaga nenhum arquivo seu!):",
    commands: [
      {
        label: "Passo 1 — Executar redefinição limpa do OneDrive",
        whereToRun: "run",
        command: "%localappdata%\\Microsoft\\OneDrive\\onedrive.exe /reset",
        explanation:
          "O ícone da nuvem perto do relógio vai sumir por cerca de 1 minuto enquanto reconstrói o catálogo sem apagar documentos.",
      },
      {
        label: "Passo 2 — Reabrir o OneDrive (caso não volte sozinho após 1 min)",
        whereToRun: "run",
        command: "%localappdata%\\Microsoft\\OneDrive\\onedrive.exe",
        explanation:
          "Religa a nuvem na barra de tarefas e retoma a sincronização limpa.",
      },
    ],
    safetyNote:
      "Fique tranquilo: todos os seus arquivos locais e da nuvem permanecem intactos.",
  },
  {
    id: "limpeza-profunda-temp",
    title: "Limpeza Avançada de Cache (%temp% e Limpador Nativo)",
    triggers: [
      "%temp%",
      "pasta temp",
      "cleanmgr",
      "limpeza profunda",
      "limpar cache",
      "muito lento",
      "travando tudo",
      "disco cheio ainda",
      "memoria cheia",
    ],
    relatedPopCodes: ["POP-001", "POP-002", "POP-004", "POP-030"],
    intro:
      "Além da limpeza básica do Windows, você pode limpar diretamente o cache bruto dos aplicativos abertos — excelente quando o notebook continua pesado ou o SSD segue cheio:",
    commands: [
      {
        label: "Passo 1 — Abrir pasta de temporários ocultos do usuário",
        whereToRun: "run",
        command: "%temp%",
        explanation:
          "Na pasta que abrir, aperte Ctrl + A (selecionar tudo), aperte Delete e, se avisar que algum arquivo está em uso, marque 'Fazer isso para todos' e clique em Ignorar.",
      },
      {
        label: "Passo 2 — Executar o Limpador Clássico do Disco C:",
        whereToRun: "run",
        command: "cleanmgr",
        explanation:
          "Selecione a unidade C:, marque Arquivos Temporários / Miniaturas / Lixeira e clique em OK.",
      },
    ],
    steps: [
      "Em seguida, vá em Iniciar > Ligar/Desligar > Reiniciar (nunca apenas Desligar) para zerar a memória RAM acumulada.",
    ],
    safetyNote:
      "Esses comandos afetam apenas rascunhos temporários de sistema — nada das suas pastas Documentos, Área de Trabalho ou Downloads é tocado.",
  },
  {
    id: "certificado-ssl-avancado",
    title: "Destravar Certificado Digital (A1/A3), SSL, e-CAC e SEFAZ",
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
      "ssl",
      "err_ssl",
      "certmgr",
      "inetcpl",
    ],
    relatedPopCodes: ["POP-018", "POP-034"],
    intro:
      "Quando sites do governo (e-CAC, Receita, SEFAZ, Conectividade) param de pedir ou reconhecer seu Certificado Digital, limpar o Estado SSL do Windows resolve na maioria das vezes:",
    commands: [
      {
        label: "Passo 1 — Limpar o Estado SSL travado no Windows",
        whereToRun: "run",
        command: "inetcpl.cpl",
        explanation:
          "Na janelinha que abrir, clique na aba 'Conteúdo', clique no botão 'Limpar estado SSL' e dê OK. Depois feche TODAS as janelas do navegador e abra de novo.",
      },
      {
        label: "Passo 2 — Conferir se o certificado está listado e dentro da validade",
        whereToRun: "run",
        command: "certmgr.msc",
        explanation:
          "Abra a pasta 'Pessoal' > 'Certificados' à esquerda e confira a coluna 'Data de Expiração'.",
      },
    ],
    steps: [
      "Se for Token USB (A3), conecte direto na porta USB do notebook (sem adaptador/hub) antes de abrir o navegador.",
    ],
    safetyNote:
      "Se o certificado estiver vencido ou precisar instalar um novo arquivo .pfx com senha da empresa, abra chamado com a TI.",
  },
  {
    id: "rede-corporativa-gpupdate",
    title: "Recarregar Pastas de Rede, Políticas e Sistemas Internos / ERP",
    triggers: [
      "pasta de rede",
      "mapeamento",
      "unidade z",
      "servidor",
      "gpupdate",
      "erp",
      "dominio",
      "sistema interno",
      "acesso negado",
      "bloqueado",
      "403",
      "500",
      "ncpa",
      "vpn",
    ],
    relatedPopCodes: ["POP-021", "POP-034", "POP-033"],
    intro:
      "Se as pastas da rede sumiram, deram erro de caminho ou o sistema interno não carrega mesmo conectado na VPN/escritório, force a atualização das credenciais de rede:",
    commands: [
      {
        label: "Passo 1 — Atualizar políticas e mapeamentos corporativos",
        whereToRun: "cmd",
        command: "gpupdate /force",
        explanation:
          "Sincroniza suas permissões e pastas de rede com o servidor (aguarde aparecer 'A atualização da política foi concluída com êxito').",
      },
      {
        label: "Passo 2 — Conferir adaptadores de VPN e Wi-Fi",
        whereToRun: "run",
        command: "ncpa.cpl",
        explanation:
          "Mostra lado a lado se o adaptador da VPN e o Wi-Fi estão realmente conectados ou desativados.",
      },
    ],
    steps: [
      "Para sistemas web internos dando erro de sessão/403, pressione Ctrl + Shift + N no navegador para testar em guia anônima sem cache antigo.",
    ],
    safetyNote:
      "Caso sua senha de rede ou usuário do sistema tenha bloqueado por tentativas, acione a TI pelo botão abaixo para desbloqueio imediato.",
  },
  {
    id: "outlook-office-safe",
    title: "Recuperar Outlook ou Excel Travando (Modo de Segurança)",
    triggers: [
      "outlook",
      "caixa de entrada",
      "nao envia",
      "nao recebe",
      "email preso",
      "excel",
      "word",
      "planilha travando",
      "outlook nao abre",
      "modo de seguranca",
      "/safe",
    ],
    relatedPopCodes: ["POP-031", "POP-007"],
    intro:
      "Quando o Outlook fica preso em 'Processando/Carregando perfil' ou o Excel congela ao abrir planilhas, inicie em Modo de Segurança para isolar suplementos com falha:",
    commands: [
      {
        label: "Opção A — Abrir o Outlook destravado (Modo Seguro)",
        whereToRun: "run",
        command: "outlook.exe /safe",
        explanation:
          "Clique em OK na caixa de perfil. Se abrir normalmente, verifique no rodapé se 'Trabalhar Offline' não está ativado na aba Enviar/Receber.",
      },
      {
        label: "Opção B — Abrir o Excel limpo sem suplementos pesados",
        whereToRun: "run",
        command: "excel.exe /safe",
        explanation:
          "Abre o Excel em modo leve para você conseguir abrir, recuperar e salvar sua planilha sem travar.",
      },
    ],
    safetyNote:
      "Persistindo o travamento fora do modo seguro, a TI pode executar o Reparo Rápido do Microsoft 365 remotamente.",
  },
  {
    id: "teams-audio-camera-reparo",
    title: "Reparar Microsoft Teams, Câmera e Microfone",
    triggers: [
      "teams",
      "camera",
      "webcam",
      "compartilhar tela",
      "reuniao",
      "microfone nao funciona",
      "sem som no teams",
      "reparar teams",
    ],
    relatedPopCodes: ["POP-027", "POP-037"],
    intro:
      "Se o Microsoft Teams está com tela branca, falhando compartilhamento ou não detecta microfone/câmera, use os atalhos diretos de reparo do Windows:",
    commands: [
      {
        label: "Passo 1 — Abrir painel de Reparo do aplicativo Teams",
        whereToRun: "run",
        command: "ms-settings:appsfeatures",
        explanation:
          "Na busca da lista, digite 'Teams', clique nos três pontinhos (...) > Opções avançadas > clique em 'Reparar' (não apaga suas conversas).",
      },
      {
        label: "Passo 2 — Verificar bloqueio de privacidade do Microfone",
        whereToRun: "run",
        command: "ms-settings:privacy-microphone",
        explanation:
          "Confirme se 'Acesso ao microfone' e 'Permitir que os aplicativos acessem o microfone' estão Ativados.",
      },
    ],
    safetyNote:
      "Dica extra: em chamadas de vídeo lentas, clique na nuvem do OneDrive > Engrenagem > Pausar sincronização por 2 horas.",
  },
  {
    id: "impressora-fila-spooler",
    title: "Destravar Fila de Impressão e Scanner",
    triggers: [
      "impressora",
      "imprimir",
      "impressao",
      "scanner",
      "escanear",
      "digitalizar",
      "fila de impressao",
      "documento preso",
      "spooler",
    ],
    relatedPopCodes: ["POP-005", "POP-029"],
    intro:
      "Quando você manda imprimir e nada sai (ou um documento antigo trava toda a fila), acesse o painel clássico de filas:",
    commands: [
      {
        label: "Abrir Gerenciador Clássico de Impressoras e Filas",
        whereToRun: "run",
        command: "control printers",
        explanation:
          "Dê dois cliques no ícone da impressora para ver a fila, clique em 'Impressora' no topo e escolha 'Cancelar todos os documentos' se houver itens travados.",
      },
    ],
    steps: [
      "Confirme se o notebook está conectado no Wi-Fi corporativo do escritório (impressoras internas não respondem pelo 4G ou rede visitante).",
      "Se a impressora aparecer esmaecida ('Offline'), reinicie o Windows em Iniciar > Reiniciar.",
    ],
    safetyNote:
      "Para instalar uma nova impressora de setor no seu notebook, abra um chamado informando o modelo ou o setor.",
  },
  {
    id: "identificar-maquina-remoto",
    title: "Descobrir Nome da Máquina (Hostname), Usuário e IP para Suporte",
    triggers: [
      "hostname",
      "nome do computador",
      "nome da maquina",
      "qual meu ip",
      "meu ip",
      "whoami",
      "patrimonio",
      "acesso remoto",
    ],
    relatedPopCodes: ["POP-033", "POP-034"],
    intro:
      "Precisa informar a identificação exata do seu notebook para o analista da TI conectar remotamente? Rode estes comandos rápidos:",
    commands: [
      {
        label: "Ver o Nome do Computador (Hostname) na rede",
        whereToRun: "cmd",
        command: "hostname",
        explanation:
          "Exibe em uma linha o código oficial da sua máquina (basta copiar e colar no chamado).",
      },
      {
        label: "Ver seu usuário de rede e domínio",
        whereToRun: "cmd",
        command: "whoami",
        explanation: "Mostra exatamente com qual conta corporativa o Windows está logado.",
      },
      {
        label: "Ver seu endereço IPv4 atual",
        whereToRun: "cmd",
        command: "ipconfig",
        explanation:
          "Procure a linha 'Endereço IPv4' para informar à equipe técnica se solicitado.",
      },
    ],
    safetyNote:
      "Com o Hostname em mãos, o atendimento remoto da TI é muito mais rápido!",
  },
  {
    id: "video-apps-nativos",
    title: "Resetar Driver de Vídeo e Destravar Captura de Tela / Apps do Windows",
    triggers: [
      "wsreset",
      "print nao funciona",
      "captura nao abre",
      "ferramenta de captura",
      "tela piscando",
      "driver de video",
      "monitor cortado",
      "escala",
    ],
    relatedPopCodes: ["POP-038", "POP-025", "POP-026", "POP-035"],
    intro:
      "Se a imagem da tela falhou ou a Ferramenta de Captura (Win + Shift + S) parou de abrir, faça este reset seguro de interface:",
    commands: [
      {
        label: "Abrir Configurações de Exibição Avançada (Ajustar p/ 50 Hz)",
        whereToRun: "run",
        command: "ms-settings:display",
        explanation:
          "Atalho direto para Sistema > Tela, onde você pode ajustar Resolução e Exibição Avançada (< 59Hz).",
      },
      {
        label: "Restaurar cache de aplicativos nativos do Windows",
        whereToRun: "run",
        command: "wsreset.exe",
        explanation:
          "Uma janela preta abrirá por ~10 segundos limpando o cache dos utilitários nativos (Captura, Fotos, Calculadora) sem apagar arquivos.",
      },
    ],
    steps: [
      "Para reiniciar o driver de vídeo na hora sem fechar seus programas abertos, aperte juntas as teclas: Win + Ctrl + Shift + B (a tela piscará 1 vez e voltará limpa).",
    ],
    safetyNote:
      "Se o monitor externo continuar sem sinal, teste reconectar o cabo HDMI/USB-C nas duas pontas.",
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
      "licenca",
    ],
    relatedPopCodes: ["POP-033", "POP-020"],
    intro:
      "Por segurança corporativa na ECOVIS BPO, contas de usuário não possuem senha de Administrador para impedir que malwares se instalem sozinhos.",
    commands: [
      {
        label: "Descobrir o Hostname do seu notebook para agilizar a instalação",
        whereToRun: "cmd",
        command: "hostname",
        explanation:
          "Copie o nome exibido e informe no chamado junto com o nome do programa que precisa instalar.",
      },
    ],
    steps: [
      "Clique em 'Copiar resumo p/ chamado' abaixo e informe o software desejado + motivo de uso.",
      "A TI conectará remotamente para validar e instalar com a credencial administrativa.",
    ],
    safetyNote:
      "Nunca baixe instaladores alternativos ('portáteis' ou de sites de terceiros).",
  },
  {
    id: "tela-azul-bitlocker",
    title: "Tela Azul (BSOD), BitLocker ou Notebook Não Inicia",
    triggers: [
      "tela azul",
      "bsod",
      "bitlocker",
      "chave de recuperacao",
      "reparo automatico",
      "desligou sozinho",
      "erro critico",
    ],
    relatedPopCodes: ["POP-032", "POP-014", "POP-034"],
    intro:
      "Falhas críticas como Tela Azul ou solicitação de Chave de Recuperação do BitLocker exigem preservação das evidências:",
    steps: [
      "Se aparecer tela azul pedindo Chave BitLocker: NÃO clique em restaurar/formatar — tire uma foto nítida da tela com seu celular mostrando o 'ID da Chave' e acione a TI.",
      "Se o notebook sofreu uma Tela Azul e reiniciou: anote o horário exato do ocorrido para o analista inspecionar os logs internos.",
      "Mantenha o equipamento conectado à fonte original sobre superfície plana e arejada.",
    ],
    safetyNote:
      "Abra chamado imediatamente anexando a foto da tela para atendimento prioritário.",
  },
];

// Mapa direto de qual Playbook Avançado sugerir quando um POP específico não resolver!
const POP_TO_PLAYBOOK_MAP: Record<string, string> = {
  "POP-001": "limpeza-profunda-temp",
  "POP-002": "limpeza-profunda-temp",
  "POP-003": "limpeza-profunda-temp",
  "POP-004": "limpeza-profunda-temp",
  "POP-006": "limpeza-profunda-temp",
  "POP-016": "rede-corporativa-gpupdate",
  "POP-018": "certificado-ssl-avancado",
  "POP-021": "rede-ip-dns",
  "POP-025": "video-apps-nativos",
  "POP-026": "video-apps-nativos",
  "POP-027": "teams-audio-camera-reparo",
  "POP-028": "onedrive-reset-profundo",
  "POP-029": "rede-ip-dns",
  "POP-030": "limpeza-profunda-temp",
  "POP-031": "outlook-office-safe",
  "POP-033": "identificar-maquina-remoto",
  "POP-034": "identificar-maquina-remoto",
  "POP-035": "video-apps-nativos",
  "POP-036": "onedrive-reset-profundo",
  "POP-037": "onedrive-reset-profundo",
  "POP-038": "video-apps-nativos",
};

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

function isAdvancedExplicitRequest(queryNorm: string): boolean {
  const advSignals = [
    "cmd",
    "prompt",
    "terminal",
    "executar",
    "win r",
    "win+r",
    "avancad",
    "comando",
    "ipconfig",
    "flushdns",
    "gpupdate",
    "cleanmgr",
    "%temp%",
    "resetar ip",
    "renovar ip",
    "resetar onedrive",
    "redefinir onedrive",
    "hostname",
    "whoami",
    "ping",
    "certmgr",
    "inetcpl",
  ];
  return advSignals.some((s) => queryNorm.includes(s));
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
    "ainda nao",
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

export function formatPlaybookResponse(
  playbook: AdvancedPlaybook,
  prefixNote?: string
): Omit<ChatMessage, "id" | "timestamp"> {
  const relatedPops = playbook.relatedPopCodes
    .map((code) => POPS.find((p) => p.code === code))
    .filter((p): p is PopItem => Boolean(p))
    .map((p) => ({ code: p.code, title: p.title, goal: p.goal }));

  const introText = prefixNote
    ? `${prefixNote}\n\n${playbook.intro}`
    : `${playbook.intro}`;

  return {
    role: "assistant",
    content: `${introText}\n\n💡 ${playbook.safetyNote}`,
    commands: playbook.commands,
    steps: playbook.steps,
    recommendedPops: relatedPops,
    suggestTicket: true,
    askResolutionFeedback: true,
    isAdvancedResponse: true,
  };
}

export function getPlaybookById(
  playbookId: string
): Omit<ChatMessage, "id" | "timestamp"> | null {
  const found = ADVANCED_PLAYBOOKS.find((p) => p.id === playbookId);
  if (!found) return null;
  return formatPlaybookResponse(found);
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

  const executedCommands = Array.from(
    new Set(
      messages.flatMap((m) => (m.commands ?? []).map((c) => c.command))
    )
  );

  const mainIssue =
    userTexts.length > 0
      ? userTexts.join(" | ")
      : "Solicitação de suporte via Assistente de Autoajuda (Portal POPs TI)";

  const checkedPops =
    suggestedCodes.length > 0
      ? suggestedCodes.join(", ")
      : "Nenhum POP específico aplicável";

  const lines = [
    "Resumo de Pré-Atendimento (Assistente IA • Portal POPs TI)",
    `• Relato / Sintoma: ${mainIssue}`,
    `• POPs consultados: ${checkedPops}`,
  ];

  if (executedCommands.length > 0) {
    lines.push(
      `• Diagnósticos avançados orientados (CMD/Executar): ${executedCommands.join(
        " ; "
      )}`
    );
  }

  lines.push(
    "• Patrimônio / Hostname (rode 'hostname' no CMD): [informar aqui]",
    "• Impacto no trabalho: [Parcial / Impedido de trabalhar]",
    "• Print do erro (Win + Shift + S): [anexar no chamado]"
  );

  return lines.join("\n");
}

export async function generateAssistantReply(params: {
  userText: string;
  history: ChatMessage[];
  currentPopCode: string | null;
}): Promise<Omit<ChatMessage, "id" | "timestamp">> {
  const { userText, history, currentPopCode } = params;

  // Suporte opcional para LLM em nuvem caso configurado via variável de ambiente
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
          commands?: CommandSnippet[];
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
            commands: data.commands,
            recommendedPops,
            suggestTicket: data.suggestTicket ?? true,
            askResolutionFeedback: true,
          };
        }
      }
    } catch {
      // Continua automaticamente no motor especialista local
    }
  }

  const queryNorm = normalize(userText);
  const tokens = queryNorm
    .split(" ")
    .filter((t) => t.length >= 2 && !STOPWORDS.has(t));

  // 1. Confirmação positiva
  if (isPositiveConfirmation(queryNorm)) {
    return {
      role: "assistant",
      content:
        "Perfeito! Que ótimo que deu certo. Sempre que precisar de um passo a passo rápido ou comando de diagnóstico, estou por aqui!",
      suggestTicket: false,
      askResolutionFeedback: false,
    };
  }

  const previouslySuggestedCodes = new Set(
    history.flatMap((m) => (m.recommendedPops ?? []).map((p) => p.code))
  );
  const alreadySentAdvanced = history.some((m) => m.isAdvancedResponse);

  const explicitPopMatch = userText.toUpperCase().match(/POP[- ]?(\d{1,3})/);
  const explicitPopCode = explicitPopMatch
    ? `POP-${explicitPopMatch[1].padStart(3, "0")}`
    : null;

  // Pontua Playbooks Avançados (Nível 2 / CMD / Executar)
  let bestPlaybook: AdvancedPlaybook | null = null;
  let bestPlaybookScore = 0;

  for (const pb of ADVANCED_PLAYBOOKS) {
    let score = 0;
    for (const trig of pb.triggers) {
      const trigNorm = normalize(trig);
      if (queryNorm.includes(trigNorm)) {
        score += trigNorm.includes(" ") ? 20 : 13;
      }
    }
    if (score > bestPlaybookScore) {
      bestPlaybookScore = score;
      bestPlaybook = pb;
    }
  }

  // 2. Se o usuário pediu explicitamente algo avançado (CMD, resetar IP, %temp%, gpupdate, etc.)
  if (isAdvancedExplicitRequest(queryNorm)) {
    if (bestPlaybook) {
      return formatPlaybookResponse(bestPlaybook);
    }
    // Se pediu "cmd" ou "comandos avançados" de forma genérica, mostra os principais diagnósticos seguros
    const netPlaybook = ADVANCED_PLAYBOOKS[0];
    return formatPlaybookResponse(
      netPlaybook,
      "Posso te guiar em diagnósticos avançados por CMD e Executar (Win + R) explicando cada passo de forma simples! Começando pelo campeão de resoluções de rede/IP (ou me diga se o problema é OneDrive, Lentidão/Cache, Certificado ou Pastas de Rede):"
    );
  }

  // 3. Quando o usuário diz que "não resolveu" / "já tentei"
  if (isUnresolvedOrEscalationIntent(queryNorm)) {
    const refPop =
      explicitPopCode ??
      currentPopCode ??
      Array.from(previouslySuggestedCodes).pop() ??
      null;

    // Se ainda não mostramos o diagnóstico Nível 2 (CMD/Executar) para esse problema, oferecemos agora!
    const mappedPlaybookId = refPop ? POP_TO_PLAYBOOK_MAP[refPop] : undefined;
    const mappedPlaybook =
      bestPlaybook ??
      (mappedPlaybookId
        ? ADVANCED_PLAYBOOKS.find((p) => p.id === mappedPlaybookId) ?? null
        : null);

    if (mappedPlaybook && !alreadySentAdvanced) {
      return formatPlaybookResponse(
        mappedPlaybook,
        refPop
          ? `Como o passo a passo básico do ${refPop} não foi suficiente, vamos subir para um diagnóstico um pouco mais avançado (mas bem simples de aplicar):`
          : "Entendi! Antes de você precisar esperar pelo atendimento de um chamado, podemos tentar este procedimento técnico Nível 2 explicado passo a passo:"
      );
    }

    // Se já tentou até o modo avançado e não resolveu, prepara tudo mastigado para o chamado na TI!
    const hostPlaybook = ADVANCED_PLAYBOOKS.find(
      (p) => p.id === "identificar-maquina-remoto"
    );
    return {
      role: "assistant",
      content:
        "Você já realizou todas as verificações recomendadas (inclusive de nível avançado)! Nesse caso, o problema exige intervenção administrativa da TI.\n\nPara o analista resolver bem rápido no acesso remoto, descubra o nome da sua máquina com o comando abaixo, clique em 'Copiar resumo' e abra o chamado:",
      commands: hostPlaybook ? [hostPlaybook.commands![0]] : undefined,
      steps: [
        "Tire um print da tela inteira com Win + Shift + S mostrando o erro.",
        "Clique em 'Copiar resumo' abaixo — ele já inclui os POPs e comandos que você testou para você não precisar digitar tudo de novo!",
      ],
      recommendedPops: [
        {
          code: "POP-033",
          title: "Como abrir um chamado de TI",
          goal: "Para padronizar solicitações de suporte",
        },
      ],
      suggestTicket: true,
      askResolutionFeedback: false,
      isAdvancedResponse: true,
    };
  }

  // 4. Pontua todos os 38 POPs
  const scoredPops = POPS.map((pop) => ({
    pop,
    score: scorePopMatch(pop, queryNorm, tokens),
  }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score);

  // Se o assunto for fora dos 38 POPs (ex: Certificado Digital, Impressora, ERP, Outlook, Hostname, Instalar Programa)
  if (
    bestPlaybook &&
    bestPlaybookScore >= 13 &&
    (scoredPops.length === 0 || bestPlaybookScore > scoredPops[0].score + 4)
  ) {
    return formatPlaybookResponse(bestPlaybook);
  }

  // 5. Se encontrou POPs diretamente aderentes, entrega o POP + atalho para Modo Avançado Nível 2!
  const unseenMatches = scoredPops.filter(
    (item) => !previouslySuggestedCodes.has(item.pop.code)
  );
  const topMatches = (
    unseenMatches.length > 0 ? unseenMatches : scoredPops
  ).slice(0, 3);

  if (topMatches.length > 0 && topMatches[0].score >= 8) {
    const primary = topMatches[0].pop;
    const theme = THEMES.find((t) => t.id === primary.themeId);
    const plainQuickSteps = primary.steps.slice(0, 3).map((s) => s.lead);
    const linkedPlaybookId = POP_TO_PLAYBOOK_MAP[primary.code];

    return {
      role: "assistant",
      content: `Encontrei o procedimento ideal (${primary.code}${
        theme ? ` • Tema ${theme.num}` : ""
      }): "${
        primary.title
      }".\n\nSiga o resumo abaixo, abra o POP ilustrado ou, se já tiver tentado o básico, clique em "🔧 Tentar diagnóstico avançado (CMD/Executar)":`,
      steps: plainQuickSteps,
      recommendedPops: topMatches.map(({ pop }) => ({
        code: pop.code,
        title: pop.title,
        goal: pop.goal,
      })),
      advancedPlaybookId: linkedPlaybookId,
      suggestTicket: false,
      askResolutionFeedback: true,
    };
  }

  // 6. Se ainda teve aderência parcial a um Playbook Avançado
  if (bestPlaybook && bestPlaybookScore > 0) {
    return formatPlaybookResponse(bestPlaybook);
  }

  // 7. Fallback amigável orientando tanto problemas básicos quanto avançados
  return {
    role: "assistant",
    content:
      "Me conte com suas palavras o que está acontecendo! Eu consigo te ajudar desde dúvidas rápidas do dia a dia até soluções avançadas passo a passo (como resetar IP/DNS no CMD, destravar OneDrive, limpar cache `%temp%`, Certificado Digital, Impressora ou pastas de rede):",
    steps: [
      "Exemplos que você pode digitar: 'internet conectada mas não navega', 'resetar ip no cmd', 'onedrive processando alterações', 'certificado digital não aparece' ou 'descobrir nome do computador'.",
      "Ou, se preferir atendimento humano imediato, clique abaixo para abrir seu chamado na TI.",
    ],
    suggestTicket: true,
    askResolutionFeedback: false,
  };
}
