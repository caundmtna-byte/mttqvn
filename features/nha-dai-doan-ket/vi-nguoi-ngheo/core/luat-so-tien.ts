import { vnnCoHienVat, VNN_TRANG_THAI_DA_NHAN } from './constants';

/**
 * Luật tiền của Chương trình hỗ trợ — bản sao CHECK `vnn_so_tien_theo_trang_thai_chk`
 * (migration `20261004120000_nddk_nha_tai_tro_tien_bat_buoc`).
 *
 * Khoản "Đã nhận" phải có giá trị cụ thể theo hình thức:
 *   Tiền mặt         ⇒ so_tien > 0
 *   Hiện vật         ⇒ tong_tien_quy_doi > 0
 *   Hiện vật và Tiền ⇒ cả hai > 0
 * Trả về danh sách ô còn thiếu (rỗng = hợp lệ).
 */
export type VnnOTien = 'so_tien' | 'tong_tien_quy_doi';

export function vnnOTienCanNhap(v: {
  trang_thai: string | null | undefined;
  hinh_thuc_ho_tro: string | null | undefined;
  so_tien?: number | null;
  tong_tien_quy_doi?: number | null;
}): VnnOTien[] {
  if (v.trang_thai !== VNN_TRANG_THAI_DA_NHAN) return [];
  const duong = (n: number | null | undefined) => typeof n === 'number' && n > 0;
  const thieu: VnnOTien[] = [];
  if (v.hinh_thuc_ho_tro !== 'Hiện vật' && !duong(v.so_tien)) thieu.push('so_tien');
  if (vnnCoHienVat(v.hinh_thuc_ho_tro) && !duong(v.tong_tien_quy_doi)) thieu.push('tong_tien_quy_doi');
  return thieu;
}
