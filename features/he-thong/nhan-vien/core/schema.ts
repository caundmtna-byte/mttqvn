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

/** Cho phép URL tuyệt đối hoặc data URL (ảnh crop); rỗng → null. */
const hinhAnhSchema = z
  .union([z.string(), z.null()])
  .optional()
  .transform((v) => {
    if (v === null || v === undefined) return null;
    const s = String(v).trim();
    return s === '' ? null : s;
  });

export const employeeSchema = z.object({
  ten_tai_khoan: z
    .string()
    .min(2, { message: txt('employee.validation.usernameMin') })
    .regex(USERNAME_REGEX, { message: txt('employee.validation.usernameFormat') }),
  ho_va_ten: z.string().min(2, { message: txt('employee.validation.fullNameMin') }),
  hinh_anh: hinhAnhSchema,
  id_phong_ban: requiredInt8Fk(txt('employee.validation.departmentRequired')),
  id_bo_phan: requiredInt8Fk(txt('employee.validation.unitRequired')),
  id_chuc_vu: requiredInt8Fk(txt('employee.validation.positionRequired')),
  trang_thai: z.enum(TRANG_THAI_NHAN_VIEN as unknown as [string, ...string[]]),
});

export type EmployeeFormValues = z.infer<typeof employeeSchema>;
