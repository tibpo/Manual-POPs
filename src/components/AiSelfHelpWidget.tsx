"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  TI_TICKET_URL,
  buildTicketSummary,
  generateAssistantReply,
  getPlaybookById,
  type ChatMessage,
  type CommandSnippet,
} from "@/lib/aiAssistantEngine";

interface AiSelfHelpWidgetProps {
  currentPopCode: string | null;
  hidden?: boolean;
  onOpenPop: (code: string) => void;
}

const QUICK_SUGGESTIONS = [
  "Resetar IP e DNS no CMD (sem internet)",
  "Destravar OneDrive (reset avançado)",
  "Limpeza profunda (%temp% e cache)",
  "Certificado Digital (A1/A3) não aparece",
  "Pastas de rede / ERP / VPN",
  "Descobrir nome da máquina (Hostname)",
];

function createWelcomeMessage(): ChatMessage {
  return {
    id: "welcome-msg",
    role: "assistant",
    content:
      "Olá! Sou a IA Especialista de Suporte da TI ECOVIS BPO.\n\nAlém de consultar os 38 POPs e preparar seu chamado, também guio você em soluções técnicas mais profundas (como comandos seguros no CMD, reset de IP/DNS, redefinição do OneDrive e limpeza de cache) explicadas passo a passo de forma bem simples!",
    suggestTicket: false,
    askResolutionFeedback: false,
    timestamp: Date.now(),
  };
}

export function AiSelfHelpWidget({
  currentPopCode,
  hidden = false,
  onOpenPop,
}: AiSelfHelpWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    createWelcomeMessage(),
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [summaryCopied, setSummaryCopied] = useState(false);
  const [copiedCmdKey, setCopiedCmdKey] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cmdCopyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping, isOpen]);

  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => inputRef.current?.focus(), 120);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      if (cmdCopyTimerRef.current) clearTimeout(cmdCopyTimerRef.current);
    };
  }, []);

  const sendMessage = useCallback(
    async (rawText: string) => {
      const trimmed = rawText.trim();
      if (!trimmed || isTyping) return;

      const userMsg: ChatMessage = {
        id: `user-${Date.now()}`,
        role: "user",
        content: trimmed,
        timestamp: Date.now(),
      };

      const updatedHistory = [...messages, userMsg];
      setMessages(updatedHistory);
      setInputValue("");
      setIsTyping(true);

      try {
        await new Promise((resolve) => setTimeout(resolve, 340));
        const reply = await generateAssistantReply({
          userText: trimmed,
          history: updatedHistory,
          currentPopCode,
        });

        setMessages((prev) => [
          ...prev,
          {
            ...reply,
            id: `assistant-${Date.now()}`,
            timestamp: Date.now(),
          },
        ]);
      } finally {
        setIsTyping(false);
      }
    },
    [currentPopCode, isTyping, messages]
  );

  const triggerAdvancedPlaybook = useCallback(
    async (playbookId: string) => {
      if (isTyping) return;
      const playbookReply = getPlaybookById(playbookId);
      if (!playbookReply) return;

      const userMsg: ChatMessage = {
        id: `user-adv-${Date.now()}`,
        role: "user",
        content: "Quero tentar o diagnóstico avançado passo a passo (CMD / Executar)",
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setIsTyping(true);

      await new Promise((resolve) => setTimeout(resolve, 320));
      setMessages((prev) => [
        ...prev,
        {
          ...playbookReply,
          id: `assistant-adv-${Date.now()}`,
          timestamp: Date.now(),
        },
      ]);
      setIsTyping(false);
    },
    [isTyping]
  );

  const handleCopyCommand = async (cmd: string, key: string) => {
    try {
      await navigator.clipboard.writeText(cmd);
      setCopiedCmdKey(key);
      if (cmdCopyTimerRef.current) clearTimeout(cmdCopyTimerRef.current);
      cmdCopyTimerRef.current = setTimeout(() => setCopiedCmdKey(null), 2200);
    } catch {
      window.prompt("Copie o comando abaixo:", cmd);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void sendMessage(inputValue);
  };

  const handleResetChat = () => {
    setMessages([createWelcomeMessage()]);
    setInputValue("");
    setSummaryCopied(false);
    setCopiedCmdKey(null);
  };

  const handleCopyTicketSummary = async () => {
    const summaryText = buildTicketSummary(messages, currentPopCode);
    try {
      await navigator.clipboard.writeText(summaryText);
      setSummaryCopied(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setSummaryCopied(false), 2500);
    } catch {
      window.prompt(
        "Copie o resumo abaixo para colar na abertura do chamado:",
        summaryText
      );
    }
  };

  if (hidden) {
    return null;
  }

  return (
    <div
      id="aiSelfHelpWidget"
      className="no-print fixed bottom-8 right-5 sm:bottom-12 sm:right-12 lg:bottom-14 lg:right-20 xl:right-28 z-40 flex flex-col items-end"
    >
      {/* Painel do Chat / Menu de Autoajuda IA */}
      {isOpen && (
        <div className="fade-in mb-3.5 w-[calc(100vw-2.5rem)] sm:w-[440px] max-h-[min(600px,calc(100vh-9.5rem))] bg-white border border-stone-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
          {/* Cabeçalho do Assistente */}
          <div className="bg-crimson text-white px-4 py-3.5 flex items-center justify-between gap-2 shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-white/15 border border-white/25 flex items-center justify-center shrink-0">
                <svg
                  className="w-4 h-4 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5"
                  />
                </svg>
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-sm font-extrabold tracking-tight truncate">
                    Autoajuda IA • Nível 1 e 2
                  </h3>
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                </div>
                <p className="text-[11px] text-white/80 truncate">
                  POPs, comandos guiados (CMD) e chamado TI
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={handleResetChat}
                title="Reiniciar conversa"
                className="text-[11px] font-bold bg-white/15 hover:bg-white/25 text-white px-2.5 py-1 rounded-md transition"
              >
                Limpar
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                aria-label="Fechar assistente"
                className="text-white/85 hover:text-white hover:bg-white/15 w-7 h-7 rounded-md flex items-center justify-center font-bold transition"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Barra Fixa de Ação Rápida: Abrir Chamado TI + Copiar Resumo */}
          <div className="bg-crimson-light/80 border-b border-crimson-border px-3.5 py-2 flex flex-wrap items-center justify-between gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCopyTicketSummary}
              className="text-[11px] font-bold text-crimson hover:text-crimson-dark bg-white border border-crimson-border px-2.5 py-1 rounded-md shadow-sm transition"
            >
              {summaryCopied
                ? "✓ Resumo copiado!"
                : "📋 Copiar resumo p/ chamado"}
            </button>
            <a
              href={TI_TICKET_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 bg-crimson hover:bg-crimson-dark text-white text-[11px] font-extrabold px-3 py-1 rounded-md shadow-sm transition"
            >
              Abrir Chamado TI ↗
            </a>
          </div>

          {/* Área de Mensagens */}
          <div className="flex-1 overflow-y-auto p-3.5 space-y-3 bg-cream/70 min-h-[250px]">
            {messages.map((msg) => {
              const isUser = msg.role === "user";
              const hasCmd = msg.commands?.some((c) => c.whereToRun === "cmd");
              const hasRun = msg.commands?.some((c) => c.whereToRun === "run");

              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    isUser ? "items-end" : "items-start"
                  }`}
                >
                  <div
                    className={`max-w-[94%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-[13px] leading-relaxed shadow-sm ${
                      isUser
                        ? "bg-crimson text-white rounded-br-sm"
                        : "bg-white text-stoneink border border-stone-200 rounded-bl-sm"
                    }`}
                  >
                    <p className="whitespace-pre-line break-words">
                      {msg.content}
                    </p>

                    {/* Bloco Interativo de Comandos Guiados (CMD / Win + R) */}
                    {msg.commands && msg.commands.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-stone-200 space-y-2.5">
                        {/* Explicação rápida para leigos de como abrir CMD ou Win + R */}
                        <div className="bg-amber-50/80 border border-amber-200 rounded-lg px-2.5 py-2 text-[11px] text-stone-700 leading-snug space-y-1">
                          {hasCmd && (
                            <div>
                              <strong className="text-stone-900">
                                Como usar no CMD:
                              </strong>{" "}
                              aperte <kbd>Win</kbd> + <kbd>R</kbd>, digite{" "}
                              <code className="inline-code">cmd</code> e dê{" "}
                              <strong>Enter</strong>. Na janela preta, clique
                              com o <strong>botão direito do mouse</strong> para
                              colar o comando copiado e aperte{" "}
                              <strong>Enter</strong>.
                            </div>
                          )}
                          {hasRun && (
                            <div>
                              <strong className="text-stone-900">
                                Como usar no Executar:
                              </strong>{" "}
                              aperte <kbd>Win</kbd> + <kbd>R</kbd> no teclado,
                              cole o comando (<kbd>Ctrl</kbd> + <kbd>V</kbd>) e
                              aperte <strong>Enter</strong>.
                            </div>
                          )}
                        </div>

                        {msg.commands.map((snippet: CommandSnippet, cIdx: number) => {
                          const cmdKey = `${msg.id}-cmd-${cIdx}`;
                          const isCopied = copiedCmdKey === cmdKey;
                          return (
                            <div
                              key={cmdKey}
                              className="rounded-xl border border-stone-200 overflow-hidden bg-stone-50"
                            >
                              <div className="px-2.5 py-1.5 bg-stone-100 border-b border-stone-200 flex items-center justify-between gap-2">
                                <span className="text-[11px] font-extrabold text-stone-800">
                                  {snippet.label}
                                </span>
                                <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-stone-200 text-stone-700">
                                  {snippet.whereToRun === "cmd"
                                    ? "Prompt (CMD)"
                                    : "Win + R"}
                                </span>
                              </div>

                              <div className="bg-stone-900 text-emerald-300 px-3 py-2 flex items-center justify-between gap-2">
                                <code className="font-mono text-[11.5px] break-all select-all">
                                  {snippet.command}
                                </code>
                                <button
                                  type="button"
                                  onClick={() =>
                                    void handleCopyCommand(
                                      snippet.command,
                                      cmdKey
                                    )
                                  }
                                  className="shrink-0 bg-white/15 hover:bg-white/25 text-white text-[10.5px] font-bold px-2.5 py-1 rounded transition"
                                >
                                  {isCopied ? "✓ Copiado" : "Copiar"}
                                </button>
                              </div>

                              <div className="px-2.5 py-1.5 text-[11.5px] text-stone-600 leading-snug">
                                {snippet.explanation}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Lista de passos práticos complementares */}
                    {msg.steps && msg.steps.length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-stone-100 space-y-1.5">
                        {msg.steps.map((st, idx) => (
                          <div
                            key={`${msg.id}-st-${idx}`}
                            className="flex items-start gap-1.5 text-xs text-stone-700"
                          >
                            <span className="shrink-0 bg-crimson-light text-crimson border border-crimson-border font-extrabold text-[10px] px-1.5 py-0.5 rounded mt-0.5">
                              {idx + 1}
                            </span>
                            <span>{st}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Botão para subir do POP básico direto ao Diagnóstico Avançado (CMD / Executar) */}
                    {msg.advancedPlaybookId && (
                      <div className="mt-2.5 pt-2 border-t border-stone-100">
                        <button
                          type="button"
                          onClick={() =>
                            void triggerAdvancedPlaybook(
                              msg.advancedPlaybookId!
                            )
                          }
                          className="w-full text-left bg-stone-900 hover:bg-stone-800 text-white rounded-lg px-3 py-2 text-xs font-bold transition flex items-center justify-between gap-2 shadow-sm"
                        >
                          <span>
                            🔧 Tentar diagnóstico avançado (CMD / Executar)
                          </span>
                          <span className="text-emerald-300 font-extrabold">
                            →
                          </span>
                        </button>
                      </div>
                    )}

                    {/* POPs Clicáveis Recomendados */}
                    {msg.recommendedPops && msg.recommendedPops.length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-stone-100 space-y-1.5">
                        <div className="text-[10.5px] font-extrabold uppercase tracking-wider text-stone-400">
                          Procedimentos relacionados no site:
                        </div>
                        {msg.recommendedPops.map((pop) => (
                          <button
                            key={`${msg.id}-${pop.code}`}
                            type="button"
                            onClick={() => onOpenPop(pop.code)}
                            className="w-full text-left bg-cream hover:bg-rose-50 border border-stone-200 hover:border-crimson rounded-lg px-2.5 py-2 transition flex items-center justify-between gap-2 group"
                          >
                            <div className="min-w-0">
                              <span className="inline-block bg-crimson text-white text-[10px] font-extrabold px-1.5 py-0.5 rounded mr-1.5">
                                {pop.code}
                              </span>
                              <span className="text-xs font-bold text-stoneink group-hover:text-crimson transition">
                                {pop.title}
                              </span>
                            </div>
                            <span className="text-crimson font-extrabold text-xs shrink-0">
                              →
                            </span>
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Botão de Abertura Direta de Chamado quando aplicável */}
                    {msg.suggestTicket && (
                      <div className="mt-3 pt-2.5 border-t border-stone-200/80 flex flex-wrap gap-1.5">
                        <button
                          type="button"
                          onClick={handleCopyTicketSummary}
                          className="flex-1 text-center bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 text-[11px] font-bold px-2.5 py-1.5 rounded-lg transition"
                        >
                          {summaryCopied
                            ? "✓ Resumo copiado"
                            : "Copiar resumo"}
                        </button>
                        <a
                          href={TI_TICKET_URL}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 text-center bg-crimson hover:bg-crimson-dark text-white text-[11px] font-extrabold px-2.5 py-1.5 rounded-lg shadow-sm transition"
                        >
                          Ir p/ Portal de Chamados ↗
                        </a>
                      </div>
                    )}

                    {/* Feedback rápido de resolução */}
                    {msg.askResolutionFeedback && (
                      <div className="mt-2.5 pt-2 border-t border-stone-100 flex flex-wrap items-center gap-1.5">
                        <span className="text-[11px] text-stone-500 mr-1">
                          Funcionou?
                        </span>
                        <button
                          type="button"
                          onClick={() => void sendMessage("Sim, resolveu!")}
                          className="text-[11px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded transition"
                        >
                          ✓ Resolveu
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            void sendMessage(
                              "Ainda não resolveu meu problema"
                            )
                          }
                          className="text-[11px] font-bold bg-rose-50 hover:bg-rose-100 text-crimson border border-crimson-border px-2 py-0.5 rounded transition"
                        >
                          ✕ Ainda não resolveu
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Sugestões rápidas iniciais / contextuais */}
            {messages.length <= 2 && !isTyping && (
              <div className="pt-1">
                <div className="text-[11px] font-bold text-stone-500 mb-1.5">
                  Diagnósticos rápidos e avançados:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {currentPopCode && (
                    <button
                      type="button"
                      onClick={() =>
                        void sendMessage(
                          `Segui o ${currentPopCode}, mas não resolveu meu problema`
                        )
                      }
                      className="text-left text-[11px] font-bold bg-crimson-light hover:bg-rose-100 text-crimson border border-crimson-border px-2.5 py-1 rounded-full transition"
                    >
                      🔧 Ir além do {currentPopCode} (Avançado)
                    </button>
                  )}
                  {QUICK_SUGGESTIONS.map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => void sendMessage(item)}
                      className="text-left text-[11px] font-semibold bg-white hover:bg-rose-50 text-stone-700 hover:text-crimson border border-stone-200 hover:border-crimson px-2.5 py-1 rounded-full transition"
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {isTyping && (
              <div className="flex items-start">
                <div className="bg-white border border-stone-200 rounded-2xl rounded-bl-sm px-3.5 py-2 text-xs text-stone-500 shadow-sm flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-crimson animate-bounce" />
                  <span>Montando diagnóstico passo a passo...</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Campo de digitação */}
          <form
            onSubmit={handleFormSubmit}
            className="p-2.5 bg-white border-t border-stone-200 flex items-center gap-2 shrink-0"
          >
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ex: resetar IP no CMD, destravar OneDrive..."
              className="flex-1 bg-stone-50 text-stoneink placeholder-stone-400 text-xs sm:text-sm rounded-xl px-3.5 py-2.5 border border-stone-200 focus:outline-none focus:border-crimson focus:bg-white transition"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isTyping}
              className="bg-crimson hover:bg-crimson-dark disabled:opacity-45 disabled:cursor-not-allowed text-white text-xs font-extrabold px-3.5 py-2.5 rounded-xl shadow-sm transition shrink-0"
            >
              Enviar
            </button>
          </form>
        </div>
      )}

      {/* Botão Flutuante no Canto Inferior Direito (mantendo tamanho e posição aprovados) */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-label="Abrir menu de autoajuda com IA e suporte de TI"
        className="group inline-flex items-center gap-3 bg-crimson hover:bg-crimson-dark text-white px-5 py-3.5 sm:px-6 sm:py-4 rounded-full shadow-2xl border-2 border-white/25 active:scale-95 transition"
      >
        <span className="relative flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-white/15">
          {isOpen ? (
            <span className="text-sm font-extrabold">✕</span>
          ) : (
            <>
              <svg
                className="w-5 h-5 text-white"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                />
              </svg>
              <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-crimson" />
            </>
          )}
        </span>
        <span className="text-sm sm:text-base font-extrabold tracking-tight">
          {isOpen ? "Fechar Autoajuda" : "Não achou? Autoajuda IA"}
        </span>
      </button>
    </div>
  );
}
