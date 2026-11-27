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

export interface ChatImageAttachment {
  dataUrl: string;
  base64Data: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  name?: string;
}

export interface ChatMessage {
  id: string;
  role: "assistant" | "user";
  content: string;
  imagePreviewUrl?: string;
  screenTranscription?: string;
  retryPayload?: {
    userText: string;
    image?: ChatImageAttachment | null;
  };
  steps?: string[];
  commands?: CommandSnippet[];
  recommendedPops?: ChatActionPop[];
  quickReplies?: string[];
  diagnosedIssue?: string;
  interactionId?: string;
  advancedPlaybookId?: string;
  suggestTicket?: boolean;
  askResolutionFeedback?: boolean;
  isAdvancedResponse?: boolean;
  isInvestigativeQuestion?: boolean;
  timestamp: number;
}

interface AdvancedPlaybook {
  id: string;
  title: string;
  triggers: string[];
  comboTriggers?: string[][];
  relatedPopCodes: string[];
  intro: string;
  commands?: CommandSnippet[];
  steps?: string[];
  quickReplies?: string[];
  safetyNote: string;
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\bwi-fi\b/g, "wifi")
    .replace(/\be-mail\b/g, "email")
    .replace(/\be-mails\b/g, "emails")
    .replace(/\be-cac\b/g, "ecac")
    .replace(/\be-cnpj\b/g, "ecnpj")
    .replace(/\be-cpf\b/g, "ecpf")
    .replace(/\bwin\s*\+\s*r\b/g, "win r")
    .replace(/[^a-z0-9%\s/_.-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const STOPWORDS = new Set([
  "nao",
  "sim",
  "como",
  "para",
  "meu",
  "minha",
  "meus",
  "minhas",
  "esta",
  "estao",
  "estou",
  "estava",
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
  "fazendo",
  "preciso",
  "quero",
  "queria",
  "gostaria",
  "ajuda",
  "ajudar",
  "ajude",
  "problema",
  "problemas",
  "duvida",
  "duvidas",
  "site",
  "portal",
  "muito",
  "mais",
  "menos",
  "quando",
  "onde",
  "pelo",
  "pela",
  "aparece",
  "aparecer",
  "aparecendo",
  "apareceu",
  "sumiu",
  "sumiram",
  "desapareceu",
  "guia",
  "guias",
  "aba",
  "abas",
  "botao",
  "botoes",
  "opcao",
  "opcoes",
  "menu",
  "icone",
  "barra",
  "funciona",
  "funcionando",
  "funcionar",
  "consigo",
  "conseguindo",
  "consegue",
  "abrir",
  "abre",
  "abriu",
  "abrindo",
  "fechar",
  "fechou",
  "carrega",
  "carregar",
  "carregando",
  "usar",
  "usando",
  "achar",
  "achei",
  "encontrar",
  "encontrei",
  "mostrar",
  "mostra",
  "habilitar",
  "ativar",
  "ajustar",
  "arrumar",
  "corrigir",
  "resolver",
  "tentei",
  "tentando",
  "fica",
  "ficou",
  "parou",
  "deu",
  "dando",
  "tem",
  "tenho",
  "tinha",
  "pode",
  "posso",
  "poderia",
  "favor",
  "bom",
  "boa",
  "dia",
  "tarde",
  "noite",
  "ola",
  "oi",
  "tudo",
  "nada",
  "algo",
  "outro",
  "outra",
  "mesmo",
  "ainda",
  "tambem",
  "sobre",
  "entre",
  "depois",
  "antes",
  "agora",
  "hoje",
  "ecovis",
  "sei",
  "explicar",
  "comecar",
  "zero",
  "leigo",
  "estranho",
  "esquisito",
  "negocio",
  "coisa",
]);

const WEAK_CONTEXT_TOKENS = new Set([
  "notebook",
  "computador",
  "maquina",
  "windows",
  "tela",
  "arquivo",
  "arquivos",
  "pasta",
  "pastas",
  "aplicativo",
  "programa",
  "programas",
  "rede",
  "erro",
  "falha",
  "sistema",
  "configurar",
  "corporativo",
  "empresa",
]);

function wordMatchesToken(word: string, token: string): boolean {
  if (!word || !token) return false;
  if (word === token) return true;
  if (word.length >= 5 && token.length >= 5) {
    const stem = token.slice(0, 5);
    return word.startsWith(stem) || token.startsWith(word.slice(0, 5));
  }
  return false;
}

function textHasPhrase(textNorm: string, phraseNorm: string): boolean {
  if (!textNorm || !phraseNorm) return false;
  const padded = ` ${textNorm} `;
  if (padded.includes(` ${phraseNorm} `)) {
    return true;
  }
  if (!phraseNorm.includes(" ") && phraseNorm.length >= 5) {
    const words = textNorm.split(" ");
    return words.some((w) => wordMatchesToken(w, phraseNorm));
  }
  return false;
}

const ADVANCED_PLAYBOOKS: AdvancedPlaybook[] = [
  {
    id: "outlook-grupos-interface",
    title: "Guia Grupos, Pastas ou Faixa de Opções Sumiram no Outlook",
    triggers: [
      "guia grupos",
      "grupos no outlook",
      "outlook grupos",
      "grupo do outlook",
      "grupos sumiu",
      "caixa compartilhada",
      "pastas do outlook",
      "painel de pastas",
      "faixa de opcoes",
      "resetnavpane",
      "novo outlook",
      "outlook classico",
    ],
    comboTriggers: [
      ["outlook", "grupo"],
      ["outlook", "grupos"],
      ["outlook", "guia"],
      ["outlook", "aba"],
      ["outlook", "pasta"],
      ["outlook", "pastas"],
      ["outlook", "barra"],
      ["outlook", "favoritos"],
    ],
    relatedPopCodes: [],
    intro:
      "Quando a seção 'Grupos' ou a lista de pastas some no Outlook, quase sempre o menu lateral apenas ficou recolhido ou mudou de lugar na versão nova. Vamos achar juntos:",
    steps: [
      "Olhe bem no canto esquerdo da janela do Outlook: se houver uma barra fininha vertical com desenhos, clique no ícone de duas pessoinhas ('Grupos') ou nos três pontinhos (...).",
      "Se você usa o Outlook tradicional (com lista de pastas à esquerda): role essa lista até o finalzinho, abaixo de 'Itens Enviados', e clique na setinha ao lado da palavra 'Grupos'. Se a coluna inteira de pastas sumiu, aperte juntas as teclas Ctrl + 6.",
      "Se o que sumiu foram os botões grandes lá no topo da janela: aperte juntas as teclas Ctrl + F1 para eles voltarem a ficar fixos.",
    ],
    commands: [
      {
        label: "Opcional — Restaurar menu lateral de pastas do Outlook",
        whereToRun: "run",
        command: "outlook.exe /resetnavpane",
        explanation:
          "Feche o Outlook primeiro e rode este comando: ele reorganiza o menu lateral sem apagar nenhum e-mail.",
      },
    ],
    quickReplies: [
      "Achei os Grupos, deu certo!",
      "Não aparece nem no menu esquerdo",
      "Meus e-mails não estão chegando",
    ],
    safetyNote:
      "Se o grupo nunca apareceu para você nem pelo navegador (outlook.office.com), peça à TI no chamado abaixo para incluir seu e-mail nesse grupo.",
  },
  {
    id: "outlook-office-safe",
    title: "Recuperar Outlook, E-mails ou Excel/Word Travados",
    triggers: [
      "outlook",
      "webmail",
      "caixa de entrada",
      "nao envia",
      "nao recebe",
      "email preso",
      "caixa de saida",
      "trabalhar offline",
      "excel",
      "word",
      "powerpoint",
      "planilha travando",
      "outlook nao abre",
      "modo de seguranca",
      "/safe",
    ],
    relatedPopCodes: ["POP-031", "POP-007"],
    intro:
      "Vamos destravar seu aplicativo do Office de forma bem tranquila e sem risco de perder seus e-mails ou planilhas:",
    steps: [
      "Se o Outlook abre, mas os e-mails não chegam nem saem: olhe na barra bem lá embaixo da janela do Outlook. Se estiver escrito 'Trabalhando Offline', clique na guia 'Enviar/Receber' lá no topo e clique no botão 'Trabalhar Offline' para reconectar.",
      "Se o Outlook ou Excel nem abre ou congela na hora: use o botão Copiar abaixo para abri-lo em 'Modo Limpo' (sem complementos pesados):",
    ],
    commands: [
      {
        label: "Opção A — Abrir o Outlook destravado (Modo Seguro)",
        whereToRun: "run",
        command: "outlook.exe /safe",
        explanation:
          "Quando aparecer uma janelinha pequena escrita 'Escolher Perfil', basta clicar em OK.",
      },
      {
        label: "Opção B — Abrir o Excel limpo sem travar",
        whereToRun: "run",
        command: "excel.exe /safe",
        explanation:
          "Ideal para abrir e salvar uma planilha pesada que estava fechando sozinha.",
      },
    ],
    quickReplies: [
      "Abriu e voltou a funcionar!",
      "A guia Grupos/Pastas sumiu no Outlook",
      "Continua travando mesmo assim",
    ],
    safetyNote:
      "Se continuar fechando sozinho fora do modo seguro, abra um chamado abaixo para a TI reparar o pacote Office remotamente.",
  },
  {
    id: "rede-ip-dns",
    title: "Destravar Internet, Wi-Fi e Renovação de Rede (IP e DNS)",
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
      "globo cortado",
      "sem internet",
    ],
    relatedPopCodes: ["POP-029", "POP-021"],
    intro:
      "Vamos renovar a conexão do seu notebook com o roteador! É totalmente seguro, não apaga nada no computador e costuma destravar sites e Wi-Fi na hora:",
    steps: [
      "Antes dos comandos, dê uma olhadinha rápida no canto inferior direito da tela (perto do relógio): clique no ícone de Wi-Fi/globo e veja se o 'Modo Avião' não ficou aceso sem querer.",
    ],
    commands: [
      {
        label: "Passo 1 — Limpar caminhos antigos travados (DNS)",
        whereToRun: "cmd",
        command: "ipconfig /flushdns",
        explanation:
          "Limpa endereços antigos de sites que ficaram presos na memória.",
      },
      {
        label: "Passo 2 — Desconectar endereço antigo com falha",
        whereToRun: "cmd",
        command: "ipconfig /release",
        explanation:
          "Solta o número antigo de conexão (a internet pisca por alguns segundos, é normal!).",
      },
      {
        label: "Passo 3 — Pegar uma conexão nova e limpa",
        whereToRun: "cmd",
        command: "ipconfig /renew",
        explanation:
          "Espere de 5 a 10 segundos até voltarem a aparecer números novos na janela preta.",
      },
      {
        label: "Passo 4 — Testar se a internet voltou",
        whereToRun: "cmd",
        command: "ping 8.8.8.8 -n 4",
        explanation:
          "Se aparecer 'Resposta de 8.8.8.8', sua internet já está funcionando!",
      },
    ],
    quickReplies: [
      "A internet voltou, obrigado!",
      "Não entendi como abrir a janela preta",
      "Apareceu 'Esgotado o tempo limite'",
    ],
    safetyNote:
      "Se aparecer 'Esgotado o tempo limite', teste se o Wi-Fi funciona no seu celular: se nem no celular funcionar, reinicie o modem/roteador da tomada por 30 segundos.",
  },
  {
    id: "onedrive-reset-profundo",
    title: "Destravar a Nuvem de Arquivos (OneDrive)",
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
      "nuvem vermelha",
      "x vermelho",
    ],
    relatedPopCodes: ["POP-036", "POP-037", "POP-028"],
    intro:
      "Quando a nuvenzinha do OneDrive (perto do relógio) fica com um 'X vermelho' ou presa em 'Processando alterações', este comando oficial da Microsoft destrava tudo sem apagar nenhum arquivo seu:",
    commands: [
      {
        label: "Passo 1 — Reiniciar a sincronização do OneDrive",
        whereToRun: "run",
        command: "%localappdata%\\Microsoft\\OneDrive\\onedrive.exe /reset",
        explanation:
          "A nuvenzinha perto do relógio vai sumir por 1 minutinho enquanto se reorganiza sozinha.",
      },
      {
        label: "Passo 2 — Abrir a nuvem novamente (se não voltar após 1 min)",
        whereToRun: "run",
        command: "%localappdata%\\Microsoft\\OneDrive\\onedrive.exe",
        explanation:
          "Faz a nuvem azul reaparecer perto do relógio sincronizando normalmente.",
      },
    ],
    quickReplies: [
      "A nuvem voltou ao normal!",
      "Pede para eu fazer login no OneDrive",
      "Continua com X vermelho em um arquivo",
    ],
    safetyNote:
      "Fique 100% tranquilo: todas as suas pastas e documentos continuam salvos e intactos.",
  },
  {
    id: "limpeza-profunda-temp",
    title: "Aliviar Notebook Lento ou Travando (Limpeza Segura)",
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
    relatedPopCodes: ["POP-001", "POP-002", "POP-005", "POP-030"],
    intro:
      "Quando o notebook fica pesado, demorando para responder a cada clique, normalmente há rascunhos acumulados e memória cheia por dias sem reiniciar. Vamos aliviar agora sem risco para seus documentos:",
    steps: [
      "Primeiro, salve o que estiver aberto e clique no botão Iniciar (janelinha do Windows) > Ligar/Desligar > escolha 'Reiniciar' (não clique em 'Desligar', pois só o 'Reiniciar' zera a memória travada!).",
      "Se continuar pesado depois de reiniciar, limpe a pasta de rascunhos temporários com o atalho abaixo:",
    ],
    commands: [
      {
        label: "Passo 1 — Abrir pasta de rascunhos temporários (%temp%)",
        whereToRun: "run",
        command: "%temp%",
        explanation:
          "Vai abrir uma pasta cheia de rascunhos antigos do sistema. Aperte Ctrl + A (seleciona tudo), aperte Delete e, se perguntar de arquivos em uso, marque a caixinha e clique em 'Ignorar'.",
      },
      {
        label: "Passo 2 — Limpador automático do Disco C:",
        whereToRun: "run",
        command: "cleanmgr",
        explanation:
          "Dê OK na unidade C:, marque Lixeira / Arquivos Temporários e clique em OK.",
      },
    ],
    quickReplies: [
      "Ficou bem mais rápido!",
      "Só um programa específico travou",
      "Continua muito lento mesmo reiniciando",
    ],
    safetyNote:
      "Nada das suas pastas Documentos, Área de Trabalho ou Downloads é apagado por esses passos.",
  },
  {
    id: "certificado-ssl-avancado",
    title: "Destravar Certificado Digital (A1/A3), e-CAC e SEFAZ",
    triggers: [
      "certificado",
      "token",
      "ecnpj",
      "ecpf",
      "a1",
      "a3",
      "receita",
      "ecac",
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
      "Quando sites do governo (e-CAC, Receita, SEFAZ) não mostram a janelinha para escolher o Certificado Digital, limpar a memória de certificados do navegador costuma resolver na hora:",
    commands: [
      {
        label: "Passo 1 — Limpar memória SSL travada no Windows",
        whereToRun: "run",
        command: "inetcpl.cpl",
        explanation:
          "Na janelinha que abrir, clique na aba 'Conteúdo' lá em cima, clique no botão 'Limpar estado SSL' e dê OK. Depois feche TODAS as janelas da internet e abra de novo.",
      },
      {
        label: "Passo 2 — Conferir se o certificado não venceu",
        whereToRun: "run",
        command: "certmgr.msc",
        explanation:
          "Dê dois cliques na pastinha 'Pessoal' > 'Certificados' à esquerda e veja a data na coluna 'Data de Expiração'.",
      },
    ],
    steps: [
      "Se o seu certificado for um pendrive/token físico (A3), tire e coloque direto na entrada USB do próprio notebook (evite adaptadores).",
    ],
    quickReplies: [
      "Apareceu o certificado e entrou!",
      "Vi aqui que está vencido / não está na lista",
      "Continua dando erro no site",
    ],
    safetyNote:
      "Se o certificado estiver vencido ou precisar instalar um certificado novo da empresa, abra chamado abaixo para a TI instalar.",
  },
  {
    id: "rede-corporativa-gpupdate",
    title: "Reconectar Pastas da Rede, VPN e Sistemas Internos / ERP",
    triggers: [
      "pasta de rede",
      "pastas de rede",
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
      "Quando pastas compartilhadas da empresa somem ou o sistema interno não abre, primeiro confira se a VPN da empresa está conectada (caso esteja fora do escritório) e rode esta sincronização:",
    commands: [
      {
        label: "Passo 1 — Reconectar pastas e permissões da empresa",
        whereToRun: "cmd",
        command: "gpupdate /force",
        explanation:
          "Aguarde alguns segundos até aparecer 'A atualização da política foi concluída com êxito'.",
      },
      {
        label: "Passo 2 — Conferir conexões de VPN e Wi-Fi",
        whereToRun: "run",
        command: "ncpa.cpl",
        explanation:
          "Abre a tela com os ícones de rede para ver se a VPN e o Wi-Fi estão conectados.",
      },
    ],
    steps: [
      "Se for um sistema no navegador dando erro de login/403, aperte Ctrl + Shift + N para testar em uma janela limpa (anônima).",
    ],
    quickReplies: [
      "Voltou a abrir normalmente!",
      "Diz que minha senha/usuário bloqueou",
      "Continua sem abrir a pasta/sistema",
    ],
    safetyNote:
      "Se aparecer aviso de conta bloqueada ou falta de permissão na pasta, abra um chamado abaixo que a TI libera rapidamente.",
  },
  {
    id: "teams-audio-camera-reparo",
    title: "Resolver Som, Microfone, Câmera ou Teams em Reuniões",
    triggers: [
      "teams",
      "camera",
      "webcam",
      "compartilhar tela",
      "reuniao",
      "microfone nao funciona",
      "sem som no teams",
      "reparar teams",
      "ninguem me ouve",
      "nao ouco",
    ],
    relatedPopCodes: ["POP-027", "POP-037"],
    intro:
      "Se ninguém ouve você na reunião, está sem som ou o Teams travou, vamos conferir os dois lugares onde o Windows costuma bloquear o áudio/vídeo:",
    steps: [
      "Olhe no teclado do notebook se há uma tecla com desenho de microfone cortado ou alto-falante com uma luzinha acesa (aperte-a para destravar o mudo físico).",
    ],
    commands: [
      {
        label: "Passo 1 — Liberar permissão do Microfone no Windows",
        whereToRun: "run",
        command: "ms-settings:privacy-microphone",
        explanation:
          "Veja se os botões 'Acesso ao microfone' e 'Permitir que os aplicativos acessem o microfone' estão ligados (Ativado).",
      },
      {
        label: "Passo 2 — Reparar o aplicativo Microsoft Teams",
        whereToRun: "run",
        command: "ms-settings:appsfeatures",
        explanation:
          "Digite 'Teams' na busca dessa tela, clique nos 3 pontinhos (...) ao lado dele > Opções avançadas > clique em 'Reparar' (não apaga conversas).",
      },
    ],
    quickReplies: [
      "O som/Teams voltou!",
      "É a câmera que está fechada/escura",
      "Continua sem funcionar",
    ],
    safetyNote:
      "Para câmera escura, veja bem no topo da tela do notebook se há uma tampinha plástica deslizante fechando a lente!",
  },
  {
    id: "impressora-fila-spooler",
    title: "Destravar Impressora e Scanner",
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
    relatedPopCodes: ["POP-005"],
    intro:
      "Mandou imprimir e não saiu nada? Geralmente um arquivo anterior ficou preso na fila ou o notebook conectou em outra rede Wi-Fi:",
    commands: [
      {
        label: "Abrir a Fila de Impressão para limpar documentos presos",
        whereToRun: "run",
        command: "control printers",
        explanation:
          "Dê dois cliques no desenho da sua impressora; se houver arquivos parados na lista, clique em 'Impressora' lá no topo > 'Cancelar todos os documentos'.",
      },
    ],
    steps: [
      "Confira se você está conectado no Wi-Fi interno corporativo (impressoras do escritório não funcionam na rede Visitante ou 4G).",
      "Veja na própria impressora se não há luz piscando indicando falta de papel ou tampa entreaberta.",
    ],
    quickReplies: [
      "Imprimiu certinho!",
      "A impressora nem aparece no meu notebook",
      "Aparece escrita 'Offline'",
    ],
    safetyNote:
      "Para instalar uma impressora nova no seu notebook, clique em Abrir Chamado abaixo informando seu setor.",
  },
  {
    id: "identificar-maquina-remoto",
    title: "Descobrir o Código do Notebook (Hostname) para a TI",
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
      "A TI pediu o nome da sua máquina (Hostname) para entrar remotamente e te ajudar? Com um clique abaixo você descobre na hora:",
    commands: [
      {
        label: "Descobrir o Nome do Computador (Hostname)",
        whereToRun: "cmd",
        command: "hostname",
        explanation:
          "Vai aparecer uma linha curta com o código do seu notebook — copie esse código e cole no chamado!",
      },
      {
        label: "Ver qual usuário está conectado",
        whereToRun: "cmd",
        command: "whoami",
        explanation: "Mostra o nome do seu login corporativo atual.",
      },
    ],
    safetyNote:
      "Com esse código e um print da tela, o analista da TI resolve seu atendimento muito mais rápido!",
  },
  {
    id: "video-apps-nativos",
    title: "Ajustar Tela Cortada, Letra Grande/Pequena ou Monitor Externo",
    triggers: [
      "wsreset",
      "print nao funciona",
      "captura nao abre",
      "ferramenta de captura",
      "tela piscando",
      "driver de video",
      "monitor cortado",
      "escala",
      "letra gigante",
      "tudo grande",
      "tela esticada",
      "segunda tela",
    ],
    relatedPopCodes: ["POP-038", "POP-025", "POP-026", "POP-035"],
    intro:
      "Se o segundo monitor está sem imagem, com bordas cortadas, letras gigantes/distorcidas ou piscando, siga este passo a passo simples:",
    commands: [
      {
        label: "Abrir ajustes da Tela / Segundo Monitor",
        whereToRun: "run",
        command: "ms-settings:display",
        explanation:
          "Abre direto a tela onde você escolhe o Monitor 2, ajusta a Resolução e, em 'Exibição avançada', coloca a Taxa abaixo de 59Hz (50 Hz) caso a tela esteja cortada.",
      },
    ],
    steps: [
      "Se a segunda tela está toda preta: aperte a tecla Windows + letra P juntas e clique em 'Estender'.",
      "Se a tela estiver piscando ou travada visualmente: aperte juntas Windows + Ctrl + Shift + B (a tela dá uma piscadinha rápida de 1 segundo para destravar a imagem sem fechar nada!).",
    ],
    quickReplies: [
      "A tela ficou perfeita agora!",
      "Diz 'Sem Sinal' no monitor externo",
      "É o botão de tirar print que parou",
    ],
    safetyNote:
      "Se aparecer 'Sem Sinal' no monitor, tire o cabo HDMI da lateral do notebook e encaixe novamente até o fim.",
  },
  {
    id: "instalacao-admin",
    title: "Pediu Senha de Administrador ou Instalar Programa",
    triggers: [
      "instalar",
      "instalacao",
      "programa novo",
      "software",
      "administrador",
      "admin",
      "uac",
      "pede senha",
      "pediu senha",
      "licenca",
    ],
    relatedPopCodes: ["POP-033", "POP-020"],
    intro:
      "Apareceu uma janelinha do Windows pedindo usuário e senha de Administrador? Na ECOVIS BPO isso é uma proteção automática de segurança para impedir que vírus se instalem sozinhos.",
    commands: [
      {
        label: "Ver o código do seu notebook para enviar à TI",
        whereToRun: "cmd",
        command: "hostname",
        explanation:
          "Informe esse código no chamado junto com o nome do programa que você precisa.",
      },
    ],
    steps: [
      "Clique em 'Copiar resumo' abaixo, abra o chamado na TI e diga qual programa precisa instalar ou atualizar.",
      "Um analista conectará remotamente na sua tela e digitará a credencial da TI para liberar para você!",
    ],
    safetyNote:
      "Nunca tente baixar versões 'portáteis' de sites desconhecidos para contornar o aviso.",
  },
  {
    id: "tela-azul-bitlocker",
    title: "Tela Azul, Chave BitLocker ou Notebook Não Liga",
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
      "Calma, seus arquivos estão protegidos! Quando aparece uma Tela Azul ou um pedido de 'Chave de Recuperação BitLocker', faça apenas isto:",
    steps: [
      "NÃO clique em opções como 'Restaurar PC' ou 'Formatar' para não perder arquivos locais.",
      "Pegue seu celular, tire uma foto bem legível da tela inteira (mostrando os números de 'ID da Chave', se houver).",
      "Deixe o carregador conectado na tomada e chame a TI imediatamente anexando essa foto no chamado.",
    ],
    safetyNote:
      "A TI possui a chave oficial de desbloqueio dessa tela e libera o equipamento rapidamente.",
  },
];

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

function hasExternalSubjectWithoutDedicatedPop(queryNorm: string): boolean {
  const externalAppSubjects = [
    "outlook",
    "webmail",
    "caixa compartilhada",
    "impressora",
    "imprimir",
    "scanner",
    "escanear",
    "spooler",
    "certificado",
    "ecac",
    "sefaz",
    "ecnpj",
    "ecpf",
    "serpro",
    "erp",
    "powerpoint",
  ];
  const mentionsExternal = externalAppSubjects.some((subj) =>
    textHasPhrase(queryNorm, subj)
  );
  if (!mentionsExternal) return false;

  if (
    ["phishing", "golpe", "suspeito", "spam", "falso", "virus"].some((w) =>
      textHasPhrase(queryNorm, w)
    )
  ) {
    return false;
  }

  return true;
}

function isLaypersonHelpFromScratchIntent(queryNorm: string): boolean {
  const scratchPhrases = [
    "nao sei explicar",
    "me ajude do zero",
    "ajude do zero",
    "nao sei por onde comecar",
    "por onde comecar",
    "sou leigo",
    "sou leiga",
    "nao entendo nada",
    "nao entendo de computador",
    "nao sei o que aconteceu",
    "nao sei o que fazer",
    "socorro",
    "nao consigo trabalhar",
    "parou tudo",
    "deu ruim",
    "ta tudo estranho",
    "apareceu um aviso",
    "apareceu uma janela",
    "apareceu uma mensagem",
    "sumiu tudo",
  ];
  return scratchPhrases.some((p) => queryNorm.includes(p));
}

function scorePopMatch(
  pop: PopItem,
  queryNorm: string,
  tokens: string[]
): number {
  const codeNorm = normalize(pop.code);
  if (textHasPhrase(queryNorm, codeNorm)) {
    return 60;
  }

  const titleWords = normalize(pop.title).split(" ").filter(Boolean);
  const goalWords = normalize(pop.goal).split(" ").filter(Boolean);
  const kwWords = normalize(pop.keywords).split(" ").filter(Boolean);
  const stepsWords = normalize(
    pop.steps.map((s) => `${s.lead} ${s.text}`).join(" ")
  )
    .split(" ")
    .filter(Boolean);

  let strongScore = 0;
  let weakScore = 0;
  let matchedSpecificTokens = 0;

  for (const token of tokens) {
    if (token.length < 2) continue;

    const inKw = kwWords.some((w) => wordMatchesToken(w, token));
    const inTitle = titleWords.some((w) => wordMatchesToken(w, token));
    const inGoal = goalWords.some((w) => wordMatchesToken(w, token));
    const inSteps = stepsWords.some((w) => wordMatchesToken(w, token));

    if (!inKw && !inTitle && !inGoal && !inSteps) continue;

    if (WEAK_CONTEXT_TOKENS.has(token)) {
      weakScore += 2;
      continue;
    }

    matchedSpecificTokens += 1;
    if (inKw) strongScore += 10;
    if (inTitle) strongScore += 9;
    if (inGoal) strongScore += 5;
    if (inSteps) strongScore += 2;
  }

  if (matchedSpecificTokens === 0) {
    return 0;
  }

  return strongScore + Math.min(weakScore, 4);
}

function scorePlaybook(pb: AdvancedPlaybook, queryNorm: string): number {
  let score = 0;

  for (const trig of pb.triggers) {
    const trigNorm = normalize(trig);
    if (textHasPhrase(queryNorm, trigNorm)) {
      score += trigNorm.includes(" ") ? 24 : 15;
    }
  }

  if (pb.comboTriggers) {
    for (const combo of pb.comboTriggers) {
      if (combo.every((term) => textHasPhrase(queryNorm, normalize(term)))) {
        score += 32;
      }
    }
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
    "avancado",
    "avancada",
    "comando",
    "comandos",
    "comandos rapidos",
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
    "resetnavpane",
  ];
  return advSignals.some((s) => textHasPhrase(queryNorm, s));
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
    "voltou",
  ];
  return (
    queryNorm.length <= 50 &&
    exactOrShort.some((p) => textHasPhrase(queryNorm, p)) &&
    !textHasPhrase(queryNorm, "nao")
  );
}

function stripHtmlTags(raw: string): string {
  return raw
    .replace(/<kbd>(.*?)<\/kbd>/gi, "[$1]")
    .replace(/<[^>]+>/g, "")
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
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
    quickReplies: playbook.quickReplies,
    diagnosedIssue: playbook.title,
    recommendedPops: relatedPops.length > 0 ? relatedPops : undefined,
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
    .map((m) =>
      m.imagePreviewUrl && !m.content.trim()
        ? "[Colaborador enviou print da tela]"
        : m.content.trim()
    )
    .filter(Boolean);

  const latestTranscription = [...messages]
    .reverse()
    .find((m) => m.role === "assistant" && m.screenTranscription?.trim())
    ?.screenTranscription?.trim();

  const latestDiagnosis = [...messages]
    .reverse()
    .find((m) => m.role === "assistant" && m.diagnosedIssue?.trim())
    ?.diagnosedIssue?.trim();

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
      : "Triagem direta via IA de Autoajuda";

  const lines = [
    "Resumo de Pré-Atendimento (Assistente IA • Portal POPs TI)",
  ];

  if (latestTranscription) {
    lines.push(`• Erro transcrito do print: ${latestTranscription}`);
  }

  if (latestDiagnosis) {
    lines.push(`• Diagnóstico identificado pela IA: ${latestDiagnosis}`);
  }

  lines.push(
    `• Relato do colaborador: ${mainIssue}`,
    `• Procedimentos consultados: ${checkedPops}`
  );

  if (executedCommands.length > 0) {
    lines.push(
      `• Comandos/verificações já orientados: ${executedCommands.join(" ; ")}`
    );
  }

  lines.push(
    "• Patrimônio / Hostname (rode 'hostname' no CMD): [informar aqui]",
    "• Impacto no trabalho: [Parcial / Impedido de trabalhar]",
    "• Print do erro (Win + Shift + S): [anexar no chamado]"
  );

  return lines.join("\n");
}

interface ApiChatPayload {
  fallback?: boolean;
  reason?: string;
  detail?: string;
  responseMode?: "investigate" | "solve" | "escalate";
  screenTranscription?: string;
  content?: string;
  steps?: string[];
  commands?: CommandSnippet[];
  quickReplies?: string[];
  popCodes?: string[];
  diagnosedIssue?: string;
  suggestTicket?: boolean;
  interactionId?: string;
}

export async function generateAssistantReply(params: {
  userText: string;
  history: ChatMessage[];
  currentPopCode: string | null;
  image?: ChatImageAttachment | null;
}): Promise<Omit<ChatMessage, "id" | "timestamp">> {
  const { userText, history, currentPopCode, image } = params;

  const prevMsg = history.length >= 2 ? history[history.length - 2] : undefined;
  const previousInteractionId =
    prevMsg?.role === "assistant" ? prevMsg.interactionId ?? null : null;

  let fallbackReason: string | null = null;
  let fallbackDetail: string | null = null;

  const externalEndpoint =
    process.env.NEXT_PUBLIC_AI_CHAT_ENDPOINT || "/api/chat";

  if (externalEndpoint) {
    const maxAttempts = 1;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const response = await fetch(externalEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
          body: JSON.stringify({
            message: userText,
            currentPopCode,
            previousInteractionId: image ? null : previousInteractionId,
            image: image
              ? {
                  base64Data: image.base64Data,
                  mimeType: image.mimeType,
                }
              : null,
            history: history.slice(-6).map((m) => ({
              role: m.role,
              content: m.content,
            })),
          }),
        });

        if (response.ok) {
          const data = (await response.json()) as ApiChatPayload;

          if (data.content) {
            const isInvestigative = data.responseMode === "investigate";
            const isEscalate = data.responseMode === "escalate";

            const recommendedPops = isInvestigative
              ? []
              : (data.popCodes ?? [])
                  .map((code) => POPS.find((p) => p.code === code))
                  .filter((p): p is PopItem => Boolean(p))
                  .map((p) => ({ code: p.code, title: p.title, goal: p.goal }));

            return {
              role: "assistant",
              screenTranscription: data.screenTranscription,
              content: data.content,
              steps: data.steps,
              commands: data.commands,
              quickReplies: data.quickReplies,
              diagnosedIssue: data.diagnosedIssue,
              interactionId: data.interactionId,
              recommendedPops:
                recommendedPops.length > 0 ? recommendedPops : undefined,
              suggestTicket: isInvestigative
                ? false
                : isEscalate || Boolean(data.suggestTicket),
              askResolutionFeedback: !isInvestigative,
              isInvestigativeQuestion: isInvestigative,
            };
          }

          fallbackReason = data.reason ?? "upstream_unavailable";
          fallbackDetail = data.detail ?? null;
        } else {
          fallbackReason = `http_${response.status}`;
        }
      } catch {
        fallbackReason = "network_error";
      }
    }
  }

  if (image) {
    const diagInfo = fallbackReason ? ` (${fallbackReason})` : "";
    let friendlyReason =
      `Não foi possível concluir a leitura óptica agora${diagInfo}. Clique abaixo para tentar novamente:`;

    if (fallbackReason === "rate_limited") {
      friendlyReason =
        "A cota gratuita por minuto do Google Gemini atingiu o limite de envios simultâneos. Aguarde cerca de 15 segundos e clique no botão abaixo para ler seu print:";
    } else if (fallbackReason === "http_413") {
      friendlyReason =
        "Essa captura de tela ficou grande demais para envio direto. Dica: aperte Win + Shift + S e recorte apenas a área da janela do erro!";
    } else if (fallbackReason === "http_504" || fallbackReason === "upstream_504") {
      friendlyReason =
        "O servidor demorou mais de 10 segundos para processar a imagem inteira. Clique abaixo para tentar novamente (ou recorte apenas a janela do erro com Win + Shift + S para leitura instantânea):";
    } else if (fallbackReason?.startsWith("api_rejected_")) {
      friendlyReason = `O Google Gemini recusou a chamada (${fallbackReason}${
        fallbackDetail ? `: ${fallbackDetail}` : ""
      }). Verifique se a chave criada no Google AI Studio está sem restrição de IP/domínio.`;
    }

    return {
      role: "assistant",
      content: friendlyReason,
      retryPayload: {
        userText,
        image,
      },
      quickReplies: [
        "Apareceu no E-mail (Outlook) ou Teams",
        "É na Internet / navegador não abre",
        "Pediu senha de Administrador",
      ],
      suggestTicket: false,
      askResolutionFeedback: false,
      isInvestigativeQuestion: true,
    };
  }

  // =========================================================================
  // MOTOR DE CONTINGÊNCIA LOCAL (TEXTO) COM TRIAGEM P/ LEIGOS
  // =========================================================================
  const queryNorm = normalize(userText);
  const tokens = queryNorm
    .split(" ")
    .filter((t) => t.length >= 2 && !STOPWORDS.has(t));

  if (isPositiveConfirmation(queryNorm)) {
    return {
      role: "assistant",
      content:
        "Que notícia ótima! Fico feliz que conseguimos resolver juntos. 😊\n\nSe surgir qualquer outra dúvida — ou quiser mandar um print de algum aviso — é só me chamar aqui!",
      suggestTicket: false,
      askResolutionFeedback: false,
    };
  }

  if (isLaypersonHelpFromScratchIntent(queryNorm)) {
    return {
      role: "assistant",
      content:
        "Fique super tranquilo! Você não precisa saber nenhum nome técnico — eu vou descobrir junto com você passo a passo. 😊\n\nOlhando para o seu notebook agora, qual destas situações chega mais perto do que está acontecendo?",
      quickReplies: [
        "Tudo muito lento ou tela congelou",
        "Internet / site / sistema não entra",
        "Problema no E-mail (Outlook) ou Reunião",
        "Meus arquivos / nuvem (OneDrive) sumiram",
      ],
      suggestTicket: false,
      askResolutionFeedback: false,
      isInvestigativeQuestion: true,
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

  let bestPlaybook: AdvancedPlaybook | null = null;
  let bestPlaybookScore = 0;

  for (const pb of ADVANCED_PLAYBOOKS) {
    const score = scorePlaybook(pb, queryNorm);
    if (score > bestPlaybookScore) {
      bestPlaybookScore = score;
      bestPlaybook = pb;
    }
  }

  if (isAdvancedExplicitRequest(queryNorm)) {
    if (bestPlaybook) {
      return formatPlaybookResponse(bestPlaybook);
    }
    return {
      role: "assistant",
      content:
        "Posso te passar comandos seguros e prontos para copiar (sem precisar de senha de Administrador)! Qual área você quer destravar agora?",
      quickReplies: [
        "Resetar IP e DNS (Internet)",
        "Destravar OneDrive (nuvem)",
        "Limpeza de cache (%temp%)",
        "Certificado Digital (e-CAC / SEFAZ)",
      ],
      suggestTicket: false,
      askResolutionFeedback: false,
      isInvestigativeQuestion: true,
    };
  }

  if (hasExternalSubjectWithoutDedicatedPop(queryNorm) && bestPlaybook) {
    return formatPlaybookResponse(bestPlaybook);
  }

  if (isUnresolvedOrEscalationIntent(queryNorm)) {
    const refPop =
      explicitPopCode ??
      currentPopCode ??
      Array.from(previouslySuggestedCodes).pop() ??
      null;

    const mappedPlaybookId = refPop ? POP_TO_PLAYBOOK_MAP[refPop] : undefined;
    const mappedPlaybook =
      bestPlaybook ??
      (mappedPlaybookId
        ? ADVANCED_PLAYBOOKS.find((p) => p.id === mappedPlaybookId) ?? null
        : null);

    if (mappedPlaybook && !alreadySentAdvanced) {
      return formatPlaybookResponse(
        mappedPlaybook,
        "Sem problema! Quando o caminho comum não resolve, podemos tentar este destravamento automático bem simples (basta copiar e colar):"
      );
    }

    const hostPlaybook = ADVANCED_PLAYBOOKS.find(
      (p) => p.id === "identificar-maquina-remoto"
    );
    return {
      role: "assistant",
      content:
        "Como já fizemos todas as tentativas seguras que não exigem senha da TI, o melhor caminho agora é nossa equipe conectar na sua tela para resolver por você!\n\nJá deixei o resumo da nossa conversa pronto — basta clicar em 'Copiar resumo' abaixo e abrir o chamado:",
      commands: hostPlaybook ? [hostPlaybook.commands![0]] : undefined,
      steps: [
        "Clique no botão 'Copiar resumo' logo abaixo para não precisar explicar tudo de novo.",
        "Clique em 'Ir p/ Portal de Chamados' e cole o resumo lá (se puder, anexe também uma foto/print da tela).",
      ],
      diagnosedIssue:
        "Caso persistente após triagem guiada (requer acesso remoto / permissão administrativa da TI)",
      suggestTicket: true,
      askResolutionFeedback: false,
      isAdvancedResponse: true,
    };
  }

  const scoredPops = POPS.map((pop) => ({
    pop,
    score: scorePopMatch(pop, queryNorm, tokens),
  }))
    .filter((item) => item.score >= 10)
    .sort((a, b) => b.score - a.score);

  if (
    bestPlaybook &&
    bestPlaybookScore >= 15 &&
    (scoredPops.length === 0 || bestPlaybookScore >= scoredPops[0].score)
  ) {
    return formatPlaybookResponse(bestPlaybook);
  }

  const unseenMatches = scoredPops.filter(
    (item) => !previouslySuggestedCodes.has(item.pop.code)
  );
  const topMatches = (
    unseenMatches.length > 0 ? unseenMatches : scoredPops
  ).slice(0, 2);

  if (topMatches.length > 0 && topMatches[0].score >= 12) {
    const primary = topMatches[0].pop;
    const theme = THEMES.find((t) => t.id === primary.themeId);
    const fullPlainSteps = primary.steps
      .slice(0, 4)
      .map((s) => `${s.lead}: ${stripHtmlTags(s.text)}`);
    const linkedPlaybookId = POP_TO_PLAYBOOK_MAP[primary.code];

    return {
      role: "assistant",
      content: `Entendi o que está acontecendo! Vou te guiar de um jeito bem fácil agora mesmo (já separei cada passo aqui embaixo):`,
      steps: fullPlainSteps,
      diagnosedIssue: `${primary.title} (${primary.code}${
        theme ? ` • ${theme.name}` : ""
      })`,
      quickReplies: [
        "Deu certo, resolveu!",
        "Ainda não resolveu, tentar outro jeito",
      ],
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

  if (bestPlaybook && bestPlaybookScore > 0) {
    return formatPlaybookResponse(bestPlaybook);
  }

  return {
    role: "assistant",
    content:
      "Quero ter certeza de te dar o caminho certinho sem chutar! Me conta só mais um detalhe (ou cole um print da tela com Ctrl + V): onde exatamente isso está acontecendo?",
    quickReplies: [
      "O notebook está lento ou travado",
      "A internet ou um site não abre",
      "No E-mail (Outlook), Excel ou Teams",
      "Apareceu uma mensagem de erro estranha",
    ],
    suggestTicket: false,
    askResolutionFeedback: false,
    isInvestigativeQuestion: true,
  };
}
