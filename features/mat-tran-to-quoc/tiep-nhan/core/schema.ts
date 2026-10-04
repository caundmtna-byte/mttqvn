import { z } from 'zod';
import { txt } from '@/lib/text';
import { parseSoInput } from '@/lib/number';
import { TN_HINH_THUC_VALUES, TN_MUC_DICH_VALUES, TN_PHU_LUC_MAX, TN_TRANG_THAI_VALUES } from './constants';
import type { TiepNhanFull, TnPhuLucDong } from './types';
import { tongGiaTriTiepNhan } from '../utils/tong-gia-tri';

/** Ô tiền: trống ⇒ undefined; có nhập thì phải là số ≥ 0 (dán "1.000.000" từ Excel vẫn đọc được). */
const optionalTien = z.preprocess(
  (val) => {
    if (val == null) return undefined;
    if (typeof val === 'number') return Number.isFinite(val) ? val : undefined;
    const s = String(val).trim();
    if (s === '') return undefined;
    return parseSoInput(s) ?? Number.NaN;
  },
  z.number({ message: txt('matTranTiepNhan.validation.soTienInvalid') }).min(0, txt('matTranTiepNhan.validation.soTienInvalid')).optional(),
);

const text = z.string().trim();

const phuLucDong = z.object({
  ho_ten: text,
  dia_chi: text,
  quan_he: text,
  noi_dung_gia_tri: text,
});

export const tiepNhanSchema = z
  .object({
    ngay_tiep_nhan: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, txt('matTranTiepNhan.validation.ngayRequired')),
    nha_tai_tro_id: z.string().trim().min(1, txt('matTranTiepNhan.validation.nhaTaiTroRequired')),
    chuong_trinh_id: z.string().trim().min(1, txt('matTranTiepNhan.validation.chuongTrinhRequired')),
    hinh_thuc: z.union([z.enum(TN_HINH_THUC_VALUES), z.literal('')]),
    so_tien: optionalTien,
    giay_to_co_gia_mo_ta: text,
    giay_to_co_gia_gia_tri: optionalTien,
    hien_vat_khac_mo_ta: text,
    hien_vat_khac_gia_tri: optionalTien,
    /** Id phiếu "Nhập từ ngoài" gắn vào khoản này. */
    phieu_ids: z.array(z.string()),
    /** Σ thành tiền các phiếu đã chọn — form tự tính, chỉ dùng để kiểm "khoản có giá trị". */
    gia_tri_phieu_kho: z.number(),
    muc_dich: z.array(z.enum(TN_MUC_DICH_VALUES as [string, ...string[]])),
    dia_diem_lap: text,
    phu_luc: z.array(phuLucDong).max(TN_PHU_LUC_MAX, txt('matTranTiepNhan.validation.phuLucMax', { max: TN_PHU_LUC_MAX })),
    trang_thai: z.enum(TN_TRANG_THAI_VALUES),
    ghi_chu: text,
  })
  .superRefine((v, ctx) => {
    // Khớp CHECK tn_hinh_thuc_theo_tien_chk: có tiền ⇔ có hình thức.
    if ((v.so_tien ?? 0) > 0 && !v.hinh_thuc) {
      ctx.addIssue({ code: 'custom', path: ['hinh_thuc'], message: txt('matTranTiepNhan.validation.hinhThucRequired') });
    }
    if ((v.giay_to_co_gia_gia_tri ?? 0) > 0 && !v.giay_to_co_gia_mo_ta) {
      ctx.addIssue({ code: 'custom', path: ['giay_to_co_gia_mo_ta'], message: txt('matTranTiepNhan.validation.moTaKhiCoGiaTri') });
    }
    if ((v.hien_vat_khac_gia_tri ?? 0) > 0 && !v.hien_vat_khac_mo_ta) {
      ctx.addIssue({ code: 'custom', path: ['hien_vat_khac_mo_ta'], message: txt('matTranTiepNhan.validation.moTaKhiCoGiaTri') });
    }
    // Bản sao luật trong rpc_tn_luu_tiep_nhan (TN_GIA_TRI_RONG).
    if (tongGiaTriTiepNhan(v) <= 0) {
      ctx.addIssue({ code: 'custom', path: ['so_tien'], message: txt('matTranTiepNhan.validation.tongGiaTriRong') });
    }
  });

export type TiepNhanFormValues = z.infer<typeof tiepNhanSchema>;

/** Hình dạng ô nhập — tiền là chuỗi để giữ được ô trống. */
export type TiepNhanFormInput = Omit<
  TiepNhanFormValues,
  'so_tien' | 'giay_to_co_gia_gia_tri' | 'hien_vat_khac_gia_tri' | 'hinh_thuc'
> & {
  hinh_thuc: string;
  so_tien: string;
  giay_to_co_gia_gia_tri: string;
  hien_vat_khac_gia_tri: string;
};

const soSangChuoi = (n: number | null | undefined) => (n == null || n === 0 ? '' : String(n));

export function tiepNhanToFormInput(row: TiepNhanFull | null, homNay: string): TiepNhanFormInput {
  if (!row) {
    return {
      ngay_tiep_nhan: homNay,
      nha_tai_tro_id: '',
      chuong_trinh_id: '',
      hinh_thuc: 'Chuyển khoản',
      so_tien: '',
      giay_to_co_gia_mo_ta: '',
      giay_to_co_gia_gia_tri: '',
      hien_vat_khac_mo_ta: '',
      hien_vat_khac_gia_tri: '',
      phieu_ids: [],
      gia_tri_phieu_kho: 0,
      muc_dich: [],
      dia_diem_lap: '',
      phu_luc: [],
      trang_thai: 'Đăng ký',
      ghi_chu: '',
    };
  }
  return {
    ngay_tiep_nhan: row.ngay_tiep_nhan,
    nha_tai_tro_id: row.nha_tai_tro_id,
    chuong_trinh_id: row.chuong_trinh_id,
    hinh_thuc: row.hinh_thuc ?? '',
    so_tien: soSangChuoi(row.so_tien),
    giay_to_co_gia_mo_ta: row.giay_to_co_gia_mo_ta ?? '',
    giay_to_co_gia_gia_tri: soSangChuoi(row.giay_to_co_gia_gia_tri),
    hien_vat_khac_mo_ta: row.hien_vat_khac_mo_ta ?? '',
    hien_vat_khac_gia_tri: soSangChuoi(row.hien_vat_khac_gia_tri),
    phieu_ids: row.phieu_kho.map((p) => p.phieu_id),
    gia_tri_phieu_kho: row.gia_tri_phieu_kho,
    muc_dich: [...row.muc_dich],
    dia_diem_lap: row.dia_diem_lap ?? '',
    phu_luc: row.phu_luc.map((d) => ({ ...d })),
    trang_thai: row.trang_thai,
    ghi_chu: row.ghi_chu ?? '',
  };
}

const dongTrong = (d: TnPhuLucDong) => !d.ho_ten && !d.dia_chi && !d.quan_he && !d.noi_dung_gia_tri;

/** Giá trị đã kiểm → `p_data` của RPC `rpc_tn_luu_tiep_nhan`. Không có tiền ⇒ không ghi hình thức. */
export function tiepNhanToRpcData(v: TiepNhanFormValues): Record<string, unknown> {
  const soTien = v.so_tien ?? 0;
  return {
    ngay_tiep_nhan: v.ngay_tiep_nhan,
    nha_tai_tro_id: Number(v.nha_tai_tro_id),
    chuong_trinh_id: Number(v.chuong_trinh_id),
    hinh_thuc: soTien > 0 ? v.hinh_thuc : null,
    so_tien: soTien,
    giay_to_co_gia_mo_ta: v.giay_to_co_gia_mo_ta || null,
    giay_to_co_gia_gia_tri: v.giay_to_co_gia_gia_tri ?? null,
    hien_vat_khac_mo_ta: v.hien_vat_khac_mo_ta || null,
    hien_vat_khac_gia_tri: v.hien_vat_khac_gia_tri ?? null,
    muc_dich: v.muc_dich,
    dia_diem_lap: v.dia_diem_lap || null,
    phu_luc: v.phu_luc.filter((d) => !dongTrong(d)),
    trang_thai: v.trang_thai,
    ghi_chu: v.ghi_chu || null,
  };
}

export const tiepNhanTrangThaiSchema = z.object({
  trang_thai: z.enum(TN_TRANG_THAI_VALUES),
  ghi_chu: text,
});
export type TiepNhanTrangThaiValues = z.infer<typeof tiepNhanTrangThaiSchema>;
