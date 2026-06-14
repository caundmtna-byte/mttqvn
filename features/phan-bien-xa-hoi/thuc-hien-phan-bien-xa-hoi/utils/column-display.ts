import type { ThucHienPhanBien } from '../core/types';
import {
  formatPbxhDateTimeDisplay,
  formatPbxhDonViThucHienDisplay,
  formatPbxhNgayDisplay,
  formatPbxhNguoiTaoDisplay,
  formatPbxhPhanTramDisplay,
  formatPbxhSoNguyenDisplay,
  formatPbxhTienDoDisplay,
  trimmedPbxhDisplay,
} from './display-format';

export function getThucHienColumnDisplayValue(
  item: ThucHienPhanBien,
  colId: string,
): string {
  switch (colId) {
    case 'don_vi_thuc_hien':
      return formatPbxhDonViThucHienDisplay(item);
    case 'tien_do':
      return formatPbxhTienDoDisplay(item);
    case 'ngay_bat_dau':
      return formatPbxhNgayDisplay(item.ngay_bat_dau);
    case 'ngay_ket_thuc':
      return formatPbxhNgayDisplay(item.ngay_ket_thuc);
    case 'mo_ta_thoi_gian':
      return trimmedPbxhDisplay(item.mo_ta_thoi_gian) ?? '';
    case 'ten_don_vi_chu_tri':
      return trimmedPbxhDisplay(item.ten_don_vi_chu_tri) ?? '';
    case 'ten_doi_tuong':
      return trimmedPbxhDisplay(item.ten_doi_tuong) ?? '';
    case 'ten_hinh_thuc':
      return trimmedPbxhDisplay(item.ten_hinh_thuc) ?? '';
    case 'ten_phong_ban':
      return trimmedPbxhDisplay(item.ten_phong_ban) ?? '';
    case 'ket_qua_kien_nghi':
      return trimmedPbxhDisplay(item.ket_qua_kien_nghi) ?? '';
    case 'link_ket_qua':
      return trimmedPbxhDisplay(item.link_ket_qua) ?? '';
    case 'so_lan_hoan_thanh':
      return formatPbxhSoNguyenDisplay(item.so_lan_hoan_thanh);
    case 'so_lan_khao_sat':
      return formatPbxhSoNguyenDisplay(item.so_lan_khao_sat);
    case 'phan_tram_hoan_thanh':
      return formatPbxhPhanTramDisplay(item.phan_tram_hoan_thanh);
    case 'ho_va_ten_nguoi_tao':
      return formatPbxhNguoiTaoDisplay(item);
    case 'tg_cap_nhat':
      return formatPbxhDateTimeDisplay(item.tg_cap_nhat);
    default:
      return String((item as unknown as Record<string, unknown>)[colId] ?? '');
  }
}
