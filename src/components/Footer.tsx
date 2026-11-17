import React from "react";
import { EcovisLogo } from "@/components/EcovisLogo";

export function Footer() {
  return (
    <footer className="border-t border-stone-200 bg-white mt-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-stone-500">
        <div className="flex items-center gap-2.5">
          <EcovisLogo className="h-5 w-auto" />
          <span className="font-semibold text-stone-700">
            • Departamento de Tecnologia da Informação (TI)
          </span>
        </div>
        <span>
          Manual Interativo de Procedimentos Operacionais Padrão (POP-001 a
          POP-038)
        </span>
      </div>
    </footer>
  );
}
