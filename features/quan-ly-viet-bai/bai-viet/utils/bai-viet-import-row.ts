/**
 * Đọc MỘT dòng Excel thành dữ liệu bài viết — hàm thuần, không gọi mạng.
 *
 * Mọi danh mục (thể loại / nguồn đăng / trang đăng / nhân viên) được nạp sẵn một
 * lần rồi truyền vào đây dưới dạng mảng tra cứu. Tra danh mục bằng request trong
 * vòng lặp là lỗi N+1 mà vài module thế hệ cũ đang mắc.
 *
 * Chấp nhận cả id lẫn tên; tên so khớp sau khi BỎ DẤU và bỏ phân biệt hoa/thường
 * để người nhập không phải gõ đúng từng dấu.
 */
import { txt } from '@/lib/text';
import { parseSoInput } from '@/lib/number';
import { chuanHoaKhoaSoKhop } from '@/lib/vietnamese';
import { baiVietDanhSachSchema, type BaiVietDanhSachFormValues } from '../core/schema';
import { normalizeBaiVietLinkForCompare } from './bai-viet-link-conflict';
import { normalizeBaiVietTenBaiForCompare } from './bai-viet-ten-bai-conflict';

/** Trần dòng mỗi lần nhập. Cao hơn nữa thì trình duyệt ôm cả file lẫn danh mục sẽ đuối. */
export const BAI_VIET_IMPORT_MAX_ROWS = 2000;

export interface NamedRef {
  id: string;
  ten: string;
  /** Khoá phụ để tra thêm (ví dụ tên tài khoản của nhân viên). */
  alias?: string | null;
}

export interface TheLoaiRef extends NamedRef {
  /** Đơn giá mặc định của thể loại — dùng khi người nhập không được sửa đơn giá. */
  donGia: number;
}

export type ImportRowOutcome<T> = { ok: true; data: T } | { ok: false; message: string };

export interface BaiVietImportRowInput {
  theLoai: readonly TheLoaiRef[];
  nguonDang: readonly NamedRef[];
  trangDang: readonly NamedRef[];
  /** Chỉ truyền khi người chạy đủ quyền gán bài cho người khác. */
  nhanVien?: readonly NamedRef[];
  /** Nhân viên mặc định (người đang đăng nhập) khi dòng không chỉ định người tạo. */
  idNguoiTaoMacDinh: string;
  /** Không đủ quyền sửa đơn giá thì bỏ qua cột đơn giá, lấy đơn giá của thể loại. */
  choSuaDonGia: boolean;
}

export interface BaiVietImportRow {
  rowNum: number;
  values: BaiVietDanhSachFormValues;
  idNguoiTao: string;
  /** Khoá so trùng, tính sẵn để lớp lập kế hoạch khỏi chuẩn hoá lại. */
  linkKey: string;
  tenBaiKey: string;
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

function fail(rowNum: number, message: string): { ok: false; message: string } {
  return { ok: false, message: txt('articleList.import.rowPrefix', { row: rowNum }) + message };
}

export function parseBaiVietImportRow(
  rowNum: number,
  raw: Record<string, unknown>,
  ctx: BaiVietImportRowInput,
): ImportRowOutcome<BaiVietImportRow> {
  const tenBai = trimCell(raw.ten_bai);
  if (!tenBai) return fail(rowNum, txt('articleList.import.errTenBaiTrong'));

  const theLoai = findRef(ctx.theLoai, raw.id_the_loai);
  if (!theLoai) {
    return fail(rowNum, txt('articleList.import.errTheLoai', { gia_tri: trimCell(raw.id_the_loai) }));
  }

  const nguon = findRef(ctx.nguonDang, raw.id_nguon_dang);
  if (!nguon) {
    return fail(rowNum, txt('articleList.import.errNguonDang', { gia_tri: trimCell(raw.id_nguon_dang) }));
  }

  const trang = findRef(ctx.trangDang, raw.id_trang_dang);
  if (!trang) {
    return fail(rowNum, txt('articleList.import.errTrangDang', { gia_tri: trimCell(raw.id_trang_dang) }));
  }

  const ngayDang = parseImportNgay(raw.ngay_dang);
  if (!ngayDang) {
    return fail(rowNum, txt('articleList.import.errNgayDang', { gia_tri: trimCell(raw.ngay_dang) }));
  }

  // Không đủ quyền sửa đơn giá thì cột này trong file bị bỏ qua hoàn toàn và lấy
  // đơn giá mặc định của thể loại — đúng bằng hành vi của form nhập tay.
  let donGia = theLoai.donGia;
  if (ctx.choSuaDonGia) {
    const rawDonGia = raw.don_gia;
    const isEmpty = rawDonGia == null || trimCell(rawDonGia) === '';
    if (!isEmpty) {
      const n =
        typeof rawDonGia === 'number'
          ? rawDonGia
          : parseSoInput(trimCell(rawDonGia), { choThapPhan: true });
      if (n == null || !Number.isFinite(n)) {
        return fail(rowNum, txt('articleList.import.errDonGia', { gia_tri: trimCell(rawDonGia) }));
      }
      donGia = n;
    }
  }

  let idNguoiTao = ctx.idNguoiTaoMacDinh;
  const rawNguoiTao = trimCell(raw.id_nguoi_tao);
  if (rawNguoiTao && ctx.nhanVien) {
    const nv = findRef(ctx.nhanVien, rawNguoiTao);
    if (!nv) return fail(rowNum, txt('articleList.import.errNguoiTao', { gia_tri: rawNguoiTao }));
    idNguoiTao = nv.id;
  }
  if (!idNguoiTao) return fail(rowNum, txt('articleList.import.errKhongCoNguoiTao'));

  const parsed = baiVietDanhSachSchema.safeParse({
    ten_bai: tenBai,
    id_the_loai: theLoai.id,
    don_gia: donGia,
    ngay_dang: ngayDang,
    id_nguon_dang: nguon.id,
    id_trang_dang: trang.id,
    link: trimCell(raw.link),
  });
  if (!parsed.success) {
    return fail(rowNum, parsed.error.issues[0]?.message ?? parsed.error.message);
  }

  return {
    ok: true,
    data: {
      rowNum,
      values: parsed.data,
      idNguoiTao,
      linkKey: normalizeBaiVietLinkForCompare(parsed.data.link),
      tenBaiKey: normalizeBaiVietTenBaiForCompare(parsed.data.ten_bai),
    },
  };
}
