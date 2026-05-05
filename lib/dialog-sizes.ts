/**
 * Quy định kích thước Dialog (modal giữa màn hình) và Drawer (slide từ phải).
 * Dùng thống nhất toàn app để giao diện chuyên nghiệp, đồng bộ.
 */

// ========== DIALOG (modal centered) ==========
/** Kích thước dialog – dùng class Tailwind cho container */
export const DIALOG_SIZE = {
  /** Xác nhận đơn giản: xóa, confirm, hủy thao tác */
  CONFIRM: 'max-w-sm',
  /** Lựa chọn nhanh: export options, picker đơn giản */
  COMPACT: 'max-w-md',
  /** Nội dung vừa */
  MEDIUM: 'max-w-lg',
  /** Nội dung nhiều: import, upload, phê duyệt (comment, lịch sử) */
  LARGE: 'max-w-2xl',
} as const;

// ========== DRAWER (slide từ phải) – Form & Detail cùng kích thước, chuẩn theo drawer nhân viên ==========
/** Drawer Form và Detail: cùng 48rem (768px) */
export const DRAWER_WIDTH_FORM = 'sm:w-[48rem] sm:min-w-[48rem] sm:max-w-[48rem]';
/** Detail dùng chung với Form */
export const DRAWER_WIDTH_DETAIL = DRAWER_WIDTH_FORM;

/** Drawer rộng cho form phức tạp cần panel phụ bên trái (82rem ≈ 1312px) */
export const DRAWER_WIDTH_WIDE = 'sm:w-[82rem] sm:min-w-[82rem] sm:max-w-[82rem]';

/** Drawer khi mở chồng lên drawer khác: nhỏ hơn (44rem) để tạo phân tầng */
export const DRAWER_WIDTH_STACKED = 'sm:w-[44rem] sm:min-w-[44rem] sm:max-w-[44rem]';

/** Drawer detail con / compact: nhỏ hơn (36rem) dùng trong detail lồng nhau */
export const DRAWER_WIDTH_DETAIL_SMALL = 'sm:w-[36rem] sm:min-w-[36rem] sm:max-w-[36rem]';

/**
 * Trả về class width cho drawer theo stack level.
 * level 0 = drawer nền (48rem), level >= 1 = drawer chồng (44rem).
 */
export function getDrawerWidthClass(stackLevel: number): string {
  return stackLevel > 0 ? DRAWER_WIDTH_STACKED : DRAWER_WIDTH_FORM;
}

/** Z-index base cho drawer (backdrop / content) – cao hơn header (z-40) và toolbar (z-30), đồng bộ với dialog overlay */
export const DRAWER_Z_BASE = 60;
export const DRAWER_Z_CONTENT_BASE = 61;

/**
 * Phân tầng overlay toàn app:
 * - Menu ngữ cảnh bảng (⋮) thấp hơn modal xác nhận để dialog luôn nổi trên.
 */
export const Z_INDEX_CONTEXT_MENU_CLASS = 'z-[100]';
/** Modal xác nhận (ConfirmDialog), form modal giữa màn hình */
export const Z_INDEX_APP_MODAL_CLASS = 'z-[200]';
