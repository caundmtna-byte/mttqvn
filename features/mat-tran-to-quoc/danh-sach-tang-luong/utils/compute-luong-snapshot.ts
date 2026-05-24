/** Lương snapshot = MLCS × hệ số bậc (làm tròn VND). */
export function computeLuongFromMlcsAndHeSo(mlcs: number, heSo: number): number {
  if (!Number.isFinite(mlcs) || mlcs <= 0 || !Number.isFinite(heSo) || heSo <= 0) return 0;
  return Math.round(mlcs * heSo);
}
