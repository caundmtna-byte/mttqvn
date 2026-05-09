import { z } from 'zod';
import { txt } from '../../../../lib/text';
import { TRANG_THAI_NHAN_VIEN } from './constants';

const USERNAME_REGEX = /^[a-zA-Z0-9_.-]+$/;

/** Chuỗi rỗng hoặc số nguyên dương (int8) — giá trị không phải số → chuỗi rỗng. */
function normInt8FkInput(v: unknown): string {
  if (v === undefined || v === null) return '';
  const s = String(v).trim();
  if (!s) return '';
  if (!/^\d+$/.test(s)) return '';
  return s;
}

/** FK int8 bắt buộc (phòng ban / bộ phận / chức vụ). */
function requiredInt8Fk(message: string) {
  return z
    .union([z.literal(''), z.string(), z.number()])
    .optional()
    .transform(normInt8FkInput)
    .refine((s) => s.length > 0, { message });
}

/** FK int8 tuỳ chọn (đơn vị / xã phường). */
function optionalInt8Fk() {
  return z
    .union([z.literal(''), z.string(), z.number(), z.null()])
    .optional()
    .transform((v) => normInt8FkInput(v));
}

/** Cho phép URL tuyệt đối hoặc data URL (ảnh crop); rỗng → null. */
const hinhAnhSchema = z
  .union([z.string(), z.null()])
  .optional()
  .transform((v) => {
    if (v === null || v === undefined) return null;
    const s = String(v).trim();
    return s === '' ? null : s;
  });

/** Tra cứu `cap_quan_ly` theo `id_chuc_vu` (đồng bộ rule với `var_chuc_vu`). */
export type EmployeePositionCapLookup = { id: string; cap_quan_ly?: string | null };

const employeeBaseSchema = z.object({
  ten_tai_khoan: z
    .string()
    .min(2, { message: txt('employee.validation.usernameMin') })
    .regex(USERNAME_REGEX, { message: txt('employee.validation.usernameFormat') }),
  ho_va_ten: z.string().min(2, { message: txt('employee.validation.fullNameMin') }),
  hinh_anh: hinhAnhSchema,
  id_phong_ban: requiredInt8Fk(txt('employee.validation.departmentRequired')),
  id_bo_phan: requiredInt8Fk(txt('employee.validation.unitRequired')),
  id_chuc_vu: requiredInt8Fk(txt('employee.validation.positionRequired')),
  don_vi_id: optionalInt8Fk(),
  trang_thai: z.enum(TRANG_THAI_NHAN_VIEN as unknown as [string, ...string[]]),
});

export function buildEmployeeSchema(positions: readonly EmployeePositionCapLookup[]) {
  const capByChucVuId = new Map<string, string | null | undefined>(
    positions.map((p) => [String(p.id), p.cap_quan_ly]),
  );
  return employeeBaseSchema.superRefine((data, ctx) => {
    const cap = capByChucVuId.get(String(data.id_chuc_vu));
    if (cap === 'Xã phường') {
      const dv = data.don_vi_id ?? '';
      if (!dv) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: txt('employee.validation.donViRequired'),
          path: ['don_vi_id'],
        });
      }
    }
  });
}

export type EmployeeFormValues = z.infer<typeof employeeBaseSchema>;
