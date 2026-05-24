/**
 * In biểu mẫu qua cửa sổ riêng (HTML + CSS sạch) — tránh xung đột Layout/sidebar
 * với pattern `body * { visibility: hidden }` trong index.css.
 */
export const TAP_HUAN_IN_DANH_SACH_PRINT_STYLES = `
  @page { size: A4 portrait; margin: 12mm 12mm 12mm 16mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 0;
    font-family: 'Times New Roman', Times, serif;
    font-size: 11pt;
    line-height: 1.3;
    color: #000;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .tap-huan-in-danh-sach-doc {
    width: 100%;
    max-width: 210mm;
    margin: 0 auto;
    padding: 0;
  }
  .tap-huan-in-danh-sach-doc__letterhead { text-align: left; margin: 0 0 8pt; }
  .tap-huan-in-danh-sach-doc__org-name {
    margin: 0;
    font-size: 14pt;
    font-weight: 700;
    line-height: 1.15;
    text-transform: uppercase;
  }
  .tap-huan-in-danh-sach-doc__org-line {
    margin: 1pt 0 0;
    font-size: 10pt;
    line-height: 1.2;
  }
  .tap-huan-in-danh-sach-doc__title {
    margin: 10pt 0 8pt;
    font-size: 14pt;
    font-weight: 700;
    text-align: center;
    text-transform: uppercase;
    line-height: 1.2;
  }
  .tap-huan-in-danh-sach-doc__meta { margin: 0 0 8pt; }
  .tap-huan-in-danh-sach-doc__meta-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2pt 12pt;
    margin-bottom: 2pt;
  }
  .tap-huan-in-danh-sach-doc__meta-item { margin: 0; font-size: 11pt; }
  .tap-huan-in-danh-sach-doc__meta-label { font-weight: 700; }
  .tap-huan-in-danh-sach-doc__empty {
    margin: 10pt 0 0;
    text-align: center;
    font-style: italic;
    font-size: 11pt;
  }
  .tap-huan-in-danh-sach-doc__table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    font-size: 10pt;
  }
  .tap-huan-in-danh-sach-doc__col-stt { width: 5%; }
  .tap-huan-in-danh-sach-doc__col-name { width: 18%; }
  .tap-huan-in-danh-sach-doc__th,
  .tap-huan-in-danh-sach-doc__td {
    border: 0.5px solid #333;
    padding: 3pt 4pt;
    vertical-align: top;
    word-break: break-word;
  }
  .tap-huan-in-danh-sach-doc__th {
    background: #f5f5f5;
    font-weight: 700;
    text-align: center;
    font-size: 10pt;
  }
  .tap-huan-in-danh-sach-doc__td { min-height: 28px; }
  .tap-huan-in-danh-sach-doc__td--center { text-align: center; }
  .tap-huan-in-danh-sach-doc__td--left { text-align: left; }
  .tap-huan-in-danh-sach-doc thead { display: table-header-group; }
  .tap-huan-in-danh-sach-doc tr { page-break-inside: avoid; }
  .tap-huan-in-danh-sach-doc__footer {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 10pt 12pt;
    margin-top: 18pt;
    page-break-inside: avoid;
  }
  .tap-huan-in-danh-sach-doc__sign-col { text-align: center; }
  .tap-huan-in-danh-sach-doc__sign-label {
    margin: 0 0 36pt;
    font-size: 11pt;
    font-weight: 700;
  }
  .tap-huan-in-danh-sach-doc__sign-name { margin: 0; font-size: 11pt; }
`;

export function printTapHuanInDanhSachDocument(
  rootEl: HTMLElement,
  documentTitle: string,
): boolean {
  const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=900,height=700');
  if (!printWindow) return false;

  const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <title>${documentTitle.replace(/</g, '&lt;')}</title>
  <style>${TAP_HUAN_IN_DANH_SACH_PRINT_STYLES}</style>
</head>
<body>
${rootEl.outerHTML}
<script>
  window.onload = function () {
    window.focus();
    window.print();
  };
  window.onafterprint = function () {
    window.close();
  };
</script>
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  return true;
}
