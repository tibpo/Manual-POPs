"use client";

import React from "react";
import { EcovisLogo } from "@/components/EcovisLogo";
import type { PortalMode } from "@/types/pop";

interface HeaderProps {
  mode: PortalMode;
  searchQuery: string;
  onResetHome: () => void;
  onSwitchMode: (mode: PortalMode) => void;
  onSearchChange: (value: string) => void;
  onClearSearch: () => void;
}

export function Header({
  mode,
  searchQuery,
  onResetHome,
  onSwitchMode,
  onSearchChange,
  onClearSearch,
}: HeaderProps) {
  const activeBtnClass =
    "flex-1 sm:flex-none px-3 py-1.5 rounded-md text-xs sm:text-sm font-bold transition bg-white text-crimson shadow-sm whitespace-nowrap";
  const inactiveBtnClass =
    "flex-1 sm:flex-none px-3 py-1.5 rounded-md text-xs sm:text-sm font-bold transition text-white/85 hover:text-white whitespace-nowrap";

  return (
    <header className="bg-crimson text-white shadow-md sticky top-0 z-30">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        {/* Marca e Título */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onResetHome}
            className="text-left group focus:outline-none"
          >
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center bg-white px-3 py-1.5 rounded-md shadow-sm">
                <EcovisLogo className="h-6 sm:h-7 w-auto" />
              </span>
              <span className="text-xs font-bold uppercase tracking-widest bg-white/15 px-2.5 py-1 rounded-full text-white">
                TI
              </span>
            </div>
            <p className="text-xs sm:text-sm text-white/85 font-medium mt-1.5 group-hover:text-white transition">
              Manual Interativo de Procedimentos Operacionais Padrão
            </p>
          </button>

          {/* Botão rápido mobile para Triagem */}
          <button
            type="button"
            onClick={() => onSwitchMode("triage")}
            className="md:hidden bg-white text-crimson font-bold text-xs px-3 py-2 rounded-lg shadow-sm active:scale-95 transition"
          >
            Triagem Guiada
          </button>
        </div>

        {/* Barra de Busca Rápida e Alternador de Modo */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="relative flex-1 sm:w-64 md:w-72">
            <input
              id="globalSearch"
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Buscar dúvida, sintoma ou POP..."
              className="w-full bg-white/15 text-white placeholder-white/70 text-sm rounded-lg pl-9 pr-8 py-2 border border-white/25 focus:outline-none focus:bg-white focus:text-stoneink focus:placeholder-stone-400 transition"
            />
            <svg
              className="w-4 h-4 text-white/75 absolute left-3 top-2.5 pointer-events-none"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M21 21l-4.35-4.35m1.85-5.15a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            {searchQuery.length > 0 && (
              <button
                type="button"
                onClick={onClearSearch}
                aria-label="Limpar busca"
                className="absolute right-2.5 top-2 text-stone-400 hover:text-stone-700 text-sm font-bold"
              >
                ✕
              </button>
            )}
          </div>

          <div className="flex bg-crimson-dark/80 p-1 rounded-lg border border-white/15">
            <button
              type="button"
              onClick={() => onSwitchMode("triage")}
              className={mode === "triage" ? activeBtnClass : inactiveBtnClass}
            >
              Triagem
            </button>
            <button
              type="button"
              onClick={() => onSwitchMode("catalog")}
              className={mode === "catalog" ? activeBtnClass : inactiveBtnClass}
            >
              38 POPs
            </button>
            <button
              type="button"
              onClick={() => onSwitchMode("manuals")}
              className={
                mode === "manuals" || mode === "reader"
                  ? activeBtnClass
                  : inactiveBtnClass
              }
            >
              Manuais (PDF)
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
