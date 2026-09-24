/**
 * Nhập lượt thăm hỏi tổ chức từ Excel — khai cho lõi chung `lib/data/import-runner.ts`.
 *
 * Danh mục (cơ sở tôn giáo, dịp, xã phường) nạp MỘT lần cho cả file — bản cũ gọi
 * lại cả danh sách cơ sở, danh sách dịp và tên dịp cho TỪNG dòng.
 *
 * Bảng này là bảng giao dịch (phân trang server) và chỉ đối chiếu được bằng mã
 * hệ thống, nên chỉ kéo đúng các bản ghi có mã trong file — `id` + cột phạm vi —
 * thay vì cả bảng. Phạm vi ghi theo đúng luật sửa/xoá của module
 * (`canMutateDttgRowByDonVi` trên đơn vị thăm hỏi).
 */
import type {
  ImportBatchResult,
  ImportDryRunResult,
  ImportRunOptions,
} from '@/components/shared/ImportDialog';
import { txt } from '@/lib/text';
import { trimCell, type NamedRef } from '@/lib/data/import-cells';
import { createImportRunner, pickMappedColumns } from '@/lib/data/import-runner';
import { getSupabase } from '@/lib/supabase/client';
import { handleSupabaseError } from '@/lib/supabase/errors';
import { fetchAllPages } from '@/lib/supabase/fetch-all-pages';
import { getXaPhuongAll } from '@/features/he-thong/danh-sach-tinh-thanh/services/dia-ban-service';
import { getDipThamHoiOptions } from '@/features/dan-toc-ton-giao/tham-hoi/dip-tham-hoi/services/dip-tham-hoi-service';
import {
  canMutateDttgRowByDonVi,
  isDttgScopedToXaPhuong,
  type DttgViewer,
} from '@/features/dan-toc-ton-giao/shared/use-dttg-viewer';
import {
  THAM_HOI_TO_CHUC_IMPORT_MAX_ROWS,
  parseThamHoiToChucImportRow,
  type ThamHoiToChucImportRow,
  type ThamHoiToChucImportRowCtx,
} from '../utils/tham-hoi-to-chuc-import-row';
import {
  THAM_HOI_TO_CHUC_IMPORT_KEYS,
  type ThamHoiToChucImportExisting,
} from '../utils/tham-hoi-to-chuc-import-keys';
import {
  insertThamHoiToChucFromImport,
  thamHoiToChucPayload,
  updateThamHoiToChucPartial,
} from './tham-hoi-to-chuc-service';

export interface ThamHoiToChucImportContext {
  idNguoiTao: string;
  viewer: DttgViewer;
}

/** Cột DB ↔ cột trong file. Tên dịp sao đi theo ô Dịp — đổi dịp thì tên đổi theo. */
const IMPORT_COLUMN_ALIAS = {
  to_chuc_id: 'ten_co_so',
  dip_tham_hoi_id: 'dip_tham_hoi',
  don_vi_tham_hoi_id: 'don_vi_tham_hoi',
} as const;

/** Giữ câu `in (...)` ngắn để URL PostgREST không quá dài. */
const ID_CHUNK = 200;

async function getToChucRefs(): Promise<NamedRef[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const rows = await fetchAllPages<Record<string, unknown>>(
    async (from, to) => {
      const { data, error } = await supabase
        .from('dttg_thong_tin_to_chuc_quan_trong')
        .select('id,ten_co_so')
        .order('id', { ascending: true })
        .range(from, to);
      if (error) handleSupabaseError(error);
      return (data ?? []) as unknown as Record<string, unknown>[];
    },
    { label: 'dttg_thong_tin_to_chuc_quan_trong (danh mục nhập thăm hỏi)' },
  );
  return rows.map((r) => ({ id: String(r.id ?? ''), ten: String(r.ten_co_so ?? '') }));
}

/** Chỉ các bản ghi có mã xuất hiện trong file — khoá đối chiếu duy nhất là `id`. */
async function getThamHoiToChucImportKeys(ids: readonly string[]): Promise<ThamHoiToChucImportExisting[]> {
  const supabase = getSupabase();
  if (!supabase || ids.length === 0) return [];
  const out: ThamHoiToChucImportExisting[] = [];
  for (let i = 0; i < ids.length; i += ID_CHUNK) {
    const chunk = ids.slice(i, i + ID_CHUNK);
    const rows = await fetchAllPages<Record<string, unknown>>(
      async (from, to) => {
        const { data, error } = await supabase
          .from('dttg_tham_hoi_to_chuc')
          .select('id,don_vi_tham_hoi_id')
          .in('id', chunk)
          .order('id', { ascending: true })
          .range(from, to);
        if (error) handleSupabaseError(error);
        return (data ?? []) as unknown as Record<string, unknown>[];
      },
      { label: 'dttg_tham_hoi_to_chuc (khoá nhập file)' },
    );
    for (const r of rows) {
      out.push({
        id: String(r.id ?? ''),
        don_vi_tham_hoi_id:
          r.don_vi_tham_hoi_id == null || r.don_vi_tham_hoi_id === '' ? null : String(r.don_vi_tham_hoi_id),
      });
    }
  }
  return out;
}

/** Mã hệ thống hợp lệ trong file (số nguyên), bỏ trùng. */
function idsInFile(rows: readonly Record<string, unknown>[]): string[] {
  const set = new Set<string>();
  for (const r of rows) {
    const id = trimCell(r.id);
    if (/^\d+$/.test(id)) set.add(id);
  }
  return [...set];
}

function payloadOf(row: ThamHoiToChucImportRow): Record<string, unknown> {
  return thamHoiToChucPayload(row.values, row.tenDip);
}

function buildRunner(ctx: ThamHoiToChucImportContext) {
  return createImportRunner<ThamHoiToChucImportRowCtx, ThamHoiToChucImportExisting, ThamHoiToChucImportRow>({
    maxRows: THAM_HOI_TO_CHUC_IMPORT_MAX_ROWS,
    keys: THAM_HOI_TO_CHUC_IMPORT_KEYS,
    async load(rows) {
      const scoped = isDttgScopedToXaPhuong(ctx.viewer);
      // Cán bộ cấp xã chưa được gán đơn vị: không có xã nào hợp lệ để nhập vào.
      if (scoped && !ctx.viewer.viewerDonViId) {
        throw new Error(txt('danTocThamHoiToChuc.import.errChuaGanDonVi'));
      }
      const [toChuc, dip, xaAll, existing] = await Promise.all([
        getToChucRefs(),
        getDipThamHoiOptions(),
        getXaPhuongAll(),
        getThamHoiToChucImportKeys(idsInFile(rows)),
      ]);
      return {
        ctx: {
          toChuc,
          dip: dip.map((d) => ({ id: String(d.id), ten: d.ten_dip })),
          xaPhuong: xaAll.map((x) => ({ id: String(x.id), ten: x.ten })),
          donViPhamVi: scoped ? ctx.viewer.viewerDonViId : null,
        },
        existing,
      };
    },
    parseRow: parseThamHoiToChucImportRow,
    canWrite: (e) => canMutateDttgRowByDonVi(ctx.viewer, [e.don_vi_tham_hoi_id]),
    create: (row) => insertThamHoiToChucFromImport(payloadOf(row), ctx.idNguoiTao),
    update: (id, row, mapped) =>
      updateThamHoiToChucPartial(id, pickMappedColumns(payloadOf(row), mapped, IMPORT_COLUMN_ALIAS)),
  });
}

export function dryRunThamHoiToChucImport(
  rows: Record<string, unknown>[],
  options: ImportRunOptions,
  ctx: ThamHoiToChucImportContext,
): Promise<ImportDryRunResult> {
  return buildRunner(ctx).dryRun(rows, options);
}

export function importThamHoiToChucRows(
  rows: Record<string, unknown>[],
  options: ImportRunOptions,
  ctx: ThamHoiToChucImportContext,
): Promise<ImportBatchResult> {
  return buildRunner(ctx).run(rows, options);
}
