/** Tuổi tại “hôm nay” theo lịch, không lưu DB. */
export function computeAgeFromBirthDate(ngaySinh: string | null | undefined): number | null {
  if (ngaySinh == null || ngaySinh === '') return null;
  const s = typeof ngaySinh === 'string' ? ngaySinh.slice(0, 10) : String(ngaySinh).slice(0, 10);
  const d = new Date(`${s}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) {
    age -= 1;
  }
  return age >= 0 ? age : null;
}
