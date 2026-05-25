import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export type Column = { header: string; key: string; width?: number };

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.rel = "noopener";
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 250);
}

/** Generic Excel (HTML→.xls) export with multiple sections */
export function exportExcelSections(
  filename: string,
  sections: Array<{ title: string; rows: Array<Array<string | number>>; headers?: string[] }>,
) {
  const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const body = sections.map((sec) => {
    const head = sec.headers
      ? `<thead><tr>${sec.headers.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead>`
      : "";
    const rows = sec.rows.map((r) => `<tr>${r.map((c) => `<td>${esc(c)}</td>`).join("")}</tr>`).join("");
    return `<h3>${esc(sec.title)}</h3><table border="1" cellspacing="0" cellpadding="4">${head}<tbody>${rows}</tbody></table><br/>`;
  }).join("");
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
<head><meta charset="utf-8"></head><body>${body}</body></html>`;
  const blob = new Blob(["\uFEFF" + html], { type: "application/vnd.ms-excel;charset=utf-8" });
  triggerDownload(blob, filename.endsWith(".xls") ? filename : `${filename}.xls`);
}

/** Generic real PDF export using jsPDF + autoTable */
export function exportPdfSections(
  filename: string,
  title: string,
  subtitle: string | undefined,
  sections: Array<{ title: string; headers: string[]; rows: Array<Array<string | number>> }>,
) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFillColor(43, 43, 43);
  doc.rect(0, 0, pageWidth, 56, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text(title, 32, 32);
  if (subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(220, 220, 220);
    doc.text(subtitle, 32, 48);
  }
  doc.setTextColor(0, 0, 0);

  let cursorY = 80;
  sections.forEach((sec, idx) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text(sec.title, 32, cursorY);
    cursorY += 6;
    autoTable(doc, {
      startY: cursorY + 4,
      head: [sec.headers],
      body: sec.rows.map((r) => r.map((c) => String(c ?? ""))),
      styles: { fontSize: 9, cellPadding: 5, overflow: "linebreak" },
      headStyles: { fillColor: [232, 92, 31], textColor: 255, fontStyle: "bold" },
      alternateRowStyles: { fillColor: [247, 245, 242] },
      margin: { left: 32, right: 32 },
      theme: "grid",
    });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const lastY = (doc as any).lastAutoTable?.finalY ?? cursorY + 40;
    cursorY = lastY + 24;
    if (idx < sections.length - 1 && cursorY > doc.internal.pageSize.getHeight() - 100) {
      doc.addPage();
      cursorY = 60;
    }
  });

  // Footer
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(120);
    doc.text(`Compliance 360 · Generated ${new Date().toLocaleString()} · Page ${i}/${pages}`,
      32, doc.internal.pageSize.getHeight() - 20);
  }

  const out = doc.output("blob");
  triggerDownload(out, filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
}
