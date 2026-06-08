/**
 * In phiếu nhập/xuất kho qua cửa sổ riêng (HTML + CSS sạch) — tránh xung đột Layout/sidebar
 * với pattern `body * { visibility: hidden }` trong index.css.
 */
export const NHAP_XUAT_KHO_PHIEU_PRINT_STYLES = `
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
  .nhap-xuat-kho-phieu-doc {
    width: 100%;
    max-width: 210mm;
    margin: 0 auto;
    padding: 0;
  }
  .nhap-xuat-kho-phieu-doc__letterhead {
    display: flex;
    justify-content: space-between;
    gap: 16pt;
    margin-bottom: 10pt;
  }
  .nhap-xuat-kho-phieu-doc__letterhead-left {
    flex: 1;
    min-width: 0;
    text-align: center;
    padding-right: 8pt;
  }
  .nhap-xuat-kho-phieu-doc__letterhead-right {
    flex: 0 0 auto;
    text-align: right;
    min-width: 130pt;
    font-size: 10pt;
  }
  .nhap-xuat-kho-phieu-doc__org-name {
    margin: 0;
    font-size: 12pt;
    font-weight: 700;
    line-height: 1.2;
    text-transform: uppercase;
    white-space: nowrap;
  }
  .nhap-xuat-kho-phieu-doc__org-sub {
    margin: 2pt 0 0;
    font-size: 11pt;
    font-weight: 700;
    text-transform: uppercase;
  }
  .nhap-xuat-kho-phieu-doc__org-line {
    width: 120pt;
    height: 1px;
    background: #000;
    margin: 4pt auto;
  }
  .nhap-xuat-kho-phieu-doc__org-line-text {
    margin: 1pt 0 0;
    font-size: 10pt;
    line-height: 1.2;
  }
  .nhap-xuat-kho-phieu-doc__ref-line { margin: 0 0 2pt; }
  .nhap-xuat-kho-phieu-doc__ref-value { font-weight: 700; }
  .nhap-xuat-kho-phieu-doc__title {
    margin: 10pt 0 4pt;
    font-size: 14pt;
    font-weight: 700;
    text-align: center;
    text-transform: uppercase;
    line-height: 1.2;
  }
  .nhap-xuat-kho-phieu-doc__subtitle {
    margin: 0 0 10pt;
    font-size: 11pt;
    text-align: center;
  }
  .nhap-xuat-kho-phieu-doc__meta { margin: 0 0 10pt; }
  .nhap-xuat-kho-phieu-doc__meta-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2pt 12pt;
    margin-bottom: 2pt;
  }
  .nhap-xuat-kho-phieu-doc__meta-item { margin: 0; font-size: 11pt; }
  .nhap-xuat-kho-phieu-doc__meta-label { font-weight: 700; }
  .nhap-xuat-kho-phieu-doc__empty {
    margin: 10pt 0 0;
    text-align: center;
    font-style: italic;
    font-size: 11pt;
  }
  .nhap-xuat-kho-phieu-doc__table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    font-size: 10pt;
  }
  .nhap-xuat-kho-phieu-doc__col-stt { width: 5%; }
  .nhap-xuat-kho-phieu-doc__col-name { width: 22%; }
  .nhap-xuat-kho-phieu-doc__th,
  .nhap-xuat-kho-phieu-doc__td {
    border: 0.5px solid #333;
    padding: 3pt 4pt;
    vertical-align: top;
    word-break: break-word;
  }
  .nhap-xuat-kho-phieu-doc__th {
    background: #f5f5f5;
    font-weight: 700;
    text-align: center;
    font-size: 10pt;
  }
  .nhap-xuat-kho-phieu-doc__td { min-height: 28px; }
  .nhap-xuat-kho-phieu-doc__td--center { text-align: center; }
  .nhap-xuat-kho-phieu-doc__td--right { text-align: right; }
  .nhap-xuat-kho-phieu-doc__td--left { text-align: left; }
  .nhap-xuat-kho-phieu-doc thead { display: table-header-group; }
  .nhap-xuat-kho-phieu-doc tr { page-break-inside: avoid; }
  .nhap-xuat-kho-phieu-doc__summary { margin-top: 8pt; text-align: right; }
  .nhap-xuat-kho-phieu-doc__summary-row {
    display: flex;
    justify-content: flex-end;
    gap: 12pt;
    margin-bottom: 4pt;
    font-size: 11pt;
  }
  .nhap-xuat-kho-phieu-doc__summary-label { font-weight: 700; }
  .nhap-xuat-kho-phieu-doc__summary-value { font-weight: 700; min-width: 100pt; text-align: right; }
  .nhap-xuat-kho-phieu-doc__amount-words {
    margin: 4pt 0 0;
    font-size: 11pt;
    font-style: italic;
    text-align: left;
  }
  .nhap-xuat-kho-phieu-doc__note {
    margin: 10pt 0 0;
    padding: 6pt 8pt;
    border: 0.5px solid #333;
    font-size: 11pt;
    min-height: 32pt;
  }
  .nhap-xuat-kho-phieu-doc__footer {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr 1fr;
    gap: 8pt 10pt;
    margin-top: 20pt;
    page-break-inside: avoid;
  }
  .nhap-xuat-kho-phieu-doc__sign-col {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
  .nhap-xuat-kho-phieu-doc__sign-label {
    margin: 0;
    font-size: 10pt;
    font-weight: 700;
    text-transform: uppercase;
  }
  .nhap-xuat-kho-phieu-doc__sign-hint {
    margin: 8pt 0 0;
    font-size: 10pt;
    font-style: italic;
  }
  .nhap-xuat-kho-phieu-doc__sign-area {
    width: 100%;
    min-height: 48pt;
  }
`;

export function printNhapXuatKhoPhieuDocument(
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
  <style>${NHAP_XUAT_KHO_PHIEU_PRINT_STYLES}</style>
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
