import { z } from 'zod';
import { txt } from '@/lib/text';
import { MTTQ_CAN_BO_GIOI_TINH } from './constants';
import { normalizeCapQuanLyInput } from '@/features/he-thong/chuc-vu/utils/cap-quan-ly';
import type { MttqCanBo } from './types';
import type { Position } from '@/features/he-thong/chuc-vu/core/types';
import type { Department } from '@/features/he-thong/phong-ban/core/types';

type PositionForCanBoSchema = Pick<Position, 'id' | 'cap_quan_ly' | 'phong_ban_id'>;

/** Phòng ban (cây) — lọc chức vụ theo phòng gốc + các bộ phận con. */
export type DepartmentForCanBoSchema = Pick<Department, 'id' | 'cha_id' | 'trang_thai'>;

function requiredIsoDate(messageEmpty: string) {
  return z
    .string()
    .trim()
    .min(1, messageEmpty)
    .refine((s) => !Number.isNaN(Date.parse(s)), txt('matTranCanBo.validation.dateInvalid'));
}

const mttqCanBoFields = z.object({
  to_chuc_id: z.string().trim().min(1, txt('matTranCanBo.validation.toChucRequired')),
  ho_ten: z.string().trim().min(1, txt('matTranCanBo.validation.hoTenRequired')),
  ngay_sinh: requiredIsoDate(txt('matTranCanBo.validation.ngaySinhRequired')),
  gioi_tinh: z.enum(MTTQ_CAN_BO_GIOI_TINH, { message: txt('matTranCanBo.validation.gioiTinhRequired') }),
  dan_toc_id: z.string().trim().min(1, txt('matTranCanBo.validation.danTocRequired')),
  ton_giao: z.string().trim().min(1, txt('matTranCanBo.validation.tonGiaoRequired')),
  dia_chi: z.string().trim().min(1, txt('matTranCanBo.validation.diaChiRequired')),
  dang_vien: z.boolean(),
  trinh_do_id: z.string().trim().min(1, txt('matTranCanBo.validation.trinhDoRequired')),
  ly_luan_chinh_tri_id: z.string().trim().min(1, txt('matTranCanBo.validation.lyLuanRequired')),
  dien_thoai: z.string().trim().min(1, txt('matTranCanBo.validation.dienThoaiRequired')),
  id_phong_ban: z.string().trim().min(1, txt('matTranCanBo.validation.phongBanRequired')),
  chuc_vu_id: z.string().trim().min(1, txt('matTranCanBo.validation.chucVuRequired')),
  don_vi_id: z.string(),
  ngay_tham_gia_to_chuc: requiredIsoDate(txt('matTranCanBo.validation.ngayThamGiaRequired')),
  trang_thai_id: z.string().trim().min(1, txt('matTranCanBo.validation.trangThaiRequired')),
  ngay_nhap_trang_thai: requiredIsoDate(txt('matTranCanBo.validation.ngayNhapTrangThaiRequired')),
  van_hoa: z.string().default(''),
  ngay_vao_dang: z.string().default(''),
  que_quan: z.string().default(''),
  noi_o_hien_nay: z.string().default(''),
});

export type MttqCanBoFormValues = z.infer<typeof mttqCanBoFields>;

function capByChucVuFromPositionsAndRow(
  positions: PositionForCanBoSchema[],
  initial: MttqCanBo | null | undefined,
): Map<string, ReturnType<typeof normalizeCapQuanLyInput>> {
  const m = new Map<string, ReturnType<typeof normalizeCapQuanLyInput>>();
  for (const p of positions) {
    m.set(String(p.id), normalizeCapQuanLyInput(p.cap_quan_ly as string | null | undefined));
  }
  if (initial?.chuc_vu_id) {
    const id = String(initial.chuc_vu_id);
    if (!m.has(id) || m.get(id) == null) {
      m.set(id, normalizeCapQuanLyInput(initial.chuc_vu_cap_quan_ly ?? undefined));
    }
  }
  return m;
}

export function buildMttqCanBoSchema(
  positions: PositionForCanBoSchema[],
  initialData: MttqCanBo | null | undefined,
  departments: DepartmentForCanBoSchema[],
) {
  return mttqCanBoFields.superRefine((data, ctx) => {
    const root = data.id_phong_ban.trim();
    const allowedPhongBanIds = new Set<string>();
    if (root) {
      allowedPhongBanIds.add(root);
      for (const d of departments) {
        if (
          d.trang_thai === 'Đang hoạt động' &&
          d.cha_id != null &&
          String(d.cha_id) === root
        ) {
          allowedPhongBanIds.add(String(d.id));
        }
      }
    }
    const pos = positions.find((p) => String(p.id) === String(data.chuc_vu_id));
    if (pos) {
      const pb =
        pos.phong_ban_id == null || pos.phong_ban_id === '' ? '' : String(pos.phong_ban_id).trim();
      if (pb && !allowedPhongBanIds.has(pb)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: txt('matTranCanBo.validation.chucVuPhongBanMismatch'),
          path: ['chuc_vu_id'],
        });
      }
    }
    const capMap = capByChucVuFromPositionsAndRow(positions, initialData);
    const cap = capMap.get(String(data.chuc_vu_id));
    const needDonVi = cap === 'Xã phường';
    const dv = data.don_vi_id.trim();
    if (needDonVi && !dv) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: txt('matTranCanBo.validation.donViRequired'),
        path: ['don_vi_id'],
      });
    }
  });
}
