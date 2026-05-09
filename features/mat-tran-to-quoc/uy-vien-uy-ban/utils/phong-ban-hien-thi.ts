/** Chuỗi phòng ban / bộ phận hiển thị từ hồ sơ cán bộ (đã flatten). */
export function formatTenPhongBanHienThi(
  tenPhongBan: string | null | undefined,
  tenBoPhan: string | null | undefined,
): string | null {
  const pb = (tenPhongBan ?? '').trim();
  const bp = (tenBoPhan ?? '').trim();
  if (pb && bp) return `${pb} · ${bp}`;
  return pb || bp || null;
}
