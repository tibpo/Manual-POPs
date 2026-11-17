"use client";

import React from "react";
import { MANUAL_THEME_ORDER, getManualMetadata } from "@/data/manuals";
import type { ThemeId } from "@/types/pop";

interface ManualsViewProps {
  onOpenThemeReader: (themeId: ThemeId) => void;
  onPdfAction: (themeId: ThemeId, action: "view" | "download") => void;
}

export function ManualsView({
  onOpenThemeReader,
  onPdfAction,
}: ManualsViewProps) {
  return (
    <section id="manualsView" className="fade-in">
      <div className="bg-white border border-stone-200 border-l-4 border-l-crimson rounded-r-xl p-4 sm:p-5 mb-6 shadow-sm">
        <div className="text-xs font-extrabold uppercase tracking-wider text-crimson mb-1">
          Biblioteca Documental Oficial • ECOVIS® TI
        </div>
        <h2 className="text-lg sm:text-xl font-extrabold text-stoneink">
          Manuais Completos por Tema &amp; PDFs
        </h2>
        <p className="text-xs sm:text-sm text-stone-600 mt-1">
          Leia o manual completo de cada tema diretamente na tela, abra o
          documento diagramado em PDF para leitura ou baixe o arquivo PDF pronto
          para salvar e compartilhar.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {MANUAL_THEME_ORDER.map((id) => {
          const meta = getManualMetadata(id);
          const isAll = id === "all";

          return (
            <div
              key={String(id)}
              className={`bg-white border ${
                isAll ? "border-2 border-crimson" : "border-stone-200"
              } rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col justify-between`}
            >
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <span
                    className={`text-xs font-extrabold uppercase tracking-wider ${
                      isAll
                        ? "bg-crimson text-white px-2.5 py-0.5 rounded"
                        : "text-crimson"
                    }`}
                  >
                    {meta.kicker}
                  </span>
                  <span className="text-xs font-bold bg-stone-100 text-stone-700 border border-stone-200 px-2.5 py-0.5 rounded-full">
                    {meta.rangeLabel}
                  </span>
                </div>

                <h3 className="text-lg sm:text-xl font-extrabold text-stoneink mt-1">
                  {meta.title}
                </h3>
                <p className="text-xs sm:text-sm text-stone-600 mt-2 leading-relaxed">
                  {meta.lead}
                </p>

                <div className="mt-3 pt-3 border-t border-stone-100 text-xs text-stone-500">
                  <span className="font-bold text-stone-700">Inclui:</span>{" "}
                  {meta.pops.map((p) => p.code).join(", ")}
                </div>
              </div>

              <div className="mt-5 pt-4 border-t border-stone-200 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <button
                  type="button"
                  onClick={() => onOpenThemeReader(id)}
                  className="flex-1 bg-stone-100 hover:bg-stone-200 text-stoneink border border-stone-300 text-xs font-bold px-3 py-2.5 rounded-lg transition text-center"
                >
                  📖 Ler Completo
                </button>
                <button
                  type="button"
                  onClick={() => onPdfAction(id, "view")}
                  className="flex-1 bg-crimson-light hover:bg-rose-100 text-crimson border border-crimson-border text-xs font-bold px-3 py-2.5 rounded-lg transition text-center"
                >
                  👁 Abrir PDF
                </button>
                <button
                  type="button"
                  onClick={() => onPdfAction(id, "download")}
                  className="flex-1 bg-crimson hover:bg-crimson-dark text-white text-xs font-extrabold px-3 py-2.5 rounded-lg shadow-sm transition text-center"
                >
                  ⬇ Baixar PDF
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
