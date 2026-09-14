/**
 * Câu tiếng Việt cho thông báo kiểm tra dữ liệu của zod.
 *
 * zod sinh câu tiếng Anh kỹ thuật khi schema không tự khai `message`:
 *
 *     Too small: expected string to have >=1 characters
 *     Invalid option: expected one of "Phiếu nhập"|"Phiếu xuất"
 *
 * Chuỗi đó hiện ở CẢ chữ đỏ dưới ô nhập lẫn toast, mà người dùng là cán bộ
 * cấp tỉnh / xã phường. Dịch tập trung một chỗ ở đây thì không phải sửa
 * ~146 ràng buộc rải trong hơn 12 file `core/schema.ts`.
 *
 * Bản locale `vi` có sẵn của zod dịch quá máy móc ("Quá nhỏ: mong đợi string
 * có >=1 ký tự") nên không dùng.
 *
 * Hàm chỉ chạy khi issue CHƯA có message riêng — mọi `message:` module đã viết
 * tay vẫn được ưu tiên, không bị ghi đè.
 */
import { z } from 'zod';

type ZodIssue = z.core.$ZodRawIssue;

const CHUA_HOP_LE = 'Giá trị chưa hợp lệ.';
const BAT_BUOC = 'Vui lòng nhập thông tin.';

/** Ngưỡng trong issue là `number | bigint`; đưa về chuỗi để ghép câu. */
function nguong(v: unknown): string {
  return typeof v === 'bigint' ? v.toString() : String(v);
}

function cauQuaNho(issue: ZodIssue & { origin?: string; minimum?: unknown }): string {
  const min = nguong(issue.minimum);
  switch (issue.origin) {
    case 'string':
      // `.min(1)` chỉ có nghĩa "bắt buộc nhập"; nói số ký tự ở đây là gây rối.
      return min === '1' ? BAT_BUOC : `Phải có ít nhất ${min} ký tự.`;
    case 'number':
    case 'int':
    case 'bigint':
      return `Giá trị phải từ ${min} trở lên.`;
    case 'array':
    case 'set':
      return min === '1' ? 'Phải có ít nhất 1 dòng.' : `Phải có ít nhất ${min} dòng.`;
    case 'date':
      return 'Ngày đã chọn quá sớm.';
    default:
      return CHUA_HOP_LE;
  }
}

function cauQuaLon(issue: ZodIssue & { origin?: string; maximum?: unknown }): string {
  const max = nguong(issue.maximum);
  switch (issue.origin) {
    case 'string':
      return `Chỉ được nhập tối đa ${max} ký tự.`;
    case 'number':
    case 'int':
    case 'bigint':
      return `Giá trị không được vượt quá ${max}.`;
    case 'array':
    case 'set':
      return `Chỉ được tối đa ${max} dòng.`;
    case 'date':
      return 'Ngày đã chọn quá muộn.';
    default:
      return CHUA_HOP_LE;
  }
}

function cauSaiDinhDang(issue: ZodIssue & { format?: string }): string {
  switch (issue.format) {
    case 'email':
      return 'Địa chỉ email chưa đúng định dạng.';
    case 'url':
      return 'Đường dẫn chưa đúng định dạng.';
    case 'date':
      return 'Ngày chưa đúng định dạng.';
    case 'datetime':
      return 'Ngày giờ chưa đúng định dạng.';
    case 'time':
      return 'Giờ chưa đúng định dạng.';
    default:
      return 'Nội dung nhập chưa đúng định dạng.';
  }
}

/** Câu tiếng Việt cho một issue của zod. Export riêng để test được. */
export function cauTiengVietChoIssue(issue: ZodIssue): string {
  switch (issue.code) {
    case 'invalid_type':
      // Ô bỏ trống về tới đây khi schema không cho phép `undefined`/`null`.
      return issue.input === undefined || issue.input === null ? BAT_BUOC : CHUA_HOP_LE;
    case 'too_small':
      return cauQuaNho(issue as ZodIssue & { origin?: string; minimum?: unknown });
    case 'too_big':
      return cauQuaLon(issue as ZodIssue & { origin?: string; maximum?: unknown });
    case 'invalid_value':
    case 'invalid_union':
    case 'invalid_key':
    case 'invalid_element':
      return 'Giá trị chưa hợp lệ. Vui lòng chọn lại trong danh sách.';
    case 'invalid_format':
      return cauSaiDinhDang(issue as ZodIssue & { format?: string });
    case 'not_multiple_of':
      return CHUA_HOP_LE;
    case 'unrecognized_keys':
      return 'Dữ liệu gửi lên có trường không hợp lệ. Vui lòng tải lại trang.';
    default:
      return CHUA_HOP_LE;
  }
}

/**
 * Bật câu tiếng Việt cho toàn bộ zod. Gọi MỘT LẦN lúc khởi động app,
 * trước khi render — xem `index.tsx`.
 */
export function applyZodVietnameseErrors(): void {
  z.config({ customError: (issue) => cauTiengVietChoIssue(issue) });
}
