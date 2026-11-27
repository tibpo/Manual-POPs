"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  TI_TICKET_URL,
  buildTicketSummary,
  generateAssistantReply,
  getPlaybookById,
  type ChatImageAttachment,
  type ChatMessage,
  type CommandSnippet,
} from "@/lib/aiAssistantEngine";

interface AiSelfHelpWidgetProps {
  currentPopCode: string | null;
  hidden?: boolean;
  onOpenPop: (code: string) => void;
}

const QUICK_STARTER_OPTIONS = [
  {
    label: "🆘 Não sei explicar o problema (me ajude do zero)",
    prompt:
      "Sou leigo e não sei explicar direito o problema nem por onde começar. Pode me fazer perguntas simples para descobrir o que está acontecendo?",
    highlight: true,
  },
  {
    label: "🐢 Computador lento ou travando",
    prompt: "Meu computador está muito lento ou travando para trabalhar",
    highlight: false,
  },
  {
    label: "🌐 Internet, Wi-Fi ou site não entra",
    prompt: "Minha internet, Wi-Fi ou sistema não está abrindo",
    highlight: false,
  },
  {
    label: "📧 Dúvida ou erro no Outlook / Teams",
    prompt: "Estou com um problema ou dúvida no e-mail (Outlook) ou no Teams",
    highlight: false,
  },
  {
    label: "☁️ Meus arquivos / OneDrive com erro",
    prompt: "Meus arquivos ou a nuvenzinha do OneDrive estão com problema",
    highlight: false,
  },
  {
    label: "🔧 Comandos rápidos (IP, Cache, Certificado)",
    prompt: "Quero ver os comandos rápidos seguros de CMD e Executar",
    highlight: false,
  },
];

function createWelcomeMessage(): ChatMessage {
  return {
    id: "welcome-msg",
    role: "assistant",
    content:
      "Olá! Sou a IA de Autoajuda da TI ECOVIS BPO. 😊\n\nApareceu algum erro na tela ou não sabe explicar o problema? Tire um print (Win + Shift + S) e cole aqui com Ctrl + V — eu leio exatamente o que está escrito na tela, transcrevo o erro e te dou a solução passo a passo!",
    suggestTicket: false,
    askResolutionFeedback: false,
    timestamp: Date.now(),
  };
}

// Preserva nitidez máxima das fontes de janelas de erro (PNG original sem perdas quando <= 2560px e <= 2.4MB; alta definição 2560px WebP/JPEG 0.92 para telas gigantes/4K)
async function prepareHighDefScreenshot(
  file: File
): Promise<ChatImageAttachment> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Falha ao ler imagem"));
    reader.onload = () => {
      const originalDataUrl =
        typeof reader.result === "string" ? reader.result : "";
      if (!originalDataUrl) {
        reject(new Error("Imagem vazia"));
        return;
      }

      const img = new Image();
      img.onerror = () => reject(new Error("Formato de imagem inválido"));
      img.onload = () => {
        const maxDim = 1920;
        const isAllowedNativeMime =
          file.type === "image/png" ||
          file.type === "image/webp" ||
          file.type === "image/jpeg";

        // Se o print já é Full HD (<= 1920px) e até 1.4 MB, envia o PNG original sem mexer em 1 pixel (nitidez 100% e leve na Vercel!)
        if (
          isAllowedNativeMime &&
          file.size <= 1_400_000 &&
          img.width <= maxDim &&
          img.height <= maxDim
        ) {
          const commaIdx = originalDataUrl.indexOf(",");
          const rawB64 =
            commaIdx >= 0 ? originalDataUrl.slice(commaIdx + 1) : "";
          if (rawB64) {
            resolve({
              dataUrl: originalDataUrl,
              base64Data: rawB64,
              mimeType: file.type as
                | "image/png"
                | "image/webp"
                | "image/jpeg",
              name: file.name || "print-tela.png",
            });
            return;
          }
        }

        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width >= height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Falha ao processar imagem"));
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.fillStyle = "#FFFFFF";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        let finalDataUrl = canvas.toDataURL("image/webp", 0.9);
        let finalMime: "image/webp" | "image/jpeg" = "image/webp";

        if (
          !finalDataUrl.startsWith("data:image/webp") ||
          finalDataUrl.length > 2_600_000
        ) {
          finalDataUrl = canvas.toDataURL("image/jpeg", 0.88);
          finalMime = "image/jpeg";
        }

        if (finalDataUrl.length > 2_800_000) {
          finalDataUrl = canvas.toDataURL("image/jpeg", 0.78);
          finalMime = "image/jpeg";
        }

        const commaIdx = finalDataUrl.indexOf(",");
        const base64Data =
          commaIdx >= 0 ? finalDataUrl.slice(commaIdx + 1) : "";

        if (!base64Data) {
          reject(new Error("Falha ao converter imagem"));
          return;
        }

        resolve({
          dataUrl: finalDataUrl,
          base64Data,
          mimeType: finalMime,
          name: file.name || "print-tela",
        });
      };
      img.src = originalDataUrl;
    };
    reader.readAsDataURL(file);
  });
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
  const [pendingImage, setPendingImage] = useState<ChatImageAttachment | null>(
    null
  );
  const [imageError, setImageError] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [isReadingImage, setIsReadingImage] = useState(false);
  const [summaryCopied, setSummaryCopied] = useState(false);
  const [copiedCmdKey, setCopiedCmdKey] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cmdCopyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping, isOpen, pendingImage]);

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

  const attachFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      setImageError("Envie apenas imagens ou prints da tela (PNG, JPG).");
      return;
    }
    setImageError(null);
    try {
      const highDef = await prepareHighDefScreenshot(file);
      setPendingImage(highDef);
    } catch {
      setImageError("Não foi possível carregar essa imagem. Tente novamente.");
    }
  }, []);

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            void attachFile(file);
            break;
          }
        }
      }
    },
    [attachFile]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void attachFile(file);
    }
    e.target.value = "";
  };

  const sendMessage = useCallback(
    async (
      rawText: string,
      explicitImage?: ChatImageAttachment | null,
      skipUserBubble = false
    ) => {
      const trimmed = rawText.trim();
      const imageToSend =
        explicitImage !== undefined ? explicitImage : pendingImage;

      if ((!trimmed && !imageToSend) || isTyping) return;

      let updatedHistory = messages;

      if (!skipUserBubble) {
        const displayContent =
          trimmed || "📷 Enviei este print da tela para leitura e solução";

        const userMsg: ChatMessage = {
          id: `user-${Date.now()}`,
          role: "user",
          content: displayContent,
          imagePreviewUrl: imageToSend?.dataUrl,
          timestamp: Date.now(),
        };

        updatedHistory = [...messages, userMsg];
        setMessages(updatedHistory);
      }

      setInputValue("");
      setPendingImage(null);
      setImageError(null);
      setIsTyping(true);
      setIsReadingImage(Boolean(imageToSend));

      try {
        await new Promise((resolve) => setTimeout(resolve, 150));
        const reply = await generateAssistantReply({
          userText: trimmed,
          history: updatedHistory,
          currentPopCode,
          image: imageToSend,
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
        setIsReadingImage(false);
      }
    },
    [currentPopCode, isTyping, messages, pendingImage]
  );

  const triggerAdvancedPlaybook = useCallback(
    async (playbookId: string) => {
      if (isTyping) return;
      const playbookReply = getPlaybookById(playbookId);
      if (!playbookReply) return;

      const userMsg: ChatMessage = {
        id: `user-adv-${Date.now()}`,
        role: "user",
        content:
          "Quero tentar o destravamento automático passo a passo (CMD / Executar)",
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, userMsg]);
      setIsTyping(true);

      await new Promise((resolve) => setTimeout(resolve, 240));
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
    void sendMessage(inputValue, pendingImage);
  };

  const handleResetChat = () => {
    setMessages([createWelcomeMessage()]);
    setInputValue("");
    setPendingImage(null);
    setImageError(null);
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

  const lastMessageIndex = messages.length - 1;

  return (
    <div
      id="aiSelfHelpWidget"
      className="no-print fixed bottom-8 right-5 sm:bottom-12 sm:right-12 lg:bottom-14 lg:right-20 xl:right-28 z-40 flex flex-col items-end"
    >
      {/* Painel do Chat / Menu de Autoajuda IA */}
      {isOpen && (
        <div
          onPaste={handlePaste}
          className="fade-in mb-3.5 w-[calc(100vw-2.5rem)] sm:w-[450px] max-h-[min(630px,calc(100vh-9.5rem))] bg-white border border-stone-200 rounded-2xl shadow-2xl flex flex-col overflow-hidden"
        >
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
                    Guia IA • Leitura de Erro e Solução
                  </h3>
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                </div>
                <p className="text-[11px] text-white/85 truncate">
                  Cole print do erro (Ctrl+V) ou conte com suas palavras
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={handleResetChat}
                title="Recomeçar conversa do zero"
                className="text-[11px] font-bold bg-white/15 hover:bg-white/25 text-white px-2.5 py-1 rounded-md transition"
              >
                Recomeçar
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
            {messages.map((msg, msgIndex) => {
              const isUser = msg.role === "user";
              const isLatestAssistant =
                !isUser && msgIndex === lastMessageIndex && !isTyping;
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
                    className={`max-w-[95%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-[13px] leading-relaxed shadow-sm ${
                      isUser
                        ? "bg-crimson text-white rounded-br-sm"
                        : "bg-white text-stoneink border border-stone-200 rounded-bl-sm"
                    }`}
                  >
                    {msg.imagePreviewUrl && (
                      <div className="mb-2 overflow-hidden rounded-xl border border-white/25 bg-black/10">
                        <img
                          src={msg.imagePreviewUrl}
                          alt="Print enviado pelo colaborador"
                          className="max-h-48 w-auto object-contain rounded-xl"
                        />
                      </div>
                    )}

                    {/* Caixa de Transcrição Fiel do Erro Lido na Tela */}
                    {msg.screenTranscription && (
                      <div className="mb-2.5 rounded-xl bg-stone-900 text-stone-100 border border-stone-700 px-3 py-2">
                        <div className="text-[10px] font-extrabold uppercase tracking-wider text-amber-300 mb-0.5">
                          🔎 Erro / Texto transcrito do seu print:
                        </div>
                        <div className="font-mono text-[11.5px] text-white leading-snug break-words">
                          {msg.screenTranscription}
                        </div>
                      </div>
                    )}

                    <p className="whitespace-pre-line break-words">
                      {msg.content}
                    </p>

                    {/* Botão de Reanalisar Print caso tenha ocorrido pico na rede */}
                    {msg.retryPayload && (
                      <div className="mt-2.5">
                        <button
                          type="button"
                          onClick={() =>
                            void sendMessage(
                              msg.retryPayload!.userText,
                              msg.retryPayload!.image ?? null,
                              true
                            )
                          }
                          disabled={isTyping}
                          className="w-full text-center bg-crimson hover:bg-crimson-dark text-white text-xs font-extrabold px-3 py-2 rounded-xl shadow-sm transition disabled:opacity-50"
                        >
                          🔄 Tentar ler este print novamente
                        </button>
                      </div>
                    )}

                    {/* Lista de passos visuais simples */}
                    {msg.steps && msg.steps.length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-stone-100 space-y-2">
                        <div className="text-[10.5px] font-extrabold uppercase tracking-wider text-crimson">
                          Passo a passo recomendado:
                        </div>
                        {msg.steps.map((st, idx) => (
                          <div
                            key={`${msg.id}-st-${idx}`}
                            className="flex items-start gap-2 text-xs text-stone-700 leading-relaxed"
                          >
                            <span className="shrink-0 bg-crimson-light text-crimson border border-crimson-border font-extrabold text-[10px] px-1.5 py-0.5 rounded mt-0.5">
                              {idx + 1}
                            </span>
                            <span>{st}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Bloco Interativo de Comandos Guiados (CMD / Win + R) */}
                    {msg.commands && msg.commands.length > 0 && (
                      <div className="mt-3 pt-2.5 border-t border-stone-200 space-y-2.5">
                        <div className="bg-amber-50/80 border border-amber-200 rounded-lg px-2.5 py-2 text-[11px] text-stone-700 leading-snug space-y-1">
                          {hasCmd && (
                            <div>
                              <strong className="text-stone-900">
                                Onde colar (Janela Preta / CMD):
                              </strong>{" "}
                              segure a tecla da janelinha <kbd>Win</kbd> e
                              aperte <kbd>R</kbd>, digite{" "}
                              <code className="inline-code">cmd</code> e aperte{" "}
                              <strong>Enter</strong>. Na janela preta que abrir,
                              clique com o{" "}
                              <strong>botão direito do mouse</strong> para colar
                              e aperte <strong>Enter</strong>.
                            </div>
                          )}
                          {hasRun && (
                            <div>
                              <strong className="text-stone-900">
                                Onde colar (Atalho Executar):
                              </strong>{" "}
                              segure a tecla da janelinha <kbd>Win</kbd> e
                              aperte <kbd>R</kbd>, cole o comando copiado (
                              <kbd>Ctrl</kbd> + <kbd>V</kbd>) e aperte{" "}
                              <strong>Enter</strong>.
                            </div>
                          )}
                        </div>

                        {msg.commands.map(
                          (snippet: CommandSnippet, cIdx: number) => {
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
                          }
                        )}
                      </div>
                    )}

                    {/* Botão opcional para destravamento avançado quando sugerido em POP local */}
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
                            🔧 Tentar destravamento automático (Copiar comando)
                          </span>
                          <span className="text-emerald-300 font-extrabold">
                            →
                          </span>
                        </button>
                      </div>
                    )}

                    {/* POPs Ilustrados Complementares (Opcional) */}
                    {msg.recommendedPops && msg.recommendedPops.length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-stone-100 space-y-1.5">
                        <div className="text-[10.5px] font-extrabold uppercase tracking-wider text-stone-400">
                          Guia visual ilustrado (opcional):
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
                    {msg.askResolutionFeedback &&
                      (!msg.quickReplies || msg.quickReplies.length === 0) && (
                        <div className="mt-2.5 pt-2 border-t border-stone-100 flex flex-wrap items-center gap-1.5">
                          <span className="text-[11px] text-stone-500 mr-1">
                            Deu certo?
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              void sendMessage("Sim, deu certo!", null)
                            }
                            className="text-[11px] font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded transition"
                          >
                            ✓ Resolveu
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              void sendMessage(
                                "Ainda não resolveu, me ajuda com outra alternativa?",
                                null
                              )
                            }
                            className="text-[11px] font-bold bg-rose-50 hover:bg-rose-100 text-crimson border border-crimson-border px-2 py-0.5 rounded transition"
                          >
                            ✕ Ainda não resolveu
                          </button>
                        </div>
                      )}
                  </div>

                  {/* Botões Dinâmicos de Resposta Rápida */}
                  {isLatestAssistant &&
                    msg.quickReplies &&
                    msg.quickReplies.length > 0 && (
                      <div className="mt-2 max-w-[96%] flex flex-col gap-1.5">
                        <span className="text-[10.5px] font-bold text-stone-500 pl-1">
                          {msg.isInvestigativeQuestion
                            ? "👇 Toque na opção mais parecida (ou digite abaixo):"
                            : "👇 Como foi aí? Toque para continuar:"}
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {msg.quickReplies.map((replyOption, rIdx) => (
                            <button
                              key={`${msg.id}-qr-${rIdx}`}
                              type="button"
                              onClick={() => void sendMessage(replyOption, null)}
                              className="text-left text-[11.5px] font-semibold bg-white hover:bg-crimson-light text-stone-800 hover:text-crimson border border-crimson-border/90 hover:border-crimson px-3 py-1.5 rounded-xl shadow-sm active:scale-95 transition"
                            >
                              {replyOption}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                </div>
              );
            })}

            {/* Opções iniciais acolhedoras */}
            {messages.length === 1 && !isTyping && (
              <div className="pt-1">
                <div className="text-[11px] font-bold text-stone-500 mb-1.5">
                  Como prefere começar?
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {currentPopCode && (
                    <button
                      type="button"
                      onClick={() =>
                        void sendMessage(
                          `Estou olhando o ${currentPopCode}, mas não entendi direito ou não resolveu meu problema. Pode me explicar de um jeito bem simples?`,
                          null
                        )
                      }
                      className="w-full text-left text-[11.5px] font-bold bg-crimson-light hover:bg-rose-100 text-crimson border border-crimson-border px-3 py-2 rounded-xl transition"
                    >
                      🙋 Me explique o {currentPopCode} de um jeito mais fácil
                    </button>
                  )}
                  {QUICK_STARTER_OPTIONS.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => void sendMessage(item.prompt, null)}
                      className={
                        item.highlight
                          ? "w-full text-left text-[11.5px] font-extrabold bg-crimson/10 hover:bg-crimson/15 text-crimson border border-crimson/35 px-3 py-2 rounded-xl transition"
                          : "text-left text-[11px] font-semibold bg-white hover:bg-rose-50 text-stone-700 hover:text-crimson border border-stone-200 hover:border-crimson px-2.5 py-1.5 rounded-full transition"
                      }
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {isTyping && (
              <div className="flex items-start">
                <div className="bg-white border border-stone-200 rounded-2xl rounded-bl-sm px-3.5 py-2 text-xs text-stone-500 shadow-sm flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-crimson animate-bounce" />
                  <span>
                    {isReadingImage
                      ? "Lendo o texto do print em alta definição e preparando a solução..."
                      : "Analisando com cuidado para te guiar..."}
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Pré-visualização de Print / Foto anexada antes do envio */}
          {(pendingImage || imageError) && (
            <div className="px-3 py-2 bg-stone-50 border-t border-stone-200 shrink-0">
              {imageError ? (
                <div className="flex items-center justify-between text-[11px] text-crimson font-semibold">
                  <span>{imageError}</span>
                  <button
                    type="button"
                    onClick={() => setImageError(null)}
                    className="font-extrabold px-1.5"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                pendingImage && (
                  <div className="flex items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <img
                        src={pendingImage.dataUrl}
                        alt="Prévia do print"
                        className="h-10 w-14 object-cover rounded-lg border border-stone-300 shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="text-[11px] font-bold text-stone-800 truncate">
                          Print em alta definição pronto
                        </div>
                        <div className="text-[10px] text-stone-500 truncate">
                          Clique em Enviar para transcrever o erro e resolver
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPendingImage(null)}
                      aria-label="Remover print anexado"
                      className="text-xs font-bold text-stone-500 hover:text-crimson bg-white border border-stone-200 rounded-md px-2 py-1 shrink-0"
                    >
                      ✕
                    </button>
                  </div>
                )
              )}
            </div>
          )}

          {/* Campo de digitação + Botão de Anexar Print */}
          <form
            onSubmit={handleFormSubmit}
            className="p-2.5 bg-white border-t border-stone-200 flex items-center gap-1.5 shrink-0"
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isTyping}
              title="Enviar print ou foto do erro (ou cole com Ctrl + V)"
              aria-label="Enviar print ou foto do erro"
              className="bg-stone-100 hover:bg-rose-50 text-stone-600 hover:text-crimson border border-stone-200 hover:border-crimson/40 rounded-xl p-2.5 transition shrink-0 disabled:opacity-45"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </button>

            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Cole o print (Ctrl+V) ou conte o que houve..."
              className="flex-1 min-w-0 bg-stone-50 text-stoneink placeholder-stone-400 text-xs sm:text-sm rounded-xl px-3 py-2.5 border border-stone-200 focus:outline-none focus:border-crimson focus:bg-white transition"
            />
            <button
              type="submit"
              disabled={(!inputValue.trim() && !pendingImage) || isTyping}
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
