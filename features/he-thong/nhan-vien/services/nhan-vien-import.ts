/**
 * Nhập nhân viên từ Excel — khai cho lõi chung `lib/data/import-runner.ts`.
 *
 * Hình dạng file: MỘT SHEET PHẲNG, một dòng = một nhân viên. Các sheet sau
 * trong file mẫu chỉ để tra cứu (`ImportDialog` chỉ đọc sheet đầu tiên).
 *
 * - **Thêm mới**: mỗi nhân viên đi kèm một tài khoản đăng nhập nên đi TỪNG DÒNG
 *   qua `createEmployee` (Edge Function `admin-user`) — lõi ghi tuần tự, mỗi lỗi
 *   gắn đúng dòng Excel, không bắn song song vài trăm request Auth.
 * - **Ghi đè**: chỉ sửa cột hồ sơ có trong file ở `var_nhan_vien`. Không bao
 *   giờ đụng tài khoản đăng nhập / mật khẩu, không đổi tên tài khoản.
 * - Phạm vi ghi đè theo đúng luật xem của module (`nhanVienRowVisible`).
 */
import { txt } from '@/lib/text';
import { getErrorMessage } from '@/lib/utils';
import type {
  ImportBatchResult,
  ImportDryRunResult,
  ImportRunOptions,
} from '@/components/shared/ImportDialog';
import { createImportRunner, pickMappedColumns } from '@/lib/data/import-runner';
import { getSupabase } from '@/lib/supabase/client';
import { handleSupabaseError } from '@/lib/supabase/errors';
import { fetchAllPages } from '@/lib/supabase/fetch-all-pages';
import { getDepartments } from '@/features/he-thong/phong-ban/services/phong-ban-service';
import { getPositions } from '@/features/he-thong/chuc-vu/services/chuc-vu-service';
import { getXaPhuongAll } from '@/features/he-thong/danh-sach-tinh-thanh/services/dia-ban-service';
import { getMttqThietLapAll } from '@/features/mat-tran-to-quoc/thiet-lap-cai-dat/services/mttq-thiet-lap-service';
import { nhanVienRowVisible, type NhanVienViewer } from '../hooks/use-nhan-vien-viewer';
import {
  AuthUserExistsError,
  createEmployee,
  employeeFormToProfilePayload,
  updateEmployeeProfilePartial,
} from './nhan-vien-service';
import {
  NHAN_VIEN_IMPORT_KEYS,
  NHAN_VIEN_IMPORT_MAX_ROWS,
  khoaTenTaiKhoan,
  kiemGhiDeNhanVien,
  parseNhanVienImportRow,
  type NhanVienImportCtx,
  type NhanVienImportExisting,
  type NhanVienImportRow,
} from '../utils/nhan-vien-import-row';

export interface NhanVienImportContext {
  viewer: NhanVienViewer;
}

const idOrNull = (v: unknown): string | null => {
  const s = v == null ? '' : String(v).trim();
  return s === '' ? null : s;
};

/** Chỉ cột khoá + cột xét phạm vi — không kéo cả hồ sơ (`docs/supabase-egress.md`). */
async function getNhanVienImportKeys(): Promise<NhanVienImportExisting[]> {
  const supabase = getSupabase();
  if (!supabase) return [];
  const rows = await fetchAllPages<Record<string, unknown>>(
    async (from, to) => {
      const { data, error } = await supabase
        .from('var_nhan_vien')
        .select('id,ten_tai_khoan,don_vi_id,id_phong_ban,cap_quan_ly')
        .order('id', { ascending: true })
        .range(from, to);
      if (error) handleSupabaseError(error);
      return (data ?? []) as unknown as Record<string, unknown>[];
    },
    { label: 'var_nhan_vien (khoá nhập file)' },
  );
  return rows.map((r) => ({
    id: String(r.id ?? ''),
    ten_tai_khoan: String(r.ten_tai_khoan ?? ''),
    don_vi_id: idOrNull(r.don_vi_id),
    id_phong_ban: idOrNull(r.id_phong_ban),
    cap_quan_ly: Array.isArray(r.cap_quan_ly) ? r.cap_quan_ly.map(String) : [],
  }));
}

async function createWithFriendlyError(row: NhanVienImportRow): Promise<void> {
  const ten = row.values.ten_tai_khoan;
  try {
    await createEmployee(row.values);
  } catch (err) {
    throw new Error(
      err instanceof AuthUserExistsError
        ? txt('employee.import.errAuthTonTai', { ten })
        : txt('employee.import.errTaoTaiKhoanDangNhap', { ten, message: getErrorMessage(err) }),
    );
  }
}

function buildRunner(ctx: NhanVienImportContext) {
  return createImportRunner<NhanVienImportCtx, NhanVienImportExisting, NhanVienImportRow>({
    maxRows: NHAN_VIEN_IMPORT_MAX_ROWS,
    keys: NHAN_VIEN_IMPORT_KEYS,
    async load() {
      const [departments, positions, thietLapAll, xaAll, existing] = await Promise.all([
        getDepartments(),
        getPositions(),
        getMttqThietLapAll(),
        getXaPhuongAll(),
        getNhanVienImportKeys(),
      ]);
      const taiKhoanTheoId = new Map<string, string>();
      for (const e of existing) {
        const k = khoaTenTaiKhoan(e.ten_tai_khoan);
        if (k) taiKhoanTheoId.set(e.id, k);
      }
      return {
        ctx: {
          phongBan: departments.map((d) => ({ id: String(d.id), ten: d.ten_phong_ban })),
          chucVu: positions.map((p) => ({ id: String(p.id), ten: p.ten_chuc_vu })),
          toChuc: thietLapAll
            .filter((x) => x.loai === 'to_chuc')
            .map((x) => ({ id: String(x.id), ten: x.ten })),
          xaPhuong: xaAll.map((x) => ({ id: String(x.id), ten: x.ten })),
          taiKhoanTheoId,
        },
        existing,
      };
    },
    parseRow: parseNhanVienImportRow,
    canWrite: (e) => nhanVienRowVisible(ctx.viewer, e),
    checkUpdate: kiemGhiDeNhanVien,
    create: createWithFriendlyError,
    update: (id, row, mapped) =>
      updateEmployeeProfilePartial(id, pickMappedColumns(employeeFormToProfilePayload(row.values), mapped)),
  });
}

export function dryRunEmployeeImport(
  rows: Record<string, unknown>[],
  options: ImportRunOptions,
  ctx: NhanVienImportContext,
): Promise<ImportDryRunResult> {
  return buildRunner(ctx).dryRun(rows, options);
}

export function importEmployeeRows(
  rows: Record<string, unknown>[],
  options: ImportRunOptions,
  ctx: NhanVienImportContext,
): Promise<ImportBatchResult> {
  return buildRunner(ctx).run(rows, options);
}
