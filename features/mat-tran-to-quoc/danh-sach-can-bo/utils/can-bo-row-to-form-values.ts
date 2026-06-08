import type { MttqCanBo } from '../core/types';
import type { MttqCanBoFormValues } from '../core/schema';
import { rootPhongBanIdForForm } from './phong-ban-form';
import { normalizeTonGiaoFromDb } from './ton-giao-form';

function toFormFk(v: string | null | undefined): string {
  return v != null && String(v).trim() !== '' ? String(v) : '';
}

function toFormDate(v: string | null | undefined): string {
  if (v == null || v === '') return '';
  return String(v).slice(0, 10);
}

/** Map bản ghi danh sách cán bộ → giá trị form chỉnh sửa (đồng bộ với `MttqCanBoForm`). */
export function mttqCanBoRowToFormValues(
  initialData: MttqCanBo,
  departments: { id: string; cha_id: string | null }[],
): MttqCanBoFormValues {
  const idPb = rootPhongBanIdForForm(initialData.phong_ban_id, departments);
  return {
    id_phong_ban: idPb,
    to_chuc_ids: Array.isArray(initialData.to_chuc_ids) ? initialData.to_chuc_ids.map(String) : [],
    ho_ten: initialData.ho_ten,
    ngay_sinh: toFormDate(initialData.ngay_sinh),
    gioi_tinh: initialData.gioi_tinh as MttqCanBoFormValues['gioi_tinh'],
    dan_toc_id: toFormFk(initialData.dan_toc_id),
    ton_giao: normalizeTonGiaoFromDb(initialData.ton_giao),
    dia_chi: initialData.dia_chi ?? '',
    dang_vien: initialData.dang_vien,
    trinh_do_id: toFormFk(initialData.trinh_do_id),
    ly_luan_chinh_tri_id: toFormFk(initialData.ly_luan_chinh_tri_id),
    dien_thoai: initialData.dien_thoai ?? '',
    chuc_vu_id: toFormFk(initialData.chuc_vu_id),
    cap_quan_ly: (Array.isArray(initialData.cap_quan_ly)
      ? initialData.cap_quan_ly
      : []) as MttqCanBoFormValues['cap_quan_ly'],
    don_vi_id: toFormFk(initialData.don_vi_id),
    ngay_tham_gia_to_chuc: toFormDate(initialData.ngay_tham_gia_to_chuc),
    trang_thai_id: toFormFk(initialData.trang_thai_id),
    ngay_nhap_trang_thai: toFormDate(initialData.ngay_nhap_trang_thai),
    van_hoa: initialData.van_hoa ?? '',
    ngay_vao_dang: toFormDate(initialData.ngay_vao_dang),
    que_quan: initialData.que_quan ?? '',
    noi_o_hien_nay: initialData.noi_o_hien_nay ?? '',
  };
}
