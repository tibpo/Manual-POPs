"use client";

import React from "react";
import { ManualEditorialContent } from "@/components/ManualEditorialContent";
import type { ThemeId } from "@/types/pop";

interface ThemeReaderViewProps {
  themeId: ThemeId;
  onBackToManuals: () => void;
  onPrint: () => void;
  onPdfAction: (themeId: ThemeId, action: "view" | "download") => void;
  onOpenPop: (code: string) => void;
}

export function ThemeReaderView({
  themeId,
  onBackToManuals,
  onPrint,
  onPdfAction,
  onOpenPop,
}: ThemeReaderViewProps) {
  return (
    <section id="themeReaderView" className="fade-in">
      <div
        id="themeReaderToolbar"
        className="flex flex-wrap items-center justify-between gap-3 mb-5 bg-white border border-stone-200 rounded-xl p-3.5 shadow-sm"
      >
        <button
          type="button"
          onClick={onBackToManuals}
          className="inline-flex items-center gap-1.5 bg-stone-100 hover:bg-stone-200 text-stoneink text-xs sm:text-sm font-bold px-3.5 py-2 rounded-lg transition"
        >
          ← Voltar aos Manuais
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onPrint}
            className="bg-stone-100 hover:bg-stone-200 text-stoneink border border-stone-300 text-xs sm:text-sm font-bold px-3.5 py-2 rounded-lg transition"
          >
            🖨 Imprimir A4
          </button>
          <button
            type="button"
            onClick={() => onPdfAction(themeId, "view")}
            className="bg-crimson-light hover:bg-rose-100 text-crimson border border-crimson-border text-xs sm:text-sm font-bold px-3.5 py-2 rounded-lg transition"
          >
            👁 Abrir PDF para Leitura
          </button>
          <button
            type="button"
            onClick={() => onPdfAction(themeId, "download")}
            className="bg-crimson hover:bg-crimson-dark text-white text-xs sm:text-sm font-extrabold px-4 py-2 rounded-lg shadow-sm transition"
          >
            ⬇ Baixar PDF Completo
          </button>
        </div>
      </div>

      <div id="themeReaderContainer" className="space-y-6">
        <ManualEditorialContent
          themeId={themeId}
          scopePrefix="reader"
          onOpenPop={onOpenPop}
        />
      </div>
    </section>
  );
}
