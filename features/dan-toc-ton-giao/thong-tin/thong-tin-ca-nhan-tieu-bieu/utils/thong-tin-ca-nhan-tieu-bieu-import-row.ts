/**
 * Đọc MỘT dòng Excel thành hồ sơ cá nhân tiêu biểu — hàm thuần, không gọi mạng.
 *
 * Xã, phường nhận id hoặc tên (bỏ dấu, không phân biệt hoa/thường, khớp nguyên
 * vẹn; trùng tên thì báo lỗi, không đoán). Đối tượng / trạng thái khớp theo danh
 * mục cố định; để trống thì lấy mặc định như trước.
 */
import { txt } from '@/lib/text';
import {
  findRefStrict,
  matchEnumCell,
  parseImportNgay,
  trimCell,
  type NamedRef,
} from '@/lib/data/import-cells';
import type { ImportParsedRow, ImportRowOutcome } from '@/lib/data/import-runner';
import { DOI_TUONG_VALUES, TRANG_THAI_HOAT_DONG, TRANG_THAI_HOAT_DONG_DEFAULT } from '../core/constants';
import { thongTinCaNhanTieuBieuSchema, type ThongTinCaNhanTieuBieuFormValues } from '../core/schema';

export const CA_NHAN_TIEU_BIEU_IMPORT_MAX_ROWS = 3000;

/** Ô Đối tượng để trống — giữ đúng mặc định của bản nhập cũ. */
const DOI_TUONG_IMPORT_DEFAULT = DOI_TUONG_VALUES[1];

export interface CaNhanTieuBieuImportRowCtx {
  xaPhuong: readonly NamedRef[];
  /** Cán bộ cấp xã: chỉ được nhập hồ sơ của xã này; ô xã trống ⇒ gán xã này (như form). */
  donViPhamVi: string | null;
}

export interface CaNhanTieuBieuImportRow extends ImportParsedRow {
  values: ThongTinCaNhanTieuBieuFormValues;
  idKey: string | null;
}

function fail(rowNum: number, message: string): { ok: false; message: string } {
  return { ok: false, message: txt('shared.import.rowPrefix', { row: rowNum }) + message };
}

function enumOrDefault<T extends string>(values: readonly T[], raw: unknown, fallback: T): T | null {
  if (!trimCell(raw)) return fallback;
  return matchEnumCell(values, raw);
}

export function parseCaNhanTieuBieuImportRow(
  rowNum: number,
  raw: Record<string, unknown>,
  ctx: CaNhanTieuBieuImportRowCtx,
): ImportRowOutcome<CaNhanTieuBieuImportRow> {
  const dv = findRefStrict(ctx.xaPhuong, raw.ten_don_vi);
  if (!dv.ok) {
    const key =
      dv.reason === 'ambiguous'
        ? 'danTocCaNhanTieuBieu.import.errDonViTrungTen'
        : 'danTocCaNhanTieuBieu.import.errDonVi';
    return fail(rowNum, txt(key, { gia_tri: trimCell(raw.ten_don_vi) }));
  }
  let donViId = dv.ref?.id ?? '';
  if (ctx.donViPhamVi) {
    if (!donViId) donViId = ctx.donViPhamVi;
    else if (donViId !== ctx.donViPhamVi) return fail(rowNum, txt('danTocCaNhanTieuBieu.import.errNgoaiDonVi'));
  }

  const doiTuong = enumOrDefault(DOI_TUONG_VALUES, raw.doi_tuong, DOI_TUONG_IMPORT_DEFAULT);
  if (doiTuong === null) {
    return fail(
      rowNum,
      txt('danTocCaNhanTieuBieu.import.errDoiTuong', {
        gia_tri: trimCell(raw.doi_tuong),
        hop_le: DOI_TUONG_VALUES.join(', '),
      }),
    );
  }
  const trangThai = enumOrDefault(TRANG_THAI_HOAT_DONG, raw.trang_thai, TRANG_THAI_HOAT_DONG_DEFAULT);
  if (trangThai === null) {
    return fail(
      rowNum,
      txt('danTocCaNhanTieuBieu.import.errTrangThai', {
        gia_tri: trimCell(raw.trang_thai),
        hop_le: TRANG_THAI_HOAT_DONG.join(', '),
      }),
    );
  }

  let ngaySinh = '';
  if (trimCell(raw.ngay_sinh)) {
    const parsedNgay = parseImportNgay(raw.ngay_sinh);
    if (!parsedNgay) {
      return fail(rowNum, txt('danTocCaNhanTieuBieu.import.errNgaySinh', { gia_tri: trimCell(raw.ngay_sinh) }));
    }
    ngaySinh = parsedNgay;
  }

  const parsed = thongTinCaNhanTieuBieuSchema.safeParse({
    ho_va_ten: trimCell(raw.ho_va_ten),
    ngay_sinh: ngaySinh,
    doi_tuong: doiTuong,
    chuc_vu_vi_tri: trimCell(raw.chuc_vu_vi_tri),
    ton_giao_dan_toc: trimCell(raw.ton_giao_dan_toc),
    dia_chi: trimCell(raw.dia_chi),
    don_vi_id: donViId,
    so_dien_thoai: trimCell(raw.so_dien_thoai),
    dong_gop_noi_bat: trimCell(raw.dong_gop_noi_bat),
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
