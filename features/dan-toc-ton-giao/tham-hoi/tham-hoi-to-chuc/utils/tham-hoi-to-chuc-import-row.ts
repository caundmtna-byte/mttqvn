/**
 * Đọc MỘT dòng Excel thành lượt thăm hỏi tổ chức — hàm thuần, không gọi mạng.
 *
 * Danh mục (cơ sở tôn giáo, dịp, xã phường) được nạp MỘT lần cho cả file rồi
 * truyền vào `ctx`; mỗi ô nhận id hoặc tên (bỏ dấu, không phân biệt hoa thường,
 * khớp nguyên vẹn — trùng tên thì báo lỗi, không đoán).
 */
import { txt } from '@/lib/text';
import { chuanHoaKhoaSoKhop } from '@/lib/vietnamese';
import { findRefStrict, matchEnumCell, trimCell, type NamedRef } from '@/lib/data/import-cells';
import type { ImportParsedRow, ImportRowOutcome } from '@/lib/data/import-runner';
import { DON_VI_THAM_HOI_TINH_LABEL, TIEN_DO_DEFAULT, TIEN_DO_VALUES } from '../core/constants';
import { thamHoiToChucSchema, type ThamHoiToChucFormValues } from '../core/schema';

export const THAM_HOI_TO_CHUC_IMPORT_MAX_ROWS = 3000;

export interface ThamHoiToChucImportRowCtx {
  toChuc: readonly NamedRef[];
  dip: readonly NamedRef[];
  xaPhuong: readonly NamedRef[];
  /** Cán bộ cấp xã: chỉ được nhập lượt của xã này; ô Đơn vị thăm hỏi trống ⇒ gán xã này (như form). */
  donViPhamVi: string | null;
}

export interface ThamHoiToChucImportRow extends ImportParsedRow {
  values: ThamHoiToChucFormValues;
  /** Tên dịp sao vào `dip_tham_hoi` — giống hệt lúc lưu từ form. */
  tenDip: string;
  idKey: string | null;
}

type Fail = { ok: false; message: string };

function fail(rowNum: number, message: string): Fail {
  return { ok: false, message: txt('shared.import.rowPrefix', { row: rowNum }) + message };
}

function resolveRef(
  rowNum: number,
  list: readonly NamedRef[],
  raw: unknown,
  cotKey: string,
): { ok: true; ref: NamedRef | null } | Fail {
  const hit = findRefStrict(list, raw);
  if (hit.ok) return hit;
  const key =
    hit.reason === 'ambiguous' ? 'danTocThamHoiToChuc.import.errTrungTen' : 'danTocThamHoiToChuc.import.errKhongThay';
  return fail(rowNum, txt(key, { cot: txt(cotKey), gia_tri: trimCell(raw) }));
}

/** Ô ghi cấp tỉnh ⇒ NULL dưới DB. Nhận cả "CQMTTQ Tỉnh" như bản nhập cũ. */
const NHAN_CAP_TINH = new Set([DON_VI_THAM_HOI_TINH_LABEL, 'CQMTTQ Tỉnh'].map(chuanHoaKhoaSoKhop));

export function parseThamHoiToChucImportRow(
  rowNum: number,
  raw: Record<string, unknown>,
  ctx: ThamHoiToChucImportRowCtx,
): ImportRowOutcome<ThamHoiToChucImportRow> {
  const toChuc = resolveRef(rowNum, ctx.toChuc, raw.ten_co_so, 'danTocThamHoiToChuc.import.cotToChuc');
  if (!toChuc.ok) return toChuc;
  const dip = resolveRef(rowNum, ctx.dip, raw.dip_tham_hoi, 'danTocThamHoiToChuc.import.cotDip');
  if (!dip.ok) return dip;

  const dvCell = trimCell(raw.don_vi_tham_hoi);
  let donViId = '';
  if (dvCell && !NHAN_CAP_TINH.has(chuanHoaKhoaSoKhop(dvCell))) {
    const dv = resolveRef(rowNum, ctx.xaPhuong, dvCell, 'danTocThamHoiToChuc.import.cotDonViThamHoi');
    if (!dv.ok) return dv;
    donViId = dv.ref?.id ?? '';
  }
  if (ctx.donViPhamVi) {
    if (!dvCell) donViId = ctx.donViPhamVi;
    // Ghi "MTTQ Tỉnh" cũng là ngoài phạm vi: cấp xã không sửa được dòng cấp tỉnh.
    if (donViId !== ctx.donViPhamVi) return fail(rowNum, txt('danTocThamHoiToChuc.import.errNgoaiDonVi'));
  }

  let tienDo = TIEN_DO_DEFAULT;
  if (trimCell(raw.tien_do)) {
    const hit = matchEnumCell(TIEN_DO_VALUES, raw.tien_do);
    if (!hit) {
      return fail(
        rowNum,
        txt('danTocThamHoiToChuc.import.errTienDo', {
          gia_tri: trimCell(raw.tien_do),
          hop_le: TIEN_DO_VALUES.join(', '),
        }),
      );
    }
    tienDo = hit;
  }

  const parsed = thamHoiToChucSchema.safeParse({
    to_chuc_id: toChuc.ref?.id ?? '',
    dip_tham_hoi_id: dip.ref?.id ?? '',
    // Cột TEXT tự do (ví dụ "Tháng 1/2027") — giữ nguyên như bản cũ.
    thoi_gian_du_kien: trimCell(raw.thoi_gian_du_kien),
    don_vi_tham_hoi_id: donViId,
    noi_dung_tham_hoi: trimCell(raw.noi_dung_tham_hoi),
    thanh_phan_doan: trimCell(raw.thanh_phan_doan),
    qua_tang: trimCell(raw.qua_tang),
    tien_do: tienDo,
    ket_qua_thuc_hien: trimCell(raw.ket_qua_thuc_hien),
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
      tenDip: dip.ref?.ten ?? '',
      idKey: trimCell(raw.id) || null,
    },
  };
}
