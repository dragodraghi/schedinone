import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface PdfOptions {
  filename: string;
  /** Paper orientation. Default "portrait". Use "landscape" for wide tables. */
  orientation?: "portrait" | "landscape";
  /** Page margin in mm. Default 10. */
  margin?: number;
  /** Background color to composite the canvas onto. Default "#ffffff" for printable output. */
  background?: string;
}

/**
 * Render a DOM element to PDF and trigger a client-side download.
 * Works on mobile Safari / Chrome Android — no native print dialog needed.
 * The element is rasterized via html2canvas at 2x DPI then placed on an
 * A4 page (scaled to fit width); multi-page output if content is taller.
 */
export async function exportElementAsPdf(
  element: HTMLElement,
  options: PdfOptions
): Promise<void> {
  const {
    filename,
    orientation = "portrait",
    margin = 10,
    background = "#ffffff",
  } = options;

  // 2x DPI for sharper text on rasterized output
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: background,
    logging: false,
    // Workaround: html2canvas doesn't handle `oklch()` colors — we use mostly
    // rgb/hex but this guards future regressions
    onclone: (doc) => {
      doc.body.classList.add("pdf-export");
    },
  });

  const imgData = canvas.toDataURL("image/jpeg", 0.92);
  const pdf = new jsPDF({
    orientation,
    unit: "mm",
    format: "a4",
    compress: true,
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const availableWidth = pageWidth - margin * 2;
  const availableHeight = pageHeight - margin * 2;

  // Scale so the canvas fits the page width exactly
  const pxPerMm = canvas.width / availableWidth;
  const imgHeightMm = canvas.height / pxPerMm;

  if (imgHeightMm <= availableHeight) {
    // Fits on a single page
    pdf.addImage(imgData, "JPEG", margin, margin, availableWidth, imgHeightMm);
  } else {
    // Multi-page: slice the canvas vertically
    let remainingPx = canvas.height;
    let sourceYPx = 0;
    const pageHeightPx = availableHeight * pxPerMm;

    while (remainingPx > 0) {
      const sliceHeightPx = Math.min(pageHeightPx, remainingPx);
      // Draw this slice onto a temp canvas so we can export just the slice
      const sliceCanvas = document.createElement("canvas");
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = sliceHeightPx;
      const ctx = sliceCanvas.getContext("2d");
      if (!ctx) throw new Error("Canvas 2D context unavailable");
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
      ctx.drawImage(
        canvas,
        0,
        sourceYPx,
        canvas.width,
        sliceHeightPx,
        0,
        0,
        canvas.width,
        sliceHeightPx
      );
      const sliceData = sliceCanvas.toDataURL("image/jpeg", 0.92);
      if (sourceYPx > 0) pdf.addPage();
      pdf.addImage(
        sliceData,
        "JPEG",
        margin,
        margin,
        availableWidth,
        sliceHeightPx / pxPerMm
      );
      sourceYPx += sliceHeightPx;
      remainingPx -= sliceHeightPx;
    }
  }

  pdf.save(filename);
}

/**
 * Format a filename-safe timestamp: 2026-06-15_14-30
 */
export function timestampSlug(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(
    d.getHours()
  )}-${pad(d.getMinutes())}`;
}
