import { getTodayISODate } from '@/lib/utils';

/** Cạnh ngắn / dài của khổ A4 (mm). */
const A4_NGAN_MM = 210;
const A4_DAI_MM = 297;
const MARGIN = { top: 10, right: 10, bottom: 10, left: 10 };
/** Nén JPEG: giữ chữ sắc nét nhưng nhẹ hơn PNG khoảng 20 lần. */
const JPEG_QUALITY = 0.92;

/**
 * PDF khớp hệt bản xem trước: chụp DOM bằng html2canvas rồi cắt theo khổ A4.
 *
 * Cố ý KHÔNG dùng `pdf.text()` của jsPDF — font mặc định của jsPDF (Helvetica,
 * WinAnsi) không có glyph tiếng Việt nên dấu sẽ rụng hoặc thành ô vuông. Đi qua
 * canvas thì chữ đã được trình duyệt vẽ sẵn, dấu luôn đúng.
 *
 * Mỗi trang được CẮT thành ảnh riêng (thay vì dán cả ảnh dài rồi đẩy lệch lên):
 * cách dán cả ảnh khiến phần thừa tràn ra ngoài mép giấy và mỗi trang phải mang
 * trọn bộ ảnh, làm file phồng lên hàng chục MB.
 */
export async function downloadVanBanPdf(
  element: HTMLElement,
  fileName: string,
  opts?: { orientation?: 'portrait' | 'landscape' },
): Promise<void> {
  const orientation = opts?.orientation ?? 'portrait';
  const pageWMm = orientation === 'landscape' ? A4_DAI_MM : A4_NGAN_MM;
  const pageHMm = orientation === 'landscape' ? A4_NGAN_MM : A4_DAI_MM;
  const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
    import('jspdf'),
    import('html2canvas'),
  ]);

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
    scrollX: 0,
    scrollY: 0,
    windowWidth: element.scrollWidth,
  });

  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation });
  const contentW = pageWMm - MARGIN.left - MARGIN.right;
  const contentH = pageHMm - MARGIN.top - MARGIN.bottom;
  const pxPerMm = canvas.width / contentW;
  const pageHeightPx = Math.max(1, Math.floor(contentH * pxPerMm));

  let offsetY = 0;
  let page = 0;

  while (offsetY < canvas.height) {
    const sliceHeight = Math.min(pageHeightPx, canvas.height - offsetY);
    const slice = document.createElement('canvas');
    slice.width = canvas.width;
    slice.height = sliceHeight;
    const ctx = slice.getContext('2d');
    if (!ctx) break;
    // JPEG không có kênh trong suốt — tô nền trắng trước để không ra nền đen.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, slice.width, slice.height);
    ctx.drawImage(canvas, 0, offsetY, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);

    if (page > 0) pdf.addPage();
    pdf.addImage(
      slice.toDataURL('image/jpeg', JPEG_QUALITY),
      'JPEG',
      MARGIN.left,
      MARGIN.top,
      contentW,
      sliceHeight / pxPerMm,
    );

    offsetY += sliceHeight;
    page += 1;
  }

  pdf.save(`${fileName}_${getTodayISODate()}.pdf`);
}
