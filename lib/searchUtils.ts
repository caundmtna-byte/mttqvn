/**
 * Utilities chuẩn hóa tìm kiếm trên list view.
 * Dùng chung cho mọi module: tìm trên tất cả cột hiển thị + trường liên kết (enriched).
 *
 * So khớp theo **dạng người dùng nhìn thấy**: bỏ dấu tiếng Việt, ngày ISO kèm thêm
 * dạng DD/MM/YYYY, số kèm thêm dạng có dấu chấm ngăn cách (150.000).
 */
import { formatDateTime } from './utils';
import { chuanHoaKhoaSoKhop } from './vietnamese';

const ISO_DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const ISO_TIMESTAMP = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/;

/** Chuỗi ISO → thêm dạng hiển thị để gõ "23/09/2026" cũng khớp. */
function stringToSearchParts(value: string): string[] {
  const dateOnly = ISO_DATE_ONLY.exec(value);
  if (dateOnly) return [value, `${dateOnly[3]}/${dateOnly[2]}/${dateOnly[1]}`];
  if (ISO_TIMESTAMP.test(value)) {
    const shown = formatDateTime(value);
    return shown ? [value, shown] : [value];
  }
  return [value];
}

/**
 * Chuẩn hóa giá trị từ item thành các chuỗi để so khớp tìm kiếm.
 * null/undefined → [], number → thô + dạng vi-VN, mảng → gộp từng phần tử,
 * object khác bỏ qua.
 */
function valueToSearchParts(value: unknown): string[] {
  if (value == null) return [];
  if (typeof value === 'string') return value ? stringToSearchParts(value) : [];
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) return [];
    const formatted = value.toLocaleString('vi-VN');
    return formatted === String(value) ? [formatted] : [String(value), formatted];
  }
  if (typeof value === 'boolean') return [String(value)];
  if (value instanceof Date) return stringToSearchParts(value.toISOString());
  if (Array.isArray(value)) return value.flatMap(valueToSearchParts);
  return [];
}

/**
 * Lấy chuỗi gộp từ item theo danh sách key, dùng để so khớp với searchTerm.
 * Đã bỏ dấu + lowercase (qua `chuanHoaKhoaSoKhop`).
 *
 * @param item - Một bản ghi (row) trong list
 * @param keys - Các key cần search (id cột + trường enriched: ten_xxx, trang_thai_text...)
 */
export function getSearchableText(
  item: Record<string, unknown>,
  keys: string[]
): string {
  const parts: string[] = [];
  for (const key of keys) parts.push(...valueToSearchParts(item[key]));
  return chuanHoaKhoaSoKhop(parts.join(' '));
}

/**
 * Kiểm tra item có khớp searchTerm khi tìm trong các trường keys hay không.
 * searchTerm rỗng (sau trim) → luôn khớp (true). Không phân biệt dấu / hoa thường.
 *
 * @param item - Một bản ghi trong list
 * @param searchTerm - Chuỗi người dùng nhập
 * @param keys - Các key cần search (id cột + trường liên kết)
 */
export function matchesSearchTerm(
  item: Record<string, unknown>,
  searchTerm: string,
  keys: string[]
): boolean {
  const term = chuanHoaKhoaSoKhop(searchTerm);
  if (!term) return true;
  return getSearchableText(item, keys).includes(term);
}
