/**
 * Nhập nhiệm kỳ từ Excel — khai cho lõi chung `lib/data/import-runner.ts`.
 *
 * Bản ghi đã có chỉ kéo `id, ten_nhiem_ky`. Nhiệm kỳ đã khoá sổ bị trigger
 * `trg_mttq_nhiem_ky_khoa_ky` chặn ghi đè — lỗi hiện theo từng dòng.
 */
import type {
  ImportBatchResult,
  ImportDryRunResult,
  ImportRunOptions,
} from '@/components/shared/ImportDialog';
import { txt } from '@/lib/text';
import { createImportRunner, pickMappedColumns } from '@/lib/data/import-runner';
import { getSupabase } from '@/lib/supabase/client';
import { handleSupabaseError } from '@/lib/supabase/errors';
import { fetchAllPages } from '@/lib/supabase/fetch-all-pages';
import {
  NHIEM_KY_IMPORT_MAX_ROWS,
  nhiemKyImportPayload,
  parseNhiemKyImportRow,
  type NhiemKyImportRow,
} from '../utils/nhiem-ky-import-row';
import { NHIEM_KY_IMPORT_KEYS, type NhiemKyImportExisting } from '../utils/nhiem-ky-import-keys';
import { insertMttqNhiemKyForImport, updateMttqNhiemKyPartial } from './mttq-nhiem-ky-service';

async function getNhiemKyImportKeys(): Promise<NhiemKyImportExisting[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const rows = await fetchAllPages<Record<string, unknown>>(
    async (from, to) => {
      const { data, error } = await supabase
        .from('mttq_nhiem_ky')
        .select('id,ten_nhiem_ky')
        .order('id', { ascending: true })
        .range(from, to);
      if (error) handleSupabaseError(error);
      return (data ?? []) as unknown as Record<string, unknown>[];
    },
    { label: 'mttq_nhiem_ky (khoá nhập file)' },
  );
  return rows.map((r) => ({ id: String(r.id ?? ''), ten_nhiem_ky: String(r.ten_nhiem_ky ?? '') }));
}

function buildRunner(idNguoiTao: string) {
  return createImportRunner<null, NhiemKyImportExisting, NhiemKyImportRow>({
    maxRows: NHIEM_KY_IMPORT_MAX_ROWS,
    keys: NHIEM_KY_IMPORT_KEYS,
    async load() {
      if (!idNguoiTao.trim()) throw new Error(txt('matTranNhiemKy.service.noEmployeeProfile'));
      return { ctx: null, existing: await getNhiemKyImportKeys() };
    },
    parseRow: (rowNum, raw) => parseNhiemKyImportRow(rowNum, raw),
    create: (row) => insertMttqNhiemKyForImport(nhiemKyImportPayload(row, true), idNguoiTao.trim()),
    update: (id, row, mapped) => updateMttqNhiemKyPartial(id, pickMappedColumns(nhiemKyImportPayload(row), mapped)),
  });
}

export function dryRunNhiemKyImport(
  rows: Record<string, unknown>[],
  options: ImportRunOptions,
  idNguoiTao: string,
): Promise<ImportDryRunResult> {
  return buildRunner(idNguoiTao).dryRun(rows, options);
}

export function importNhiemKyRows(
  rows: Record<string, unknown>[],
  options: ImportRunOptions,
  idNguoiTao: string,
): Promise<ImportBatchResult> {
  return buildRunner(idNguoiTao).run(rows, options);
}
