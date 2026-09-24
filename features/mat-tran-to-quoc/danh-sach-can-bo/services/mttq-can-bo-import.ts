/**
 * Nhập hồ sơ cán bộ từ Excel — khai cho lõi chung `lib/data/import-runner.ts`.
 *
 * Danh mục (chức vụ, phòng ban, thiết lập, xã phường) và hồ sơ đã có nạp MỘT
 * lần; hồ sơ đã có chỉ kéo cột khoá (`id, ho_ten, ngay_sinh, don_vi_id`). Phạm
 * vi ghi đè theo đúng luật xem của module (`canViewCanBoRow`: xã phường chỉ đè
 * cán bộ của xã mình).
 *
 * Ghi đè CHỈ đụng cột có trong file — hai cột mảng `to_chuc_ids`, `cap_quan_ly`
 * cũng chỉ bị ghi khi cột của nó được map.
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
import { getPositions } from '@/features/he-thong/chuc-vu/services/chuc-vu-service';
import { getDepartments } from '@/features/he-thong/phong-ban/services/phong-ban-service';
import { getMttqThietLapAll } from '@/features/mat-tran-to-quoc/thiet-lap-cai-dat/services/mttq-thiet-lap-service';
import type { MttqThietLapLoai } from '@/features/mat-tran-to-quoc/thiet-lap-cai-dat/core/types';
import { getXaPhuongAll } from '@/features/he-thong/danh-sach-tinh-thanh/services/dia-ban-service';
import { buildMttqCanBoSchema } from '../core/schema';
import { canViewCanBoRow, type MttqCanBoViewer } from '../hooks/use-mttq-can-bo-viewer';
import {
  CAN_BO_IMPORT_COLUMN_ALIAS,
  CAN_BO_IMPORT_MAX_ROWS,
  parseCanBoImportRow,
  type CanBoImportRow,
  type CanBoImportRowCtx,
} from '../utils/can-bo-import-row';
import { CAN_BO_IMPORT_KEYS, type CanBoImportExisting } from '../utils/can-bo-import-keys';
import { formToPayload, insertMttqCanBoForImport, updateMttqCanBoPartial } from './mttq-can-bo-service';

export interface CanBoImportContext {
  idNguoiTao: string;
  viewer: MttqCanBoViewer;
}

async function getCanBoImportKeys(): Promise<CanBoImportExisting[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const rows = await fetchAllPages<Record<string, unknown>>(
    async (from, to) => {
      const { data, error } = await supabase
        .from('mttq_can_bo')
        .select('id,ho_ten,ngay_sinh,don_vi_id')
        .order('id', { ascending: true })
        .range(from, to);
      if (error) handleSupabaseError(error);
      return (data ?? []) as unknown as Record<string, unknown>[];
    },
    { label: 'mttq_can_bo (khoá nhập file)' },
  );
  return rows.map((r) => ({
    id: String(r.id ?? ''),
    ho_ten: String(r.ho_ten ?? ''),
    ngay_sinh: r.ngay_sinh == null ? null : String(r.ngay_sinh).slice(0, 10),
    don_vi_id: r.don_vi_id == null || r.don_vi_id === '' ? null : String(r.don_vi_id),
  }));
}

function thietByLoai(all: { id: string; loai: MttqThietLapLoai; ten: string }[], loai: MttqThietLapLoai) {
  return all.filter((x) => x.loai === loai).map((x) => ({ id: String(x.id), ten: x.ten }));
}

function buildRunner(ctx: CanBoImportContext) {
  return createImportRunner<CanBoImportRowCtx, CanBoImportExisting, CanBoImportRow>({
    maxRows: CAN_BO_IMPORT_MAX_ROWS,
    keys: CAN_BO_IMPORT_KEYS,
    async load() {
      if (!ctx.idNguoiTao.trim()) throw new Error(txt('matTranCanBo.service.noEmployeeProfile'));
      const [positions, departments, thietLapAll, xaList, existing] = await Promise.all([
        getPositions(),
        getDepartments(),
        getMttqThietLapAll(),
        getXaPhuongAll(),
        getCanBoImportKeys(),
      ]);
      const schema = buildMttqCanBoSchema(
        positions.map((p) => ({ id: String(p.id), phong_ban_id: p.phong_ban_id ?? null })),
        undefined,
        departments.map((d) => ({
          id: String(d.id),
          cha_id: d.cha_id == null ? null : String(d.cha_id),
          trang_thai: d.trang_thai,
        })),
      );
      return {
        ctx: {
          positions,
          departments,
          toChuc: thietByLoai(thietLapAll, 'to_chuc'),
          danToc: thietByLoai(thietLapAll, 'dan_toc'),
          trinhDo: thietByLoai(thietLapAll, 'trinh_do'),
          lyLuan: thietByLoai(thietLapAll, 'ly_luan_chinh_tri'),
          trangThai: thietByLoai(thietLapAll, 'trang_thai'),
          xa: xaList.map((x) => ({ id: String(x.id), ten: x.ten })),
          schema,
        },
        existing,
      };
    },
    parseRow: parseCanBoImportRow,
    canWrite: (e) => canViewCanBoRow(ctx.viewer, e),
    create: (row) => insertMttqCanBoForImport(formToPayload(row.values, ctx.idNguoiTao.trim())),
    update: (id, row, mapped) =>
      updateMttqCanBoPartial(
        id,
        pickMappedColumns(formToPayload(row.values), mapped, CAN_BO_IMPORT_COLUMN_ALIAS),
      ),
  });
}

export function dryRunCanBoImport(
  rows: Record<string, unknown>[],
  options: ImportRunOptions,
  ctx: CanBoImportContext,
): Promise<ImportDryRunResult> {
  return buildRunner(ctx).dryRun(rows, options);
}

export function importMttqCanBoRows(
  rows: Record<string, unknown>[],
  options: ImportRunOptions,
  ctx: CanBoImportContext,
): Promise<ImportBatchResult> {
  return buildRunner(ctx).run(rows, options);
}
