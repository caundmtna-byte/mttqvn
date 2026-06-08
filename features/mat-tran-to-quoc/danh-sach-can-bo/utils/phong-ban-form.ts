/**
 * `phong_ban_id` lưu DB có thể là phòng ban gốc hoặc (legacy) id bộ phận con.
 * Form chỉ chọn phòng ban gốc → luôn map về `id` phòng cha để hiển thị combobox.
 */
export function rootPhongBanIdForForm(
  phong_ban_id: string | null | undefined,
  departments: readonly { id: string; cha_id: string | null }[],
): string {
  const id = phong_ban_id != null && String(phong_ban_id).trim() !== '' ? String(phong_ban_id).trim() : '';
  if (!id) return '';
  const node = departments.find((d) => String(d.id) === id);
  if (!node) return '';
  if (!node.cha_id) return String(node.id);
  return String(node.cha_id);
}
