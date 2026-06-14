import { getTodayISODate } from '@/lib/utils';

const PAGE_W_MM = 210;
const PAGE_H_MM = 297;
const MARGIN = { top: 10, right: 10, bottom: 10, left: 10 };

/** PDF khớp preview — chụp DOM bằng html2canvas, tách trang A4. */
export async function downloadNhapXuatKhoPhieuPdf(
  element: HTMLElement,
  fileName: string,
): Promise<void> {
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

  const pdf = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const contentW = PAGE_W_MM - MARGIN.left - MARGIN.right;
  const contentH = PAGE_H_MM - MARGIN.top - MARGIN.bottom;
  const imgW = contentW;
  const imgH = (canvas.height * imgW) / canvas.width;
  const imgData = canvas.toDataURL('image/png');

  let offsetY = 0;
  let page = 0;

  while (offsetY < imgH) {
    if (page > 0) pdf.addPage();
    pdf.addImage(imgData, 'PNG', MARGIN.left, MARGIN.top - offsetY, imgW, imgH);
    offsetY += contentH;
    page += 1;
  }

  pdf.save(`${fileName}_${getTodayISODate()}.pdf`);
}
