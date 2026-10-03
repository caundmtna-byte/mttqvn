/**
 * CSS của biên bản — MỘT nguồn cho cả màn xem trước, cửa sổ in và PDF.
 *
 * Trang xem trước chèn `BIEN_BAN_SCREEN_STYLES` bằng thẻ `<style>`; cửa sổ in
 * dùng `BIEN_BAN_PRINT_STYLES` (bỏ lề của khung, lề giấy do `@page` lo). Không
 * đặt trong `index.css`: hai nơi giữ hai bản CSS là hai nơi phải sửa cùng lúc.
 */
const BASE = `
  .bien-ban-doc {
    font-family: 'Times New Roman', Times, serif;
    font-size: 13pt;
    line-height: 1.5;
    color: #000;
    box-sizing: border-box;
    width: 100%;
  }
  .bien-ban-doc * { box-sizing: border-box; }
  .bien-ban-doc p { margin: 0; }
  .bien-ban-doc__quoc-hieu { text-align: center; margin: 0 0 14pt; }
  .bien-ban-doc__quoc-hieu-dong { font-size: 13pt; font-weight: 700; text-transform: uppercase; }
  .bien-ban-doc__tieu-ngu { font-size: 13pt; font-weight: 700; }
  .bien-ban-doc__rule { width: 34%; height: 1px; margin: 2pt auto 0; border: 0; background: #000; }
  .bien-ban-doc__tieu-de { text-align: center; margin: 0 0 14pt; }
  .bien-ban-doc__tieu-de-dong--lg { font-size: 14pt; }
  .bien-ban-doc__tieu-de-dong--bold { font-weight: 700; }
  .bien-ban-doc__tieu-de-dong--italic { font-style: italic; }
  .bien-ban-doc__doan { margin: 0 0 4pt !important; }
  .bien-ban-doc__doan--indent { text-indent: 1cm; }
  .bien-ban-doc__doan--bold { font-weight: 700; }
  .bien-ban-doc__doan--italic { font-style: italic; }
  .bien-ban-doc__doan--left { text-align: left; }
  .bien-ban-doc__doan--center { text-align: center; }
  .bien-ban-doc__doan--right { text-align: right; }
  .bien-ban-doc__doan--justify { text-align: justify; }
  .bien-ban-doc__run--bold { font-weight: 700; }
  .bien-ban-doc__run--italic { font-style: italic; }
  /* Dòng chấm dài không có khoảng trắng — cho phép ngắt ở bất kỳ đâu. */
  .bien-ban-doc__dots { overflow-wrap: anywhere; word-break: break-all; }
  .bien-ban-doc__lua-chon { margin: 0 0 4pt; }
  .bien-ban-doc__lua-chon--inline .bien-ban-doc__lua-chon-opt { margin-left: 16pt; }
  .bien-ban-doc__lua-chon--stack .bien-ban-doc__lua-chon-opt { display: block; padding-left: 2.2cm; }
  .bien-ban-doc__lua-chon-nhan { margin: 0; }
  .bien-ban-doc__lua-chon-luoi { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); column-gap: 12pt; padding-left: 1cm; }
  .bien-ban-doc__o { font-family: 'Segoe UI Symbol', 'DejaVu Sans', 'Arial Unicode MS', sans-serif; margin-right: 4pt; }
  .bien-ban-doc__ky { margin-top: 14pt; page-break-inside: avoid; break-inside: avoid; }
  .bien-ban-doc__ky-ngay { text-align: right; font-style: italic; margin: 0 0 4pt !important; }
  .bien-ban-doc__ky-grid { display: grid; gap: 0 6pt; }
  .bien-ban-doc__ky-nhom { text-align: center; font-weight: 700; text-transform: uppercase; margin-bottom: 2pt; }
  .bien-ban-doc__ky-col { text-align: center; }
  .bien-ban-doc__ky-title { font-weight: 700; }
  .bien-ban-doc__ky-note { font-style: italic; font-size: 12pt; }
  .bien-ban-doc__ky-space { height: 64pt; }
  .bien-ban-doc__ky-name { font-weight: 700; }
  .bien-ban-doc__bang { width: 100%; border-collapse: collapse; table-layout: fixed; margin: 2pt 0 6pt; font-size: 12pt; line-height: 1.3; }
  .bien-ban-doc__bang tr { page-break-inside: avoid; break-inside: avoid; }
  .bien-ban-doc__bang th, .bien-ban-doc__bang td { border: 1px solid #000; padding: 3pt 4pt; vertical-align: middle; overflow-wrap: anywhere; }
  .bien-ban-doc__bang th { font-weight: 700; text-align: center; }
  .bien-ban-doc__bang td { height: 18pt; }
  .bien-ban-doc__bang-o--left { text-align: left; }
  .bien-ban-doc__bang-o--center { text-align: center; }
  .bien-ban-doc__bang-o--right { text-align: right; }
  .bien-ban-doc__bang-tong td { font-weight: 700; }
`;

/** Khung xem trước: lề giống lề giấy thật để bản PDF chụp lại khớp bản in. */
export const BIEN_BAN_SCREEN_STYLES = `${BASE}
  .bien-ban-doc { padding: 20mm 15mm 20mm 30mm; }
`;

export const BIEN_BAN_PRINT_STYLES = `
  @page { size: A4 portrait; margin: 20mm 15mm 20mm 30mm; }
  body {
    margin: 0;
    padding: 0;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
${BASE}
  .bien-ban-doc { padding: 0; max-width: 210mm; margin: 0 auto; }
`;
