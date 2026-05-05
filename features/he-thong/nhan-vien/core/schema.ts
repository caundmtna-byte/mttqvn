import { z } from "zod";
import { txt } from '../../../../lib/text';
import { TRANG_THAI_NHAN_VIEN } from './constants';

/* ================================================================
 *  Regex patterns cho validation nâng cao
 * ================================================================ */

/** SĐT Việt Nam: bắt đầu 0, theo sau 9–10 chữ số */
const PHONE_REGEX = /^0\d{9,10}$/;

/** CCCD Việt Nam: 12 chữ số */
const CCCD_REGEX = /^\d{12}$/;

/** Mã số thuế cá nhân: 10 hoặc 13 chữ số */
const MST_REGEX = /^\d{10}(\d{3})?$/;

/** Kiểm tra tuổi ≥ 16 (tuổi lao động tối thiểu) */
const isWorkingAge = (dateStr: string): boolean => {
  const dob = new Date(dateStr);
  if (isNaN(dob.getTime())) return true; // bỏ qua nếu không parse được
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age >= 16;
};

export const employeeSchema = z.object({
  ma_nhan_vien: z.string().min(2, { message: txt('employee.validation.codeRequired') }),
  ho_ten: z.string().min(2, { message: txt('employee.validation.nameMin') }),
  email: z.string().email({ message: txt('employee.validation.emailInvalid') }),
  so_dien_thoai: z.string()
    .min(1, { message: txt('employee.validation.phoneRequired') })
    .regex(PHONE_REGEX, { message: txt('employee.validation.phoneInvalid') }),
  chuc_vu_id: z.string().min(1, { message: txt('employee.validation.positionRequired') }),
  phong_ban_id: z.string().min(1, { message: txt('employee.validation.departmentRequired') }),
  chi_nhanh_id: z.string().optional().nullable(),
  gioi_tinh: z.enum(['Nam', 'Nữ', 'Khác']),
  trang_thai: z.enum(TRANG_THAI_NHAN_VIEN),
  ngay_vao_lam: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: txt('employee.validation.hireDateInvalid'),
  }),
  anh_dai_dien: z.string().optional().nullable(),

  // --- Thông tin cá nhân ---
  ngay_sinh: z.string().optional().nullable()
    .refine(
      (val) => !val || isWorkingAge(val),
      { message: txt('employee.validation.ageMin') }
    ),
  cmnd_cccd: z.string().optional().nullable()
    .refine(
      (val) => !val || CCCD_REGEX.test(val),
      { message: txt('employee.validation.idCardLength') }
    ),
  ngay_cap_cccd: z.string().optional().nullable(),
  noi_cap_cccd: z.string().optional().nullable(),
  quoc_tich: z.string().optional().nullable(),
  dan_toc: z.string().optional().nullable(),
  ton_giao: z.string().optional().nullable(),

  // --- Địa chỉ ---
  tinh_thanh: z.string().optional().nullable(),
  quan_huyen: z.string().optional().nullable(),
  phuong_xa: z.string().optional().nullable(),
  dia_chi_cu_the: z.string().optional().nullable(),
  dia_chi_tam_tru: z.string().optional().nullable(),

  // --- Công việc (mở rộng) ---
  cap_bac_id: z.string().optional().nullable(),
  loai_hop_dong: z.string().optional().nullable(),
  ngay_het_han_hd: z.string().optional().nullable(),
  noi_lam_viec: z.string().optional().nullable(),

  // --- Liên hệ (mở rộng) ---
  email_ca_nhan: z.string().email({ message: txt('employee.validation.personalEmailInvalid') }).optional().or(z.literal("")),
  nguoi_lien_he_khan_cap: z.string().optional().nullable(),
  sdt_khan_cap: z.string().optional().nullable()
    .refine(
      (val) => !val || PHONE_REGEX.test(val),
      { message: txt('employee.validation.emergencyPhoneInvalid') }
    ),
  quan_he_khan_cap: z.string().optional().nullable(),

  // --- Hôn nhân & Gia đình ---
  tinh_trang_hon_nhan: z.string().optional().nullable(),
  so_nguoi_phu_thuoc: z.coerce.number().optional().nullable(),

  // --- Học vấn ---
  trinh_do_hoc_van: z.string().optional().nullable(),
  chuyen_nganh: z.string().optional().nullable(),
  truong_hoc: z.string().optional().nullable(),
  nam_tot_nghiep: z.string().optional().nullable(),
  chung_chi: z.string().optional().nullable(),

  // --- Tài chính & Ngân hàng ---
  so_tai_khoan: z.string().optional().nullable(),
  ten_ngan_hang: z.string().optional().nullable(),
  chi_nhanh_nh: z.string().optional().nullable(),
  ma_so_thue_ca_nhan: z.string().optional().nullable()
    .refine(
      (val) => !val || MST_REGEX.test(val),
      { message: txt('employee.validation.taxIdLength') }
    ),

  // --- Bảo hiểm ---
  so_bhxh: z.string().optional().nullable(),
  so_bhyt: z.string().optional().nullable(),
  ngay_tham_gia_bh: z.string().optional().nullable(),
  noi_dang_ky_kcb: z.string().optional().nullable(),
}).refine(
  (data) => {
    // Nếu hợp đồng "Có thời hạn" thì ngày hết hạn HĐ phải được nhập
    if (data.loai_hop_dong === 'Có thời hạn') {
      return !!data.ngay_het_han_hd;
    }
    return true;
  },
  {
    message: txt('employee.validation.contractEndRequired'),
    path: ['ngay_het_han_hd'],
  }
);

export type EmployeeFormValues = z.infer<typeof employeeSchema>;
