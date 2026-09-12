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
  /**
   * True từ lúc mount tới khi truy vấn `permission-grants` xong (thành công HOẶC lỗi).
   *
   * Cần thiết vì store này **không persist**: sau mỗi F5, `matrixActive` là `false`.
   * Không có cờ này thì UI không phân biệt được "chưa tải quyền" với "đã tải, không
   * có quyền" — trước đây khoảng trống đó được lấp bằng cách cho xem tất cả
   * (`legacyCan` trả true cho mọi `view`), tức là mở toang sau mỗi lần tải lại trang.
   */
  matrixLoading: boolean;
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
  /** Truy vấn quyền đã kết thúc (kể cả khi lỗi) — thôi chờ, áp luật deny-by-default. */
  setMatrixLoading: (loading: boolean) => void;
  /** Đăng xuất hoặc trước khi đăng nhập lại — tắt matrix, xóa grants. */
  clearMatrix: () => void;
}

export const usePermissionGrantStore = create<PermissionGrantState>((set) => ({
  matrixActive: false,
  matrixLoading: true,
  grantsByModule: {},
  chucVuCapBac: null,
  chucVuCapQuanLy: null,
  setMatrixLoading: (loading) => set({ matrixLoading: loading }),
  setMatrixGrants: (grants, chucVuCapBac = null, chucVuCapQuanLy = null) =>
    set({
      matrixActive: true,
      matrixLoading: false,
      grantsByModule: grants,
      chucVuCapBac:
        chucVuCapBac != null && Number.isFinite(Number(chucVuCapBac)) ? Number(chucVuCapBac) : null,
      chucVuCapQuanLy: chucVuCapQuanLy ?? null,
    }),
  clearMatrix: () =>
    set({
      matrixActive: false,
      matrixLoading: false,
      grantsByModule: {},
      chucVuCapBac: null,
      chucVuCapQuanLy: null,
    }),
}));
