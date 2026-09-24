/**
 * Nhập danh mục / hàng hóa cứu trợ từ Excel — khai cho lõi chung
 * `lib/data/import-runner.ts` (thêm mới / ghi đè / chỉ cập nhật + xem trước).
 *
 * Hình dạng file: MỘT SHEET PHẲNG, một dòng = một bản ghi. Sheet đầu tiên là dữ
 * liệu, các sheet sau chỉ là hướng dẫn/tra cứu (`ImportDialog` chỉ đọc sheet đầu).
 *
 * Bản ghi đã có chỉ kéo cột khoá + thứ tự (xem `docs/supabase-egress.md`).
 * Hai bảng này là danh mục, không có phạm vi dòng ⇒ không cần `canWrite`.
 */
import type {
  ImportBatchResult,
  ImportDryRunResult,
  ImportRunOptions,
} from '@/components/shared/ImportDialog';
import type { NamedRef } from '@/lib/data/import-cells';
import { createImportRunner, pickMappedColumns } from '@/lib/data/import-runner';
import { getSupabase } from '@/lib/supabase/client';
import { handleSupabaseError } from '@/lib/supabase/errors';
import { fetchAllPages } from '@/lib/supabase/fetch-all-pages';
import { nextThuTuDanhMuc, nextThuTuHangHoaTrongDanhMuc } from '../utils/next-thu-tu';
import {
  HANG_HOA_IMPORT_MAX_ROWS,
  danhMucImportPayload,
  hangHoaImportPayload,
  parseDanhMucImportRow,
  parseHangHoaImportRow,
  type DanhMucImportRow,
  type HangHoaImportRow,
  type HangHoaImportRowCtx,
} from '../utils/hang-hoa-import-row';
import {
  DANH_MUC_IMPORT_KEYS,
  HANG_HOA_IMPORT_KEYS,
  type DanhMucImportExisting,
  type HangHoaImportExisting,
} from '../utils/hang-hoa-import-keys';
import { insertKhoDanhMucHangHoaForImport, updateKhoDanhMucHangHoaPartial } from './kho-danh-muc-hang-hoa-service';
import { insertKhoDanhSachHangHoaForImport, updateKhoDanhSachHangHoaPartial } from './kho-danh-sach-hang-hoa-service';

async function fetchKeyRows(table: 'kho_danh_muc_hang_hoa' | 'kho_danh_sach_hang_hoa', cols: string) {
  const supabase = getSupabase();
  if (!supabase) return [];
  return fetchAllPages<Record<string, unknown>>(
    async (from, to) => {
      const { data, error } = await supabase
        .from(table)
        .select(cols)
        .order('id', { ascending: true })
        .range(from, to);
      if (error) handleSupabaseError(error);
      return (data ?? []) as unknown as Record<string, unknown>[];
    },
    { label: `${table} (khoá nhập file)` },
  );
}

async function getDanhMucImportKeys(): Promise<DanhMucImportExisting[]> {
  const rows = await fetchKeyRows('kho_danh_muc_hang_hoa', 'id,ten_danh_muc,thu_tu');
  return rows.map((r) => ({
    id: String(r.id ?? ''),
    ten_danh_muc: String(r.ten_danh_muc ?? ''),
    thu_tu: Number(r.thu_tu) || 0,
  }));
}

async function getHangHoaImportKeys(): Promise<HangHoaImportExisting[]> {
  const rows = await fetchKeyRows('kho_danh_sach_hang_hoa', 'id,id_danh_muc,ten_hang_hoa,thu_tu');
  return rows.map((r) => ({
    id: String(r.id ?? ''),
    id_danh_muc: String(r.id_danh_muc ?? ''),
    ten_hang_hoa: String(r.ten_hang_hoa ?? ''),
    thu_tu: Number(r.thu_tu) || 0,
  }));
}

// ---------------------------------------------------------------------------
// Danh mục
// ---------------------------------------------------------------------------

/** Thứ tự kế tiếp khi cột Thứ tự trống — tăng dần theo từng dòng thêm mới. */
interface DanhMucCtx {
  nextThuTu: number;
}

const danhMucRunner = createImportRunner<DanhMucCtx, DanhMucImportExisting, DanhMucImportRow>({
  maxRows: HANG_HOA_IMPORT_MAX_ROWS,
  keys: DANH_MUC_IMPORT_KEYS,
  async load() {
    const existing = await getDanhMucImportKeys();
    return { ctx: { nextThuTu: nextThuTuDanhMuc(existing) }, existing };
  },
  parseRow: (rowNum, raw) => parseDanhMucImportRow(rowNum, raw),
  async create(row, ctx) {
    const payload = danhMucImportPayload(row, { thuTuTiepTheo: ctx.nextThuTu });
    await insertKhoDanhMucHangHoaForImport(payload);
    ctx.nextThuTu = Math.max(ctx.nextThuTu, Number(payload.thu_tu) + 1);
  },
  update: (id, row, mapped) =>
    updateKhoDanhMucHangHoaPartial(id, pickMappedColumns(danhMucImportPayload(row), mapped)),
});

export function dryRunKhoDanhMucHangHoaImport(
  rows: Record<string, unknown>[],
  options: ImportRunOptions,
): Promise<ImportDryRunResult> {
  return danhMucRunner.dryRun(rows, options);
}

export function importKhoDanhMucHangHoaRows(
  rows: Record<string, unknown>[],
  options: ImportRunOptions,
): Promise<ImportBatchResult> {
  return danhMucRunner.run(rows, options);
}

// ---------------------------------------------------------------------------
// Hàng hóa
// ---------------------------------------------------------------------------

interface HangHoaCtx extends HangHoaImportRowCtx {
  /** Thứ tự kế tiếp theo từng danh mục — tăng dần theo từng dòng thêm mới. */
  nextThuTuByDanhMuc: Map<string, number>;
}

const hangHoaRunner = createImportRunner<HangHoaCtx, HangHoaImportExisting, HangHoaImportRow>({
  maxRows: HANG_HOA_IMPORT_MAX_ROWS,
  keys: HANG_HOA_IMPORT_KEYS,
  async load() {
    const [danhMucRows, existing] = await Promise.all([
      fetchKeyRows('kho_danh_muc_hang_hoa', 'id,ten_danh_muc'),
      getHangHoaImportKeys(),
    ]);
    const danhMuc: NamedRef[] = danhMucRows.map((d) => ({
      id: String(d.id ?? ''),
      ten: String(d.ten_danh_muc ?? ''),
    }));
    return {
      ctx: {
        danhMuc,
        nextThuTuByDanhMuc: new Map(danhMuc.map((d) => [d.id, nextThuTuHangHoaTrongDanhMuc(existing, d.id)])),
      },
      existing,
    };
  },
  parseRow: parseHangHoaImportRow,
  async create(row, ctx) {
    const next = ctx.nextThuTuByDanhMuc.get(row.id_danh_muc) ?? 0;
    const payload = hangHoaImportPayload(row, { thuTuTiepTheo: next });
    await insertKhoDanhSachHangHoaForImport(payload);
    ctx.nextThuTuByDanhMuc.set(row.id_danh_muc, Math.max(next, Number(payload.thu_tu) + 1));
  },
  update: (id, row, mapped) =>
    updateKhoDanhSachHangHoaPartial(id, pickMappedColumns(hangHoaImportPayload(row), mapped)),
});

export function dryRunKhoDanhSachHangHoaImport(
  rows: Record<string, unknown>[],
  options: ImportRunOptions,
): Promise<ImportDryRunResult> {
  return hangHoaRunner.dryRun(rows, options);
}

export function importKhoDanhSachHangHoaRows(
  rows: Record<string, unknown>[],
  options: ImportRunOptions,
): Promise<ImportBatchResult> {
  return hangHoaRunner.run(rows, options);
}
