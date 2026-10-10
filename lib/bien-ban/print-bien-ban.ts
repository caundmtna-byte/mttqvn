import type { BienBanKhoGiay } from './bien-ban-model';
import { bienBanPrintStyles } from './bien-ban-styles';

/**
 * In qua cửa sổ riêng (HTML + CSS sạch) — tránh xung đột với pattern
 * `body * { visibility: hidden }` của Layout/sidebar trong `index.css`.
 * Trả `false` khi trình duyệt chặn popup.
 */
export function printBienBanDocument(
  rootEl: HTMLElement,
  documentTitle: string,
  khoGiay: BienBanKhoGiay = 'doc',
): boolean {
  // KHÔNG thêm `noopener`: `window.open` có `noopener` luôn trả về `null`.
  const printWindow = window.open('', '_blank', 'width=900,height=700');
  if (!printWindow) return false;

  const html = `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <title>${documentTitle.replace(/</g, '&lt;')}</title>
  <style>${bienBanPrintStyles(khoGiay)}</style>
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
