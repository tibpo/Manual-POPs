"use client";

import React, { useEffect, useRef } from "react";
import { ManualEditorialContent } from "@/components/ManualEditorialContent";
import { getManualMetadata } from "@/data/manuals";
import type { ThemeId } from "@/types/pop";

interface PdfViewerModalProps {
  isOpen: boolean;
  themeId: ThemeId;
  pdfBlobUrl: string | null;
  onPrintActive: () => void;
  onClose: () => void;
  onOpenPop: (code: string) => void;
}

export function PdfViewerModal({
  isOpen,
  themeId,
  pdfBlobUrl,
  onPrintActive,
  onClose,
  onOpenPop,
}: PdfViewerModalProps) {
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isOpen && scrollAreaRef.current) {
      scrollAreaRef.current.scrollTop = 0;
    }
  }, [isOpen, themeId]);

  if (!isOpen) {
    return null;
  }

  const meta = getManualMetadata(themeId);

  return (
    <div
      id="pdfViewerModal"
      className="fixed inset-0 z-50 bg-stone-900/85 backdrop-blur-sm flex flex-col"
    >
      <div className="bg-crimson text-white px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-3 shadow-md shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="bg-white/20 text-white text-xs font-extrabold px-2.5 py-1 rounded uppercase tracking-wider shrink-0">
            PDF A4
          </span>
          <span className="text-sm sm:text-base font-bold truncate">
            {meta.title}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onPrintActive}
            className="bg-white/15 hover:bg-white/25 text-white text-xs sm:text-sm font-bold px-3 py-1.5 rounded-lg border border-white/25 transition"
          >
            🖨 Imprimir / Salvar PDF
          </button>
          <a
            href={pdfBlobUrl ?? "#"}
            download={meta.fileName}
            className="bg-white text-crimson hover:bg-rose-50 text-xs sm:text-sm font-extrabold px-3.5 py-1.5 rounded-lg shadow-sm transition"
          >
            ⬇ Baixar Arquivo PDF
          </a>
          <button
            type="button"
            onClick={onClose}
            className="bg-crimson-dark hover:bg-stone-900 text-white text-xs sm:text-sm font-bold px-3 py-1.5 rounded-lg transition"
          >
            Fechar ✕
          </button>
        </div>
      </div>

      {/* Barra informativa do documento */}
      <div className="bg-stone-800 text-stone-300 text-xs px-4 sm:px-6 py-2 border-b border-stone-700 flex flex-wrap items-center justify-between gap-2 shrink-0">
        <span>
          Pré-visualização oficial diagramada em padrão A4 (ECOVIS® TI). Ao usar{" "}
          <strong>Imprimir / Salvar PDF</strong>, desmarque{" "}
          <em>Cabeçalhos e rodapés</em> se o navegador exibir a origem.
        </span>
        <span className="font-bold text-white">{meta.rangeLabel}</span>
      </div>

      {/* Área de leitura rolável com o documento A4 completo */}
      <div
        ref={scrollAreaRef}
        className="flex-1 overflow-y-auto bg-stone-700/90 p-3 sm:p-6"
      >
        <div
          id="pdfDocumentSheet"
          className="max-w-4xl mx-auto shadow-2xl rounded-xl overflow-hidden bg-cream"
        >
          <ManualEditorialContent
            themeId={themeId}
            scopePrefix="pdfmodal"
            onOpenPop={(code) => {
              onClose();
              onOpenPop(code);
            }}
          />
        </div>
      </div>
    </div>
  );
}
