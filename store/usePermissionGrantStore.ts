import { create } from 'zustand';
import type { ActionType } from '@/features/he-thong/phan-quyen/core/types';

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
  /** Bật matrix + gán quyền (gọi từ service sau khi load chức vụ / phân quyền). */
  setMatrixGrants: (grants: Record<string, ActionType[]>, chucVuCapBac?: number | null) => void;
  /** Đăng xuất hoặc trước khi đăng nhập lại — tắt matrix, xóa grants. */
  clearMatrix: () => void;
}

export const usePermissionGrantStore = create<PermissionGrantState>((set) => ({
  matrixActive: false,
  grantsByModule: {},
  chucVuCapBac: null,
  setMatrixGrants: (grants, chucVuCapBac = null) =>
    set({
      matrixActive: true,
      grantsByModule: grants,
      chucVuCapBac:
        chucVuCapBac != null && Number.isFinite(Number(chucVuCapBac)) ? Number(chucVuCapBac) : null,
    }),
  clearMatrix: () => set({ matrixActive: false, grantsByModule: {}, chucVuCapBac: null }),
}));
