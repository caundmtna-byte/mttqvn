import { z } from 'zod';
import { txt } from '@/lib/text';
import { CONG_VIEC_MUC_DO, CONG_VIEC_TRANG_THAI } from './constants';
import type { CongViecDanhSach } from './types';

const optionalLink = z
  .string()
  .trim()
  .transform((s) => s)
  .pipe(
    z.union([z.literal(''), z.string().url(txt('taskList.validation.linkUrl'))]).transform((s) => (s === '' ? undefined : s)),
  );

const optionalDate = z
  .string()
  .trim()
  .transform((s) => (s === '' ? undefined : s))
  .pipe(z.union([z.undefined(), z.string().min(1, txt('taskList.validation.dateInvalid'))]));

export const congViecDanhSachSchema = z.object({
  muc_do: z.enum(CONG_VIEC_MUC_DO, { message: txt('taskList.validation.mucDoRequired') }),
  ten_cong_viec: z.string().trim().min(1, txt('taskList.validation.tenCongViecRequired')),
  ghi_chu: z
    .string()
    .trim()
    .optional()
    .transform((s) => (s === '' ? undefined : s)),
  link_tai_lieu: optionalLink,
  thoi_han: optionalDate,
  tien_do: z.preprocess(
    (v) => {
      if (v === '' || v === undefined || v === null) return 0;
      const n = typeof v === 'number' ? v : Number(v);
      return Number.isFinite(n) ? n : 0;
    },
    z.number().int().min(0).max(100, txt('taskList.validation.tienDoRange')),
  ),
  id_trach_nhiem: z.string().trim().min(1, txt('taskList.validation.trachNhiemRequired')),
  ids_ho_tro: z.array(z.string()),
  trang_thai: z.enum(CONG_VIEC_TRANG_THAI, { message: txt('taskList.validation.trangThaiRequired') }),
  ket_qua: z
    .string()
    .trim()
    .optional()
    .transform((s) => (s === '' ? undefined : s)),
  link_kq: optionalLink,
  ngay_hoan_thanh: optionalDate,
});

export type CongViecDanhSachFormValues = z.infer<typeof congViecDanhSachSchema>;

/** Ghép bản ghi hiện có → payload form (cập nhật một phần / báo cáo / hủy). */
export function congViecRowToFormValues(row: CongViecDanhSach): CongViecDanhSachFormValues {
  return {
    muc_do: row.muc_do,
    ten_cong_viec: row.ten_cong_viec,
    ghi_chu: row.ghi_chu ?? undefined,
    link_tai_lieu: row.link_tai_lieu ?? undefined,
    thoi_han: row.thoi_han ?? undefined,
    tien_do: row.tien_do,
    id_trach_nhiem: row.id_trach_nhiem,
    ids_ho_tro: [...row.ids_ho_tro],
    trang_thai: row.trang_thai,
    ket_qua: row.ket_qua ?? undefined,
    link_kq: row.link_kq ?? undefined,
    ngay_hoan_thanh: row.ngay_hoan_thanh ?? undefined,
  };
}
