/**
 * Nhập danh mục / hàng hóa cứu trợ từ Excel.
 *
 * Hình dạng file: MỘT SHEET PHẲNG, một dòng = một bản ghi — đúng bản chất bảng
 * danh mục (không có bảng con). Sheet đầu tiên là dữ liệu, các sheet sau chỉ là
 * hướng dẫn/tra cứu (engine `ImportDialog` chỉ đọc sheet đầu tiên).
 *
 * Kiểm tra chạy TRỌN VẸN trước khi ghi: dòng sai bị loại và báo theo số dòng
 * Excel, dòng đúng vẫn được ghi (nhập một phần, không all-or-nothing).
 */
import { txt } from '@/lib/text';
import { getSupabase } from '@/lib/supabase/client';
import { handleSupabaseError } from '@/lib/supabase/errors';
import type { ImportErrorRow } from '@/components/shared/ImportDialog';
import { IMPORT_ROW_NUM_KEY } from '@/components/shared/ImportDialog';
import { khoDanhMucHangHoaSchema, khoDanhSachHangHoaSchema } from '../core/schema';
import { getKhoDanhMucHangHoaList } from './kho-danh-muc-hang-hoa-service';
import { getKhoDanhSachHangHoaList } from './kho-danh-sach-hang-hoa-service';
import { nextThuTuDanhMuc, nextThuTuHangHoaTrongDanhMuc } from '../utils/next-thu-tu';
import {
  HANG_HOA_IMPORT_MAX_ROWS,
  hangHoaDedupKey,
  normalizeMatchKey,
  parseDanhMucImportRow,
  parseHangHoaImportRow,
} from '../utils/hang-hoa-import-row';

export type ImportResult = { created: number; errors: string[]; errorRows: ImportErrorRow[] };

function importRowNum(raw: Record<string, unknown>, fallback: number): number {
  const v = raw[IMPORT_ROW_NUM_KEY];
  if (typeof v === 'number' && v > 0) return v;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function stripRowNum(raw: Record<string, unknown>): Record<string, unknown> {
  const data = { ...raw };
  delete data[IMPORT_ROW_NUM_KEY];
  return data;
}

/**
 * `ImportDialog` chỉ hiện 10 lỗi đầu. Khi nhiều hơn, chèn một câu tóm tắt lên
 * ĐẦU danh sách để cán bộ biết còn lỗi chưa thấy và phải tải file lỗi về.
 */
function withErrorSummary(errors: string[]): string[] {
  if (errors.length <= 10) return errors;
  return [txt('matTranHangHoa.import.errSummary', { count: errors.length }), ...errors];
}

function tooManyRows(rows: unknown[]): ImportResult | null {
  if (rows.length <= HANG_HOA_IMPORT_MAX_ROWS) return null;
  return {
    created: 0,
    errors: [
      txt('matTranHangHoa.import.errTooManyRows', {
        count: rows.length,
        max: HANG_HOA_IMPORT_MAX_ROWS,
      }),
    ],
    errorRows: [],
  };
}

export async function importKhoDanhMucHangHoaRows(
  rows: Record<string, unknown>[],
): Promise<ImportResult> {
  const capped = tooManyRows(rows);
  if (capped) return capped;

  const existingRows = await getKhoDanhMucHangHoaList();
  const existingTen = new Map(existingRows.map((r) => [normalizeMatchKey(r.ten_danh_muc), r.ten_danh_muc]));
  const seenTen = new Map<string, number>();
  let nextThuTu = nextThuTuDanhMuc(existingRows);

  const errors: string[] = [];
  const errorRows: ImportErrorRow[] = [];
  const payloads: Record<string, unknown>[] = [];

  for (let i = 0; i < rows.length; i++) {
    const rowNum = importRowNum(rows[i], i + 2);
    const rowData = stripRowNum(rows[i]);

    const parsed = parseDanhMucImportRow(rowNum, rowData, { existingTen, seenTen, nextThuTu });
    if (!parsed.ok) {
      errors.push(parsed.message);
      errorRows.push({ rowNum, data: rowData, message: parsed.message });
      continue;
    }

    const checked = khoDanhMucHangHoaSchema.safeParse(parsed.data);
    if (!checked.success) {
      const msg =
        txt('matTranHangHoa.import.rowPrefix', { row: rowNum }) +
        (checked.error.issues[0]?.message ?? checked.error.message);
      errors.push(msg);
      errorRows.push({ rowNum, data: rowData, message: msg });
      continue;
    }

    seenTen.set(normalizeMatchKey(checked.data.ten_danh_muc), rowNum);
    nextThuTu = Math.max(nextThuTu, checked.data.thu_tu + 1);
    const moTa = checked.data.mo_ta.trim();
    payloads.push({
      ten_danh_muc: checked.data.ten_danh_muc,
      mo_ta: moTa === '' ? null : moTa,
      thu_tu: checked.data.thu_tu,
      trang_thai: checked.data.trang_thai,
    });
  }

  if (payloads.length > 0) {
    const supabase = getSupabase();
    if (!supabase) throw new Error(txt('matTranHangHoa.service.notFoundDanhMuc'));
    const { error } = await supabase.from('kho_danh_muc_hang_hoa').insert(payloads);
    if (error) handleSupabaseError(error);
  }

  return { created: payloads.length, errors: withErrorSummary(errors), errorRows };
}

export async function importKhoDanhSachHangHoaRows(
  rows: Record<string, unknown>[],
): Promise<ImportResult> {
  const capped = tooManyRows(rows);
  if (capped) return capped;

  const [danhMucRows, hangRows] = await Promise.all([
    getKhoDanhMucHangHoaList(),
    getKhoDanhSachHangHoaList(),
  ]);

  const danhMuc = danhMucRows.map((d) => ({ id: String(d.id), ten: d.ten_danh_muc }));
  const existingHang = new Set(hangRows.map((h) => hangHoaDedupKey(h.id_danh_muc, h.ten_hang_hoa)));
  const seenHang = new Map<string, number>();
  const nextThuTuByDanhMuc = new Map<string, number>(
    danhMuc.map((d) => [d.id, nextThuTuHangHoaTrongDanhMuc(hangRows, d.id)]),
  );

  const errors: string[] = [];
  const errorRows: ImportErrorRow[] = [];
  const payloads: Record<string, unknown>[] = [];

  for (let i = 0; i < rows.length; i++) {
    const rowNum = importRowNum(rows[i], i + 2);
    const rowData = stripRowNum(rows[i]);

    const parsed = parseHangHoaImportRow(rowNum, rowData, {
      danhMuc,
      existingHang,
      seenHang,
      nextThuTuByDanhMuc,
    });
    if (!parsed.ok) {
      errors.push(parsed.message);
      errorRows.push({ rowNum, data: rowData, message: parsed.message });
      continue;
    }

    const checked = khoDanhSachHangHoaSchema.safeParse(parsed.data);
    if (!checked.success) {
      const msg =
        txt('matTranHangHoa.import.rowPrefix', { row: rowNum }) +
        (checked.error.issues[0]?.message ?? checked.error.message);
      errors.push(msg);
      errorRows.push({ rowNum, data: rowData, message: msg });
      continue;
    }

    const dmId = checked.data.id_danh_muc;
    seenHang.set(hangHoaDedupKey(dmId, checked.data.ten_hang_hoa), rowNum);
    nextThuTuByDanhMuc.set(dmId, Math.max(nextThuTuByDanhMuc.get(dmId) ?? 0, checked.data.thu_tu + 1));

    const moTa = checked.data.mo_ta.trim();
    const quyCach = checked.data.quy_cach.trim();
    payloads.push({
      id_danh_muc: Number(dmId),
      ten_hang_hoa: checked.data.ten_hang_hoa,
      don_vi_tinh: checked.data.don_vi_tinh,
      mo_ta: moTa === '' ? null : moTa,
      quy_cach: quyCach === '' ? null : quyCach,
      thu_tu: checked.data.thu_tu,
      trang_thai: checked.data.trang_thai,
    });
  }

  if (payloads.length > 0) {
    const supabase = getSupabase();
    if (!supabase) throw new Error(txt('matTranHangHoa.service.notFoundHang'));
    const { error } = await supabase.from('kho_danh_sach_hang_hoa').insert(payloads);
    if (error) handleSupabaseError(error);
  }

  return { created: payloads.length, errors: withErrorSummary(errors), errorRows };
}
