/**
 * Đọc MỘT dòng Excel thành lượt thăm hỏi cá nhân — hàm thuần, không gọi mạng.
 *
 * Mọi danh mục (cá nhân, phòng ban, dịp, xã phường) được nạp MỘT lần cho cả file
 * rồi truyền vào `ctx`; mỗi ô nhận id hoặc tên (bỏ dấu, không phân biệt hoa
 * thường, khớp nguyên vẹn — trùng tên thì báo lỗi, không đoán).
 */
import { txt } from '@/lib/text';
import { chuanHoaKhoaSoKhop } from '@/lib/vietnamese';
import { findRefStrict, matchEnumCell, trimCell, type NamedRef } from '@/lib/data/import-cells';
import type { ImportParsedRow, ImportRowOutcome } from '@/lib/data/import-runner';
import {
  DON_VI_THAM_HOI_CQMTTQ_LABEL,
  TRANG_THAI_DEFAULT,
  TRANG_THAI_VALUES,
  type TrangThaiThamHoi,
} from '../core/constants';
import { thamHoiCaNhanSchema, type ThamHoiCaNhanFormValues } from '../core/schema';
import { dbDateToMonthYear, parseThoiGianDuKienImport } from './thoi-gian-du-kien';

export const THAM_HOI_CA_NHAN_IMPORT_MAX_ROWS = 3000;

export interface CaNhanImportRef extends NamedRef {
  doi_tuong: string | null;
  chuc_vu_vi_tri: string | null;
}

export interface ThamHoiCaNhanImportRowCtx {
  caNhan: readonly CaNhanImportRef[];
  phongBan: readonly NamedRef[];
  dip: readonly NamedRef[];
  xaPhuong: readonly NamedRef[];
  /**
   * Cán bộ cấp xã: ô Đơn vị thăm hỏi / Xã phường trống ⇒ gán xã mình (như form),
   * và ít nhất một trong hai phải là xã mình (đúng luật sửa/xoá của module).
   */
  donViPhamVi: string | null;
}

export interface ThamHoiCaNhanImportRow extends ImportParsedRow {
  values: ThamHoiCaNhanFormValues;
  /** Cột sao từ hồ sơ cá nhân + tên dịp — giống hệt lúc lưu từ form. */
  denorm: { doi_tuong: string | null; chuc_vu_vi_tri: string | null };
  tenDip: string;
  idKey: string | null;
}

type Fail = { ok: false; message: string };

function fail(rowNum: number, message: string): Fail {
  return { ok: false, message: txt('shared.import.rowPrefix', { row: rowNum }) + message };
}

/** Tra một ô danh mục; lỗi thì nói rõ là cột nào, giá trị gì. */
function resolveRef<T extends NamedRef>(
  rowNum: number,
  list: readonly T[],
  raw: unknown,
  cotKey: string,
): { ok: true; ref: T | null } | Fail {
  const hit = findRefStrict(list, raw);
  if (hit.ok) return hit;
  const key =
    hit.reason === 'ambiguous' ? 'danTocThamHoiCaNhan.import.errTrungTen' : 'danTocThamHoiCaNhan.import.errKhongThay';
  return fail(rowNum, txt(key, { cot: txt(cotKey), gia_tri: trimCell(raw) }));
}

/**
 * Trạng thái: bản nhập cũ nhận cả ô checkbox (`TRUE`/`1` = đã hoàn thành,
 * `FALSE`/`0` = chưa thực hiện) — giữ nguyên để file cũ vẫn dùng được.
 */
export function parseTrangThaiThamHoiCell(raw: unknown): TrangThaiThamHoi | null {
  const s = trimCell(raw).toLowerCase();
  if (!s) return TRANG_THAI_DEFAULT;
  if (s === 'true' || s === '1') return 'Đã hoàn thành';
  if (s === 'false' || s === '0') return 'Chưa thực hiện';
  return matchEnumCell(TRANG_THAI_VALUES, raw);
}

const CQMTTQ_KEY = chuanHoaKhoaSoKhop(DON_VI_THAM_HOI_CQMTTQ_LABEL);

export function parseThamHoiCaNhanImportRow(
  rowNum: number,
  raw: Record<string, unknown>,
  ctx: ThamHoiCaNhanImportRowCtx,
): ImportRowOutcome<ThamHoiCaNhanImportRow> {
  const caNhan = resolveRef(rowNum, ctx.caNhan, raw.ho_va_ten, 'danTocThamHoiCaNhan.import.cotCaNhan');
  if (!caNhan.ok) return caNhan;
  const phongBan = resolveRef(rowNum, ctx.phongBan, raw.ten_phong_ban, 'danTocThamHoiCaNhan.import.cotPhongBan');
  if (!phongBan.ok) return phongBan;
  const dip = resolveRef(rowNum, ctx.dip, raw.dip_tham_hoi, 'danTocThamHoiCaNhan.import.cotDip');
  if (!dip.ok) return dip;

  // Ô Đơn vị thăm hỏi ghi "CQMTTQ Tỉnh" ⇒ NULL dưới DB (cơ quan tỉnh tự đi).
  const dvCell = trimCell(raw.ten_don_vi_tham_hoi);
  const laCqmttq = dvCell !== '' && chuanHoaKhoaSoKhop(dvCell) === CQMTTQ_KEY;
  let donViThamHoiId = '';
  if (dvCell && !laCqmttq) {
    const dv = resolveRef(rowNum, ctx.xaPhuong, dvCell, 'danTocThamHoiCaNhan.import.cotDonViThamHoi');
    if (!dv.ok) return dv;
    donViThamHoiId = dv.ref?.id ?? '';
  }
  const xp = resolveRef(rowNum, ctx.xaPhuong, raw.ten_xa_phuong, 'danTocThamHoiCaNhan.import.cotXaPhuong');
  if (!xp.ok) return xp;
  let xaPhuongId = xp.ref?.id ?? '';

  if (ctx.donViPhamVi) {
    if (!dvCell) donViThamHoiId = ctx.donViPhamVi;
    if (!xaPhuongId) xaPhuongId = ctx.donViPhamVi;
    if (donViThamHoiId !== ctx.donViPhamVi && xaPhuongId !== ctx.donViPhamVi) {
      return fail(rowNum, txt('danTocThamHoiCaNhan.import.errNgoaiDonVi'));
    }
  }

  const trangThai = parseTrangThaiThamHoiCell(raw.trang_thai);
  if (trangThai === null) {
    return fail(
      rowNum,
      txt('danTocThamHoiCaNhan.import.errTrangThai', {
        gia_tri: trimCell(raw.trang_thai),
        hop_le: TRANG_THAI_VALUES.join(', '),
      }),
    );
  }

  let thoiGian = '';
  if (trimCell(raw.thoi_gian_du_kien)) {
    const iso = parseThoiGianDuKienImport(raw.thoi_gian_du_kien);
    // Bản cũ lặng lẽ bỏ ô không đọc được — giờ báo lỗi để không mất dữ liệu.
    if (!iso) {
      return fail(
        rowNum,
        txt('danTocThamHoiCaNhan.import.errThoiGian', { gia_tri: trimCell(raw.thoi_gian_du_kien) }),
      );
    }
    thoiGian = dbDateToMonthYear(iso);
  }

  const parsed = thamHoiCaNhanSchema.safeParse({
    ca_nhan_id: caNhan.ref?.id ?? '',
    phong_ban_tham_muu_id: phongBan.ref?.id ?? '',
    dip_tham_hoi_id: dip.ref?.id ?? '',
    thoi_gian_du_kien: thoiGian,
    don_vi_tham_hoi_id: donViThamHoiId,
    qua_tang: trimCell(raw.qua_tang),
    xa_phuong_id: xaPhuongId,
    trang_thai: trangThai,
    ket_qua_ghi_chu: trimCell(raw.ket_qua_ghi_chu),
    link_ket_qua: trimCell(raw.link_ket_qua),
  });
  if (!parsed.success) {
    return fail(rowNum, parsed.error.issues[0]?.message ?? parsed.error.message);
  }

  return {
    ok: true,
    data: {
      rowNum,
      raw,
      values: parsed.data,
      denorm: {
        doi_tuong: caNhan.ref?.doi_tuong ?? null,
        chuc_vu_vi_tri: caNhan.ref?.chuc_vu_vi_tri ?? null,
      },
      tenDip: dip.ref?.ten ?? '',
      idKey: trimCell(raw.id) || null,
    },
  };
}
