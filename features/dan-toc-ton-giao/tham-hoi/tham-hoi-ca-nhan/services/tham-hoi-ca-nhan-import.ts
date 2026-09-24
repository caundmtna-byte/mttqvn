/**
 * Nhập lượt thăm hỏi cá nhân từ Excel — khai cho lõi chung `lib/data/import-runner.ts`.
 *
 * Danh mục (cá nhân, phòng ban, dịp, xã phường) nạp MỘT lần cho cả file — bản cũ
 * gọi lại cả danh sách cá nhân (hai lần), phòng ban, dịp và tên dịp cho TỪNG dòng.
 *
 * Bảng này là bảng giao dịch (phân trang server) và chỉ đối chiếu được bằng mã
 * hệ thống, nên chỉ kéo đúng các bản ghi có mã trong file — `id` + cột phạm vi —
 * thay vì cả bảng. Phạm vi ghi theo đúng luật sửa/xoá của module
 * (`canMutateDttgRowByDonVi` trên đơn vị thăm hỏi + xã phường).
 */
import type {
  ImportBatchResult,
  ImportDryRunResult,
  ImportRunOptions,
} from '@/components/shared/ImportDialog';
import { txt } from '@/lib/text';
import { trimCell } from '@/lib/data/import-cells';
import { createImportRunner, pickMappedColumns } from '@/lib/data/import-runner';
import { getSupabase } from '@/lib/supabase/client';
import { handleSupabaseError } from '@/lib/supabase/errors';
import { fetchAllPages } from '@/lib/supabase/fetch-all-pages';
import { getXaPhuongAll } from '@/features/he-thong/danh-sach-tinh-thanh/services/dia-ban-service';
import { getDepartments } from '@/features/he-thong/phong-ban/services/phong-ban-service';
import { getDipThamHoiOptions } from '@/features/dan-toc-ton-giao/tham-hoi/dip-tham-hoi/services/dip-tham-hoi-service';
import {
  canMutateDttgRowByDonVi,
  isDttgScopedToXaPhuong,
  type DttgViewer,
} from '@/features/dan-toc-ton-giao/shared/use-dttg-viewer';
import {
  THAM_HOI_CA_NHAN_IMPORT_MAX_ROWS,
  parseThamHoiCaNhanImportRow,
  type CaNhanImportRef,
  type ThamHoiCaNhanImportRow,
  type ThamHoiCaNhanImportRowCtx,
} from '../utils/tham-hoi-ca-nhan-import-row';
import {
  THAM_HOI_CA_NHAN_IMPORT_KEYS,
  type ThamHoiCaNhanImportExisting,
} from '../utils/tham-hoi-ca-nhan-import-keys';
import {
  insertThamHoiCaNhanFromImport,
  thamHoiCaNhanPayload,
  updateThamHoiCaNhanPartial,
} from './tham-hoi-ca-nhan-service';

export interface ThamHoiCaNhanImportContext {
  idNguoiTao: string;
  viewer: DttgViewer;
}

/**
 * Cột DB ↔ cột trong file. Cột sao từ cá nhân (đối tượng, chức vụ) đi theo ô Họ
 * tên, tên dịp đi theo ô Dịp — đổi người/dịp thì cột sao đổi theo, không lệch.
 */
const IMPORT_COLUMN_ALIAS = {
  ca_nhan_id: 'ho_va_ten',
  doi_tuong: 'ho_va_ten',
  chuc_vu_vi_tri: 'ho_va_ten',
  phong_ban_tham_muu_id: 'ten_phong_ban',
  dip_tham_hoi_id: 'dip_tham_hoi',
  don_vi_tham_hoi_id: 'ten_don_vi_tham_hoi',
  xa_phuong_id: 'ten_xa_phuong',
} as const;

/** Giữ câu `in (...)` ngắn để URL PostgREST không quá dài. */
const ID_CHUNK = 200;

function toNullableId(v: unknown): string | null {
  return v == null || v === '' ? null : String(v);
}

async function getCaNhanRefs(): Promise<CaNhanImportRef[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const rows = await fetchAllPages<Record<string, unknown>>(
    async (from, to) => {
      const { data, error } = await supabase
        .from('dttg_thong_tin_ca_nhan_tieu_bieu')
        .select('id,ho_va_ten,doi_tuong,chuc_vu_vi_tri')
        .order('id', { ascending: true })
        .range(from, to);
      if (error) handleSupabaseError(error);
      return (data ?? []) as unknown as Record<string, unknown>[];
    },
    { label: 'dttg_thong_tin_ca_nhan_tieu_bieu (danh mục nhập thăm hỏi)' },
  );
  return rows.map((r) => ({
    id: String(r.id ?? ''),
    ten: String(r.ho_va_ten ?? ''),
    doi_tuong: toNullableId(r.doi_tuong),
    chuc_vu_vi_tri: toNullableId(r.chuc_vu_vi_tri),
  }));
}

/** Chỉ các bản ghi có mã xuất hiện trong file — khoá đối chiếu duy nhất là `id`. */
async function getThamHoiCaNhanImportKeys(ids: readonly string[]): Promise<ThamHoiCaNhanImportExisting[]> {
  const supabase = getSupabase();
  if (!supabase || ids.length === 0) return [];
  const out: ThamHoiCaNhanImportExisting[] = [];
  for (let i = 0; i < ids.length; i += ID_CHUNK) {
    const chunk = ids.slice(i, i + ID_CHUNK);
    const rows = await fetchAllPages<Record<string, unknown>>(
      async (from, to) => {
        const { data, error } = await supabase
          .from('dttg_tham_hoi_ca_nhan')
          .select('id,don_vi_tham_hoi_id,xa_phuong_id')
          .in('id', chunk)
          .order('id', { ascending: true })
          .range(from, to);
        if (error) handleSupabaseError(error);
        return (data ?? []) as unknown as Record<string, unknown>[];
      },
      { label: 'dttg_tham_hoi_ca_nhan (khoá nhập file)' },
    );
    for (const r of rows) {
      out.push({
        id: String(r.id ?? ''),
        don_vi_tham_hoi_id: toNullableId(r.don_vi_tham_hoi_id),
        xa_phuong_id: toNullableId(r.xa_phuong_id),
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

function payloadOf(row: ThamHoiCaNhanImportRow): Record<string, unknown> {
  return thamHoiCaNhanPayload(row.values, row.denorm, row.tenDip);
}

type RunnerCtx = ThamHoiCaNhanImportRowCtx & {
  existingById: ReadonlyMap<string, ThamHoiCaNhanImportExisting>;
};

/**
 * Luật phạm vi là "đơn vị thăm hỏi HOẶC xã phường là xã mình". Ghi đè từng phần
 * (chỉ một trong hai cột có trong file) giữ nguyên cột kia từ bản ghi cũ — nên
 * phải xét cặp giá trị SAU khi ghi, không chỉ giá trị trong file.
 */
function giuTrongPhamVi(
  viewer: DttgViewer,
  existing: ThamHoiCaNhanImportExisting | undefined,
  payload: Record<string, unknown>,
): boolean {
  if (!isDttgScopedToXaPhuong(viewer)) return true;
  const pick = (k: 'don_vi_tham_hoi_id' | 'xa_phuong_id') =>
    k in payload ? toNullableId(payload[k]) : (existing?.[k] ?? null);
  return canMutateDttgRowByDonVi(viewer, [pick('don_vi_tham_hoi_id'), pick('xa_phuong_id')]);
}

function buildRunner(ctx: ThamHoiCaNhanImportContext) {
  return createImportRunner<RunnerCtx, ThamHoiCaNhanImportExisting, ThamHoiCaNhanImportRow>({
    maxRows: THAM_HOI_CA_NHAN_IMPORT_MAX_ROWS,
    keys: THAM_HOI_CA_NHAN_IMPORT_KEYS,
    async load(rows) {
      const scoped = isDttgScopedToXaPhuong(ctx.viewer);
      // Cán bộ cấp xã chưa được gán đơn vị: không có xã nào hợp lệ để nhập vào.
      if (scoped && !ctx.viewer.viewerDonViId) {
        throw new Error(txt('danTocThamHoiCaNhan.import.errChuaGanDonVi'));
      }
      const [caNhan, phongBan, dip, xaAll, existing] = await Promise.all([
        getCaNhanRefs(),
        getDepartments(),
        getDipThamHoiOptions(),
        getXaPhuongAll(),
        getThamHoiCaNhanImportKeys(idsInFile(rows)),
      ]);
      return {
        ctx: {
          caNhan,
          phongBan: phongBan.map((p) => ({ id: String(p.id), ten: p.ten_phong_ban })),
          dip: dip.map((d) => ({ id: String(d.id), ten: d.ten_dip })),
          xaPhuong: xaAll.map((x) => ({ id: String(x.id), ten: x.ten })),
          donViPhamVi: scoped ? ctx.viewer.viewerDonViId : null,
          existingById: new Map(existing.map((e) => [e.id, e])),
        },
        existing,
      };
    },
    parseRow: parseThamHoiCaNhanImportRow,
    canWrite: (e) => canMutateDttgRowByDonVi(ctx.viewer, [e.don_vi_tham_hoi_id, e.xa_phuong_id]),
    create: (row) => insertThamHoiCaNhanFromImport(payloadOf(row), ctx.idNguoiTao),
    update: async (id, row, mapped, runCtx) => {
      const payload = pickMappedColumns(payloadOf(row), mapped, IMPORT_COLUMN_ALIAS);
      if (!giuTrongPhamVi(ctx.viewer, runCtx.existingById.get(id), payload)) {
        throw new Error(txt('danTocThamHoiCaNhan.import.errNgoaiDonVi'));
      }
      await updateThamHoiCaNhanPartial(id, payload);
    },
  });
}

export function dryRunThamHoiCaNhanImport(
  rows: Record<string, unknown>[],
  options: ImportRunOptions,
  ctx: ThamHoiCaNhanImportContext,
): Promise<ImportDryRunResult> {
  return buildRunner(ctx).dryRun(rows, options);
}

export function importThamHoiCaNhanRows(
  rows: Record<string, unknown>[],
  options: ImportRunOptions,
  ctx: ThamHoiCaNhanImportContext,
): Promise<ImportBatchResult> {
  return buildRunner(ctx).run(rows, options);
}
