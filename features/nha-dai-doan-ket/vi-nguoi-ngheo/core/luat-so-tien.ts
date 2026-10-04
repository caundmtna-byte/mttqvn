import { vnnCoHienVat } from './constants';

/**
 * Luật tiền của Chương trình hỗ trợ — bản sao CHECK `vnn_so_tien_theo_hinh_thuc_chk`
 * (migration `20261004200000_tien_bat_buoc_cho_phep_0`). Sửa một bên phải sửa cả bên kia.
 *
 * Mọi khoản, ở mọi trạng thái, phải nhập ô tiền theo hình thức (được nhập 0):
 *   Tiền mặt         ⇒ so_tien
 *   Hiện vật         ⇒ tong_tien_quy_doi
 *   Hiện vật và Tiền ⇒ cả hai
 * Trả về danh sách ô còn thiếu (rỗng = hợp lệ).
 */
export type VnnOTien = 'so_tien' | 'tong_tien_quy_doi';

export function vnnOTienCanNhap(v: {
  hinh_thuc_ho_tro: string | null | undefined;
  so_tien?: number | null;
  tong_tien_quy_doi?: number | null;
}): VnnOTien[] {
  const coSo = (n: number | null | undefined) => typeof n === 'number' && !Number.isNaN(n);
  const thieu: VnnOTien[] = [];
  if (v.hinh_thuc_ho_tro !== 'Hiện vật' && !coSo(v.so_tien)) thieu.push('so_tien');
  if (vnnCoHienVat(v.hinh_thuc_ho_tro) && !coSo(v.tong_tien_quy_doi)) thieu.push('tong_tien_quy_doi');
  return thieu;
}
