/**
 * Đọc ô Excel dùng chung cho mọi module nhập file — hàm thuần, không gọi mạng.
 *
 * Danh mục tra cứu (`findRef`) được nạp sẵn một lần rồi truyền vào; tra danh mục
 * bằng request trong vòng lặp là lỗi N+1. So tên sau khi BỎ DẤU và bỏ phân biệt
 * hoa/thường, và chỉ khớp NGUYÊN VẸN — khớp chuỗi con là gán nhầm khoá ngoại.
 */
import { chuanHoaKhoaSoKhop } from '@/lib/vietnamese';

export interface NamedRef {
  id: string;
  ten: string;
  /** Khoá phụ để tra thêm (ví dụ tên tài khoản của nhân viên). */
  alias?: string | null;
}

/**
 * Ô Excel → chuỗi đã cắt hai đầu.
 * Số nguyên rất lớn (id dán từ hệ thống khác) bị `Number` làm tròn mất chữ số,
 * nên đi qua `BigInt` trước khi đổi sang chuỗi.
 */
export function trimCell(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'number') {
    if (Number.isInteger(v) && Math.abs(v) > 1e12) return String(BigInt(v));
    return String(v);
  }
  if (v instanceof Date) return v.toISOString();
  return String(v).trim();
}

const EXCEL_EPOCH_MS = Date.UTC(1899, 11, 30);
/** Ngoài dải này chắc chắn không phải serial ngày của Excel (≈ năm 1900–7000). */
const EXCEL_SERIAL_MIN = 200;
const EXCEL_SERIAL_MAX = 2_000_000;

/**
 * Ghép ngày và KIỂM LẠI bằng cách so ngược từng thành phần.
 * `Date.parse('2026-02-31')` KHÔNG trả NaN mà tự trôi sang 03/03/2026 — nhận
 * bừa như vậy là ghi sai ngày vào CSDL mà không ai thấy dấu vết.
 */
function ghepNgayChuan(nam: number, thang: number, ngay: number): string | null {
  if (!Number.isInteger(nam) || !Number.isInteger(thang) || !Number.isInteger(ngay)) return null;
  const d = new Date(Date.UTC(nam, thang - 1, ngay));
  if (
    d.getUTCFullYear() !== nam ||
    d.getUTCMonth() !== thang - 1 ||
    d.getUTCDate() !== ngay
  ) {
    return null;
  }
  return `${String(nam).padStart(4, '0')}-${String(thang).padStart(2, '0')}-${String(ngay).padStart(2, '0')}`;
}

/**
 * Ngày ở 4 dạng thường gặp: `Date`, serial Excel, ISO `yyyy-mm-dd`, `dd/mm/yyyy`.
 * Không dùng `dayjs(s, fmt, true)` vì repo chưa nạp plugin `customParseFormat`.
 */
export function parseImportNgay(raw: unknown): string | null {
  if (raw == null || raw === '') return null;

  if (raw instanceof Date) {
    return Number.isNaN(raw.getTime()) ? null : raw.toISOString().slice(0, 10);
  }

  if (typeof raw === 'number' && Number.isFinite(raw)) {
    if (raw <= EXCEL_SERIAL_MIN || raw >= EXCEL_SERIAL_MAX) return null;
    const d = new Date(EXCEL_EPOCH_MS + Math.floor(raw) * 86_400_000);
    return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
  }

  const s = trimCell(raw);
  if (!s) return null;

  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (iso) return ghepNgayChuan(Number(iso[1]), Number(iso[2]), Number(iso[3]));

  const dmy = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/.exec(s);
  if (dmy) return ghepNgayChuan(Number(dmy[3]), Number(dmy[2]), Number(dmy[1]));

  return null;
}

/** Tra theo id trước, rồi tên, rồi alias — tất cả đều bỏ dấu khi so. */
export function findRef<T extends NamedRef>(list: readonly T[], raw: unknown): T | null {
  const s = trimCell(raw);
  if (!s) return null;
  const byId = list.find((x) => String(x.id) === s);
  if (byId) return byId;
  const key = chuanHoaKhoaSoKhop(s);
  if (!key) return null;
  return (
    list.find((x) => chuanHoaKhoaSoKhop(x.ten) === key) ??
    list.find((x) => x.alias != null && chuanHoaKhoaSoKhop(x.alias) === key) ??
    null
  );
}

export type RefLookup<T> = { ok: true; ref: T | null } | { ok: false; reason: 'missing' | 'ambiguous' };

/**
 * Như `findRef` nhưng không nhận bừa khi hai mục trùng tên (hai xã cùng tên ở hai
 * tỉnh…): trả `ambiguous` để người nhập dùng id. Ô trống ⇒ `{ ok: true, ref: null }`.
 */
export function findRefStrict<T extends NamedRef>(list: readonly T[], raw: unknown): RefLookup<T> {
  const s = trimCell(raw);
  if (!s) return { ok: true, ref: null };
  const byId = list.find((x) => String(x.id) === s);
  if (byId) return { ok: true, ref: byId };
  const key = chuanHoaKhoaSoKhop(s);
  const hits = key ? list.filter((x) => chuanHoaKhoaSoKhop(x.ten) === key) : [];
  if (hits.length === 1) return { ok: true, ref: hits[0] };
  return { ok: false, reason: hits.length > 1 ? 'ambiguous' : 'missing' };
}

/** Khớp một giá trị liệt kê (enum) không phân biệt hoa/thường và dấu. */
export function matchEnumCell<T extends string>(values: readonly T[], raw: unknown): T | null {
  const key = chuanHoaKhoaSoKhop(trimCell(raw));
  if (!key) return null;
  return values.find((v) => chuanHoaKhoaSoKhop(v) === key) ?? null;
}
