"use client";

import React, { useEffect, useRef, useState } from "react";
import { POPS } from "@/data/pops";
import { THEMES } from "@/data/themes";
import { PopMockup } from "@/components/PopMockups";
import { RichText } from "@/components/RichText";

interface PopDetailViewProps {
  popCode: string;
  onBack: () => void;
  onRestartTriage: () => void;
  onOpenPop: (code: string) => void;
}

export function PopDetailView({
  popCode,
  onBack,
  onRestartTriage,
  onOpenPop,
}: PopDetailViewProps) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setCopied(false);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [popCode]);

  const popIndex = POPS.findIndex((p) => p.code === popCode);
  const pop = popIndex >= 0 ? POPS[popIndex] : null;

  if (!pop) {
    return null;
  }

  const handleCopyLink = async () => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    url.search = `?pop=${encodeURIComponent(pop.code)}`;
    url.hash = "";
    try {
      await navigator.clipboard.writeText(url.toString());
      setCopied(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback caso o navegador restrinja clipboard sem HTTPS
      window.prompt("Copie o link direto deste POP:", url.toString());
    }
  };

  const theme = THEMES.find((t) => t.id === pop.themeId);
  const prevPop = popIndex > 0 ? POPS[popIndex - 1] : null;
  const nextPop = popIndex < POPS.length - 1 ? POPS[popIndex + 1] : null;

  return (
    <section className="fade-in">
      {/* Barra superior de navegação do POP */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex items-center gap-1.5 bg-white hover:bg-stone-100 text-stoneink border border-stone-300 text-xs sm:text-sm font-bold px-3.5 py-2 rounded-lg shadow-sm transition"
          >
            ← Voltar
          </button>
          <button
            type="button"
            onClick={onRestartTriage}
            className="inline-flex items-center gap-1.5 bg-crimson-light hover:bg-rose-100 text-crimson border border-crimson-border text-xs sm:text-sm font-bold px-3.5 py-2 rounded-lg transition"
          >
            Refazer Triagem
          </button>
          <button
            type="button"
            onClick={handleCopyLink}
            className="inline-flex items-center gap-1.5 bg-white hover:bg-stone-100 text-stone-700 border border-stone-300 text-xs sm:text-sm font-bold px-3.5 py-2 rounded-lg shadow-sm transition"
          >
            {copied ? "✓ Link copiado" : "Copiar link do POP"}
          </button>
        </div>

        {theme && (
          <span className="text-xs font-extrabold uppercase tracking-wider text-stone-500">
            Tema {theme.num} • {theme.name}
          </span>
        )}
      </div>

      {/* Cartão Principal do POP */}
      <article
        id="detailCard"
        className="bg-white border border-stone-200 rounded-2xl shadow-sm overflow-hidden"
      >
        <div className="detail-header-mobile bg-stone-50 border-b border-stone-200 px-5 sm:px-8 py-6">
          <div className="text-xs sm:text-sm font-extrabold uppercase tracking-wider text-crimson mb-2">
            {pop.goal}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="bg-crimson text-white text-sm font-extrabold px-3 py-1 rounded-md shadow-sm">
              {pop.code}
            </span>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold text-stoneink tracking-tight">
              {pop.title}
            </h1>
          </div>
        </div>

        <div className="detail-body-mobile p-5 sm:p-8">
          <div className="divide-y divide-dashed divide-stone-200">
            {pop.steps.map((step, i) => {
              const padClass =
                pop.steps.length === 1
                  ? ""
                  : i === 0
                  ? "pb-5"
                  : i === pop.steps.length - 1
                  ? "pt-5"
                  : "py-5";

              return (
                <div key={`${pop.code}-step-${i + 1}`} className={padClass}>
                  <div className="step-header-mobile flex items-baseline gap-2.5 mb-1.5">
                    <span className="step-badge-mobile shrink-0 whitespace-nowrap text-xs font-extrabold uppercase tracking-wider text-crimson bg-crimson-light border border-crimson-border px-2 py-0.5 rounded">
                      Passo {i + 1}
                    </span>
                    <h2 className="text-base sm:text-lg font-extrabold text-stoneink leading-snug">
                      {step.lead}
                    </h2>
                  </div>
                  <p className="text-sm sm:text-base text-stone-700 leading-relaxed break-words">
                    <RichText text={step.text} onOpenPop={onOpenPop} />
                  </p>
                </div>
              );
            })}
          </div>

          <PopMockup code={pop.code} />
        </div>
      </article>

      {/* Navegação Anterior / Próximo POP */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          {prevPop && (
            <button
              type="button"
              onClick={() => onOpenPop(prevPop.code)}
              className="w-full text-left bg-white hover:bg-stone-50 border border-stone-200 hover:border-crimson rounded-xl p-4 transition shadow-sm"
            >
              <div className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
                ← Procedimento anterior
              </div>
              <div className="text-xs font-extrabold text-crimson mt-1">
                {prevPop.goal}
              </div>
              <div className="text-sm font-bold text-stoneink mt-0.5">
                {prevPop.code} — {prevPop.title}
              </div>
            </button>
          )}
        </div>
        <div>
          {nextPop && (
            <button
              type="button"
              onClick={() => onOpenPop(nextPop.code)}
              className="w-full text-right bg-white hover:bg-stone-50 border border-stone-200 hover:border-crimson rounded-xl p-4 transition shadow-sm"
            >
              <div className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
                Próximo procedimento →
              </div>
              <div className="text-xs font-extrabold text-crimson mt-1">
                {nextPop.goal}
              </div>
              <div className="text-sm font-bold text-stoneink mt-0.5">
                {nextPop.code} — {nextPop.title}
              </div>
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
