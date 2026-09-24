/**
 * Nhập ủy viên ủy ban từ Excel — khai cho lõi chung `lib/data/import-runner.ts`.
 *
 * Danh mục tra cứu (nhiệm kỳ, xã phường, cán bộ) và bản ghi đã có nạp MỘT lần,
 * chỉ các cột cần (xem `docs/supabase-egress.md`). Phạm vi ghi đè theo đúng
 * luật xem của module (`canViewUyVienUyBanRow`): RLS bảng này vẫn `USING
 * (true)` nên đây là lớp chặn duy nhất.
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
import { canViewUyVienUyBanRow, type MttqUyVienUyBanViewer } from '../hooks/use-mttq-uy-vien-uy-ban-viewer';
import {
  UY_VIEN_IMPORT_MAX_ROWS,
  parseUyVienImportRow,
  uyVienImportPayload,
  uyVienMappedDbColumns,
  type UyVienImportRow,
  type UyVienImportRowCtx,
} from '../utils/uy-vien-import-row';
import { UY_VIEN_IMPORT_KEYS, type UyVienImportExisting } from '../utils/uy-vien-import-keys';
import { insertMttqUyVienUyBanForImport, updateMttqUyVienUyBanPartial } from './mttq-uy-vien-uy-ban-service';

export interface UyVienImportContext {
  idNguoiTao: string;
  viewer: MttqUyVienUyBanViewer;
}

type Table = 'mttq_uy_vien_uy_ban' | 'mttq_nhiem_ky' | 'mttq_can_bo';

async function fetchCols(table: Table, cols: string): Promise<Record<string, unknown>[]> {
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
    { label: `${table} (nhập ủy viên)` },
  );
}

const str = (v: unknown): string => (v == null ? '' : String(v));
const strOrNull = (v: unknown): string | null => (v == null || v === '' ? null : String(v));

function buildRunner(ctx: UyVienImportContext) {
  return createImportRunner<UyVienImportRowCtx, UyVienImportExisting, UyVienImportRow>({
    maxRows: UY_VIEN_IMPORT_MAX_ROWS,
    keys: UY_VIEN_IMPORT_KEYS,
    async load() {
      if (!ctx.idNguoiTao.trim()) throw new Error(txt('matTranUyVienUyBan.service.noEmployeeProfile'));
      const v = ctx.viewer;
      const capXa = !v.canViewAll && v.chucVuCapQuanLy === 'Xã phường';
      if (capXa && !v.viewerDonViId) throw new Error(txt('shared.import.errChuaGanDonVi'));
      const [nhiemKy, xaAll, canBo, existing] = await Promise.all([
        fetchCols('mttq_nhiem_ky', 'id,ten_nhiem_ky'),
        getXaPhuongAll(),
        fetchCols('mttq_can_bo', 'id,ho_ten,ngay_sinh'),
        fetchCols('mttq_uy_vien_uy_ban', 'id,nhiem_ky_id,can_bo_id,ma_uv,don_vi_id,id_nguoi_tao'),
      ]);
      return {
        ctx: {
          nhiemKy: nhiemKy.map((n) => ({ id: str(n.id), ten: str(n.ten_nhiem_ky) })),
          xaPhuong: xaAll.map((x) => ({ id: String(x.id), ten: x.ten })),
          xaPhamVi: capXa ? v.viewerDonViId : null,
          canBo: canBo.map((c) => ({
            id: str(c.id),
            ho_ten: str(c.ho_ten),
            ngay_sinh: c.ngay_sinh == null ? null : str(c.ngay_sinh).slice(0, 10),
          })),
        },
        existing: existing.map((e) => ({
          id: str(e.id),
          nhiem_ky_id: str(e.nhiem_ky_id),
          can_bo_id: str(e.can_bo_id),
          ma_uv: strOrNull(e.ma_uv),
          don_vi_id: strOrNull(e.don_vi_id),
          id_nguoi_tao: strOrNull(e.id_nguoi_tao),
        })),
      };
    },
    parseRow: parseUyVienImportRow,
    canWrite: (e) => canViewUyVienUyBanRow(ctx.viewer, e),
    create: (row) => insertMttqUyVienUyBanForImport(uyVienImportPayload(row, true), ctx.idNguoiTao.trim()),
    update: (id, row, mapped) =>
      updateMttqUyVienUyBanPartial(id, pickMappedColumns(uyVienImportPayload(row), uyVienMappedDbColumns(mapped))),
  });
}

export function dryRunUyVienImport(
  rows: Record<string, unknown>[],
  options: ImportRunOptions,
  ctx: UyVienImportContext,
): Promise<ImportDryRunResult> {
  return buildRunner(ctx).dryRun(rows, options);
}

export function importUyVienRows(
  rows: Record<string, unknown>[],
  options: ImportRunOptions,
  ctx: UyVienImportContext,
): Promise<ImportBatchResult> {
  return buildRunner(ctx).run(rows, options);
}
