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

const CAP_QUAN_LY_ENUM = ['Tỉnh', 'Xã phường'] as const;

const employeeBaseSchema = z.object({
  ten_tai_khoan: z
    .string()
    .min(2, { message: txt('employee.validation.usernameMin') })
    .regex(USERNAME_REGEX, { message: txt('employee.validation.usernameFormat') }),
  ho_va_ten: z.string().min(2, { message: txt('employee.validation.fullNameMin') }),
  hinh_anh: hinhAnhSchema,
  id_phong_ban: requiredInt8Fk(txt('employee.validation.departmentRequired')),
  id_bo_phan: optionalInt8Fk(),
  id_chuc_vu: requiredInt8Fk(txt('employee.validation.positionRequired')),
  cap_quan_ly: z.array(z.enum(CAP_QUAN_LY_ENUM)).default([]),
  to_chuc_ids: z.array(z.string()).default([]),
  don_vi_id: optionalInt8Fk(),
  trang_thai: z.enum(TRANG_THAI_NHAN_VIEN as unknown as [string, ...string[]]),
});

export function buildEmployeeSchema() {
  return employeeBaseSchema.superRefine((data, ctx) => {
    if (data.cap_quan_ly.includes('Xã phường')) {
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
