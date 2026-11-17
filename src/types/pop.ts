export type ThemeId = "all" | 1 | 2 | 3 | 4 | 5;

export type NumericThemeId = Exclude<ThemeId, "all">;

export interface Theme {
  id: ThemeId;
  num: string;
  name: string;
  desc: string;
}

export interface PopStep {
  lead: string;
  text: string;
}

export interface PopItem {
  code: string;
  themeId: NumericThemeId;
  goal: string;
  title: string;
  keywords: string;
  steps: PopStep[];
}

export type TriageNodeKey =
  | "start"
  | "slow_branch"
  | "hardware_conn_branch"
  | "security_branch"
  | "productivity_care_branch";

export interface TriageActionLink {
  label: string;
  url: string;
}

export interface TriageOption {
  label: string;
  desc: string;
  next?: TriageNodeKey;
  pops?: string[];
  summary?: string;
  actionLink?: TriageActionLink;
}

export interface TriageQuestionNode {
  question: string;
  subtitle: string;
  options: TriageOption[];
}

export interface TriageResultNode {
  pops: string[];
  summary: string;
  actionLink?: TriageActionLink;
}

export type TriageHistoryEntry =
  | { type: "node"; key: TriageNodeKey }
  | { type: "result"; key: string; data: TriageResultNode };

export type PortalMode =
  | "triage"
  | "catalog"
  | "detail"
  | "manuals"
  | "reader";

export interface ManualMetadata {
  id: ThemeId;
  kicker: string;
  dept: string;
  title: string;
  lead: string;
  rangeLabel: string;
  fileName: string;
  rule: string;
  pops: PopItem[];
}
