/**
 * Thẻ chỉ số Trang chủ — kiểu dùng chung cho mọi nguồn số liệu (công việc, kỳ họp…).
 */
import type { LucideIcon } from 'lucide-react';

/** Sắc thái thẻ: đỏ = cần xử lý gấp, hổ phách = sắp tới, xanh = thông tin. */
export type HomeMetricTone = 'danger' | 'warning' | 'info';

export interface HomeMetricCardItem {
  /** Khoá React + khoá test. */
  id: string;
  /** Nhãn hiển thị (tiếng Việt, không thuật ngữ kỹ thuật). */
  label: string;
  /** Con số chính. */
  value: number;
  /** Dòng phụ dưới con số (ví dụ ngày gần nhất). Rỗng thì không hiện. */
  hint?: string | null;
  icon: LucideIcon;
  tone: HomeMetricTone;
  /** Đường dẫn khi bấm — phải mở đúng danh sách đã lọc sẵn. */
  onOpen: () => void;
}
