/**
 * Ô nhập của phiếu khảo sát, theo đúng thứ tự trên mẫu giấy. Nhãn lấy từ
 * `viNguoiNgheo.phieuKhaoSat.nhan.<nhánh>.<trường>` (text.ts).
 *
 * Thông tin chủ hộ (mục 1–7) KHÔNG có ở đây — đọc từ hộ nghèo được gắn.
 */
import type { VnnLinhVuc } from '../../core/constants';
import {
  PKS_CO_KHONG,
  PKS_DOI_TUONG_UU_TIEN,
  PKS_GIAY_TO,
  PKS_GIOI_TINH,
  PKS_HOAN_CANH_HOC_SINH,
  PKS_KET_LUAN,
  PKS_KET_QUA_HOC_TAP,
  PKS_LOAI_SU_CO,
  PKS_MO_HINH,
  PKS_NGUYEN_NHAN_MAT,
  PKS_NHU_CAU_BENH_TAT,
  PKS_NHU_CAU_HOC_SINH,
  PKS_NHU_CAU_THIEN_TAI,
  PKS_THIET_HAI_NHA,
  type VnnLoaiPhieu,
} from '../../core/phieu-khao-sat';

export type PksONhap = {
  /** `so` = số nguyên (năm, số người) · `thapPhan` = tối đa 2 chữ số lẻ (m², km). */
  kind: 'text' | 'textarea' | 'date' | 'tien' | 'so' | 'thapPhan';
  /** `<nhánh>.<trường>` — đường dẫn trong `phieu_khao_sat`. */
  name: string;
  full?: boolean;
  placeholderKey?: string;
  /** Chỉ hiện với các lĩnh vực này (Phiếu 2: nhóm ô bệnh / nhóm ô qua đời). */
  chiKhi?: readonly VnnLinhVuc[];
};

export type PksOTick = {
  kind: 'nhieu' | 'mot';
  name: string;
  options: readonly string[];
  /** Trường chữ của ô "Khác". */
  khac?: string;
  cols?: 1 | 2 | 3;
  chiKhi?: readonly VnnLinhVuc[];
};

export type PksNhom = {
  kind: 'nhom';
  titleKey: string;
  chiKhi?: readonly VnnLinhVuc[];
};

export type PksField = PksONhap | PksOTick | PksNhom;

export function laOTick(f: PksField): f is PksOTick {
  return f.kind === 'nhieu' || f.kind === 'mot';
}

const BENH: readonly VnnLinhVuc[] = ['Chữa bệnh'];
const QUA_DOI: readonly VnnLinhVuc[] = ['Người chết'];

/** Mục I phần không có ở hộ nghèo + hai mục cuối mục II (chung cả 4 phiếu). */
export const PKS_CHUNG_DAU: PksField[] = [
  { kind: 'date', name: 'chung.ngay_khao_sat' },
  { kind: 'tien', name: 'chung.thu_nhap_binh_quan' },
  {
    kind: 'nhieu',
    name: 'chung.doi_tuong_uu_tien',
    options: PKS_DOI_TUONG_UU_TIEN,
    khac: 'chung.doi_tuong_uu_tien_khac',
  },
];

export const PKS_CHUNG_CUOI: PksField[] = [
  { kind: 'textarea', name: 'chung.hoan_canh_gia_dinh', full: true },
  { kind: 'textarea', name: 'chung.ho_tro_nguon_khac', full: true },
];

/** Mục III — kết luận, mức đề xuất, ghi chú. "Hình thức đề xuất" lấy từ Hình thức hỗ trợ. */
export const PKS_Y_KIEN: PksField[] = [
  { kind: 'mot', name: 'chung.ket_luan', options: PKS_KET_LUAN },
  {
    kind: 'text',
    name: 'chung.muc_de_xuat',
    full: true,
    placeholderKey: 'viNguoiNgheo.phieuKhaoSat.nhan.chung.muc_de_xuat_placeholder',
  },
  { kind: 'textarea', name: 'chung.ghi_chu', full: true },
];

export const PKS_MUC_II: Record<VnnLoaiPhieu, PksField[]> = {
  'thien-tai': [
    {
      kind: 'nhieu',
      name: 'thien_tai.loai_su_co',
      options: PKS_LOAI_SU_CO,
      khac: 'thien_tai.loai_su_co_khac',
    },
    { kind: 'text', name: 'thien_tai.thoi_gian_xay_ra' },
    { kind: 'tien', name: 'thien_tai.uoc_tinh_thiet_hai' },
    {
      kind: 'nhieu',
      name: 'thien_tai.thiet_hai_nha',
      options: PKS_THIET_HAI_NHA,
    },
    { kind: 'textarea', name: 'thien_tai.thiet_hai_tai_san', full: true },
    { kind: 'textarea', name: 'thien_tai.thiet_hai_san_xuat', full: true },
    { kind: 'nhom', titleKey: 'viNguoiNgheo.phieuKhaoSat.nhomNhaO' },
    { kind: 'text', name: 'thien_tai.ket_cau_nha', full: true },
    { kind: 'thapPhan', name: 'thien_tai.dien_tich_nha' },
    { kind: 'so', name: 'thien_tai.nam_xay_dung' },
    { kind: 'text', name: 'thien_tai.noi_o_tam', full: true },
    { kind: 'text', name: 'thien_tai.kha_nang_doi_ung', full: true },
    {
      kind: 'nhieu',
      name: 'thien_tai.nhu_cau',
      options: PKS_NHU_CAU_THIEN_TAI,
      khac: 'thien_tai.nhu_cau_khac',
    },
  ],
  'benh-tat': [
    { kind: 'text', name: 'benh_tat.ho_ten' },
    { kind: 'so', name: 'benh_tat.nam_sinh' },
    { kind: 'text', name: 'benh_tat.quan_he_chu_ho', full: true },
    {
      kind: 'nhom',
      titleKey: 'viNguoiNgheo.phieuKhaoSat.nhomBenh',
      chiKhi: BENH,
    },
    { kind: 'text', name: 'benh_tat.chan_doan', full: true, chiKhi: BENH },
    { kind: 'text', name: 'benh_tat.co_so_dieu_tri', full: true, chiKhi: BENH },
    { kind: 'date', name: 'benh_tat.dieu_tri_tu', chiKhi: BENH },
    { kind: 'date', name: 'benh_tat.dieu_tri_den', chiKhi: BENH },
    {
      kind: 'mot',
      name: 'benh_tat.co_bhyt',
      options: PKS_CO_KHONG,
      cols: 2,
      chiKhi: BENH,
    },
    { kind: 'tien', name: 'benh_tat.chi_phi_da_tra', chiKhi: BENH },
    { kind: 'tien', name: 'benh_tat.chi_phi_du_kien', chiKhi: BENH },
    {
      kind: 'nhom',
      titleKey: 'viNguoiNgheo.phieuKhaoSat.nhomQuaDoi',
      chiKhi: QUA_DOI,
    },
    { kind: 'date', name: 'benh_tat.ngay_mat', chiKhi: QUA_DOI },
    { kind: 'text', name: 'benh_tat.noi_mat', chiKhi: QUA_DOI },
    {
      kind: 'mot',
      name: 'benh_tat.nguyen_nhan',
      options: PKS_NGUYEN_NHAN_MAT,
      khac: 'benh_tat.nguyen_nhan_khac',
      chiKhi: QUA_DOI,
    },
    {
      kind: 'text',
      name: 'benh_tat.nguoi_phu_thuoc',
      full: true,
      chiKhi: QUA_DOI,
    },
    {
      kind: 'nhieu',
      name: 'benh_tat.giay_to',
      options: PKS_GIAY_TO,
      khac: 'benh_tat.giay_to_khac',
    },
    {
      kind: 'nhieu',
      name: 'benh_tat.nhu_cau',
      options: PKS_NHU_CAU_BENH_TAT,
      khac: 'benh_tat.nhu_cau_khac',
    },
  ],
  'sinh-ke': [
    { kind: 'so', name: 'sinh_ke.so_lao_dong' },
    { kind: 'text', name: 'sinh_ke.nguon_thu_nhap_chinh' },
    { kind: 'thapPhan', name: 'sinh_ke.dien_tich_dat_sx' },
    { kind: 'text', name: 'sinh_ke.chuong_trai' },
    { kind: 'text', name: 'sinh_ke.kinh_nghiem', full: true },
    {
      kind: 'nhieu',
      name: 'sinh_ke.mo_hinh',
      options: PKS_MO_HINH,
      khac: 'sinh_ke.mo_hinh_khac',
    },
    { kind: 'text', name: 'sinh_ke.quy_mo', full: true },
    { kind: 'text', name: 'sinh_ke.von_doi_ung', full: true },
    { kind: 'text', name: 'sinh_ke.hieu_qua_du_kien', full: true },
    { kind: 'text', name: 'sinh_ke.nguoi_huong_dan', full: true },
  ],
  'hoc-sinh': [
    { kind: 'text', name: 'hoc_sinh.ho_ten' },
    {
      kind: 'mot',
      name: 'hoc_sinh.gioi_tinh',
      options: PKS_GIOI_TINH,
      cols: 2,
    },
    { kind: 'date', name: 'hoc_sinh.ngay_sinh' },
    { kind: 'text', name: 'hoc_sinh.lop' },
    { kind: 'text', name: 'hoc_sinh.truong' },
    { kind: 'text', name: 'hoc_sinh.quan_he_chu_ho' },
    {
      kind: 'mot',
      name: 'hoc_sinh.ket_qua_hoc_tap',
      options: PKS_KET_QUA_HOC_TAP,
      cols: 3,
    },
    {
      kind: 'nhieu',
      name: 'hoc_sinh.hoan_canh',
      options: PKS_HOAN_CANH_HOC_SINH,
      khac: 'hoc_sinh.hoan_canh_khac',
    },
    { kind: 'thapPhan', name: 'hoc_sinh.khoang_cach_km' },
    { kind: 'text', name: 'hoc_sinh.phuong_tien' },
    {
      kind: 'nhieu',
      name: 'hoc_sinh.nhu_cau',
      options: PKS_NHU_CAU_HOC_SINH,
      khac: 'hoc_sinh.nhu_cau_khac',
    },
  ],
};

export function pksNhan(name: string): string {
  return `viNguoiNgheo.phieuKhaoSat.nhan.${name}`;
}

export function pksFieldVisible(f: PksField, linhVuc: string): boolean {
  return !f.chiKhi || (f.chiKhi as readonly string[]).includes(linhVuc);
}
