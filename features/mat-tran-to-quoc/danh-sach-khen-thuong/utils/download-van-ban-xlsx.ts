import { exportToExcel } from '@/lib/utils';
import { layBangDauTien, type VanBanHanhChinhModel } from './van-ban-hanh-chinh';

/**
 * Xuất phần bảng của văn bản ra Excel (tiện đối chiếu/tổng hợp).
 * Văn bản không có bảng thì không xuất gì và trả về false.
 */
export function downloadVanBanXlsx(model: VanBanHanhChinhModel, fileName: string): boolean {
  const bang = layBangDauTien(model.noiDung);
  if (!bang || bang.rows.length === 0) return false;
  const data = bang.rows.map((row) => {
    const rec: Record<string, unknown> = {};
    bang.headers.forEach((h, i) => {
      rec[h] = row[i] ?? '';
    });
    return rec;
  });
  exportToExcel(data, fileName);
  return true;
}
