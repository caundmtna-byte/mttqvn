/**
 * Nhập phòng ban từ Excel — khai cho lõi chung `lib/data/import-runner.ts`.
 *
 * Danh mục phòng ban nhỏ (có trần tự nhiên) nên một lần `getDepartments()` đủ
 * cho cả tra phòng cha lẫn đối chiếu bản ghi đã có. Ghi đè chỉ đụng cột có
 * trong file; đổi phòng cha thì tính lại đường dẫn cây.
 */
import type {
  ImportBatchResult,
  ImportDryRunResult,
  ImportRunOptions,
} from '@/components/shared/ImportDialog';
import { txt } from '@/lib/text';
import { createImportRunner, pickMappedColumns } from '@/lib/data/import-runner';
import {
  PHONG_BAN_IMPORT_KEYS,
  PHONG_BAN_IMPORT_MAX_ROWS,
  parsePhongBanImportRow,
  taoVongCha,
  type PhongBanImportExisting,
  type PhongBanImportRow,
  type PhongBanImportRowCtx,
} from '../utils/phong-ban-import-row';
import {
  createDepartment,
  departmentFormToPayload,
  getDepartments,
  updateDepartmentPartial,
} from './phong-ban-service';

const runner = createImportRunner<PhongBanImportRowCtx, PhongBanImportExisting, PhongBanImportRow>({
  maxRows: PHONG_BAN_IMPORT_MAX_ROWS,
  keys: PHONG_BAN_IMPORT_KEYS,
  async load() {
    const depts = await getDepartments();
    return {
      ctx: {
        phongBan: depts.map((d) => ({ id: String(d.id), ten: d.ten_phong_ban })),
        duongDanTheoId: new Map(depts.map((d) => [String(d.id), d.duong_dan ?? ''])),
      },
      existing: depts.map((d) => ({ id: String(d.id), ten_phong_ban: d.ten_phong_ban })),
    };
  },
  parseRow: parsePhongBanImportRow,
  create: (row) => createDepartment(row.values),
  update: (id, row, mapped, ctx) => {
    const payload = pickMappedColumns(departmentFormToPayload(row.values), mapped);
    if ('cha_id' in payload && taoVongCha(id, row.values.cha_id || null, ctx.duongDanTheoId)) {
      throw new Error(txt('department.import.errChaVong'));
    }
    return updateDepartmentPartial(id, payload);
  },
});

export function dryRunPhongBanImport(
  rows: Record<string, unknown>[],
  options: ImportRunOptions,
): Promise<ImportDryRunResult> {
  return runner.dryRun(rows, options);
}

export function importPhongBanRows(
  rows: Record<string, unknown>[],
  options: ImportRunOptions,
): Promise<ImportBatchResult> {
  return runner.run(rows, options);
}
