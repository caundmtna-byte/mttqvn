/**
 * Nhập tỉnh thành / xã phường từ Excel — khai cho lõi chung `lib/data/import-runner.ts`.
 *
 * Tỉnh: kéo `id, ten` (vài chục dòng). Xã: đối chiếu bằng `getXaPhuongAll()` —
 * đã cache 24h và tự bỏ cache sau mọi lần ghi xã, nên không kéo lại ~10k dòng
 * mỗi lần mở hộp thoại. Ghi đè chỉ đụng cột có trong file.
 */
import type {
  ImportBatchResult,
  ImportDryRunResult,
  ImportRunOptions,
} from '@/components/shared/ImportDialog';
import { createImportRunner, pickMappedColumns } from '@/lib/data/import-runner';
import { getSupabase } from '@/lib/supabase/client';
import { handleSupabaseError } from '@/lib/supabase/errors';
import {
  TINH_THANH_IMPORT_KEYS,
  TINH_THANH_IMPORT_MAX_ROWS,
  XA_PHUONG_IMPORT_KEYS,
  XA_PHUONG_IMPORT_MAX_ROWS,
  parseTinhThanhImportRow,
  parseXaPhuongImportRow,
  type TinhThanhImportExisting,
  type TinhThanhImportRow,
  type XaPhuongImportExisting,
  type XaPhuongImportRow,
  type XaPhuongImportRowCtx,
} from '../utils/dia-ban-import-row';
import {
  createTinhThanh,
  createXaPhuong,
  getXaPhuongAll,
  tinhThanhFormToPayload,
  updateTinhThanhPartial,
  updateXaPhuongPartial,
  xaPhuongFormToPayload,
} from './dia-ban-service';

/** Danh mục tỉnh có trần tự nhiên (vài chục dòng) — một request, không phân trang. */
async function getTinhThanhImportKeys(): Promise<TinhThanhImportExisting[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const { data, error } = await supabase.from('var_ssn_tinh_thanh').select('id,ten').order('id');
  if (error) handleSupabaseError(error);
  return ((data ?? []) as Record<string, unknown>[]).map((r) => ({
    id: String(r.id ?? ''),
    ten: String(r.ten ?? ''),
  }));
}

const tinhRunner = createImportRunner<null, TinhThanhImportExisting, TinhThanhImportRow>({
  maxRows: TINH_THANH_IMPORT_MAX_ROWS,
  keys: TINH_THANH_IMPORT_KEYS,
  async load() {
    return { ctx: null, existing: await getTinhThanhImportKeys() };
  },
  parseRow: (rowNum, raw) => parseTinhThanhImportRow(rowNum, raw),
  create: (row) => createTinhThanh(row.values),
  update: (id, row, mapped) =>
    updateTinhThanhPartial(id, pickMappedColumns(tinhThanhFormToPayload(row.values), mapped)),
});

const xaRunner = createImportRunner<XaPhuongImportRowCtx, XaPhuongImportExisting, XaPhuongImportRow>({
  maxRows: XA_PHUONG_IMPORT_MAX_ROWS,
  keys: XA_PHUONG_IMPORT_KEYS,
  async load() {
    const [tinh, xaAll] = await Promise.all([getTinhThanhImportKeys(), getXaPhuongAll()]);
    return {
      ctx: { tinh },
      existing: xaAll.map((x) => ({ id: String(x.id), id_tinh_thanh: String(x.id_tinh_thanh), ten: x.ten })),
    };
  },
  parseRow: parseXaPhuongImportRow,
  create: (row) => createXaPhuong(row.values),
  update: (id, row, mapped) => {
    // Tỉnh đọc được từ cột id tỉnh hoặc cột tên tỉnh — có một trong hai là có tỉnh.
    const cols = new Set(mapped);
    if (cols.has('ten_tinh')) cols.add('id_tinh_thanh');
    return updateXaPhuongPartial(id, pickMappedColumns(xaPhuongFormToPayload(row.values), cols));
  },
});

export function dryRunTinhThanhImport(
  rows: Record<string, unknown>[],
  options: ImportRunOptions,
): Promise<ImportDryRunResult> {
  return tinhRunner.dryRun(rows, options);
}

export function importTinhThanhRows(
  rows: Record<string, unknown>[],
  options: ImportRunOptions,
): Promise<ImportBatchResult> {
  return tinhRunner.run(rows, options);
}

export function dryRunXaPhuongImport(
  rows: Record<string, unknown>[],
  options: ImportRunOptions,
): Promise<ImportDryRunResult> {
  return xaRunner.dryRun(rows, options);
}

export function importXaPhuongRows(
  rows: Record<string, unknown>[],
  options: ImportRunOptions,
): Promise<ImportBatchResult> {
  return xaRunner.run(rows, options);
}
