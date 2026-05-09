import { create } from 'zustand';
import type { ActionType } from '@/features/he-thong/phan-quyen/core/types';
import type { CapQuanLy } from '@/features/he-thong/chuc-vu/utils/cap-quan-ly';

/**
 * Quyền theo module (khớp `module_id` trong Phân quyền, ví dụ `he-thong/nhan-vien`).
 * Khi `matrixActive === false`, `can()` dùng luật legacy (admin/member).
 * Khi `matrixActive === true`, `can()` đối chiếu `grantsByModule` — hydrate sau khi gọi API theo `id_chuc_vu` (Supabase).
 */
export interface PermissionGrantState {
  matrixActive: boolean;
  grantsByModule: Record<string, ActionType[]>;
  /** `var_chuc_vu.cap_bac` của chức vụ đang hydrate ma trận. */
  chucVuCapBac: number | null;
  /** `var_chuc_vu.cap_quan_ly` sau chuẩn hoá — dùng gating xem theo Tỉnh/Xã (vd. ủy viên). */
  chucVuCapQuanLy: CapQuanLy | null;
  /** Bật matrix + gán quyền (gọi từ service sau khi load chức vụ / phân quyền). */
  setMatrixGrants: (
    grants: Record<string, ActionType[]>,
    chucVuCapBac?: number | null,
    chucVuCapQuanLy?: CapQuanLy | null,
  ) => void;
  /** Đăng xuất hoặc trước khi đăng nhập lại — tắt matrix, xóa grants. */
  clearMatrix: () => void;
}

export const usePermissionGrantStore = create<PermissionGrantState>((set) => ({
  matrixActive: false,
  grantsByModule: {},
  chucVuCapBac: null,
  chucVuCapQuanLy: null,
  setMatrixGrants: (grants, chucVuCapBac = null, chucVuCapQuanLy = null) =>
    set({
      matrixActive: true,
      grantsByModule: grants,
      chucVuCapBac:
        chucVuCapBac != null && Number.isFinite(Number(chucVuCapBac)) ? Number(chucVuCapBac) : null,
      chucVuCapQuanLy: chucVuCapQuanLy ?? null,
    }),
  clearMatrix: () =>
    set({ matrixActive: false, grantsByModule: {}, chucVuCapBac: null, chucVuCapQuanLy: null }),
}));
