/**
 * Nhập đơn vị cứu trợ từ Excel — khai cho lõi chung `lib/data/import-runner.ts`.
 *
 * Bản ghi đã có chỉ kéo `id, ten`; xã phường (đơn vị giới thiệu) nạp một lần.
 * Bảng danh mục, không có phạm vi dòng ⇒ không cần `canWrite`.
 */
import type {
  ImportBatchResult,
  ImportDryRunResult,
  ImportRunOptions,
} from '@/components/shared/ImportDialog';
import { coCot, createImportRunner, pickMappedColumns } from '@/lib/data/import-runner';
import { getSupabase } from '@/lib/supabase/client';
import { handleSupabaseError } from '@/lib/supabase/errors';
import { fetchAllPages } from '@/lib/supabase/fetch-all-pages';
import { getXaPhuongAll } from '@/features/he-thong/danh-sach-tinh-thanh/services/dia-ban-service';
import {
  DON_VI_CUU_TRO_IMPORT_COLUMN_ALIAS,
  DON_VI_CUU_TRO_IMPORT_MAX_ROWS,
  parseDonViCuuTroImportRow,
  type DonViCuuTroImportRow,
  type DonViCuuTroImportRowCtx,
} from '../utils/don-vi-cuu-tro-import-row';
import { DON_VI_CUU_TRO_IMPORT_KEYS, type DonViCuuTroImportExisting } from '../utils/don-vi-cuu-tro-import-keys';
import {
  insertKhoDonViCuuTroForImport,
  khoDonViCuuTroFormToPayload,
  updateKhoDonViCuuTroPartial,
} from './kho-don-vi-cuu-tro-service';

async function getDonViCuuTroImportKeys(): Promise<DonViCuuTroImportExisting[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const rows = await fetchAllPages<Record<string, unknown>>(
    async (from, to) => {
      const { data, error } = await supabase
        .from('kho_don_vi_cuu_tro')
        .select('id,ten')
        .order('id', { ascending: true })
        .range(from, to);
      if (error) handleSupabaseError(error);
      return (data ?? []) as unknown as Record<string, unknown>[];
    },
    { label: 'kho_don_vi_cuu_tro (khoá nhập file)' },
  );
  return rows.map((r) => ({ id: String(r.id ?? ''), ten: String(r.ten ?? '') }));
}

const runner = createImportRunner<DonViCuuTroImportRowCtx, DonViCuuTroImportExisting, DonViCuuTroImportRow>({
  maxRows: DON_VI_CUU_TRO_IMPORT_MAX_ROWS,
  keys: DON_VI_CUU_TRO_IMPORT_KEYS,
  async load(rows) {
    // Chỉ kéo danh mục xã/phường khi file thật sự có điền đơn vị giới thiệu.
    const [xaAll, existing] = await Promise.all([
      coCot(rows, 'don_vi_gioi_thieu') ? getXaPhuongAll() : Promise.resolve([]),
      getDonViCuuTroImportKeys(),
    ]);
    return { ctx: { xaPhuong: xaAll.map((x) => ({ id: String(x.id), ten: x.ten })) }, existing };
  },
  parseRow: parseDonViCuuTroImportRow,
  create: (row) => insertKhoDonViCuuTroForImport(khoDonViCuuTroFormToPayload(row.values)),
  update: (id, row, mapped) =>
    updateKhoDonViCuuTroPartial(
      id,
      pickMappedColumns(khoDonViCuuTroFormToPayload(row.values), mapped, DON_VI_CUU_TRO_IMPORT_COLUMN_ALIAS),
    ),
});

export function dryRunDonViCuuTroImport(
  rows: Record<string, unknown>[],
  options: ImportRunOptions,
): Promise<ImportDryRunResult> {
  return runner.dryRun(rows, options);
}

export function importDonViCuuTroRows(
  rows: Record<string, unknown>[],
  options: ImportRunOptions,
): Promise<ImportBatchResult> {
  return runner.run(rows, options);
}
