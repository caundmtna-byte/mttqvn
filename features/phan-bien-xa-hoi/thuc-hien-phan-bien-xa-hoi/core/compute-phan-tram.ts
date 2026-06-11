/** Tỷ lệ % = (số lần hoàn thành / số lần khảo sát) × 100, làm tròn 0–100. */
export function computePhanTramHoanThanh(soLanHoanThanh: number, soLanKhaoSat: number): number {
  if (!Number.isFinite(soLanHoanThanh) || !Number.isFinite(soLanKhaoSat) || soLanKhaoSat <= 0) {
    return 0;
  }
  return Math.min(100, Math.max(0, Math.round((soLanHoanThanh / soLanKhaoSat) * 100)));
}
