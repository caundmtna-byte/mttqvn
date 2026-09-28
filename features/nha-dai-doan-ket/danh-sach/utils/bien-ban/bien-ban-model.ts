/**
 * Mô hình tài liệu cho 3 biên bản Nhà đại đoàn kết.
 *
 * Không dùng `VanBanHanhChinhModel` (khen thưởng): biên bản ở đây có ô ☐/☒ và
 * lưới chữ ký nhiều cột, không có cơ quan ban hành / số ký hiệu / nơi nhận.
 *
 * MỘT mô hình, BA đầu ra: HTML (xem trước + in + PDF chụp từ HTML), Word, Excel.
 * Builder là hàm thuần ⇒ test được mà không cần DOM.
 */

/** Chữ thường, hoặc một ô dữ liệu: `value` null/rỗng ⇒ in dòng chấm để viết tay. */
export type BienBanRun =
  | { kind: 'text'; text: string; bold?: boolean; italic?: boolean }
  | { kind: 'field'; value: string | null; dots: number };

export type BienBanAlign = 'left' | 'center' | 'right' | 'justify';

export interface BienBanTieuDeDong {
  text: string;
  bold?: boolean;
  italic?: boolean;
  /** `lg` = tên biên bản (14pt), mặc định 13pt. */
  size?: 'lg';
}

export interface BienBanLuaChon {
  label: string;
  checked: boolean;
}

export interface BienBanCotKy {
  /** Chức danh in đậm, vd "BÊN GIAO TIỀN". */
  title: string;
  /** Dòng nghiêng dưới chức danh, vd "(Ký, ghi rõ họ tên)". */
  note: string;
  /** Họ tên in sẵn dưới chỗ ký — biết thì in, không thì để trống. */
  hoTen?: string | null;
}

export type BienBanBlock =
  | { kind: 'quoc-hieu' }
  | { kind: 'tieu-de'; lines: BienBanTieuDeDong[] }
  | {
      kind: 'doan';
      runs: BienBanRun[];
      indent?: boolean;
      bold?: boolean;
      italic?: boolean;
      align?: BienBanAlign;
    }
  | {
      kind: 'lua-chon';
      /** Nhãn đứng trước (cùng dòng khi `inline`, dòng riêng khi `stack`). */
      label: BienBanRun[];
      options: BienBanLuaChon[];
      layout: 'inline' | 'stack';
    }
  | {
      kind: 'chu-ky';
      /** "Môn Sơn, ngày 05 tháng 10 năm 2026" — in nghiêng, căn phải. */
      diaDanhNgay?: string;
      /** Nhãn chung đặt trên `span` cột đầu, vd "ĐẠI DIỆN TỔ CÔNG TÁC". */
      nhomDau?: { text: string; span: number };
      cols: BienBanCotKy[];
    };

export interface BienBanModel {
  /** Tên cửa sổ in / tên file. */
  tieuDe: string;
  blocks: BienBanBlock[];
}

/* ------------------------------------------------------------------ *
 * Hằng & helper dựng khối
 * ------------------------------------------------------------------ */

export const QUOC_HIEU = 'CỘNG HOÀ XÃ HỘI CHỦ NGHĨA VIỆT NAM';
export const TIEU_NGU = 'Độc lập – Tự do – Hạnh phúc';
/** Địa danh cấp tỉnh — cùng giá trị `DIA_DANH_MAC_DINH` của khen thưởng. */
export const TINH_MAC_DINH = 'Nghệ An';

export const DOT = '.';
/** Ô trống ngắn (tên, số) / vừa / dài (hết dòng). */
export const DOTS_SHORT = 18;
export const DOTS_MEDIUM = 32;
export const DOTS_LONG = 70;

export function t(text: string, opts?: { bold?: boolean; italic?: boolean }): BienBanRun {
  return { kind: 'text', text, ...opts };
}

export function f(value: string | number | null | undefined, dots = DOTS_MEDIUM): BienBanRun {
  const s = value == null ? '' : String(value).trim();
  return { kind: 'field', value: s === '' ? null : s, dots };
}

export function doan(
  runs: BienBanRun[],
  opts?: Omit<Extract<BienBanBlock, { kind: 'doan' }>, 'kind' | 'runs'>,
): BienBanBlock {
  return { kind: 'doan', runs, ...opts };
}

/** Văn bản thuần của một run — dùng cho Excel và test. */
export function runText(r: BienBanRun): string {
  if (r.kind === 'text') return r.text;
  return r.value ?? DOT.repeat(r.dots);
}

export function runsText(runs: BienBanRun[]): string {
  return runs.map(runText).join('');
}

export const O_CHON = '☒';
export const O_TRONG = '☐';

/* ------------------------------------------------------------------ *
 * Định dạng dữ liệu
 * ------------------------------------------------------------------ */

function tachNgay(iso: string | null | undefined): [string, string, string] | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso ?? '').trim());
  return m ? [m[3], m[2], m[1]] : null;
}

/**
 * `2026-10-05` → `ngày 05 tháng 10 năm 2026`; trống ⇒ dòng chấm để viết tay.
 *
 * Nghị định 30/2020, Phụ lục I, mục 6: ngày < 10 và tháng 1, 2 ghi thêm số 0;
 * tháng 3–9 thì không ("tháng 3", nhưng "tháng 02").
 */
export function ngayThangNam(iso: string | null | undefined): string {
  const p = tachNgay(iso);
  if (!p) return 'ngày …… tháng …… năm ……';
  const [ngay, thang, nam] = p;
  const thangHienThi = thang === '01' || thang === '02' ? thang : String(Number(thang));
  return `ngày ${ngay} tháng ${thangHienThi} năm ${nam}`;
}

/** `2026-10-05` → `05/10/2026`. */
export function ngayGach(iso: string | null | undefined): string | null {
  const p = tachNgay(iso);
  return p ? `${p[0]}/${p[1]}/${p[2]}` : null;
}

const TIEN_TO_XA = /^(xã|phường|thị trấn)\s+/i;

/** Tên xã kèm cấp ("xã Môn Sơn"). Dữ liệu đã có tiền tố thì giữ nguyên. */
export function tenXaDayDu(ten: string | null | undefined): string | null {
  const s = ten?.trim();
  if (!s) return null;
  return TIEN_TO_XA.test(s) ? s : `xã ${s}`;
}

/** Địa danh đầu dòng ký ("Môn Sơn, ngày …") — bỏ tiền tố cấp hành chính. */
export function diaDanhXa(ten: string | null | undefined): string | null {
  const s = ten?.trim();
  if (!s) return null;
  return s.replace(TIEN_TO_XA, '').trim() || null;
}

export function dongDiaDanhNgay(diaDanh: string | null, iso: string | null | undefined): string {
  return `${diaDanh ?? '……………'}, ${ngayThangNam(iso)}`;
}

const TIEN_TO_THON = /^(thôn|xóm|khối|bản|tổ dân phố)\s+/i;

/** "thôn Tân Hợp"; dữ liệu đã ghi "Xóm 3" thì giữ nguyên. */
export function tenThonDayDu(ten: string | null | undefined): string | null {
  const s = ten?.trim();
  if (!s) return null;
  return TIEN_TO_THON.test(s) ? s : `thôn ${s}`;
}

/** "thôn Tân Hợp, xã Môn Sơn, tỉnh Nghệ An" — bỏ phần nào không có. */
export function diaChiDayDu(khoiXom: string | null, tenXa: string | null): string | null {
  const parts = [tenThonDayDu(khoiXom), tenXaDayDu(tenXa)].filter(Boolean);
  if (parts.length === 0) return null;
  return [...parts, `tỉnh ${TINH_MAC_DINH}`].join(', ');
}

const SO_VN = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 });

/** `60000000` → `60.000.000`; `45.5` → `45,5`. */
export function soVN(n: number | null | undefined): string | null {
  if (n == null || !Number.isFinite(Number(n))) return null;
  return SO_VN.format(Number(n));
}
