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
  comboTriggers?: string[][];
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

// Palavras genéricas de ligação, negação, sintomas ou interface que NUNCA devem pontuar POPs sozinhas
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
]);

// Termos amplos que ajudam a desempatar, mas jamais validam sozinhos um POP sem o assunto principal
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

// Base de Diagnóstico Técnico Especialista (Nível 2) traduzida de forma simples e segura (sem exigir senha de Admin)
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
      "Quando a seção ou guia 'Grupos' (ou o painel de pastas) não aparece no Outlook, normalmente é uma mudança de posição entre o Novo Outlook e o Outlook Clássico ou ocultação do painel lateral. Veja como localizar em segundos:",
    steps: [
      "1. No Novo Outlook (visual moderno): 'Grupos' não fica mais como guia no topo — olhe na barra vertical fina bem à esquerda da tela e clique no ícone 'Grupos' (pessoas) ou nos três pontinhos (...) > 'Grupos'.",
      "2. No Outlook Clássico: role a lista de pastas da esquerda até o final (abaixo de 'Itens Enviados' e 'Lixo Eletrônico') e clique na setinha ao lado de 'Grupos' para expandir. Se a barra lateral inteira sumiu, aperte Ctrl + 6 ou vá em Exibir > Painel de Pastas > Normal.",
      "3. Se as guias do topo (Página Inicial / Enviar e Receber / Exibir) sumiram: aperte Ctrl + F1 no teclado para fixar novamente a Faixa de Opções completa.",
      "4. Faça o teste no navegador (outlook.office.com): se os Grupos aparecerem na Web mas não no aplicativo instalado, use o comando de restaurar painel abaixo. Se NÃO aparecerem nem na Web, sua conta ainda precisa ser incluída como membro do Grupo pela TI.",
    ],
    commands: [
      {
        label: "Opcional — Restaurar Painel de Navegação do Outlook Clássico",
        whereToRun: "run",
        command: "outlook.exe /resetnavpane",
        explanation:
          "Feche o Outlook antes e rode no Win + R: recria o menu lateral de pastas e grupos sem apagar nenhum e-mail.",
      },
    ],
    safetyNote:
      "Se você precisa ser adicionado a um Grupo de e-mail ou Caixa Compartilhada do seu setor, clique em Abrir Chamado abaixo informando o nome do grupo.",
  },
  {
    id: "outlook-office-safe",
    title: "Recuperar Outlook, E-mails ou Excel/Word com Falha",
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
      "Para destravar o Outlook (e-mails presos, falha ao abrir perfil ou tela congelada) ou recuperar planilhas do Excel sem perder dados, siga estas verificações seguras:",
    steps: [
      "Se o Outlook abre mas não envia nem recebe e-mails: clique na guia 'Enviar/Receber' no topo e verifique se o botão 'Trabalhar Offline' está marcado (clique nele para desativar e reconectar).",
      "Teste em Modo de Segurança com os comandos abaixo para isolar suplementos que estejam travando o aplicativo:",
    ],
    commands: [
      {
        label: "Opção A — Abrir o Outlook destravado (Modo Seguro)",
        whereToRun: "run",
        command: "outlook.exe /safe",
        explanation:
          "Clique em OK na janela de perfil. Abre o Outlook limpo sem suplementos externos pesados.",
      },
      {
        label: "Opção B — Abrir o Excel limpo sem suplementos",
        whereToRun: "run",
        command: "excel.exe /safe",
        explanation:
          "Permite abrir, recuperar e salvar planilhas pesadas quando o Excel fecha sozinho ou congela.",
      },
    ],
    safetyNote:
      "Persistindo a falha fora do modo seguro, abra chamado abaixo para a TI executar o Reparo Rápido do Microsoft 365.",
  },
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
    relatedPopCodes: ["POP-005"],
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

// Assuntos específicos que NÃO possuem POP dedicado entre os 38 POPs (evita sugerir POP de Wi-Fi/Pastas por engano!)
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

  // Exceção legítima: se falar de e-mail/outlook suspeito, golpe, phishing ou boleto falso -> permite POP-016
  if (
    ["phishing", "golpe", "suspeito", "spam", "falso", "virus"].some((w) =>
      textHasPhrase(queryNorm, w)
    )
  ) {
    return false;
  }

  return true;
}

function scorePopMatch(pop: PopItem, queryNorm: string, tokens: string[]): number {
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

  // Sem ao menos 1 palavra específica real do tema do POP, descarta completamente!
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
  ];
  return (
    queryNorm.length <= 45 &&
    exactOrShort.some((p) => textHasPhrase(queryNorm, p)) &&
    !textHasPhrase(queryNorm, "nao")
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

  // Conecta automaticamente na rota /api/chat (Google Gemini gratuito) com fallback transparente para o motor especialista local
  const externalEndpoint =
    process.env.NEXT_PUBLIC_AI_CHAT_ENDPOINT || "/api/chat";
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
            recommendedPops:
              recommendedPops.length > 0 ? recommendedPops : undefined,
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

  // Pontua Playbooks Especialistas / Nível 2
  let bestPlaybook: AdvancedPlaybook | null = null;
  let bestPlaybookScore = 0;

  for (const pb of ADVANCED_PLAYBOOKS) {
    const score = scorePlaybook(pb, queryNorm);
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
    const netPlaybook = ADVANCED_PLAYBOOKS.find((p) => p.id === "rede-ip-dns")!;
    return formatPlaybookResponse(
      netPlaybook,
      "Posso te guiar em diagnósticos avançados por CMD e Executar (Win + R) explicando cada passo de forma simples! Começando pelo campeão de resoluções de rede/IP (ou me diga se o problema é OneDrive, Outlook, Lentidão/Cache, Certificado ou Pastas de Rede):"
    );
  }

  // 3. Se o assunto é explicitamente uma ferramenta fora dos 38 POPs (ex.: Outlook, Impressora, Certificado, ERP)
  if (hasExternalSubjectWithoutDedicatedPop(queryNorm) && bestPlaybook) {
    return formatPlaybookResponse(bestPlaybook);
  }

  // 4. Quando o usuário diz que "não resolveu" / "já tentei"
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
        refPop
          ? `Como o passo a passo básico do ${refPop} não foi suficiente, vamos subir para um diagnóstico um pouco mais avançado (mas bem simples de aplicar):`
          : "Entendi! Antes de você precisar esperar pelo atendimento de um chamado, podemos tentar este procedimento técnico Nível 2 explicado passo a passo:"
      );
    }

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

  // 5. Pontua todos os 38 POPs apenas com palavras de domínio real
  const scoredPops = POPS.map((pop) => ({
    pop,
    score: scorePopMatch(pop, queryNorm, tokens),
  }))
    .filter((item) => item.score >= 10)
    .sort((a, b) => b.score - a.score);

  // Se um Playbook Especialista teve correspondência mais forte que os POPs, prioriza o Playbook
  if (
    bestPlaybook &&
    bestPlaybookScore >= 15 &&
    (scoredPops.length === 0 || bestPlaybookScore >= scoredPops[0].score)
  ) {
    return formatPlaybookResponse(bestPlaybook);
  }

  // 6. Se encontrou POPs genuinamente aderentes ao mesmo assunto
  const unseenMatches = scoredPops.filter(
    (item) => !previouslySuggestedCodes.has(item.pop.code)
  );
  const topMatches = (
    unseenMatches.length > 0 ? unseenMatches : scoredPops
  ).slice(0, 3);

  if (topMatches.length > 0 && topMatches[0].score >= 12) {
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

  // 7. Se ainda teve aderência válida a um Playbook ou a um POP secundário (>= 10)
  if (bestPlaybook && bestPlaybookScore > 0) {
    return formatPlaybookResponse(bestPlaybook);
  }

  if (topMatches.length > 0) {
    const primary = topMatches[0].pop;
    return {
      role: "assistant",
      content: `O procedimento mais próximo no catálogo é o ${primary.code}: "${primary.title}". Se sua dúvida for sobre outro sistema ou função específica, me detalhe qual programa está usando ou abra chamado direto com a TI abaixo:`,
      steps: primary.steps.slice(0, 3).map((s) => s.lead),
      recommendedPops: [
        { code: primary.code, title: primary.title, goal: primary.goal },
      ],
      suggestTicket: true,
      askResolutionFeedback: true,
    };
  }

  // 8. Fallback honesto (sem inventar POPs desconexos!)
  return {
    role: "assistant",
    content:
      "Não encontrei um POP específico para essa questão exata no catálogo, e prefiro não chutar uma resposta fora de contexto! Me diga qual aplicativo aparece na tela ou qual mensagem surgiu (ex.: Outlook, Excel, OneDrive, Wi-Fi, Monitor, Certificado Digital), ou clique abaixo para falar direto com a TI:",
    steps: [
      "Dica rápida: você pode pedir diagnósticos como 'guia grupos no outlook', 'resetar ip no cmd', 'onedrive processando alterações', 'certificado digital não aparece' ou 'erro de escala no monitor'.",
      "Para atendimento humano rápido, clique em 'Copiar resumo' e depois em 'Abrir Chamado na TI'.",
    ],
    suggestTicket: true,
    askResolutionFeedback: false,
  };
}
