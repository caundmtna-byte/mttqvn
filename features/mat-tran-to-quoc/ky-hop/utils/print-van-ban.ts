/**
 * In văn bản hành chính qua cửa sổ riêng (HTML + CSS sạch) — tránh xung đột với
 * pattern `body * { visibility: hidden }` trong `index.css` của Layout/sidebar.
 */
export const VAN_BAN_HANH_CHINH_PRINT_STYLES = `
  @page { size: A4 portrait; margin: 20mm 15mm 20mm 30mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 0;
    font-family: 'Times New Roman', Times, serif;
    font-size: 13pt;
    line-height: 1.45;
    color: #000;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .van-ban-doc { width: 100%; max-width: 210mm; margin: 0 auto; padding: 0; }
  .van-ban-doc__head {
    display: grid;
    grid-template-columns: 45% 55%;
    gap: 0 8pt;
    margin: 0 0 12pt;
  }
  .van-ban-doc__head-col { text-align: center; }
  .van-ban-doc__co-quan-chu-quan { margin: 0; font-size: 12pt; text-transform: uppercase; }
  .van-ban-doc__co-quan { margin: 0; font-size: 12pt; font-weight: 700; text-transform: uppercase; }
  .van-ban-doc__quoc-hieu { margin: 0; font-size: 12pt; font-weight: 700; text-transform: uppercase; }
  .van-ban-doc__tieu-ngu { margin: 0; font-size: 13pt; font-weight: 700; }
  .van-ban-doc__rule {
    width: 40%;
    height: 1px;
    margin: 2pt auto 4pt;
    border: 0;
    background: #000;
  }
  .van-ban-doc__rule--wide { width: 60%; }
  .van-ban-doc__so { margin: 0; font-size: 12pt; }
  .van-ban-doc__dia-danh { margin: 0; font-size: 12pt; font-style: italic; }
  .van-ban-doc__ten-loai {
    margin: 14pt 0 4pt;
    font-size: 14pt;
    font-weight: 700;
    text-align: center;
    text-transform: uppercase;
  }
  .van-ban-doc__trich-yeu {
    margin: 0 0 10pt;
    font-size: 13pt;
    font-weight: 700;
    text-align: center;
  }
  .van-ban-doc__tham-quyen {
    margin: 8pt 0 10pt;
    font-size: 13pt;
    font-weight: 700;
    text-align: center;
    text-transform: uppercase;
  }
  .van-ban-doc__can-cu { margin: 0 0 6pt; text-indent: 1cm; font-style: italic; }
  .van-ban-doc__quyet-dinh-label {
    margin: 10pt 0 10pt;
    font-weight: 700;
    text-align: center;
  }
  .van-ban-doc__meta { margin: 0 0 10pt; }
  .van-ban-doc__meta-row {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 2pt 12pt;
    margin-bottom: 3pt;
  }
  .van-ban-doc__meta-item { margin: 0; }
  .van-ban-doc__meta-label { font-weight: 700; }
  .van-ban-doc__doan { margin: 0 0 8pt; text-align: justify; }
  .van-ban-doc__doan--indent { text-indent: 1cm; }
  .van-ban-doc__doan--center { text-align: center; }
  .van-ban-doc__doan--italic { font-style: italic; }
  .van-ban-doc__doan--bold { font-weight: 700; }
  .van-ban-doc__empty { margin: 8pt 0; text-align: center; font-style: italic; }
  .van-ban-doc__table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    font-size: 11pt;
    margin: 0 0 10pt;
  }
  .van-ban-doc__th,
  .van-ban-doc__td {
    border: 0.5px solid #000;
    padding: 3pt 4pt;
    vertical-align: top;
    overflow-wrap: break-word;
  }
  .van-ban-doc__th { background: #f2f2f2; font-weight: 700; text-align: center; }
  /* Cột STT hẹp — cấm ngắt chữ để html2canvas không xuống dòng thành "ST T". */
  .van-ban-doc__table th:first-child { white-space: nowrap; }
  .van-ban-doc__td--center { text-align: center; }
  .van-ban-doc__td--right { text-align: right; }
  .van-ban-doc__td--nowrap { white-space: nowrap; }
  .van-ban-doc thead { display: table-header-group; }
  .van-ban-doc tr { page-break-inside: avoid; }
  .van-ban-doc__sign {
    display: grid;
    grid-template-columns: 55% 45%;
    gap: 0 8pt;
    margin-top: 14pt;
    page-break-inside: avoid;
  }
  .van-ban-doc__noi-nhan-label { margin: 0 0 2pt; font-size: 12pt; font-weight: 700; font-style: italic; }
  .van-ban-doc__noi-nhan-item { margin: 0; font-size: 11pt; }
  .van-ban-doc__sign-col { text-align: center; }
  .van-ban-doc__sign-role { margin: 0; font-weight: 700; text-transform: uppercase; }
  .van-ban-doc__sign-space { height: 64pt; }
  .van-ban-doc__sign-name { margin: 0; font-weight: 700; }
`;

export function printVanBanDocument(rootEl: HTMLElement, documentTitle: string): boolean {
  const printWindow = window.open('', '_blank', 'noopener,noreferrer,width=900,height=700');
  if (!printWindow) return false;

  const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <title>${documentTitle.replace(/</g, '&lt;')}</title>
  <style>${VAN_BAN_HANH_CHINH_PRINT_STYLES}</style>
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
