"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { CatalogView } from "@/components/CatalogView";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { HeroBanner } from "@/components/HeroBanner";
import { ManualsView } from "@/components/ManualsView";
import { PdfViewerModal } from "@/components/PdfViewerModal";
import { PopDetailView } from "@/components/PopDetailView";
import { ThemeReaderView } from "@/components/ThemeReaderView";
import { TriageView } from "@/components/TriageView";
import { getManualMetadata } from "@/data/manuals";
import { POPS } from "@/data/pops";
import { generateNativePdfBlob } from "@/lib/pdfGenerator";
import type {
  PortalMode,
  ThemeId,
  TriageHistoryEntry,
  TriageOption,
} from "@/types/pop";

const INITIAL_TRIAGE_HISTORY: TriageHistoryEntry[] = [
  { type: "node", key: "start" },
];

function normalizePopParam(raw: string | null): string | null {
  if (!raw) return null;
  const cleaned = raw.trim().toUpperCase();
  const candidate = /^\d{1,3}$/.test(cleaned)
    ? `POP-${cleaned.padStart(3, "0")}`
    : cleaned;
  return POPS.some((p) => p.code === candidate) ? candidate : null;
}

function parseThemeParam(raw: string | null): ThemeId {
  if (!raw || raw.trim().toLowerCase() === "all") return "all";
  const num = Number(raw);
  if (num === 1 || num === 2 || num === 3 || num === 4 || num === 5) {
    return num;
  }
  return 1;
}

export function PortalApp() {
  const [mode, setMode] = useState<PortalMode>("triage");
  const [previousMode, setPreviousMode] = useState<
    "triage" | "catalog" | "reader"
  >("triage");
  const [selectedTheme, setSelectedTheme] = useState<ThemeId>("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [currentPopCode, setCurrentPopCode] = useState<string | null>(null);
  const [readerThemeId, setReaderThemeId] = useState<ThemeId>(1);
  const [activePdfThemeId, setActivePdfThemeId] = useState<ThemeId>(1);
  const [catalogIndexExpanded, setCatalogIndexExpanded] = useState(false);
  const [triageHistory, setTriageHistory] = useState<TriageHistoryEntry[]>(
    INITIAL_TRIAGE_HISTORY
  );

  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const [pdfToastText, setPdfToastText] = useState<string | null>(null);

  const pdfBlobUrlRef = useRef<string | null>(null);
  const pdfTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const printTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (pdfBlobUrlRef.current) {
        URL.revokeObjectURL(pdfBlobUrlRef.current);
      }
      if (pdfTimerRef.current) clearTimeout(pdfTimerRef.current);
      if (printTimerRef.current) clearTimeout(printTimerRef.current);
    };
  }, []);

  const scrollToTop = useCallback(() => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, []);

  const syncUrl = useCallback(
    (
      nextMode: PortalMode,
      nextPopCode: string | null,
      nextReaderTheme?: ThemeId
    ) => {
      if (typeof window === "undefined") return;
      const url = new URL(window.location.href);
      url.searchParams.delete("pop");
      url.searchParams.delete("modo");
      url.searchParams.delete("tema");

      if (nextMode === "detail" && nextPopCode) {
        url.searchParams.set("pop", nextPopCode);
      } else if (nextMode === "catalog") {
        url.searchParams.set("modo", "catalogo");
      } else if (nextMode === "manuals") {
        url.searchParams.set("modo", "manuais");
      } else if (nextMode === "reader") {
        url.searchParams.set("modo", "leitor");
        url.searchParams.set("tema", String(nextReaderTheme ?? readerThemeId));
      }

      const target = `${url.pathname}${url.search}${url.hash}`;
      const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      if (target !== current) {
        window.history.pushState(null, "", target);
      }
    },
    [readerThemeId]
  );

  useEffect(() => {
    const applyFromUrl = () => {
      const params = new URLSearchParams(window.location.search);
      const popCode = normalizePopParam(params.get("pop"));
      if (popCode) {
        setPreviousMode("catalog");
        setCurrentPopCode(popCode);
        setMode("detail");
        return;
      }

      const modoParam = params.get("modo")?.trim().toLowerCase();
      if (modoParam === "catalogo") {
        setCurrentPopCode(null);
        setMode("catalog");
        return;
      }
      if (modoParam === "manuais") {
        setCurrentPopCode(null);
        setMode("manuals");
        return;
      }
      if (modoParam === "leitor") {
        setCurrentPopCode(null);
        setReaderThemeId(parseThemeParam(params.get("tema")));
        setMode("reader");
        return;
      }

      setCurrentPopCode(null);
      setMode("triage");
    };

    applyFromUrl();
    window.addEventListener("popstate", applyFromUrl);
    return () => window.removeEventListener("popstate", applyFromUrl);
  }, []);

  const switchMode = useCallback(
    (newMode: PortalMode) => {
      setMode(newMode);
      syncUrl(
        newMode,
        newMode === "detail" ? currentPopCode : null,
        newMode === "reader" ? readerThemeId : undefined
      );
      scrollToTop();
    },
    [currentPopCode, readerThemeId, scrollToTop, syncUrl]
  );

  const resetHome = useCallback(() => {
    setSearchQuery("");
    setTriageHistory(INITIAL_TRIAGE_HISTORY);
    setCurrentPopCode(null);
    setMode("triage");
    syncUrl("triage", null);
    scrollToTop();
  }, [scrollToTop, syncUrl]);

  const handleSearchChange = useCallback(
    (query: string) => {
      setSearchQuery(query);
      if (query.trim().length > 0) {
        setSelectedTheme("all");
        if (mode !== "catalog") {
          setMode("catalog");
          syncUrl("catalog", null);
          scrollToTop();
        }
      }
    },
    [mode, scrollToTop, syncUrl]
  );

  const clearSearch = useCallback(() => {
    setSearchQuery("");
  }, []);

  const openPop = useCallback(
    (code: string) => {
      if (mode === "triage" || mode === "catalog" || mode === "reader") {
        setPreviousMode(mode);
      } else if (mode !== "detail") {
        setPreviousMode("catalog");
      }
      setCurrentPopCode(code);
      setMode("detail");
      syncUrl("detail", code);
      scrollToTop();
    },
    [mode, scrollToTop, syncUrl]
  );

  const backFromDetail = useCallback(() => {
    setMode(previousMode);
    syncUrl(
      previousMode,
      null,
      previousMode === "reader" ? readerThemeId : undefined
    );
    scrollToTop();
  }, [previousMode, readerThemeId, scrollToTop, syncUrl]);

  const openThemeReader = useCallback(
    (themeId: ThemeId) => {
      setReaderThemeId(themeId);
      setMode("reader");
      syncUrl("reader", null, themeId);
      scrollToTop();
    },
    [scrollToTop, syncUrl]
  );

  const handlePdfAction = useCallback(
    (themeId: ThemeId, actionType: "view" | "download") => {
      const meta = getManualMetadata(themeId);
      setPdfToastText(`Preparando ${meta.fileName}...`);

      if (pdfTimerRef.current) clearTimeout(pdfTimerRef.current);
      pdfTimerRef.current = setTimeout(() => {
        try {
          const pdfBlob = generateNativePdfBlob(themeId);
          if (pdfBlobUrlRef.current) {
            URL.revokeObjectURL(pdfBlobUrlRef.current);
          }
          const nextUrl = URL.createObjectURL(pdfBlob);
          pdfBlobUrlRef.current = nextUrl;
          setPdfBlobUrl(nextUrl);
          setPdfToastText(null);

          if (actionType === "download") {
            const tempLink = document.createElement("a");
            tempLink.href = nextUrl;
            tempLink.download = meta.fileName;
            document.body.appendChild(tempLink);
            tempLink.click();
            document.body.removeChild(tempLink);
          } else {
            setActivePdfThemeId(themeId);
            setPdfModalOpen(true);
          }
        } catch (err) {
          console.error("Erro ao gerar PDF:", err);
          setPdfToastText(null);
          openThemeReader(themeId);
        }
      }, 40);
    },
    [openThemeReader]
  );

  const printCurrentReaderDocument = useCallback(() => {
    if (typeof window !== "undefined") {
      window.print();
    }
  }, []);

  const printActivePdfDocument = useCallback(() => {
    const themeId = activePdfThemeId || readerThemeId || 1;
    setPdfModalOpen(false);
    openThemeReader(themeId);
    if (printTimerRef.current) clearTimeout(printTimerRef.current);
    printTimerRef.current = setTimeout(() => {
      if (typeof window !== "undefined") {
        window.print();
      }
    }, 250);
  }, [activePdfThemeId, openThemeReader, readerThemeId]);

  const handleSelectTriageOption = useCallback(
    (option: TriageOption, optionIndex: number) => {
      setTriageHistory((prev) => {
        const current = prev[prev.length - 1];
        const currentKey = current.type === "node" ? current.key : "start";

        if (option.next) {
          return [...prev, { type: "node", key: option.next }];
        }
        if (option.pops) {
          return [
            ...prev,
            {
              type: "result",
              key: `${currentKey}_res_${optionIndex}`,
              data: {
                pops: option.pops,
                summary: option.summary ?? "",
                actionLink: option.actionLink,
              },
            },
          ];
        }
        return prev;
      });
    },
    []
  );

  const goBackTriage = useCallback(() => {
    setTriageHistory((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  }, []);

  const restartTriage = useCallback(() => {
    setTriageHistory(INITIAL_TRIAGE_HISTORY);
    setCurrentPopCode(null);
    setMode("triage");
    syncUrl("triage", null);
    scrollToTop();
  }, [scrollToTop, syncUrl]);

  const showHeroBanner =
    mode === "triage" || mode === "catalog" || mode === "manuals";

  return (
    <>
      <Header
        mode={mode}
        searchQuery={searchQuery}
        onResetHome={resetHome}
        onSwitchMode={switchMode}
        onSearchChange={handleSearchChange}
        onClearSearch={clearSearch}
      />

      {showHeroBanner && <HeroBanner />}

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {mode === "triage" && (
          <TriageView
            history={triageHistory}
            onSelectOption={handleSelectTriageOption}
            onGoBack={goBackTriage}
            onRestart={restartTriage}
            onOpenPop={openPop}
            onOpenCatalog={() => switchMode("catalog")}
          />
        )}

        {mode === "catalog" && (
          <CatalogView
            selectedTheme={selectedTheme}
            searchQuery={searchQuery}
            catalogIndexExpanded={catalogIndexExpanded}
            onSelectTheme={setSelectedTheme}
            onToggleCatalogIndex={() =>
              setCatalogIndexExpanded((prev) => !prev)
            }
            onOpenPop={openPop}
            onClearSearch={clearSearch}
            onOpenThemeReader={openThemeReader}
            onPdfAction={handlePdfAction}
          />
        )}

        {mode === "detail" && currentPopCode && (
          <PopDetailView
            popCode={currentPopCode}
            onBack={backFromDetail}
            onRestartTriage={restartTriage}
            onOpenPop={openPop}
          />
        )}

        {mode === "manuals" && (
          <ManualsView
            onOpenThemeReader={openThemeReader}
            onPdfAction={handlePdfAction}
          />
        )}

        {mode === "reader" && (
          <ThemeReaderView
            themeId={readerThemeId}
            onBackToManuals={() => switchMode("manuals")}
            onPrint={printCurrentReaderDocument}
            onPdfAction={handlePdfAction}
            onOpenPop={openPop}
          />
        )}
      </main>

      <PdfViewerModal
        isOpen={pdfModalOpen}
        themeId={activePdfThemeId}
        pdfBlobUrl={pdfBlobUrl}
        onPrintActive={printActivePdfDocument}
        onClose={() => setPdfModalOpen(false)}
        onOpenPop={openPop}
      />

      {pdfToastText && (
        <div
          id="pdfToast"
          className="fixed bottom-5 right-5 z-50 bg-stoneink text-white px-4 py-3 rounded-xl shadow-xl border border-stone-700 flex items-center gap-3 text-xs sm:text-sm font-semibold"
        >
          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
          <span>{pdfToastText}</span>
        </div>
      )}

      <Footer />
    </>
  );
}
