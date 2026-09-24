/**
 * Nhập kỳ họp từ Excel — khai cho lõi chung `lib/data/import-runner.ts`.
 *
 * Nhiệm kỳ, xã phường và kỳ họp đã có nạp MỘT lần, chỉ các cột cần. Phạm vi
 * ghi đè theo luật xem của module (`canViewKyHopRow`). Nhiệm kỳ / kỳ họp đã
 * khoá sổ bị trigger khoá kỳ chặn ghi — lỗi hiện theo từng dòng.
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
import { getXaPhuongAll } from '@/features/he-thong/danh-sach-tinh-thanh/services/dia-ban-service';
import { canViewKyHopRow, type MttqKyHopViewer } from '../hooks/use-mttq-ky-hop-viewer';
import {
  KY_HOP_IMPORT_MAX_ROWS,
  kyHopImportPayload,
  kyHopMappedDbColumns,
  parseKyHopImportRow,
  type KyHopImportRow,
  type KyHopImportRowCtx,
} from '../utils/ky-hop-import-row';
import { KY_HOP_IMPORT_KEYS, type KyHopImportExisting } from '../utils/ky-hop-import-keys';
import { insertMttqKyHopForImport, updateMttqKyHopPartial } from './mttq-ky-hop-service';

export interface KyHopImportContext {
  idNguoiTao: string;
  viewer: MttqKyHopViewer;
}

async function fetchCols(table: 'mttq_ky_hop' | 'mttq_nhiem_ky', cols: string): Promise<Record<string, unknown>[]> {
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
    { label: `${table} (nhập kỳ họp)` },
  );
}

const str = (v: unknown): string => (v == null ? '' : String(v));
const strOrNull = (v: unknown): string | null => (v == null || v === '' ? null : String(v));

function buildRunner(ctx: KyHopImportContext) {
  return createImportRunner<KyHopImportRowCtx, KyHopImportExisting, KyHopImportRow>({
    maxRows: KY_HOP_IMPORT_MAX_ROWS,
    keys: KY_HOP_IMPORT_KEYS,
    async load() {
      if (!ctx.idNguoiTao.trim()) throw new Error(txt('matTranKyHop.service.noEmployeeProfile'));
      const v = ctx.viewer;
      const capXa = !v.canViewAll && v.chucVuCapQuanLy === 'Xã phường';
      if (capXa && !v.viewerDonViId) throw new Error(txt('shared.import.errChuaGanDonVi'));
      const [nhiemKy, xaAll, existing] = await Promise.all([
        fetchCols('mttq_nhiem_ky', 'id,ten_nhiem_ky'),
        getXaPhuongAll(),
        fetchCols('mttq_ky_hop', 'id,nhiem_ky_id,ky_thu,don_vi_id,id_nguoi_tao'),
      ]);
      return {
        ctx: {
          nhiemKy: nhiemKy.map((n) => ({ id: str(n.id), ten: str(n.ten_nhiem_ky) })),
          xaPhuong: xaAll.map((x) => ({ id: String(x.id), ten: x.ten })),
          xaPhamVi: capXa ? v.viewerDonViId : null,
        },
        existing: existing.map((e) => ({
          id: str(e.id),
          nhiem_ky_id: str(e.nhiem_ky_id),
          ky_thu: str(e.ky_thu),
          don_vi_id: strOrNull(e.don_vi_id),
          id_nguoi_tao: strOrNull(e.id_nguoi_tao),
        })),
      };
    },
    parseRow: parseKyHopImportRow,
    canWrite: (e) => canViewKyHopRow(ctx.viewer, e),
    create: (row) => insertMttqKyHopForImport(kyHopImportPayload(row), ctx.idNguoiTao.trim()),
    update: (id, row, mapped) =>
      updateMttqKyHopPartial(id, pickMappedColumns(kyHopImportPayload(row), kyHopMappedDbColumns(mapped))),
  });
}

export function dryRunKyHopImport(
  rows: Record<string, unknown>[],
  options: ImportRunOptions,
  ctx: KyHopImportContext,
): Promise<ImportDryRunResult> {
  return buildRunner(ctx).dryRun(rows, options);
}

export function importKyHopRows(
  rows: Record<string, unknown>[],
  options: ImportRunOptions,
  ctx: KyHopImportContext,
): Promise<ImportBatchResult> {
  return buildRunner(ctx).run(rows, options);
}
