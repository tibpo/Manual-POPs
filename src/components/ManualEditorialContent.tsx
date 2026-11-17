"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { EcovisLogo } from "@/components/EcovisLogo";
import { PopMockup } from "@/components/PopMockups";
import { RichText } from "@/components/RichText";
import { getManualMetadata } from "@/data/manuals";
import { THEMES } from "@/data/themes";
import type { ThemeId } from "@/types/pop";

interface ManualEditorialContentProps {
  themeId: ThemeId;
  scopePrefix: "reader" | "pdfmodal";
  onOpenPop: (code: string) => void;
}

export function ManualEditorialContent({
  themeId,
  scopePrefix,
  onOpenPop,
}: ManualEditorialContentProps) {
  const meta = getManualMetadata(themeId);
  const indexAnchorId = `${scopePrefix}-indice-guia`;
  const [highlightedPop, setHighlightedPop] = useState<string | null>(null);
  const highlightTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  useEffect(() => {
    setHighlightedPop(null);
    return () => {
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, [themeId, scopePrefix]);

  const scrollToManualPop = useCallback(
    (popCode: string) => {
      const target = document.getElementById(`${scopePrefix}-pop-${popCode}`);
      if (!target) return;
      target.scrollIntoView({ behavior: "smooth", block: "start" });
      setHighlightedPop(popCode);
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
      highlightTimeoutRef.current = setTimeout(() => {
        setHighlightedPop(null);
      }, 2400);
    },
    [scopePrefix]
  );

  const scrollBackToManualIndex = useCallback(() => {
    const indexEl = document.getElementById(indexAnchorId);
    if (indexEl) {
      indexEl.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [indexAnchorId]);

  const isModal = scopePrefix === "pdfmodal";

  return (
    <>
      {/* Capa Dedicada Vermelha/Bordô ECOVIS® com escrita em branco */}
      <div
        className={`manual-cover-page bg-crimson text-white p-7 sm:p-9 ${
          isModal ? "rounded-none" : "rounded-2xl"
        }`}
      >
        <div>
          <div className="inline-flex items-center bg-white px-3.5 py-2 rounded-md mb-2.5">
            <EcovisLogo className="h-9 sm:h-10 w-auto" />
          </div>
          <div className="text-xs font-bold tracking-[0.12em] uppercase text-white/85 mb-8">
            {meta.dept}
          </div>

          <div className="text-xs font-extrabold tracking-[0.12em] uppercase text-white/85 mb-2.5">
            MANUAL DE USO • {meta.kicker.replace(/^MANUAL DE USO\s*•\s*/i, "")}
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold leading-tight text-white mb-4">
            {meta.title}
          </h1>
          <p className="text-sm sm:text-base leading-relaxed text-white/90 max-w-[92%]">
            {meta.lead}
          </p>
        </div>

        <div className="border-t border-white/30 pt-4 mt-8 grid grid-cols-1 sm:grid-cols-3 gap-3 text-[13px]">
          <div>
            <span className="block text-[10px] uppercase tracking-wider text-white/75 font-bold mb-0.5">
              Para quem
            </span>
            <strong className="text-white">Colaboradores e usuários</strong>
          </div>
          <div>
            <span className="block text-[10px] uppercase tracking-wider text-white/75 font-bold mb-0.5">
              Procedimentos
            </span>
            <strong className="text-white">{meta.rangeLabel}</strong>
          </div>
          <div>
            <span className="block text-[10px] uppercase tracking-wider text-white/75 font-bold mb-0.5">
              Sistema
            </span>
            <strong className="text-white">Windows 10 / 11</strong>
          </div>
        </div>
      </div>

      {/* Conteúdo Creme + Regra de Ouro + Índice Clicável + POPs */}
      <div
        className={`print-content-wrapper bg-cream p-5 sm:p-6 ${
          isModal
            ? "rounded-none border-0 mt-0"
            : "rounded-2xl border border-stone-200 mt-5"
        }`}
      >
        <div className="golden-rule-box bg-white border border-stone-200 border-l-4 border-l-crimson rounded-r-xl px-4 py-3.5 mb-5">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-crimson mb-1">
            ★ A Regra de Ouro
          </div>
          <p className="m-0 text-[13px] leading-relaxed text-stone-800">
            {meta.rule}
          </p>
        </div>

        <div
          id={indexAnchorId}
          className="scroll-mt-[88px] text-sm font-extrabold text-stoneink mb-3"
        >
          Neste guia{" "}
          <span className="font-medium text-stone-500 text-xs">
            (clique ou consulte pela sua necessidade)
          </span>
        </div>

        <div className="neste-guia-grid grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
          {meta.pops.map((p) => {
            const targetId = `${scopePrefix}-pop-${p.code}`;
            return (
              <a
                key={`${scopePrefix}-idx-${p.code}`}
                href={`#${targetId}`}
                onClick={(e) => {
                  e.preventDefault();
                  scrollToManualPop(p.code);
                }}
                className="neste-guia-card no-underline text-left bg-white hover:bg-rose-50/40 border border-stone-200 hover:border-crimson rounded-xl p-3.5 transition shadow-sm hover:shadow-md cursor-pointer group flex flex-col justify-between min-h-[126px]"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="bg-crimson-light group-hover:bg-crimson text-crimson group-hover:text-white border border-crimson-border group-hover:border-crimson text-[11px] font-extrabold px-2 py-0.5 rounded transition">
                      {p.code}
                    </span>
                    <span className="text-xs font-extrabold text-crimson opacity-75 group-hover:opacity-100 group-hover:translate-y-0.5 transition">
                      Ir ↓
                    </span>
                  </div>
                  <div className="text-xs sm:text-[13px] font-extrabold text-stoneink group-hover:text-crimson transition leading-snug">
                    {p.goal}
                  </div>
                </div>
                <div className="text-[11.5px] font-medium text-stone-500 group-hover:text-stone-700 mt-2.5 pt-2 border-t border-stone-100 leading-snug">
                  {p.title}
                </div>
              </a>
            );
          })}
        </div>

        {/* Lista Editorial Completa de Todos os POPs */}
        <div>
          {meta.pops.map((p) => {
            const tObj = THEMES.find((t) => t.id === p.themeId);
            const popAnchorId = `${scopePrefix}-pop-${p.code}`;
            const isHighlighted = highlightedPop === p.code;

            return (
              <div
                key={popAnchorId}
                id={popAnchorId}
                className={`manual-pop-card scroll-mt-[88px] bg-white border border-stone-200 rounded-xl px-5 py-4 mb-4 ${
                  isHighlighted ? "pop-target-highlight" : ""
                }`}
              >
                <div className="border-b border-stone-100 pb-2.5 mb-2.5">
                  <div className="flex flex-wrap justify-between items-center gap-1.5 mb-1">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-crimson">
                      {p.goal}
                    </span>
                    {tObj && (
                      <span className="text-[11px] font-semibold text-stone-500">
                        Tema {tObj.num} • {tObj.name}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="bg-crimson text-white text-[11.5px] font-extrabold px-2 py-0.5 rounded">
                        {p.code}
                      </span>
                      <h3 className="m-0 text-base font-extrabold text-stoneink">
                        {p.title}
                      </h3>
                    </div>
                    <a
                      href={`#${indexAnchorId}`}
                      onClick={(e) => {
                        e.preventDefault();
                        scrollBackToManualIndex();
                      }}
                      className="no-underline text-[11px] font-bold text-crimson bg-crimson-light border border-crimson-border rounded-md px-2.5 py-0.5 cursor-pointer inline-block hover:bg-rose-100 transition"
                    >
                      ↑ Voltar ao Guia Inicial
                    </a>
                  </div>
                </div>

                <div>
                  {p.steps.map((st, sIdx) => (
                    <div
                      key={`${popAnchorId}-step-${sIdx + 1}`}
                      className={`py-2.5 ${
                        sIdx < p.steps.length - 1
                          ? "border-b border-dashed border-stone-200"
                          : ""
                      }`}
                    >
                      <div className="mb-1 flex flex-wrap items-baseline gap-1.5">
                        <span className="step-badge-mobile inline-block bg-crimson-light text-crimson border border-crimson-border text-[10.5px] font-extrabold uppercase px-1.5 py-0.5 rounded">
                          Passo {sIdx + 1}
                        </span>
                        <strong className="text-[13.5px] text-stoneink">
                          {st.lead}
                        </strong>
                      </div>
                      <p className="m-0 text-[13px] leading-relaxed text-stone-700 break-words">
                        <RichText text={st.text} onOpenPop={onOpenPop} />
                      </p>
                    </div>
                  ))}
                </div>

                <div className="win-mockup">
                  <PopMockup code={p.code} />
                </div>
              </div>
            );
          })}
        </div>

        <div className="print-doc-footer mt-5 pt-3 border-t border-stone-200 flex justify-between text-[11px] text-stone-500">
          <span>ECOVIS® • {meta.title}</span>
          <span>{meta.rangeLabel}</span>
        </div>
      </div>
    </>
  );
}
