"use client";

import React from "react";
import { POPS } from "@/data/pops";
import { THEMES } from "@/data/themes";
import { TRIAGE_NODES } from "@/data/triage";
import type {
  PopItem,
  TriageActionLink,
  TriageHistoryEntry,
  TriageOption,
} from "@/types/pop";

interface TriageViewProps {
  history: TriageHistoryEntry[];
  onSelectOption: (option: TriageOption, optionIndex: number) => void;
  onGoBack: () => void;
  onRestart: () => void;
  onOpenPop: (code: string) => void;
  onOpenCatalog: () => void;
}

export function TriageView({
  history,
  onSelectOption,
  onGoBack,
  onRestart,
  onOpenPop,
  onOpenCatalog,
}: TriageViewProps) {
  const currentEntry = history[history.length - 1];
  const stepNumber = history.length;

  return (
    <section id="triageView" className="fade-in">
      <div className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden">
        {/* Cabeçalho do Assistente */}
        <div className="bg-stone-100/80 border-b border-stone-200 px-5 sm:px-7 py-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-wider text-crimson">
              Assistente de Diagnóstico TI
            </span>
            <h2 className="text-lg sm:text-xl font-extrabold text-stoneink mt-0.5">
              Triagem Inteligente
            </h2>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold bg-crimson-light text-crimson border border-crimson-border px-3 py-1 rounded-full">
              {currentEntry.type === "result"
                ? "Diagnóstico Concluído"
                : `Etapa ${stepNumber} de 2`}
            </span>

            {stepNumber > 1 && (
              <>
                <button
                  type="button"
                  onClick={onGoBack}
                  className="text-xs font-bold text-stone-600 hover:text-stoneink bg-white border border-stone-300 px-3 py-1.5 rounded-lg transition"
                >
                  ← Voltar
                </button>
                <button
                  type="button"
                  onClick={onRestart}
                  className="text-xs font-bold text-crimson hover:bg-crimson-light border border-crimson-border px-3 py-1.5 rounded-lg transition"
                >
                  Recomeçar
                </button>
              </>
            )}
          </div>
        </div>

        {/* Corpo Dinâmico da Pergunta ou Resultado */}
        <div className="p-5 sm:p-8">
          {currentEntry.type === "result" ? (
            <TriageResult
              summary={currentEntry.data.summary}
              popCodes={currentEntry.data.pops}
              actionLink={currentEntry.data.actionLink}
              onOpenPop={onOpenPop}
            />
          ) : (
            <TriageQuestion
              node={TRIAGE_NODES[currentEntry.key]}
              onSelectOption={onSelectOption}
            />
          )}
        </div>
      </div>

      {/* Atalho discreto para ver catálogo completo */}
      <div className="mt-6 text-center">
        <p className="text-xs sm:text-sm text-stone-500">
          Já sabe qual procedimento procura?
          <button
            type="button"
            onClick={onOpenCatalog}
            className="font-bold text-crimson hover:underline ml-1"
          >
            Explorar o catálogo completo dos 38 POPs →
          </button>
        </p>
      </div>
    </section>
  );
}

function TriageResult({
  summary,
  popCodes,
  actionLink,
  onOpenPop,
}: {
  summary: string;
  popCodes: string[];
  actionLink?: TriageActionLink;
  onOpenPop: (code: string) => void;
}) {
  const recommendedPops = popCodes
    .map((code) => POPS.find((p) => p.code === code))
    .filter((p): p is PopItem => Boolean(p));

  return (
    <div className="fade-in">
      <div className="bg-crimson-light border border-crimson-border rounded-xl p-4 sm:p-5 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-extrabold uppercase tracking-wider text-crimson mb-1">
            Procedimento(s) Recomendado(s) para o seu caso
          </div>
          <p className="text-sm sm:text-base text-stoneink font-medium">
            {summary}
          </p>
        </div>

        {actionLink && (
          <a
            href={actionLink.url}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 inline-flex items-center justify-center gap-1.5 bg-crimson hover:bg-crimson-dark text-white text-xs sm:text-sm font-bold px-4 py-2.5 rounded-lg shadow-sm transition"
          >
            {actionLink.label} ↗
          </a>
        )}
      </div>

      <div className="space-y-3">
        {recommendedPops.map((pop, idx) => {
          const theme = THEMES.find((t) => t.id === pop.themeId);
          return (
            <button
              key={pop.code}
              type="button"
              onClick={() => onOpenPop(pop.code)}
              className={`w-full text-left bg-white hover:bg-rose-50/40 border-2 ${
                idx === 0
                  ? "border-crimson"
                  : "border-stone-200 hover:border-crimson"
              } rounded-xl p-4 sm:p-5 transition shadow-sm group flex flex-col sm:flex-row sm:items-center justify-between gap-4`}
            >
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  {idx === 0 && (
                    <span className="bg-crimson text-white text-[11px] font-extrabold uppercase tracking-wider px-2.5 py-0.5 rounded">
                      Mais indicado
                    </span>
                  )}
                  <span className="text-xs font-extrabold uppercase tracking-wide text-crimson">
                    {pop.goal}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="bg-crimson-light text-crimson border border-crimson-border text-xs font-extrabold px-2.5 py-0.5 rounded">
                    {pop.code}
                  </span>
                  <span className="text-base sm:text-lg font-extrabold text-stoneink group-hover:text-crimson transition">
                    {pop.title}
                  </span>
                </div>
                {theme && (
                  <div className="text-xs text-stone-500 mt-1.5 font-medium">
                    Tema {theme.num} • {theme.name}
                  </div>
                )}
              </div>
              <div className="shrink-0">
                <span className="inline-flex items-center gap-1.5 bg-crimson text-white text-xs sm:text-sm font-bold px-4 py-2.5 rounded-lg group-hover:bg-crimson-dark transition">
                  Abrir Passo a Passo →
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TriageQuestion({
  node,
  onSelectOption,
}: {
  node: (typeof TRIAGE_NODES)[keyof typeof TRIAGE_NODES];
  onSelectOption: (option: TriageOption, optionIndex: number) => void;
}) {
  return (
    <div className="fade-in">
      <h3 className="text-xl sm:text-2xl font-extrabold text-stoneink leading-snug">
        {node.question}
      </h3>
      <p className="text-sm text-stone-500 mt-1.5 mb-6">{node.subtitle}</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {node.options.map((opt, index) => {
          const cardClassName =
            "text-left bg-cream/60 hover:bg-white border border-stone-200 hover:border-crimson rounded-xl p-4 sm:p-5 transition shadow-sm hover:shadow group flex flex-col justify-between cursor-pointer";

          const cardContent = (
            <>
              <div>
                <div className="flex items-start justify-between gap-2">
                  <span className="text-base font-extrabold text-stoneink group-hover:text-crimson transition leading-snug">
                    {opt.label}
                  </span>
                  <span className="text-crimson font-extrabold text-lg leading-none opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition">
                    →
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-stone-600 mt-2 leading-relaxed">
                  {opt.desc}
                </p>
              </div>
              {opt.actionLink && (
                <div className="mt-3 pt-2.5 border-t border-stone-200/80">
                  <a
                    href={opt.actionLink.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-crimson hover:text-crimson-dark underline"
                  >
                    {opt.actionLink.label} ↗
                  </a>
                </div>
              )}
            </>
          );

          if (opt.actionLink) {
            return (
              <div
                key={opt.label}
                role="button"
                tabIndex={0}
                onClick={() => onSelectOption(opt, index)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelectOption(opt, index);
                  }
                }}
                className={cardClassName}
              >
                {cardContent}
              </div>
            );
          }

          return (
            <button
              key={opt.label}
              type="button"
              onClick={() => onSelectOption(opt, index)}
              className={cardClassName}
            >
              {cardContent}
            </button>
          );
        })}
      </div>
    </div>
  );
}
