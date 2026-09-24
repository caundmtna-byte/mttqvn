/**
 * Nhập chức vụ từ Excel — khai cho lõi chung `lib/data/import-runner.ts`.
 *
 * Bản ghi đã có chỉ kéo cột khoá (`id, ten_chuc_vu`); cấp bậc và phòng ban nạp
 * một lần cho cả file. Ghi đè chỉ đụng các cột có trong file.
 */
import type {
  ImportBatchResult,
  ImportDryRunResult,
  ImportRunOptions,
} from '@/components/shared/ImportDialog';
import { createImportRunner, pickMappedColumns } from '@/lib/data/import-runner';
import { getSupabase } from '@/lib/supabase/client';
import { handleSupabaseError } from '@/lib/supabase/errors';
import { fetchAllPages } from '@/lib/supabase/fetch-all-pages';
import { getJobLevels } from '../../cap-bac/services/cap-bac-service';
import { getDepartments } from '../../phong-ban/services/phong-ban-service';
import {
  CHUC_VU_IMPORT_KEYS,
  CHUC_VU_IMPORT_MAX_ROWS,
  parseChucVuImportRow,
  type ChucVuImportExisting,
  type ChucVuImportRow,
  type ChucVuImportRowCtx,
} from '../utils/chuc-vu-import-row';
import { createPosition, positionFormToPayload, updatePositionPartial } from './chuc-vu-service';

/** Cột payload → cột trong file khi tên khác nhau. */
const PAYLOAD_TO_IMPORT_COL: Record<string, string> = { phong_ban_id: 'ten_phong_ban' };

async function getChucVuImportKeys(): Promise<ChucVuImportExisting[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const rows = await fetchAllPages<Record<string, unknown>>(
    async (from, to) => {
      const { data, error } = await supabase
        .from('var_chuc_vu')
        .select('id,ten_chuc_vu')
        .order('id', { ascending: true })
        .range(from, to);
      if (error) handleSupabaseError(error);
      return (data ?? []) as unknown as Record<string, unknown>[];
    },
    { label: 'var_chuc_vu (khoá nhập file)' },
  );
  return rows.map((r) => ({ id: String(r.id ?? ''), ten_chuc_vu: String(r.ten_chuc_vu ?? '') }));
}

const runner = createImportRunner<ChucVuImportRowCtx, ChucVuImportExisting, ChucVuImportRow>({
  maxRows: CHUC_VU_IMPORT_MAX_ROWS,
  keys: CHUC_VU_IMPORT_KEYS,
  async load() {
    const [levels, depts, existing] = await Promise.all([
      getJobLevels(),
      getDepartments(),
      getChucVuImportKeys(),
    ]);
    return {
      ctx: {
        capBac: levels.map((l) => ({ id: String(l.id), ma: l.ma_cap_bac ?? null })),
        phongBan: depts.map((d) => ({ id: String(d.id), ten: d.ten_phong_ban })),
      },
      existing,
    };
  },
  parseRow: parseChucVuImportRow,
  create: (row) => createPosition(row.values),
  update: (id, row, mapped) => {
    // Cấp bậc đọc được từ cột id hoặc cột mã — có một trong hai là có cấp bậc.
    const cols = new Set(mapped);
    if (cols.has('ma_cap_bac')) cols.add('cap_bac');
    return updatePositionPartial(
      id,
      pickMappedColumns(positionFormToPayload(row.values), cols, PAYLOAD_TO_IMPORT_COL),
    );
  },
});

export function dryRunChucVuImport(
  rows: Record<string, unknown>[],
  options: ImportRunOptions,
): Promise<ImportDryRunResult> {
  return runner.dryRun(rows, options);
}

export function importChucVuRows(
  rows: Record<string, unknown>[],
  options: ImportRunOptions,
): Promise<ImportBatchResult> {
  return runner.run(rows, options);
}
