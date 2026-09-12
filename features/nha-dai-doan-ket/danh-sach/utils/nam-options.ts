import { NDDK_NAM_MAX, NDDK_NAM_MIN } from '../core/constants';

/** Số năm quá khứ hiện trong chip lọc "Năm". */
export const NDDK_NAM_LOOKBACK = 10;

/**
 * Danh sách năm cho chip lọc, mới nhất lên trước.
 *
 * Danh sách phân trang phía máy chủ nên KHÔNG suy được năm từ dữ liệu đang tải
 * (chỉ ra năm có mặt trên đúng trang đang xem). Vì vậy dựng từ năm hiện tại:
 * một năm tới (hồ sơ lập trước cho năm sau) lùi về `NDDK_NAM_LOOKBACK` năm,
 * kẹp trong khoảng CHECK của DB.
 */
export function buildNddkNamOptions(
  currentYear: number = new Date().getFullYear(),
  lookback: number = NDDK_NAM_LOOKBACK,
): { value: string; label: string }[] {
  const from = Math.max(NDDK_NAM_MIN, currentYear - lookback);
  const to = Math.min(NDDK_NAM_MAX, currentYear + 1);
  const out: { value: string; label: string }[] = [];
  for (let y = to; y >= from; y -= 1) {
    out.push({ value: String(y), label: String(y) });
  }
  return out;
}
