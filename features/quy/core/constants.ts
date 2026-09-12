/**
 * Hằng số dùng chung cho hai quỹ tiền: **Quỹ vì người nghèo** và **Quỹ cứu trợ**.
 *
 * Hai quỹ giống hệt nhau về nghiệp vụ nên dùng CHUNG một bộ bảng (`quy_*`) và
 * CHUNG một bộ màn hình — phân biệt bằng cột `quy`. Mỗi trang nhận `quy` làm
 * tham số, hai nhánh route trỏ vào cùng một component.
 */

export const QUY_KEYS = ['vi_nguoi_ngheo', 'cuu_tro'] as const;
export type QuyKey = (typeof QUY_KEYS)[number];

/** Nhãn tiếng Việt của từng quỹ — hiện ở tiêu đề trang và tên file xuất. */
export const QUY_LABEL: Record<QuyKey, string> = {
  vi_nguoi_ngheo: 'Quỹ vì người nghèo',
  cuu_tro: 'Quỹ cứu trợ',
};

/** Segment đường dẫn của từng quỹ (`/an-sinh-xa-hoi/<segment>/...`). */
export const QUY_ROUTE_SEGMENT: Record<QuyKey, string> = {
  vi_nguoi_ngheo: 'quy-vi-nguoi-ngheo',
  cuu_tro: 'quy-cuu-tro',
};

/** Hậu tố tên file xuất Excel. */
export const QUY_FILE_SUFFIX: Record<QuyKey, string> = {
  vi_nguoi_ngheo: 'quy-vi-nguoi-ngheo',
  cuu_tro: 'quy-cuu-tro',
};

export const QUY_LOAI_KEYS = ['thu', 'chi'] as const;
export type QuyLoai = (typeof QUY_LOAI_KEYS)[number];

/** Nhãn loại phiếu trong sổ. */
export const QUY_LOAI_PHIEU_LABEL: Record<QuyLoai, string> = {
  thu: 'Phiếu thu',
  chi: 'Phiếu chi',
};

/** Nhãn loại khoản mục trong danh mục. */
export const QUY_LOAI_KHOAN_LABEL: Record<QuyLoai, string> = {
  thu: 'Khoản thu',
  chi: 'Khoản chi',
};

export const QUY_TRANG_THAI_KEYS = ['Hoạt động', 'Ngừng'] as const;
export type QuyTrangThai = (typeof QUY_TRANG_THAI_KEYS)[number];

export function isQuyKey(v: unknown): v is QuyKey {
  return typeof v === 'string' && (QUY_KEYS as readonly string[]).includes(v);
}

export function isQuyLoai(v: unknown): v is QuyLoai {
  return typeof v === 'string' && (QUY_LOAI_KEYS as readonly string[]).includes(v);
}

/** Đường dẫn gốc của quỹ — dùng cho nút Quay lại và điều hướng giữa các trang. */
export function quyModulePath(quy: QuyKey, module: string): string {
  return `/an-sinh-xa-hoi/${QUY_ROUTE_SEGMENT[quy]}/${module}`;
}
