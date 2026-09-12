/**
 * Nhập nhân viên từ Excel — khởi tạo hệ thống không còn phải gõ tay từng người.
 *
 * Hình dạng file: MỘT SHEET PHẲNG, một dòng = một nhân viên. Bảng `var_nhan_vien`
 * không có bảng con nên đây là hình dạng tự nhiên; các sheet sau trong file mẫu
 * chỉ để tra cứu (engine `ImportDialog` chỉ đọc sheet đầu tiên).
 *
 * Khác với các module khác: **mỗi nhân viên đi kèm một tài khoản đăng nhập**
 * (Edge Function `admin-user`). Vì vậy không thể `insert` một lô — phải đi TỪNG
 * DÒNG qua `createEmployee` để mỗi lỗi gắn đúng vào dòng Excel của nó, và dòng
 * hỏng không kéo theo dòng lành.
 */
import { txt } from '@/lib/text';
import { getErrorMessage } from '@/lib/utils';
import type { ImportErrorRow } from '@/components/shared/ImportDialog';
import { IMPORT_ROW_NUM_KEY } from '@/components/shared/ImportDialog';
import { getDepartments } from '@/features/he-thong/phong-ban/services/phong-ban-service';
import { getPositions } from '@/features/he-thong/chuc-vu/services/chuc-vu-service';
import { getXaPhuongAll } from '@/features/he-thong/danh-sach-tinh-thanh/services/dia-ban-service';
import { getMttqThietLapAll } from '@/features/mat-tran-to-quoc/thiet-lap-cai-dat/services/mttq-thiet-lap-service';
import { buildEmployeeSchema } from '../core/schema';
import { AuthUserExistsError, createEmployee, getEmployees } from './nhan-vien-service';
import {
  NHAN_VIEN_IMPORT_MAX_ROWS,
  parseNhanVienImportRow,
  type NamedRef,
} from '../utils/nhan-vien-import-row';

export type EmployeeImportResult = {
  created: number;
  errors: string[];
  errorRows: ImportErrorRow[];
};

function importRowNum(raw: Record<string, unknown>, fallback: number): number {
  const v = raw[IMPORT_ROW_NUM_KEY];
  if (typeof v === 'number' && v > 0) return v;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** `ImportDialog` chỉ hiện 10 lỗi đầu — chèn câu tóm tắt để không ai tưởng chỉ có 10. */
function withErrorSummary(errors: string[]): string[] {
  if (errors.length <= 10) return errors;
  return [txt('employee.import.errSummary', { count: errors.length }), ...errors];
}

export async function importEmployeeRows(
  rows: Record<string, unknown>[],
): Promise<EmployeeImportResult> {
  if (rows.length > NHAN_VIEN_IMPORT_MAX_ROWS) {
    return {
      created: 0,
      errors: [
        txt('employee.import.errTooManyRows', {
          count: rows.length,
          max: NHAN_VIEN_IMPORT_MAX_ROWS,
        }),
      ],
      errorRows: [],
    };
  }

  const [departments, positions, thietLapAll, xaAll, employees] = await Promise.all([
    getDepartments(),
    getPositions(),
    getMttqThietLapAll(),
    getXaPhuongAll(),
    getEmployees(),
  ]);

  const phongBan: NamedRef[] = departments.map((d) => ({ id: String(d.id), ten: d.ten_phong_ban }));
  const chucVu: NamedRef[] = positions.map((p) => ({ id: String(p.id), ten: p.ten_chuc_vu }));
  const toChuc: NamedRef[] = thietLapAll
    .filter((x) => x.loai === 'to_chuc')
    .map((x) => ({ id: String(x.id), ten: x.ten }));
  const xaPhuong: NamedRef[] = xaAll.map((x) => ({ id: String(x.id), ten: x.ten }));

  const existingUsernames = new Set(
    employees.map((e) => String(e.ten_tai_khoan ?? '').trim().toLowerCase()).filter(Boolean),
  );
  const seenUsernames = new Map<string, number>();
  const schema = buildEmployeeSchema();

  const errors: string[] = [];
  const errorRows: ImportErrorRow[] = [];

  // Bước 1 — kiểm TOÀN BỘ file trước khi ghi một dòng nào. Không có chạy thử
  // riêng, nhưng ít nhất lỗi định dạng/tra cứu không để lại nửa lô dữ liệu rác.
  const ready: { rowNum: number; rowData: Record<string, unknown>; data: ReturnType<typeof schema.parse> }[] = [];

  for (let i = 0; i < rows.length; i++) {
    const rowNum = importRowNum(rows[i], i + 2);
    const rowData = { ...rows[i] };
    delete rowData[IMPORT_ROW_NUM_KEY];

    const parsed = parseNhanVienImportRow(rowNum, rowData, {
      phongBan,
      chucVu,
      toChuc,
      xaPhuong,
      existingUsernames,
      seenUsernames,
    });
    if (!parsed.ok) {
      errors.push(parsed.message);
      errorRows.push({ rowNum, data: rowData, message: parsed.message });
      continue;
    }

    const checked = schema.safeParse(parsed.data);
    if (!checked.success) {
      const msg =
        txt('employee.import.rowPrefix', { row: rowNum }) +
        (checked.error.issues[0]?.message ?? checked.error.message);
      errors.push(msg);
      errorRows.push({ rowNum, data: rowData, message: msg });
      continue;
    }

    seenUsernames.set(checked.data.ten_tai_khoan, rowNum);
    ready.push({ rowNum, rowData, data: checked.data });
  }

  // Bước 2 — ghi từng dòng. Tuần tự (không Promise.all) vì mỗi dòng gọi Edge
  // Function tạo tài khoản; bắn song song vài trăm request sẽ bị chặn tốc độ.
  let created = 0;
  for (const item of ready) {
    try {
      await createEmployee(item.data);
      created += 1;
    } catch (err) {
      const msg =
        txt('employee.import.rowPrefix', { row: item.rowNum }) +
        (err instanceof AuthUserExistsError
          ? txt('employee.import.errAuthTonTai', { ten: item.data.ten_tai_khoan })
          : txt('employee.import.errTaoTaiKhoanDangNhap', {
              ten: item.data.ten_tai_khoan,
              message: getErrorMessage(err),
            }));
      errors.push(msg);
      errorRows.push({ rowNum: item.rowNum, data: item.rowData, message: msg });
    }
  }

  return { created, errors: withErrorSummary(errors), errorRows };
}
