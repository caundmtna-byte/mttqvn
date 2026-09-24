/**
 * Nhập hộ nghèo từ Excel — khai cho lõi chung `lib/data/import-runner.ts`.
 *
 * Bản ghi đã có chỉ kéo CỘT KHOÁ (`id, so_cccd, ho_ten_dai_dien, xa_phuong_id`)
 * — đủ để đối chiếu, không kéo cả hồ sơ (xem `docs/supabase-egress.md`).
 * Phạm vi ghi đè theo đúng luật xem của module: cán bộ cấp xã chỉ đè hộ của xã
 * mình. RLS bảng này vẫn `USING (true)` nên đây là lớp chặn duy nhất.
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
import { getMttqThietLapAll } from '@/features/mat-tran-to-quoc/thiet-lap-cai-dat/services/mttq-thiet-lap-service';
import { canViewHoNgheoRow, isHoNgheoScopedToXaPhuong, type HoNgheoViewer } from '../hooks/use-ho-ngheo-viewer';
import {
  HO_NGHEO_IMPORT_MAX_ROWS,
  parseHoNgheoImportRow,
  type HoNgheoImportRow,
  type HoNgheoImportRowCtx,
} from '../utils/ho-ngheo-import-row';
import { HO_NGHEO_IMPORT_KEYS, type HoNgheoImportExisting } from '../utils/ho-ngheo-import-keys';
import { createHoNgheo, formToPayload, updateHoNgheoPartial } from './ho-ngheo-service';

export interface HoNgheoImportContext {
  idNguoiTao: string;
  viewer: HoNgheoViewer;
}

async function getHoNgheoImportKeys(): Promise<HoNgheoImportExisting[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const rows = await fetchAllPages<Record<string, unknown>>(
    async (from, to) => {
      const { data, error } = await supabase
        .from('hngh_thong_tin_ho_ngheo')
        .select('id,so_cccd,ho_ten_dai_dien,xa_phuong_id')
        .order('id', { ascending: true })
        .range(from, to);
      if (error) handleSupabaseError(error);
      return (data ?? []) as unknown as Record<string, unknown>[];
    },
    { label: 'hngh_thong_tin_ho_ngheo (khoá nhập file)' },
  );
  return rows.map((r) => ({
    id: String(r.id ?? ''),
    so_cccd: r.so_cccd == null ? null : String(r.so_cccd),
    ho_ten_dai_dien: String(r.ho_ten_dai_dien ?? ''),
    xa_phuong_id: r.xa_phuong_id == null ? null : String(r.xa_phuong_id),
  }));
}

function buildRunner(ctx: HoNgheoImportContext) {
  return createImportRunner<HoNgheoImportRowCtx, HoNgheoImportExisting, HoNgheoImportRow>({
    maxRows: HO_NGHEO_IMPORT_MAX_ROWS,
    keys: HO_NGHEO_IMPORT_KEYS,
    async load() {
      const scoped = isHoNgheoScopedToXaPhuong(ctx.viewer);
      // Cán bộ cấp xã chưa được gán đơn vị: không có xã nào hợp lệ để nhập vào.
      if (scoped && !ctx.viewer.viewerDonViId) throw new Error(txt('hoNgheo.noXaPhuongScopePermission'));
      const [xaAll, thietLap, existing] = await Promise.all([
        getXaPhuongAll(),
        getMttqThietLapAll(),
        getHoNgheoImportKeys(),
      ]);
      return {
        ctx: {
          xaPhuong: xaAll.map((x) => ({ id: String(x.id), ten: x.ten })),
          danToc: thietLap
            .filter((t) => t.loai === 'dan_toc')
            .map((t) => ({ id: String(t.id), ten: t.ten })),
          xaPhamVi: scoped ? ctx.viewer.viewerDonViId : null,
        },
        existing,
      };
    },
    parseRow: parseHoNgheoImportRow,
    canWrite: (e) => canViewHoNgheoRow(ctx.viewer, e),
    create: (row) => createHoNgheo(row.values, ctx.idNguoiTao),
    update: (id, row, mapped) => updateHoNgheoPartial(id, pickMappedColumns(formToPayload(row.values), mapped)),
  });
}

export function dryRunHoNgheoImport(
  rows: Record<string, unknown>[],
  options: ImportRunOptions,
  ctx: HoNgheoImportContext,
): Promise<ImportDryRunResult> {
  return buildRunner(ctx).dryRun(rows, options);
}

export function importHoNgheoRows(
  rows: Record<string, unknown>[],
  options: ImportRunOptions,
  ctx: HoNgheoImportContext,
): Promise<ImportBatchResult> {
  return buildRunner(ctx).run(rows, options);
}
