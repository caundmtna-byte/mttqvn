/**
 * Khoá sổ kỳ — luật chung cho cả khối Mặt trận.
 *
 * Hai cấp khoá, nhiệm kỳ đè lên kỳ họp:
 *   · `mttq_nhiem_ky.da_khoa` → khoá cả cây (uỷ viên, kỳ họp, điểm danh);
 *   · `mttq_ky_hop.da_khoa`   → khoá riêng kỳ họp đó và điểm danh của nó.
 *
 * Database mới là chỗ chặn thật (trigger trong `20260801100000_khoa_ky.sql`).
 * Mấy hàm ở đây chỉ để giao diện **ẩn trước** nút Thêm/Sửa/Xoá và nói rõ vì sao
 * — người dùng không phải bấm rồi mới nhận thông báo lỗi.
 *
 * Đặt ở module nhiệm kỳ vì nhiệm kỳ là gốc của cây; module kỳ họp và uỷ viên
 * import sang, cùng kiểu với `ky-hop/utils/xoa-optimistic`.
 */

/** Cấp đang giữ khoá — quyết định câu "phải mở khoá ở đâu". */
export type NguonKhoaKy = 'nhiem_ky' | 'ky_hop' | null;

export interface TrangThaiKhoaKy {
  /** `mttq_nhiem_ky.da_khoa` của nhiệm kỳ đang xét (hoặc nhiệm kỳ cha). */
  nhiemKyDaKhoa?: boolean | null;
  /** `mttq_ky_hop.da_khoa` — chỉ có nghĩa với kỳ họp và điểm danh của nó. */
  kyHopDaKhoa?: boolean | null;
}

/**
 * Khoá đang đến từ đâu. Nhiệm kỳ được ưu tiên: khi cả hai cùng khoá thì mở
 * khoá kỳ họp cũng vô ích, phải mở nhiệm kỳ trước — câu nhắc phải nói đúng chỗ đó.
 */
export function nguonKhoaKy(trangThai: TrangThaiKhoaKy): NguonKhoaKy {
  if (trangThai.nhiemKyDaKhoa === true) return 'nhiem_ky';
  if (trangThai.kyHopDaKhoa === true) return 'ky_hop';
  return null;
}

/** Bản ghi (hoặc bản ghi con của nó) có đang bị khoá sổ không. */
export function daKhoaSo(trangThai: TrangThaiKhoaKy): boolean {
  return nguonKhoaKy(trangThai) !== null;
}

/**
 * Còn được Thêm / Sửa / Xoá không.
 *
 * Hai điều kiện ĐỘC LẬP, thiếu một là không: có quyền theo ma trận phân quyền,
 * **và** kỳ chưa khoá sổ. Khoá sổ không phải là quyền — quản trị cũng không ghi
 * đè được, muốn sửa thì phải mở khoá (và việc mở khoá đó có vết).
 */
export function coTheSuaKhiKhoa(
  trangThai: TrangThaiKhoaKy & { coQuyen?: boolean | null },
): boolean {
  return trangThai.coQuyen === true && !daKhoaSo(trangThai);
}
