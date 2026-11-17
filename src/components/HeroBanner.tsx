import React from "react";

export function HeroBanner() {
  return (
    <section
      id="heroBanner"
      className="bg-crimson text-white border-b border-crimson-dark"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-7 sm:py-9">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-7">
            <span className="inline-block text-xs font-extrabold uppercase tracking-widest text-white/80 mb-2">
              Guia Interativo de Autoatendimento • Windows 10 / 11
            </span>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight leading-tight">
              Resolva problemas do seu notebook em poucos passos
            </h1>
            <p className="text-white/90 text-sm sm:text-base mt-3 leading-relaxed max-w-2xl">
              Responda à triagem rápida abaixo para encontrar exatamente qual
              procedimento seguir ou navegue diretamente pelos 38 POPs organizados
              pela sua necessidade.
            </p>
          </div>

          {/* A Regra de Ouro */}
          <div className="lg:col-span-5">
            <div className="bg-white/10 backdrop-blur-sm border border-white/25 rounded-xl p-4 sm:p-5">
              <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-rose-200 mb-1.5">
                <span>★</span> A Regra de Ouro
              </div>
              <p className="text-xs sm:text-sm text-white/95 leading-relaxed">
                Antes de abrir um chamado de TI, consulte o POP indicado para o
                seu caso. Pequenas ações — como <strong>Reiniciar</strong> pelo
                menu Iniciar (em vez de apenas Desligar), manter{" "}
                <strong>15% livre no SSD</strong> e bloquear a tela (
                <kbd>Win</kbd> + <kbd>L</kbd>) — evitam a maioria das falhas.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
