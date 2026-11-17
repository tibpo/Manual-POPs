import { getManualMetadata } from "@/data/manuals";
import type { ThemeId } from "@/types/pop";

interface PdfDestInfo {
  pageIdx: number;
  targetY: number;
}

interface PdfAnnotation {
  rect: [number, number, number, number];
  targetPopCode?: string;
  targetCustomDest?: PdfDestInfo;
}

function stripHtmlToPlain(html: string): string {
  if (typeof document !== "undefined") {
    const tmp = document.createElement("div");
    tmp.innerHTML = html;
    return (tmp.textContent || tmp.innerText || "").replace(/\s+/g, " ").trim();
  }
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&gt;/g, ">")
    .replace(/&lt;/g, "<")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
}

const WIN1252_MAP: Record<number, number> = {
  0x20ac: 0x80,
  0x201a: 0x82,
  0x0192: 0x83,
  0x201e: 0x84,
  0x2026: 0x85,
  0x2020: 0x86,
  0x2021: 0x87,
  0x02c6: 0x88,
  0x2030: 0x89,
  0x0160: 0x8a,
  0x2039: 0x8b,
  0x0152: 0x8c,
  0x017d: 0x8e,
  0x2018: 0x91,
  0x2019: 0x92,
  0x201c: 0x93,
  0x201d: 0x94,
  0x2022: 0x95,
  0x2013: 0x96,
  0x2014: 0x97,
  0x02dc: 0x98,
  0x2122: 0x99,
  0x0161: 0x9a,
  0x203a: 0x9b,
  0x0153: 0x9c,
  0x017e: 0x9e,
  0x0178: 0x9f,
};

function encodeWin1252Bytes(str: string): number[] {
  const out: number[] = [];
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code <= 0xff) {
      out.push(code);
    } else if (WIN1252_MAP[code] !== undefined) {
      out.push(WIN1252_MAP[code]);
    } else {
      out.push(0x3f);
    }
  }
  return out;
}

function pdfEscapeText(str: string): string {
  const bytes = encodeWin1252Bytes(str);
  let res = "";
  for (let i = 0; i < bytes.length; i++) {
    const b = bytes[i];
    if (b === 0x28 || b === 0x29 || b === 0x5c) {
      res += "\\" + String.fromCharCode(b);
    } else if (b < 0x20 || b > 0x7e) {
      res += "\\" + b.toString(8).padStart(3, "0");
    } else {
      res += String.fromCharCode(b);
    }
  }
  return res;
}

function wrapPdfText(text: string, maxChars: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if (!current) {
      current = word;
    } else if ((current + " " + word).length <= maxChars) {
      current += " " + word;
    } else {
      lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export function generateNativePdfBlob(themeId: ThemeId): Blob {
  const meta = getManualMetadata(themeId);
  const pagesContent: string[] = [];
  const pageAnnotations: PdfAnnotation[][] = [];
  const popDestinations: Record<string, PdfDestInfo> = {};
  let indexTopDest: PdfDestInfo = { pageIdx: 1, targetY: 795 };

  // PÁGINA 1 (Índice 0): CAPA DEDICADA BORDÔ ECOVIS® COM ESCRITA EM BRANCO
  let coverStream = "";
  coverStream += "0.624 0.071 0.224 rg\n0 0 595 842 re f\n";
  coverStream += "1 1 1 rg\n52 732 185 44 re f\n";
  coverStream += "0.769 0.118 0.227 rg\n75 754 14 0 360 arc f\n";
  coverStream +=
    "0.55 0.54 0.54 rg\nBT /F2 20 Tf 98 747 Td (ECOVIS\\256) Tj ET\n";
  coverStream +=
    "1 1 1 rg\nBT /F2 10 Tf 52 710 Td (" +
    pdfEscapeText(meta.dept) +
    ") Tj ET\n";
  coverStream +=
    "0.99 0.85 0.88 rg\nBT /F2 10 Tf 52 600 Td (" +
    pdfEscapeText(meta.kicker) +
    ") Tj ET\n";

  const coverTitleLines = wrapPdfText(meta.title, 26);
  let cy = 562;
  for (const line of coverTitleLines) {
    coverStream +=
      "1 1 1 rg\nBT /F2 28 Tf 52 " +
      cy +
      " Td (" +
      pdfEscapeText(line) +
      ") Tj ET\n";
    cy -= 34;
  }

  cy -= 8;
  const coverLeadLines = wrapPdfText(meta.lead, 66);
  for (const line of coverLeadLines) {
    coverStream +=
      "0.96 0.94 0.95 rg\nBT /F1 12 Tf 52 " +
      cy +
      " Td (" +
      pdfEscapeText(line) +
      ") Tj ET\n";
    cy -= 18;
  }

  coverStream += "0.85 0.55 0.62 RG 1 w\n52 120 m 543 120 l S\n";
  coverStream +=
    "0.95 0.80 0.84 rg\nBT /F2 8.5 Tf 52 100 Td (PARA QUEM) Tj ET\n";
  coverStream +=
    "1 1 1 rg\nBT /F2 10.5 Tf 52 84 Td (" +
    pdfEscapeText("Colaboradores e usuários") +
    ") Tj ET\n";
  coverStream +=
    "0.95 0.80 0.84 rg\nBT /F2 8.5 Tf 245 100 Td (PROCEDIMENTOS) Tj ET\n";
  coverStream +=
    "1 1 1 rg\nBT /F2 10.5 Tf 245 84 Td (" +
    pdfEscapeText(meta.rangeLabel) +
    ") Tj ET\n";
  coverStream +=
    "0.95 0.80 0.84 rg\nBT /F2 8.5 Tf 435 100 Td (SISTEMA) Tj ET\n";
  coverStream +=
    "1 1 1 rg\nBT /F2 10.5 Tf 435 84 Td (Windows 10 / 11) Tj ET\n";

  pagesContent.push(coverStream);
  pageAnnotations.push([]);

  // PÁGINAS DE CONTEÚDO (FUNDO CREME #FAF8F5)
  let stream = "";
  let currentAnnots: PdfAnnotation[] = [];
  let y = 785;

  function startNewContentPage() {
    if (stream) {
      pagesContent.push(stream);
      pageAnnotations.push(currentAnnots);
    }
    stream = "0.980 0.973 0.961 rg\n0 0 595 842 re f\n";
    stream += "0.624 0.071 0.224 rg\n0 834 595 8 re f\n";
    currentAnnots = [];
    y = 795;
  }

  function ensureSpace(neededHeight: number) {
    if (y - neededHeight < 64) {
      startNewContentPage();
    }
  }

  startNewContentPage();

  // A Regra de Ouro
  const ruleLines = wrapPdfText(stripHtmlToPlain(meta.rule), 84);
  const ruleBoxH = 28 + ruleLines.length * 14;
  stream +=
    "1 1 1 rg\n46 " + (y - ruleBoxH) + " 503 " + ruleBoxH + " re f\n";
  stream +=
    "0.624 0.071 0.224 rg\n46 " +
    (y - ruleBoxH) +
    " 4 " +
    ruleBoxH +
    " re f\n";
  stream +=
    "0.624 0.071 0.224 rg\nBT /F2 9 Tf 58 " +
    (y - 16) +
    " Td (A REGRA DE OURO) Tj ET\n";
  let ry = y - 31;
  for (const rl of ruleLines) {
    stream +=
      "0.18 0.16 0.15 rg\nBT /F1 9.8 Tf 58 " +
      ry +
      " Td (" +
      pdfEscapeText(rl) +
      ") Tj ET\n";
    ry -= 14;
  }
  y -= ruleBoxH + 20;

  // Salva destino exato do Guia Inicial ("Neste guia")
  indexTopDest = {
    pageIdx: pagesContent.length,
    targetY: Math.min(820, y + 18),
  };

  // Título do Guia Inicial Clicável
  stream +=
    "0.11 0.10 0.09 rg\nBT /F2 11.5 Tf 46 " +
    y +
    " Td (" +
    pdfEscapeText("Neste guia — Clique no botão desejado para ir direto ao POP:") +
    ") Tj ET\n";
  y -= 18;

  // Grade em 2 colunas de BOTÕES LINKÁVEIS dentro do PDF
  const colWidths = 246;
  const colGap = 11;
  const cardHeight = 46;

  for (let i = 0; i < meta.pops.length; i += 2) {
    ensureSpace(cardHeight + 8);
    const rowPops = [meta.pops[i], meta.pops[i + 1]].filter(Boolean);

    rowPops.forEach((pop, colIdx) => {
      const x0 = 46 + colIdx * (colWidths + colGap);
      const yBottom = y - cardHeight;

      stream +=
        "1 1 1 rg\n" +
        x0 +
        " " +
        yBottom +
        " " +
        colWidths +
        " " +
        cardHeight +
        " re f\n";
      stream +=
        "0.84 0.82 0.81 RG 0.75 w\n" +
        x0 +
        " " +
        yBottom +
        " " +
        colWidths +
        " " +
        cardHeight +
        " re S\n";
      stream +=
        "0.624 0.071 0.224 rg\n" +
        x0 +
        " " +
        yBottom +
        " 4 " +
        cardHeight +
        " re f\n";

      stream +=
        "1 0.945 0.949 rg\n" + (x0 + 10) + " " + (y - 16) + " 46 12 re f\n";
      stream +=
        "0.624 0.071 0.224 rg\nBT /F2 7.8 Tf " +
        (x0 + 14) +
        " " +
        (y - 13) +
        " Td (" +
        pdfEscapeText(pop.code) +
        ") Tj ET\n";
      stream +=
        "0.624 0.071 0.224 rg\nBT /F2 7.8 Tf " +
        (x0 + colWidths - 26) +
        " " +
        (y - 13) +
        " Td (Ir >) Tj ET\n";

      const goalShort =
        pop.goal.length > 43 ? pop.goal.slice(0, 40) + "..." : pop.goal;
      const titleShort =
        pop.title.length > 45 ? pop.title.slice(0, 42) + "..." : pop.title;
      stream +=
        "0.11 0.10 0.09 rg\nBT /F2 8.4 Tf " +
        (x0 + 10) +
        " " +
        (y - 28) +
        " Td (" +
        pdfEscapeText(goalShort) +
        ") Tj ET\n";
      stream +=
        "0.35 0.33 0.32 rg\nBT /F1 8 Tf " +
        (x0 + 10) +
        " " +
        (y - 40) +
        " Td (" +
        pdfEscapeText(titleShort) +
        ") Tj ET\n";

      currentAnnots.push({
        rect: [x0, yBottom, x0 + colWidths, y],
        targetPopCode: pop.code,
      });
    });

    y -= cardHeight + 8;
  }

  y -= 12;

  // Blocos detalhados de todos os POPs
  for (const pop of meta.pops) {
    ensureSpace(102);

    popDestinations[pop.code] = {
      pageIdx: pagesContent.length,
      targetY: Math.min(825, y + 14),
    };

    stream +=
      "0.624 0.071 0.224 rg\nBT /F2 8.5 Tf 46 " +
      y +
      " Td (" +
      pdfEscapeText(pop.goal.toUpperCase()) +
      ") Tj ET\n";

    const backBtnW = 86;
    const backBtnH = 14;
    const backBtnX = 549 - backBtnW;
    const backBtnY = y - 3;
    stream +=
      "1 0.945 0.949 rg\n" +
      backBtnX +
      " " +
      backBtnY +
      " " +
      backBtnW +
      " " +
      backBtnH +
      " re f\n";
    stream +=
      "0.996 0.804 0.827 RG 0.6 w\n" +
      backBtnX +
      " " +
      backBtnY +
      " " +
      backBtnW +
      " " +
      backBtnH +
      " re S\n";
    stream +=
      "0.624 0.071 0.224 rg\nBT /F2 7.5 Tf " +
      (backBtnX + 8) +
      " " +
      (backBtnY + 4) +
      " Td (" +
      pdfEscapeText("^ Voltar ao Guia") +
      ") Tj ET\n";

    currentAnnots.push({
      rect: [backBtnX, backBtnY, backBtnX + backBtnW, backBtnY + backBtnH],
      targetCustomDest: indexTopDest,
    });

    y -= 17;

    stream += "0.624 0.071 0.224 rg\n46 " + (y - 4) + " 54 16 re f\n";
    stream +=
      "1 1 1 rg\nBT /F2 9 Tf 52 " +
      y +
      " Td (" +
      pdfEscapeText(pop.code) +
      ") Tj ET\n";

    const titleLines = wrapPdfText(pop.title, 62);
    stream +=
      "0.11 0.10 0.09 rg\nBT /F2 12 Tf 108 " +
      y +
      " Td (" +
      pdfEscapeText(titleLines[0]) +
      ") Tj ET\n";
    y -= 16;
    for (let tIdx = 1; tIdx < titleLines.length; tIdx++) {
      stream +=
        "0.11 0.10 0.09 rg\nBT /F2 12 Tf 108 " +
        y +
        " Td (" +
        pdfEscapeText(titleLines[tIdx]) +
        ") Tj ET\n";
      y -= 15;
    }
    stream += "0.88 0.87 0.86 RG 0.8 w\n46 " + (y + 4) + " m 549 " + (y + 4) + " l S\n";
    y -= 8;

    pop.steps.forEach((step, sIdx) => {
      const plainLead = stripHtmlToPlain(step.lead);
      const plainText = stripHtmlToPlain(step.text);
      const textLines = wrapPdfText(plainText, 86);
      ensureSpace(22 + textLines.length * 13);

      stream +=
        "0.624 0.071 0.224 rg\nBT /F2 8.5 Tf 46 " +
        y +
        " Td (" +
        pdfEscapeText("PASSO " + (sIdx + 1) + ":") +
        ") Tj ET\n";
      stream +=
        "0.11 0.10 0.09 rg\nBT /F2 9.8 Tf 96 " +
        y +
        " Td (" +
        pdfEscapeText(plainLead) +
        ") Tj ET\n";
      y -= 14;

      for (const tl of textLines) {
        stream +=
          "0.26 0.24 0.23 rg\nBT /F1 9.5 Tf 54 " +
          y +
          " Td (" +
          pdfEscapeText(tl) +
          ") Tj ET\n";
        y -= 13;
      }
      y -= 5;
    });

    y -= 12;
  }

  if (stream) {
    pagesContent.push(stream);
    pageAnnotations.push(currentAnnots);
  }

  // Rodapé numerado + link "Voltar ao Guia Inicial" nas páginas de conteúdo
  const totalPages = pagesContent.length;
  for (let p = 1; p < totalPages; p++) {
    let fStream = "0.85 0.84 0.83 RG 0.6 w\n46 44 m 549 44 l S\n";
    fStream +=
      "0.47 0.45 0.43 rg\nBT /F1 8.5 Tf 46 30 Td (" +
      pdfEscapeText("ECOVIS® • " + meta.title) +
      ") Tj ET\n";
    fStream +=
      "0.624 0.071 0.224 rg\nBT /F2 8.5 Tf 315 30 Td (" +
      pdfEscapeText("[Voltar ao Guia Inicial]") +
      ") Tj ET\n";
    fStream +=
      "0.47 0.45 0.43 rg\nBT /F1 8.5 Tf 485 30 Td (" +
      pdfEscapeText("Página " + (p + 1) + " de " + totalPages) +
      ") Tj ET\n";
    pagesContent[p] += fStream;

    pageAnnotations[p].push({
      rect: [312, 24, 432, 40],
      targetCustomDest: indexTopDest,
    });
  }

  // Montagem estrutural binária PDF 1.4 válida
  const objects: string[] = [];
  function addObj(content: string): number {
    objects.push(content);
    return objects.length;
  }

  const catalogId = addObj("");
  const pagesId = addObj("");
  const fontRegularId = addObj(
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>"
  );
  const fontBoldId = addObj(
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>"
  );

  const pageObjIds = pagesContent.map(() => addObj(""));

  for (let pIdx = 0; pIdx < pagesContent.length; pIdx++) {
    const contentStr = pagesContent[pIdx];
    const contentBytes = encodeWin1252Bytes(contentStr);
    let rawStream = "";
    for (let bIdx = 0; bIdx < contentBytes.length; bIdx++) {
      rawStream += String.fromCharCode(contentBytes[bIdx]);
    }
    const streamObjId = addObj(
      `<< /Length ${contentBytes.length} >>\nstream\n${rawStream}\nendstream`
    );

    const annotObjIds: number[] = [];
    for (const annot of pageAnnotations[pIdx]) {
      const destInfo =
        annot.targetCustomDest ??
        (annot.targetPopCode ? popDestinations[annot.targetPopCode] : undefined);
      if (!destInfo) continue;
      const destPageObjId = pageObjIds[destInfo.pageIdx];
      if (!destPageObjId) continue;

      const rectStr = annot.rect.map((n) => n.toFixed(1)).join(" ");
      const targetY = Math.round(destInfo.targetY);
      const annotId = addObj(
        `<< /Type /Annot /Subtype /Link /Rect [${rectStr}] /Border [0 0 0] /H /I /Dest [${destPageObjId} 0 R /XYZ null ${targetY} null] >>`
      );
      annotObjIds.push(annotId);
    }

    const annotsDictEntry =
      annotObjIds.length > 0
        ? ` /Annots [${annotObjIds.map((id) => `${id} 0 R`).join(" ")}]`
        : "";

    objects[pageObjIds[pIdx] - 1] =
      `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> >> /Contents ${streamObjId} 0 R${annotsDictEntry} >>`;
  }

  objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
  objects[pagesId - 1] =
    `<< /Type /Pages /Kids [${pageObjIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageObjIds.length} >>`;

  let pdfText = "%PDF-1.4\n";
  const offsets: number[] = [0];
  for (let i = 0; i < objects.length; i++) {
    offsets.push(pdfText.length);
    pdfText += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }

  const xrefOffset = pdfText.length;
  pdfText += `xref\n0 ${objects.length + 1}\n`;
  pdfText += "0000000000 65535 f \n";
  for (let i = 1; i <= objects.length; i++) {
    pdfText += String(offsets[i]).padStart(10, "0") + " 00000 n \n";
  }
  pdfText += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  const finalBytes = new Uint8Array(pdfText.length);
  for (let i = 0; i < pdfText.length; i++) {
    finalBytes[i] = pdfText.charCodeAt(i) & 0xff;
  }
  return new Blob([finalBytes], { type: "application/pdf" });
}
