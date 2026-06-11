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
  /**
   * CSS selector (resolved within `element`) of a header to repeat at the top
   * of every page after the first, e.g. "thead" for tables — so column labels
   * stay visible on multi-page output.
   */
  repeatHeaderSelector?: string;
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
    repeatHeaderSelector,
  } = options;

  // Measure the header (if any) before rasterizing, while the element is
  // laid out exactly as it will be captured.
  let headerRatio = 0;
  if (repeatHeaderSelector) {
    const headerEl = element.querySelector(repeatHeaderSelector);
    const elementHeight = element.getBoundingClientRect().height;
    if (headerEl && elementHeight > 0) {
      headerRatio = headerEl.getBoundingClientRect().height / elementHeight;
    }
  }

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
    // Multi-page: slice the canvas vertically. Pages after the first get the
    // header re-stamped on top so column labels stay readable throughout.
    const pageHeightPx = availableHeight * pxPerMm;
    let headerPx = Math.round(canvas.height * headerRatio);
    // Safety: a header taller than half a page would leave no room for rows
    if (headerPx >= pageHeightPx * 0.5) headerPx = 0;

    let sourceYPx = 0;
    let pageIndex = 0;
    while (sourceYPx < canvas.height) {
      const headerOnPagePx = pageIndex > 0 ? headerPx : 0;
      const contentHeightPx = Math.min(
        pageHeightPx - headerOnPagePx,
        canvas.height - sourceYPx
      );
      // Draw header + slice onto a temp canvas so we can export just the slice
      const sliceCanvas = document.createElement("canvas");
      sliceCanvas.width = canvas.width;
      sliceCanvas.height = headerOnPagePx + contentHeightPx;
      const ctx = sliceCanvas.getContext("2d");
      if (!ctx) throw new Error("Canvas 2D context unavailable");
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
      if (headerOnPagePx > 0) {
        ctx.drawImage(
          canvas,
          0,
          0,
          canvas.width,
          headerOnPagePx,
          0,
          0,
          canvas.width,
          headerOnPagePx
        );
      }
      ctx.drawImage(
        canvas,
        0,
        sourceYPx,
        canvas.width,
        contentHeightPx,
        0,
        headerOnPagePx,
        canvas.width,
        contentHeightPx
      );
      const sliceData = sliceCanvas.toDataURL("image/jpeg", 0.92);
      if (pageIndex > 0) pdf.addPage();
      pdf.addImage(
        sliceData,
        "JPEG",
        margin,
        margin,
        availableWidth,
        sliceCanvas.height / pxPerMm
      );
      sourceYPx += contentHeightPx;
      pageIndex++;
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
