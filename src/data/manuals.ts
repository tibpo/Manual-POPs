import { POPS } from "@/data/pops";
import { THEMES } from "@/data/themes";
import type { ManualMetadata, NumericThemeId, ThemeId } from "@/types/pop";

const FILE_MAP: Record<NumericThemeId, string> = {
  1: "Manual_POP_Tema_01_Windows_e_Desempenho.pdf",
  2: "Manual_POP_Tema_02_Limpeza_e_Conservacao_Fisica.pdf",
  3: "Manual_POP_Tema_03_Seguranca_Digital.pdf",
  4: "Manual_POP_Tema_04_Produtividade_e_Usabilidade.pdf",
  5: "Manual_POP_Tema_05_Suporte_e_Resolucao_de_Problemas.pdf",
};

const RULE_MAP: Record<NumericThemeId, string> = {
  1: "Antes de abrir um chamado por lentidão, verifique o espaço livre no SSD e execute uma reinicialização completa pelo menu Iniciar. No Windows moderno, desligar apenas hiberna o sistema; somente Reiniciar limpa a memória por completo.",
  2: "Nunca borrife nenhum líquido diretamente sobre o notebook e jamais utilize álcool comum (líquido ou em gel), limpa-vidros ou papel toalha na tela — esses produtos removem o revestimento antirreflexo e riscam o display.",
  3: "Nunca compartilhe sua senha com ninguém — nem mesmo com a equipe de TI — e nunca deixe o notebook desbloqueado (Win + L) ao se ausentar da mesa. Em suspeita de vírus, desconecte a internet na hora.",
  4: "Dominar atalhos nativos (Win + Shift + S para captura e Win + Seta para dividir janelas) e manter o OneDrive sincronizado com Arquivos Sob Demanda economiza tempo e protege seus documentos.",
  5: "Sempre que precisar abrir um chamado de TI, anexe um print da tela inteira com a mensagem de erro (Win + Shift + S) e informe a etiqueta de patrimônio do notebook para agilizar o suporte.",
};

export const MANUAL_THEME_ORDER: ThemeId[] = [1, 2, 3, 4, 5, "all"];

export function getManualMetadata(themeId: ThemeId): ManualMetadata {
  if (themeId === "all") {
    return {
      id: "all",
      kicker: "MANUAL GERAL CONSOLIDADO • TODOS OS TEMAS",
      dept: "TI • MANUAL GERAL DE PROCEDIMENTOS",
      title: "Manual Geral Consolidado de POPs",
      lead: "Coletânea completa com todos os 38 Procedimentos Operacionais Padrão de TI da ECOVIS®, organizados nos 5 temas essenciais para uso diário.",
      rangeLabel: "POP-001 a POP-038 (38 POPs)",
      fileName: "Manual_POP_Geral_Completo_ECOVIS.pdf",
      rule: "Antes de abrir um chamado de TI, consulte o POP correspondente. Pequenas ações preventivas — como Reiniciar pelo menu Iniciar, manter 15% livre no SSD e bloquear a tela (Win + L) — evitam a maioria das falhas.",
      pops: POPS,
    };
  }

  const theme = THEMES.find((t) => t.id === themeId) ?? THEMES[1];
  const themePops = POPS.filter((p) => p.themeId === themeId);
  const codes = themePops.map((p) => p.code);
  const rangeLabel =
    codes.length > 0
      ? `${codes[0]} a ${codes[codes.length - 1]} (${themePops.length} POPs)`
      : "0 POPs";

  return {
    id: themeId,
    kicker: `MANUAL DE USO • TEMA ${theme.num}`,
    dept: `TI • ${theme.name.toUpperCase()}`,
    title: theme.name,
    lead: theme.desc,
    rangeLabel,
    fileName: FILE_MAP[themeId] ?? `Manual_POP_Tema_${theme.num}.pdf`,
    rule: RULE_MAP[themeId],
    pops: themePops,
  };
}
