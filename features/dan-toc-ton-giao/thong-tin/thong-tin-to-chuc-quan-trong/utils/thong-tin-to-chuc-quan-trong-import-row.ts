/**
 * Đọc MỘT dòng Excel thành hồ sơ tổ chức tôn giáo — hàm thuần, không gọi mạng.
 *
 * Xã, phường nhận id hoặc tên (bỏ dấu, không phân biệt hoa/thường, khớp nguyên
 * vẹn; trùng tên thì báo lỗi, không đoán). Loại hình / trạng thái khớp theo danh
 * mục cố định; để trống thì lấy mặc định như trước.
 */
import { txt } from '@/lib/text';
import { findRefStrict, matchEnumCell, trimCell, type NamedRef } from '@/lib/data/import-cells';
import type { ImportParsedRow, ImportRowOutcome } from '@/lib/data/import-runner';
import {
  LOAI_HINH_DEFAULT,
  LOAI_HINH_VALUES,
  TRANG_THAI_HOAT_DONG,
  TRANG_THAI_HOAT_DONG_DEFAULT,
} from '../core/constants';
import { thongTinToChucQuanTrongSchema, type ThongTinToChucQuanTrongFormValues } from '../core/schema';

export const TO_CHUC_QUAN_TRONG_IMPORT_MAX_ROWS = 3000;

export interface ToChucQuanTrongImportRowCtx {
  xaPhuong: readonly NamedRef[];
  /** Cán bộ cấp xã: chỉ được nhập hồ sơ của xã này; ô xã trống ⇒ gán xã này. */
  donViPhamVi: string | null;
}

export interface ToChucQuanTrongImportRow extends ImportParsedRow {
  values: ThongTinToChucQuanTrongFormValues;
  idKey: string | null;
}

function fail(rowNum: number, message: string): { ok: false; message: string } {
  return { ok: false, message: txt('shared.import.rowPrefix', { row: rowNum }) + message };
}

function enumOrDefault<T extends string>(values: readonly T[], raw: unknown, fallback: T): T | null {
  if (!trimCell(raw)) return fallback;
  return matchEnumCell(values, raw);
}

export function parseToChucQuanTrongImportRow(
  rowNum: number,
  raw: Record<string, unknown>,
  ctx: ToChucQuanTrongImportRowCtx,
): ImportRowOutcome<ToChucQuanTrongImportRow> {
  const dv = findRefStrict(ctx.xaPhuong, raw.ten_don_vi);
  if (!dv.ok) {
    const key =
      dv.reason === 'ambiguous'
        ? 'danTocToChucQuanTrong.import.errDonViTrungTen'
        : 'danTocToChucQuanTrong.import.errDonVi';
    return fail(rowNum, txt(key, { gia_tri: trimCell(raw.ten_don_vi) }));
  }
  let donViId = dv.ref?.id ?? '';
  if (ctx.donViPhamVi) {
    if (!donViId) donViId = ctx.donViPhamVi;
    else if (donViId !== ctx.donViPhamVi) return fail(rowNum, txt('danTocToChucQuanTrong.import.errNgoaiDonVi'));
  }

  const loaiHinh = enumOrDefault(LOAI_HINH_VALUES, raw.loai_hinh, LOAI_HINH_DEFAULT);
  if (loaiHinh === null) {
    return fail(
      rowNum,
      txt('danTocToChucQuanTrong.import.errLoaiHinh', {
        gia_tri: trimCell(raw.loai_hinh),
        hop_le: LOAI_HINH_VALUES.join(', '),
      }),
    );
  }
  const trangThai = enumOrDefault(TRANG_THAI_HOAT_DONG, raw.trang_thai, TRANG_THAI_HOAT_DONG_DEFAULT);
  if (trangThai === null) {
    return fail(
      rowNum,
      txt('danTocToChucQuanTrong.import.errTrangThai', {
        gia_tri: trimCell(raw.trang_thai),
        hop_le: TRANG_THAI_HOAT_DONG.join(', '),
      }),
    );
  }

  const parsed = thongTinToChucQuanTrongSchema.safeParse({
    loai_hinh: loaiHinh,
    ten_co_so: trimCell(raw.ten_co_so),
    chu_tri: trimCell(raw.chu_tri),
    lich_su_hinh_thanh: trimCell(raw.lich_su_hinh_thanh),
    cong_tac_an_sinh: trimCell(raw.cong_tac_an_sinh),
    don_vi_id: donViId,
    dia_chi: trimCell(raw.dia_chi),
    so_dien_thoai: trimCell(raw.so_dien_thoai),
    trang_thai: trangThai,
  });
  if (!parsed.success) {
    return fail(rowNum, parsed.error.issues[0]?.message ?? parsed.error.message);
  }

  return {
    ok: true,
    data: { rowNum, raw, values: parsed.data, idKey: trimCell(raw.id) || null },
  };
}
