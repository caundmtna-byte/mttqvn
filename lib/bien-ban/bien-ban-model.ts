/**
 * Mô hình tài liệu cho biên bản / phiếu in (Nhà đại đoàn kết, Chương trình hỗ trợ…).
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
  /** Ô "Khác: ……" — in ngay sau nhãn; giá trị trống ⇒ dòng chấm để viết tay. */
  ghiThem?: BienBanRun;
}

/** `inline`: cùng dòng nhãn · `stack`: mỗi ô một dòng · `luoi`: nhãn một dòng, ô xếp 2 cột. */
export type BienBanLuaChonLayout = 'inline' | 'stack' | 'luoi';

export interface BienBanCotKy {
  /** Chức danh in đậm, vd "BÊN GIAO TIỀN". `\n` ⇒ xuống dòng ("TM. BAN THƯỜNG TRỰC\nCHỦ TỊCH"). */
  title: string;
  /** Dòng nghiêng dưới chức danh, vd "(Ký, ghi rõ họ tên)". */
  note: string;
  /** Họ tên in sẵn dưới chỗ ký — biết thì in, không thì để trống. */
  hoTen?: string | null;
}

/** Cột của bảng có viền (bảng hiện vật…). `widthPct` bỏ trống ⇒ chia đều phần còn lại. */
export interface BienBanCotBang {
  title: string;
  align?: 'left' | 'center' | 'right';
  widthPct?: number;
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
      layout: BienBanLuaChonLayout;
    }
  | {
      kind: 'chu-ky';
      /** "Môn Sơn, ngày 05 tháng 10 năm 2026" — in nghiêng, căn phải. */
      diaDanhNgay?: string;
      /** Nhãn chung đặt trên `span` cột đầu, vd "ĐẠI DIỆN TỔ CÔNG TÁC". */
      nhomDau?: { text: string; span: number };
      cols: BienBanCotKy[];
    }
  | {
      kind: 'bang';
      cols: BienBanCotBang[];
      /** Mỗi dòng đủ `cols.length` ô; ô rỗng ⇒ để trống viết tay. */
      rows: string[][];
      /**
       * Dòng tổng in đậm. Ô đầu gộp `span` cột (mặc định 1), nên
       * `cells.length = cols.length - span + 1`.
       */
      footer?: { cells: string[]; span?: number };
    }
  /** Sang trang mới (phụ lục…). Excel không có trang ⇒ một dòng trống. */
  | { kind: 'ngat-trang' };

/** Khổ A4 dọc (mặc định, biên bản) hay ngang (danh sách nhiều cột). */
export type BienBanKhoGiay = 'doc' | 'ngang';

export interface BienBanModel {
  /** Tên cửa sổ in / tên file. */
  tieuDe: string;
  blocks: BienBanBlock[];
  /** Bỏ trống ⇒ dọc. */
  khoGiay?: BienBanKhoGiay;
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

export interface DanhMucLuaChon {
  value: string;
  label: string;
}

/**
 * Một dòng ô ☐/☒. `chon` là một giá trị (chọn một) hoặc mảng (chọn nhiều).
 * `khac` thêm ô "Khác: ……" cuối danh sách — có chữ thì tự tick.
 */
export function luaChon(
  label: string | BienBanRun[],
  danhMuc: readonly DanhMucLuaChon[],
  chon: string | readonly string[] | null | undefined,
  layout: BienBanLuaChonLayout,
  khac?: { value: string | null | undefined; label?: string; dots?: number },
): BienBanBlock {
  const daChon = new Set(chon == null ? [] : typeof chon === 'string' ? [chon] : chon);
  const options: BienBanLuaChon[] = danhMuc.map((d) => ({
    label: d.label,
    checked: daChon.has(d.value),
  }));
  if (khac) {
    const ghiThem = f(khac.value, khac.dots ?? DOTS_SHORT);
    options.push({ label: khac.label ?? 'Khác: ', checked: ghiThem.kind === 'field' && ghiThem.value != null, ghiThem });
  }
  return {
    kind: 'lua-chon',
    label: typeof label === 'string' ? [t(label)] : label,
    options,
    layout,
  };
}

/** Văn bản thuần của một ô lựa chọn, không kèm ký hiệu ô. */
export function luaChonText(o: BienBanLuaChon): string {
  return o.ghiThem ? `${o.label}${runText(o.ghiThem)}` : o.label;
}

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

/** Tên file an toàn: bỏ dấu, khoảng trắng thành gạch dưới. */
export function fileSlug(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

const SO_VN = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 });

/** `60000000` → `60.000.000`; `45.5` → `45,5`. */
export function soVN(n: number | null | undefined): string | null {
  if (n == null || !Number.isFinite(Number(n))) return null;
  return SO_VN.format(Number(n));
}
