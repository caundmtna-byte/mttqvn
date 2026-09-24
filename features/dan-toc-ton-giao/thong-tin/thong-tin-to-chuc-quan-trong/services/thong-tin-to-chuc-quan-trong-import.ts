/**
 * Nhập tổ chức tôn giáo từ Excel — khai cho lõi chung `lib/data/import-runner.ts`.
 *
 * Bản ghi đã có chỉ kéo CỘT KHOÁ + cột phạm vi (`id, ten_co_so, don_vi_id`) — đủ
 * để đối chiếu, không kéo cả hồ sơ (xem `docs/supabase-egress.md`). Phạm vi ghi
 * theo đúng luật của module: cán bộ cấp xã chỉ thêm / ghi đè hồ sơ của xã mình.
 * RLS bảng này vẫn `USING (true)` nên đây là lớp chặn duy nhất.
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
import {
  canMutateDttgRowByDonVi,
  isDttgScopedToXaPhuong,
  type DttgViewer,
} from '@/features/dan-toc-ton-giao/shared/use-dttg-viewer';
import {
  TO_CHUC_QUAN_TRONG_IMPORT_MAX_ROWS,
  parseToChucQuanTrongImportRow,
  type ToChucQuanTrongImportRow,
  type ToChucQuanTrongImportRowCtx,
} from '../utils/thong-tin-to-chuc-quan-trong-import-row';
import {
  TO_CHUC_QUAN_TRONG_IMPORT_KEYS,
  type ToChucQuanTrongImportExisting,
} from '../utils/thong-tin-to-chuc-quan-trong-import-keys';
import {
  formToPayload,
  insertThongTinToChucQuanTrongFromImport,
  updateThongTinToChucQuanTrongPartial,
} from './thong-tin-to-chuc-quan-trong-service';

export interface ToChucQuanTrongImportContext {
  idNguoiTao: string;
  viewer: DttgViewer;
}

/** Cột DB ↔ cột trong file khi tên khác nhau (ô Xã, phường nhận tên hoặc id). */
const IMPORT_COLUMN_ALIAS = { don_vi_id: 'ten_don_vi' } as const;

async function getToChucQuanTrongImportKeys(): Promise<ToChucQuanTrongImportExisting[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const rows = await fetchAllPages<Record<string, unknown>>(
    async (from, to) => {
      const { data, error } = await supabase
        .from('dttg_thong_tin_to_chuc_quan_trong')
        .select('id,ten_co_so,don_vi_id')
        .order('id', { ascending: true })
        .range(from, to);
      if (error) handleSupabaseError(error);
      return (data ?? []) as unknown as Record<string, unknown>[];
    },
    { label: 'dttg_thong_tin_to_chuc_quan_trong (khoá nhập file)' },
  );
  return rows.map((r) => ({
    id: String(r.id ?? ''),
    ten_co_so: String(r.ten_co_so ?? ''),
    don_vi_id: r.don_vi_id == null ? null : String(r.don_vi_id),
  }));
}

function buildRunner(ctx: ToChucQuanTrongImportContext) {
  return createImportRunner<ToChucQuanTrongImportRowCtx, ToChucQuanTrongImportExisting, ToChucQuanTrongImportRow>({
    maxRows: TO_CHUC_QUAN_TRONG_IMPORT_MAX_ROWS,
    keys: TO_CHUC_QUAN_TRONG_IMPORT_KEYS,
    async load() {
      const scoped = isDttgScopedToXaPhuong(ctx.viewer);
      // Cán bộ cấp xã chưa được gán đơn vị: không có xã nào hợp lệ để nhập vào.
      if (scoped && !ctx.viewer.viewerDonViId) {
        throw new Error(txt('danTocToChucQuanTrong.import.errChuaGanDonVi'));
      }
      const [xaAll, existing] = await Promise.all([getXaPhuongAll(), getToChucQuanTrongImportKeys()]);
      return {
        ctx: {
          xaPhuong: xaAll.map((x) => ({ id: String(x.id), ten: x.ten })),
          donViPhamVi: scoped ? ctx.viewer.viewerDonViId : null,
        },
        existing,
      };
    },
    parseRow: parseToChucQuanTrongImportRow,
    canWrite: (e) => canMutateDttgRowByDonVi(ctx.viewer, [e.don_vi_id]),
    create: (row) => insertThongTinToChucQuanTrongFromImport(row.values, ctx.idNguoiTao),
    update: (id, row, mapped) =>
      updateThongTinToChucQuanTrongPartial(
        id,
        pickMappedColumns(formToPayload(row.values), mapped, IMPORT_COLUMN_ALIAS),
      ),
  });
}

export function dryRunToChucQuanTrongImport(
  rows: Record<string, unknown>[],
  options: ImportRunOptions,
  ctx: ToChucQuanTrongImportContext,
): Promise<ImportDryRunResult> {
  return buildRunner(ctx).dryRun(rows, options);
}

export function importToChucQuanTrongRows(
  rows: Record<string, unknown>[],
  options: ImportRunOptions,
  ctx: ToChucQuanTrongImportContext,
): Promise<ImportBatchResult> {
  return buildRunner(ctx).run(rows, options);
}
