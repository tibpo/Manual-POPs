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

interface FloatingPosition {
  x: number;
  y: number;
}

interface CustomSize {
  width: number;
  height: number;
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
      "Olá! Sou a IA de Autoajuda da TI ECOVIS BPO. 😊\n\nApareceu algum erro na tela ou não sabe explicar o problema? Tire um print (Win + Shift + S) e cole aqui com Ctrl + V — eu identifico o erro na hora e já te dou a solução passo a passo!",
    suggestTicket: false,
    askResolutionFeedback: false,
    timestamp: Date.now(),
  };
}

function clampValue(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

// Preserva nitidez máxima das fontes de janelas de erro (PNG original sem perdas quando <= 1920px e <= 1.4MB; alta definição WebP/JPEG para telas maiores)
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
  const [isMinimized, setIsMinimized] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [hasUnreadWhileMinimized, setHasUnreadWhileMinimized] = useState(false);

  // Posicionamento livre (arrastar pelo site) e redimensionamento manual
  const [normalPosition, setNormalPosition] = useState<FloatingPosition | null>(
    null
  );
  const [expandedPosition, setExpandedPosition] =
    useState<FloatingPosition | null>(null);
  const [customSize, setCustomSize] = useState<CustomSize | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);

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

  const panelRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cmdCopyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMinimizedRef = useRef(isMinimized);

  useEffect(() => {
    isMinimizedRef.current = isMinimized;
    if (!isMinimized) {
      setHasUnreadWhileMinimized(false);
    }
  }, [isMinimized]);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isTyping, isOpen, isMinimized, isExpanded, pendingImage]);

  useEffect(() => {
    if (isOpen && !isMinimized) {
      const t = setTimeout(() => inputRef.current?.focus(), 120);
      return () => clearTimeout(t);
    }
  }, [isOpen, isMinimized]);

  useEffect(() => {
    return () => {
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      if (cmdCopyTimerRef.current) clearTimeout(cmdCopyTimerRef.current);
    };
  }, []);

  // Mantém a janela ativa dentro da área visível caso o navegador seja redimensionado ou mude de modo
  const clampPositionIntoViewport = useCallback(() => {
    const el = panelRef.current;
    if (!el || typeof window === "undefined") return;
    const rect = el.getBoundingClientRect();
    const margin = 8;
    const maxX = Math.max(margin, window.innerWidth - rect.width - margin);
    const maxY = Math.max(margin, window.innerHeight - rect.height - margin);

    if (isExpanded && !isMinimized) {
      setExpandedPosition((prev) =>
        prev
          ? {
              x: clampValue(prev.x, margin, maxX),
              y: clampValue(prev.y, margin, maxY),
            }
          : null
      );
    } else {
      setNormalPosition((prev) =>
        prev
          ? {
              x: clampValue(prev.x, margin, maxX),
              y: clampValue(prev.y, margin, maxY),
            }
          : null
      );
    }
  }, [isExpanded, isMinimized]);

  useEffect(() => {
    if (!isOpen) return;
    const onResize = () => clampPositionIntoViewport();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [isOpen, clampPositionIntoViewport]);

  // Reajusta limites ao alternar entre minimizado / normal / expandido
  useEffect(() => {
    if (!isOpen) return;
    const id = requestAnimationFrame(() => clampPositionIntoViewport());
    return () => cancelAnimationFrame(id);
  }, [isOpen, isMinimized, isExpanded, clampPositionIntoViewport]);

  // Arrastar o chat livremente por qualquer área do site
  const handleDragStart = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0 && e.pointerType === "mouse") return;
      const target = e.target as HTMLElement | null;
      if (target?.closest("button, a, input, textarea")) return;

      const panel = panelRef.current;
      if (!panel || typeof window === "undefined") return;

      e.preventDefault();
      const rect = panel.getBoundingClientRect();
      const startClientX = e.clientX;
      const startClientY = e.clientY;
      const startLeft = rect.left;
      const startTop = rect.top;
      const width = rect.width;
      const height = rect.height;
      const draggingExpanded = isExpanded && !isMinimized;
      const startedMinimized = isMinimized;
      let movedSignificantly = false;

      setIsDragging(true);

      const onPointerMove = (moveEvent: PointerEvent) => {
        const dx = moveEvent.clientX - startClientX;
        const dy = moveEvent.clientY - startClientY;
        if (Math.hypot(dx, dy) > 4) {
          movedSignificantly = true;
        }

        const margin = 8;
        const maxX = Math.max(margin, window.innerWidth - width - margin);
        const maxY = Math.max(margin, window.innerHeight - height - margin);
        const nextPos: FloatingPosition = {
          x: clampValue(startLeft + dx, margin, maxX),
          y: clampValue(startTop + dy, margin, maxY),
        };

        if (draggingExpanded) {
          setExpandedPosition(nextPos);
        } else {
          setNormalPosition(nextPos);
        }
      };

      const onPointerUp = () => {
        setIsDragging(false);
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
        window.removeEventListener("pointercancel", onPointerUp);

        // Clique simples na barra quando minimizada já restaura o chat
        if (startedMinimized && !movedSignificantly) {
          setIsMinimized(false);
          setHasUnreadWhileMinimized(false);
        }
      };

      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
      window.addEventListener("pointercancel", onPointerUp);
    },
    [isExpanded, isMinimized]
  );

  // Redimensionar o chat pelas bordas/canto inferior direito quando no modo normal
  const handleResizeStart = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0 && e.pointerType === "mouse") return;
      const panel = panelRef.current;
      if (!panel || typeof window === "undefined") return;

      e.preventDefault();
      e.stopPropagation();

      const rect = panel.getBoundingClientRect();
      const startClientX = e.clientX;
      const startClientY = e.clientY;
      const startWidth = rect.width;
      const startHeight = rect.height;

      // Fixa a âncora atual (x, y) para redimensionar de forma previsível
      setNormalPosition((prev) => prev ?? { x: rect.left, y: rect.top });
      setIsResizing(true);

      const onPointerMove = (moveEvent: PointerEvent) => {
        const margin = 12;
        const maxW = Math.min(1040, window.innerWidth - margin * 2);
        const maxH = window.innerHeight - margin * 2;
        const minW = Math.min(380, maxW);
        const minH = Math.min(430, maxH);

        const nextWidth = clampValue(
          startWidth + (moveEvent.clientX - startClientX),
          minW,
          maxW
        );
        const nextHeight = clampValue(
          startHeight + (moveEvent.clientY - startClientY),
          minH,
          maxH
        );

        setCustomSize({ width: nextWidth, height: nextHeight });

        setNormalPosition((prev) => {
          if (!prev) return prev;
          return {
            x: clampValue(
              prev.x,
              margin,
              Math.max(margin, window.innerWidth - nextWidth - margin)
            ),
            y: clampValue(
              prev.y,
              margin,
              Math.max(margin, window.innerHeight - nextHeight - margin)
            ),
          };
        });
      };

      const onPointerUp = () => {
        setIsResizing(false);
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
        window.removeEventListener("pointercancel", onPointerUp);
      };

      window.addEventListener("pointermove", onPointerMove);
      window.addEventListener("pointerup", onPointerUp);
      window.addEventListener("pointercancel", onPointerUp);
    },
    []
  );

  const handleResetWindowLayout = useCallback(() => {
    setNormalPosition(null);
    setExpandedPosition(null);
    setCustomSize(null);
    setIsExpanded(false);
    setIsMinimized(false);
  }, []);

  const handleToggleExpand = useCallback(() => {
    setIsMinimized(false);
    setIsExpanded((prev) => !prev);
  }, []);

  const handleMinimize = useCallback(() => {
    setIsMinimized(true);
  }, []);

  const handleRestoreFromMinimized = useCallback(() => {
    setIsMinimized(false);
    setHasUnreadWhileMinimized(false);
  }, []);

  const handleCloseWindow = useCallback(() => {
    setIsOpen(false);
    setIsMinimized(false);
  }, []);

  const handleLauncherClick = useCallback(() => {
    if (!isOpen) {
      setIsOpen(true);
      setIsMinimized(false);
    } else if (isMinimized) {
      setIsMinimized(false);
      setHasUnreadWhileMinimized(false);
    } else {
      setIsOpen(false);
    }
  }, [isOpen, isMinimized]);

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

        if (isMinimizedRef.current) {
          setHasUnreadWhileMinimized(true);
        }
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

  const handleSelectPopFromChat = (code: string) => {
    onOpenPop(code);
    // Se estava expandido cobrindo boa parte da tela, restaura p/ tamanho normal para facilitar leitura lado a lado do POP
    if (isExpanded) {
      setIsExpanded(false);
    }
  };

  if (hidden) {
    return null;
  }

  const lastMessageIndex = messages.length - 1;
  const activePos =
    isExpanded && !isMinimized ? expandedPosition : normalPosition;
  const hasCustomLayout = Boolean(
    normalPosition || expandedPosition || customSize
  );

  // Estilos dinâmicos da janela flutuante (posição livre + tamanho aumentado / expandido / minimizado)
  const floatingWindowStyle: React.CSSProperties = {};
  if (activePos) {
    floatingWindowStyle.left = `${activePos.x}px`;
    floatingWindowStyle.top = `${activePos.y}px`;
  }

  if (!isMinimized && !isExpanded && customSize) {
    floatingWindowStyle.width = `${customSize.width}px`;
    floatingWindowStyle.height = `${customSize.height}px`;
  }

  const windowPositionClasses = activePos
    ? "fixed z-50"
    : isExpanded && !isMinimized
    ? "fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
    : "fixed z-50 bottom-24 sm:bottom-28 lg:bottom-32 right-3 sm:right-12 lg:right-20 xl:right-28";

  const windowSizeClasses = isMinimized
    ? "w-[min(370px,calc(100vw-1.5rem))]"
    : isExpanded
    ? "w-[calc(100vw-1.5rem)] sm:w-[min(940px,calc(100vw-2.5rem))] h-[min(86vh,calc(100vh-2rem))]"
    : customSize
    ? "max-w-[calc(100vw-1rem)] max-h-[calc(100vh-1rem)]"
    : "w-[calc(100vw-1.25rem)] sm:w-[540px] lg:w-[570px] h-[min(710px,calc(100vh-8.5rem))] min-h-[420px]";

  return (
    <>
      {/* Janela Flutuante Movimentável da IA (Minimizada, Normal Maior ou Expandida) */}
      {isOpen && (
        <div
          ref={panelRef}
          style={floatingWindowStyle}
          onPaste={handlePaste}
          className={`no-print ${windowPositionClasses} ${windowSizeClasses} bg-white border border-stone-200/95 rounded-2xl shadow-[0_22px_60px_-12px_rgba(0,0,0,0.35)] flex flex-col overflow-hidden ${
            isDragging || isResizing
              ? "select-none"
              : "transition-[width,height] duration-200"
          }`}
        >
          {/* Barra Superior (Arraste para mover em qualquer ponto do site + Controles Minimizar / Expandir / Fechar) */}
          <div
            onPointerDown={handleDragStart}
            onDoubleClick={() => {
              if (isMinimized) {
                handleRestoreFromMinimized();
              } else {
                handleToggleExpand();
              }
            }}
            title="Arraste esta barra para mover o chat pelo site (duplo clique para expandir/restaurar)"
            className={`bg-crimson text-white px-3.5 py-3 flex items-center justify-between gap-2 shrink-0 select-none ${
              isDragging ? "cursor-grabbing" : "cursor-grab"
            }`}
          >
            <div className="flex items-center gap-2 min-w-0">
              {/* Indicador visual de arraste (Grip 6 pontos) */}
              <div
                aria-hidden="true"
                className="text-white/60 hover:text-white/90 flex items-center shrink-0 px-0.5"
              >
                <svg className="w-3.5 h-4" viewBox="0 0 12 16" fill="currentColor">
                  <circle cx="3.5" cy="3" r="1.3" />
                  <circle cx="8.5" cy="3" r="1.3" />
                  <circle cx="3.5" cy="8" r="1.3" />
                  <circle cx="8.5" cy="8" r="1.3" />
                  <circle cx="3.5" cy="13" r="1.3" />
                  <circle cx="8.5" cy="13" r="1.3" />
                </svg>
              </div>

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
                    {isMinimized
                      ? "Guia IA (Minimizado)"
                      : "Guia IA • Autoajuda e Solução"}
                  </h3>
                  <span
                    className={`inline-block w-2 h-2 rounded-full shrink-0 ${
                      isTyping
                        ? "bg-amber-300 animate-ping"
                        : "bg-emerald-400"
                    }`}
                  />
                  {isMinimized && hasUnreadWhileMinimized && (
                    <span className="bg-amber-300 text-stone-900 text-[10px] font-extrabold px-1.5 py-0.5 rounded-full shrink-0">
                      Nova resposta
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-white/85 truncate">
                  {isMinimized
                    ? isTyping
                      ? "Analisando sua solicitação..."
                      : "Arraste p/ mover ou clique p/ reabrir"
                    : "Arraste esta barra p/ mover • Cole print (Ctrl+V)"}
                </p>
              </div>
            </div>

            {/* Mecanismos de Ação da Janela */}
            <div className="flex items-center gap-1 shrink-0">
              {!isMinimized && (
                <button
                  type="button"
                  onClick={handleResetChat}
                  title="Recomeçar conversa do zero"
                  className="text-[11px] font-bold bg-white/15 hover:bg-white/25 text-white px-2 py-1 rounded-md transition"
                >
                  Recomeçar
                </button>
              )}

              {hasCustomLayout && !isMinimized && (
                <button
                  type="button"
                  onClick={handleResetWindowLayout}
                  title="Voltar chat para posição e tamanho padrão"
                  aria-label="Restaurar posição padrão"
                  className="text-white/85 hover:text-white hover:bg-white/20 w-7 h-7 rounded-md flex items-center justify-center transition"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2.2"
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                </button>
              )}

              {/* Botão Minimizar / Restaurar da barra minimizada */}
              {isMinimized ? (
                <button
                  type="button"
                  onClick={handleRestoreFromMinimized}
                  title="Abrir novamente o chat"
                  aria-label="Restaurar chat minimizado"
                  className="bg-white/20 hover:bg-white/30 text-white text-[11px] font-extrabold px-2.5 py-1 rounded-md flex items-center gap-1 transition"
                >
                  <span>Restaurar</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleMinimize}
                  title="Minimizar chat (mantém flutuando na tela)"
                  aria-label="Minimizar chat"
                  className="text-white/90 hover:text-white hover:bg-white/20 w-7 h-7 rounded-md flex items-center justify-center transition"
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
                      strokeWidth="2.5"
                      d="M5 12h14"
                    />
                  </svg>
                </button>
              )}

              {/* Botão Expandir / Restaurar Tamanho */}
              <button
                type="button"
                onClick={handleToggleExpand}
                title={
                  isExpanded && !isMinimized
                    ? "Restaurar tamanho normal"
                    : "Expandir janela do chat"
                }
                aria-label={
                  isExpanded && !isMinimized
                    ? "Restaurar tamanho normal"
                    : "Expandir janela do chat"
                }
                className="text-white/90 hover:text-white hover:bg-white/20 w-7 h-7 rounded-md flex items-center justify-center transition"
              >
                {isExpanded && !isMinimized ? (
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2.2"
                      d="M9 9L4 4m0 0v4m0-4h4m7 5l5-5m0 0v4m0-4h-4M9 15l-5 5m0 0v-4m0 4h4m7-5l5 5m0 0v-4m0 4h-4"
                    />
                  </svg>
                ) : (
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2.2"
                      d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                    />
                  </svg>
                )}
              </button>

              {/* Botão Fechar */}
              <button
                type="button"
                onClick={handleCloseWindow}
                title="Fechar chat"
                aria-label="Fechar assistente"
                className="text-white/90 hover:text-white hover:bg-white/20 w-7 h-7 rounded-md flex items-center justify-center font-bold transition"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Corpo Completo do Chat (Ocultado quando Minimizado, preservando conversa e estado) */}
          {!isMinimized && (
            <>
              {/* Barra Fixa de Ação Rápida: Abrir Chamado TI + Copiar Resumo */}
              <div className="bg-crimson-light/80 border-b border-crimson-border px-4 py-2 flex flex-wrap items-center justify-between gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleCopyTicketSummary}
                  className="text-[11.5px] font-bold text-crimson hover:text-crimson-dark bg-white border border-crimson-border px-2.5 py-1 rounded-md shadow-sm transition"
                >
                  {summaryCopied
                    ? "✓ Resumo copiado!"
                    : "📋 Copiar resumo p/ chamado"}
                </button>
                <a
                  href={TI_TICKET_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 bg-crimson hover:bg-crimson-dark text-white text-[11.5px] font-extrabold px-3 py-1 rounded-md shadow-sm transition"
                >
                  Abrir Chamado TI ↗
                </a>
              </div>

              {/* Área de Mensagens */}
              <div
                className={`flex-1 overflow-y-auto bg-cream/70 min-h-[260px] ${
                  isExpanded ? "p-5 space-y-4" : "p-4 space-y-3.5"
                }`}
              >
                {messages.map((msg, msgIndex) => {
                  const isUser = msg.role === "user";
                  const isLatestAssistant =
                    !isUser && msgIndex === lastMessageIndex && !isTyping;
                  const hasCmd = msg.commands?.some(
                    (c) => c.whereToRun === "cmd"
                  );
                  const hasRun = msg.commands?.some(
                    (c) => c.whereToRun === "run"
                  );

                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${
                        isUser ? "items-end" : "items-start"
                      }`}
                    >
                      <div
                        className={`${
                          isExpanded ? "max-w-[88%]" : "max-w-[94%]"
                        } rounded-2xl px-4 py-3 ${
                          isExpanded
                            ? "text-sm leading-relaxed"
                            : "text-xs sm:text-[13.5px] leading-relaxed"
                        } shadow-sm ${
                          isUser
                            ? "bg-crimson text-white rounded-br-sm"
                            : "bg-white text-stoneink border border-stone-200 rounded-bl-sm"
                        }`}
                      >
                        {msg.imagePreviewUrl && (
                          <div className="mb-2.5 overflow-hidden rounded-xl border border-white/25 bg-black/10">
                            <img
                              src={msg.imagePreviewUrl}
                              alt="Print enviado pelo colaborador"
                              className={`${
                                isExpanded ? "max-h-72" : "max-h-52"
                              } w-auto object-contain rounded-xl`}
                            />
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
                          <div className="mt-3 pt-2.5 border-t border-stone-100 space-y-2">
                            <div className="text-[11px] font-extrabold uppercase tracking-wider text-crimson">
                              Passo a passo recomendado:
                            </div>
                            {msg.steps.map((st, idx) => (
                              <div
                                key={`${msg.id}-st-${idx}`}
                                className={`flex items-start gap-2.5 ${
                                  isExpanded ? "text-[13.5px]" : "text-xs sm:text-[13px]"
                                } text-stone-700 leading-relaxed`}
                              >
                                <span className="shrink-0 bg-crimson-light text-crimson border border-crimson-border font-extrabold text-[10.5px] px-1.5 py-0.5 rounded mt-0.5">
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
                            <div className="bg-amber-50/80 border border-amber-200 rounded-lg px-3 py-2 text-[11.5px] text-stone-700 leading-snug space-y-1">
                              {hasCmd && (
                                <div>
                                  <strong className="text-stone-900">
                                    Onde colar (Janela Preta / CMD):
                                  </strong>{" "}
                                  segure a tecla da janelinha <kbd>Win</kbd> e
                                  aperte <kbd>R</kbd>, digite{" "}
                                  <code className="inline-code">cmd</code> e
                                  aperte <strong>Enter</strong>. Na janela preta
                                  que abrir, clique com o{" "}
                                  <strong>botão direito do mouse</strong> para
                                  colar e aperte <strong>Enter</strong>.
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
                                    <div className="px-3 py-1.5 bg-stone-100 border-b border-stone-200 flex items-center justify-between gap-2">
                                      <span className="text-xs font-extrabold text-stone-800">
                                        {snippet.label}
                                      </span>
                                      <span className="shrink-0 text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-stone-200 text-stone-700">
                                        {snippet.whereToRun === "cmd"
                                          ? "Prompt (CMD)"
                                          : "Win + R"}
                                      </span>
                                    </div>

                                    <div className="bg-stone-900 text-emerald-300 px-3 py-2 flex items-center justify-between gap-2">
                                      <code className="font-mono text-xs break-all select-all">
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
                                        className="shrink-0 bg-white/15 hover:bg-white/25 text-white text-[11px] font-bold px-2.5 py-1 rounded transition"
                                      >
                                        {isCopied ? "✓ Copiado" : "Copiar"}
                                      </button>
                                    </div>

                                    <div className="px-3 py-1.5 text-xs text-stone-600 leading-snug">
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
                                🔧 Tentar destravamento automático (Copiar
                                comando)
                              </span>
                              <span className="text-emerald-300 font-extrabold">
                                →
                              </span>
                            </button>
                          </div>
                        )}

                        {/* POPs Ilustrados Complementares (Opcional) */}
                        {msg.recommendedPops &&
                          msg.recommendedPops.length > 0 && (
                            <div className="mt-2.5 pt-2 border-t border-stone-100 space-y-1.5">
                              <div className="text-[10.5px] font-extrabold uppercase tracking-wider text-stone-400">
                                Guia visual ilustrado (opcional):
                              </div>
                              {msg.recommendedPops.map((pop) => (
                                <button
                                  key={`${msg.id}-${pop.code}`}
                                  type="button"
                                  onClick={() =>
                                    handleSelectPopFromChat(pop.code)
                                  }
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
                              className="flex-1 text-center bg-stone-100 hover:bg-stone-200 text-stone-800 border border-stone-300 text-xs font-bold px-2.5 py-1.5 rounded-lg transition"
                            >
                              {summaryCopied
                                ? "✓ Resumo copiado"
                                : "Copiar resumo"}
                            </button>
                            <a
                              href={TI_TICKET_URL}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 text-center bg-crimson hover:bg-crimson-dark text-white text-xs font-extrabold px-2.5 py-1.5 rounded-lg shadow-sm transition"
                            >
                              Ir p/ Portal de Chamados ↗
                            </a>
                          </div>
                        )}

                        {/* Feedback rápido de resolução */}
                        {msg.askResolutionFeedback &&
                          (!msg.quickReplies ||
                            msg.quickReplies.length === 0) && (
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
                            <span className="text-[11px] font-bold text-stone-500 pl-1">
                              {msg.isInvestigativeQuestion
                                ? "👇 Toque na opção mais parecida (ou digite abaixo):"
                                : "👇 Como foi aí? Toque para continuar:"}
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {msg.quickReplies.map((replyOption, rIdx) => (
                                <button
                                  key={`${msg.id}-qr-${rIdx}`}
                                  type="button"
                                  onClick={() =>
                                    void sendMessage(replyOption, null)
                                  }
                                  className="text-left text-xs font-semibold bg-white hover:bg-crimson-light text-stone-800 hover:text-crimson border border-crimson-border/90 hover:border-crimson px-3 py-1.5 rounded-xl shadow-sm active:scale-95 transition"
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
                    <div className="text-xs font-bold text-stone-500 mb-2">
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
                          className="w-full text-left text-xs font-bold bg-crimson-light hover:bg-rose-100 text-crimson border border-crimson-border px-3 py-2 rounded-xl transition"
                        >
                          🙋 Me explique o {currentPopCode} de um jeito mais
                          fácil
                        </button>
                      )}
                      {QUICK_STARTER_OPTIONS.map((item) => (
                        <button
                          key={item.label}
                          type="button"
                          onClick={() => void sendMessage(item.prompt, null)}
                          className={
                            item.highlight
                              ? "w-full text-left text-xs font-extrabold bg-crimson/10 hover:bg-crimson/15 text-crimson border border-crimson/35 px-3 py-2.5 rounded-xl transition"
                              : "text-left text-[11.5px] font-semibold bg-white hover:bg-rose-50 text-stone-700 hover:text-crimson border border-stone-200 hover:border-crimson px-3 py-1.5 rounded-full transition"
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
                    <div className="bg-white border border-stone-200 rounded-2xl rounded-bl-sm px-3.5 py-2.5 text-xs text-stone-500 shadow-sm flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-crimson animate-bounce" />
                      <span>
                        {isReadingImage
                          ? "Analisando o print em alta definição e preparando a solução..."
                          : "Analisando com cuidado para te guiar..."}
                      </span>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Pré-visualização de Print / Foto anexada antes do envio */}
              {(pendingImage || imageError) && (
                <div className="px-3.5 py-2 bg-stone-50 border-t border-stone-200 shrink-0">
                  {imageError ? (
                    <div className="flex items-center justify-between text-xs text-crimson font-semibold">
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
                        <div className="flex items-center gap-2.5 min-w-0">
                          <img
                            src={pendingImage.dataUrl}
                            alt="Prévia do print"
                            className="h-11 w-16 object-cover rounded-lg border border-stone-300 shrink-0"
                          />
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-stone-800 truncate">
                              Print em alta definição pronto
                            </div>
                            <div className="text-[11px] text-stone-500 truncate">
                              Clique em Enviar para analisar o erro e resolver
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
                className="relative p-3 bg-white border-t border-stone-200 flex items-center gap-2 shrink-0"
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
                  className="flex-1 min-w-0 bg-stone-50 text-stoneink placeholder-stone-400 text-xs sm:text-sm rounded-xl px-3.5 py-2.5 border border-stone-200 focus:outline-none focus:border-crimson focus:bg-white transition"
                />
                <button
                  type="submit"
                  disabled={(!inputValue.trim() && !pendingImage) || isTyping}
                  className="bg-crimson hover:bg-crimson-dark disabled:opacity-45 disabled:cursor-not-allowed text-white text-xs sm:text-sm font-extrabold px-4 py-2.5 rounded-xl shadow-sm transition shrink-0"
                >
                  Enviar
                </button>

                {/* Alça discreta no canto inferior direito para esticar/redimensionar manualmente */}
                {!isExpanded && (
                  <div
                    onPointerDown={handleResizeStart}
                    title="Arraste o canto para ajustar o tamanho da janela"
                    aria-hidden="true"
                    className="hidden sm:flex absolute bottom-0.5 right-0.5 w-4 h-4 cursor-nwse-resize items-end justify-end p-0.5 text-stone-300 hover:text-crimson transition"
                  >
                    <svg
                      className="w-2.5 h-2.5"
                      viewBox="0 0 10 10"
                      fill="currentColor"
                    >
                      <path d="M9 1v8H1L9 1z" opacity="0.45" />
                    </svg>
                  </div>
                )}
              </form>
            </>
          )}
        </div>
      )}

      {/* Botão Flutuante Fixo no Canto Inferior Direito (mantendo tamanho e posição aprovados) */}
      <div
        id="aiSelfHelpWidget"
        className="no-print fixed bottom-8 right-5 sm:bottom-12 sm:right-12 lg:bottom-14 lg:right-20 xl:right-28 z-40 flex flex-col items-end"
      >
        <button
          type="button"
          onClick={handleLauncherClick}
          aria-expanded={isOpen && !isMinimized}
          aria-label="Abrir menu de autoajuda com IA e suporte de TI"
          className="group inline-flex items-center gap-3 bg-crimson hover:bg-crimson-dark text-white px-5 py-3.5 sm:px-6 sm:py-4 rounded-full shadow-2xl border-2 border-white/25 active:scale-95 transition"
        >
          <span className="relative flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-full bg-white/15">
            {isOpen && !isMinimized ? (
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
            {!isOpen
              ? "Não achou? Autoajuda IA"
              : isMinimized
              ? "Restaurar Autoajuda"
              : "Fechar Autoajuda"}
          </span>
        </button>
      </div>
    </>
  );
}
