/**
 * Mô hình văn bản hành chính nhà nước dùng cho các biểu mẫu in của module. Đây là lớp *dữ liệu thuần* — không phụ thuộc DOM, không phụ thuộc
 * React — nên cả ba đường xuất (xem trước/in, DOCX, PDF) đọc đúng một nguồn.
 *
 * Thể thức bám Nghị định 30/2020/NĐ-CP: quốc hiệu — tiêu ngữ, tên cơ quan ban hành,
 * số và ký hiệu, địa danh + ngày tháng, tên loại/trích yếu, căn cứ, nội dung,
 * nơi nhận, chữ ký.
 */

export const QUOC_HIEU = 'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM';
export const TIEU_NGU = 'Độc lập - Tự do - Hạnh phúc';

export type VanBanAlign = 'left' | 'center' | 'right';

/** Một đoạn văn bản trong phần nội dung. */
export interface VanBanDoanVan {
  kind: 'doan';
  text: string;
  bold?: boolean;
  italic?: boolean;
  align?: VanBanAlign;
  /** Thụt đầu dòng 1cm như đoạn văn hành chính thường lệ. */
  indent?: boolean;
}

/** Một bảng dữ liệu nhiều dòng trong phần nội dung. */
export interface VanBanBang {
  kind: 'bang';
  headers: string[];
  rows: string[][];
  /** Căn lề theo từng cột; thiếu thì mặc định căn trái. */
  aligns?: VanBanAlign[];
  /** Tỉ lệ bề rộng cột (%) — tổng nên bằng 100. */
  widths?: number[];
  /** Cột cấm xuống dòng (ngày tháng, số hiệu) — tránh "20/09/198 0". */
  nowraps?: boolean[];
  /** Hiện khi `rows` rỗng. */
  emptyMessage?: string;
}

export type VanBanKhoiNoiDung = VanBanDoanVan | VanBanBang;

/** Cặp nhãn — giá trị hiển thị ở khối thông tin chung (biểu mẫu danh sách). */
export interface VanBanMucThongTin {
  label: string;
  value: string;
}

export interface VanBanChuKy {
  /** Ví dụ `TM. BAN THƯỜNG TRỰC`. */
  thayMat?: string;
  /** Ví dụ `CHỦ TỊCH`. */
  chucDanh: string;
  /** Họ tên người ký — để trống thì chừa chỗ ký tay. */
  hoTen?: string;
}

export interface VanBanHanhChinhModel {
  /** Cơ quan chủ quản (dòng trên, in thường). */
  coQuanChuQuan?: string;
  /** Cơ quan ban hành (dòng dưới, in đậm). */
  coQuanBanHanh: string;
  /** `Số: 12/QĐ-MTTQ-BTT` — phần sau nhãn `Số:`. */
  soKyHieu: string;
  /** `Nghệ An, ngày 05 tháng 9 năm 2025`. */
  diaDanhNgayThang: string;
  /** Tên loại văn bản: `QUYẾT ĐỊNH` / `DANH SÁCH`. */
  tenLoai: string;
  /** Trích yếu: `Về việc khen thưởng ...`. */
  trichYeu?: string;
  /** Thẩm quyền ban hành, in hoa đậm — chỉ có ở quyết định. */
  thamQuyen?: string;
  /** Các dòng `Căn cứ ...;` — chỉ có ở quyết định. */
  canCu?: string[];
  /** Khối thông tin chung dạng 2 cột — dùng cho biểu mẫu danh sách. */
  thongTinChung?: VanBanMucThongTin[];
  noiDung: VanBanKhoiNoiDung[];
  /** `Nơi nhận:` + các dòng. Không truyền thì ẩn cả khối. */
  noiNhan?: string[];
  chuKy: VanBanChuKy;
  /** Cột chữ ký phụ bên trái (ví dụ `NGƯỜI LẬP BIỂU`). */
  chuKyPhu?: VanBanChuKy;
}

const THANG_KHONG_DEM_SO_0 = /^0(\d)$/;

/**
 * `2025-09-05` → `ngày 05 tháng 9 năm 2025`.
 *
 * Thể thức hành chính: ngày < 10 viết thêm số 0, tháng < 10 KHÔNG thêm số 0
 * (Nghị định 30/2020/NĐ-CP, Phụ lục I, mục 6).
 */
export function formatNgayThangNamVanBan(iso: string | null | undefined): string {
  const raw = String(iso ?? '').trim();
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  if (!m) return '';
  const [, nam, thang, ngay] = m;
  const thangHienThi = thang.replace(THANG_KHONG_DEM_SO_0, '$1');
  return `ngày ${ngay} tháng ${thangHienThi} năm ${nam}`;
}

/** `Nghệ An, ngày 05 tháng 9 năm 2025`; thiếu ngày thì chỉ còn địa danh + dấu phẩy. */
export function formatDiaDanhNgayThang(diaDanh: string, iso: string | null | undefined): string {
  const ngay = formatNgayThangNamVanBan(iso);
  const dd = diaDanh.trim();
  if (!ngay) return dd ? `${dd}, ngày      tháng      năm     ` : '';
  return dd ? `${dd}, ${ngay}` : ngay;
}

/** Chia danh sách mục thông tin thành các hàng 2 cột để bố trí như biểu mẫu giấy. */
export function layoutThongTinPairs(items: VanBanMucThongTin[]): VanBanMucThongTin[][] {
  const pairs: VanBanMucThongTin[][] = [];
  for (let i = 0; i < items.length; i += 2) {
    const row: VanBanMucThongTin[] = [items[i]];
    if (items[i + 1]) row.push(items[i + 1]);
    pairs.push(row);
  }
  return pairs;
}

/** Lọc lấy các khối bảng — dùng khi xuất DOCX/Excel cần biết có bảng hay không. */
export function layBangDauTien(noiDung: VanBanKhoiNoiDung[]): VanBanBang | null {
  for (const k of noiDung) {
    if (k.kind === 'bang') return k;
  }
  return null;
}

export function doan(text: string, opts?: Omit<VanBanDoanVan, 'kind' | 'text'>): VanBanDoanVan {
  return { kind: 'doan', text, ...opts };
}
