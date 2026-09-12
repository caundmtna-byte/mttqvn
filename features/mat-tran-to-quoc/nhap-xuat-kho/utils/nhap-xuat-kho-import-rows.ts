/**
 * Gom các dòng Excel thành PHIẾU nhập/xuất kho — LOGIC THUẦN, không gọi mạng.
 *
 * ===========================================================================
 * HÌNH DẠNG FILE EXCEL ĐÃ CHỌN: MỘT SHEET PHẲNG — MỘT DÒNG = MỘT DÒNG HÀNG,
 * GOM THEO CỘT « Mã phiếu ».
 * ===========================================================================
 * Vì sao không dùng hai sheet (sheet phiếu + sheet chi tiết):
 *
 *  1. Engine dùng chung `components/shared/ImportDialog.tsx` chỉ đọc SHEET ĐẦU
 *     TIÊN của workbook (`workbook.Sheets[workbook.SheetNames[0]]`). Hai sheet
 *     dữ liệu là bất khả thi nếu không sửa engine — mà engine là của chung.
 *  2. Bảng kê hàng cứu trợ mà các xã gửi lên vốn đã là bảng phẳng: mỗi mặt hàng
 *     một dòng. Bắt cán bộ tách làm hai bảng rồi nối khoá là thêm việc, thêm
 *     chỗ sai, đúng lúc bão lụt.
 *  3. Cột gom KHÔNG THỂ là `so_phieu`: số phiếu do trigger dưới CSDL phát khi
 *     ghi. Nên dùng « Mã phiếu » — mã TẠM do cán bộ tự đặt (P1, P2, PN-MonSon…)
 *     chỉ để gom dòng trong file; hệ thống không lưu mã này.
 *
 * Thông tin đầu phiếu (loại phiếu, ngày, kho, đơn vị, đợt…) lặp lại ở mọi dòng
 * của cùng một mã phiếu. Lặp không khớp nhau là LỖI, báo đúng dòng lệch.
 *
 * MỘT PHIẾU LÀ MỘT KHỐI: chỉ cần một dòng hàng sai, CẢ PHIẾU không được nhập.
 * Nhập thiếu một dòng hàng nghĩa là ghi sai số lượng hàng cứu trợ đã nhận —
 * tệ hơn hẳn so với việc bắt cán bộ sửa rồi nhập lại cả phiếu. Vì vậy mọi dòng
 * của phiếu hỏng đều được đưa vào file lỗi tải về, để sửa xong nhập lại nguyên phiếu.
 */
import { txt } from '@/lib/text';
import { NHAP_XUAT_KHO_LOAI_PHIEU, type NhapXuatKhoLoaiPhieu } from '../core/constants';
import { nhapXuatKhoFormSchema, type NhapXuatKhoFormValues } from '../core/schema';

/** Trần số dòng một lần nhập — file dán nhầm sẽ bị chặn trước khi chạm CSDL. */
export const NHAP_XUAT_KHO_IMPORT_MAX_ROWS = 3000;

const EXCEL_EPOCH_MS = Date.UTC(1899, 11, 30);

export interface NamedKho {
  id: string;
  ten: string;
  don_vi_id: string | null;
}

export interface NamedHangHoa {
  id: string;
  ten: string;
  don_vi_tinh: string;
}

export interface NamedRef {
  id: string;
  ten: string;
}

/** Phạm vi ghi — dùng lại đúng tín hiệu của `use-kho-nhap-xuat-kho-viewer`. */
export interface NhapXuatKhoImportViewer {
  canViewAll: boolean;
  chucVuCapQuanLy: 'Tỉnh' | 'Xã phường' | null;
  viewerDonViId: string | null;
}

export interface NhapXuatKhoImportCtx {
  khoList: NamedKho[];
  donViCuuTroList: NamedRef[];
  dotCuuTroList: NamedRef[];
  hangHoaList: NamedHangHoa[];
  viewer: NhapXuatKhoImportViewer;
}

export interface ImportSourceRow {
  rowNum: number;
  data: Record<string, unknown>;
}

export interface ImportRowError {
  rowNum: number;
  data: Record<string, unknown>;
  message: string;
}

export interface BuiltPhieu {
  /** Mã phiếu tạm do cán bộ đặt trong file — chỉ dùng để gom dòng và báo lỗi. */
  maPhieu: string;
  rows: ImportSourceRow[];
  values: NhapXuatKhoFormValues;
}

export function trimCell(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'number' && Number.isFinite(v)) {
    if (Number.isInteger(v) && Math.abs(v) > 1e12) return String(BigInt(v));
    return String(v).trim();
  }
  return String(v).trim();
}

export function normalizeMatchKey(v: unknown): string {
  return trimCell(v).replace(/\s+/g, ' ').toLowerCase();
}

export function findByIdOrName<T extends { id: string; ten: string }>(
  list: readonly T[],
  raw: unknown,
): T | undefined {
  const s = trimCell(raw);
  if (!s) return undefined;
  const byId = list.find((x) => String(x.id) === s);
  if (byId) return byId;
  const key = normalizeMatchKey(s);
  return list.find((x) => normalizeMatchKey(x.ten) === key);
}

/** ISO yyyy-mm-dd, dd/mm/yyyy, hoặc số serial ngày của Excel. */
export function parseImportNgay(raw: unknown): string | null {
  if (raw == null || raw === '') return null;
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) return raw.toISOString().slice(0, 10);
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    if (raw > 200 && raw < 2_000_000) {
      const d = new Date(EXCEL_EPOCH_MS + Math.floor(raw) * 86_400_000);
      if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
    }
    return null;
  }
  const s = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
    const iso = s.slice(0, 10);
    return Number.isNaN(Date.parse(iso)) ? null : iso;
  }
  const m = s.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/);
  if (m) {
    const iso = `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
    return Number.isNaN(Date.parse(iso)) ? null : iso;
  }
  return null;
}

export type SoParseResult =
  | { ok: true; value: number }
  | { ok: false; reason: 'ambiguous' | 'invalid' };

/**
 * Số lượng / đơn giá.
 *
 * Dấu phân cách hàng nghìn bị TỪ CHỐI chứ không đoán: « 1.000 » có thể là một
 * nghìn (cách viết Việt Nam) hoặc là một phẩy không (cách viết Anh–Mỹ). Đoán sai
 * là sai số lượng gạo gấp 1000 lần. Ô kiểu SỐ của Excel thì không dính chuyện này.
 */
export function parseImportSo(raw: unknown): SoParseResult {
  if (typeof raw === 'number' && Number.isFinite(raw)) return { ok: true, value: raw };
  const s = trimCell(raw).replace(/\s+/g, '');
  if (!s) return { ok: false, reason: 'invalid' };
  if (/^\d{1,3}([.,]\d{3})+([.,]\d+)?$/.test(s)) return { ok: false, reason: 'ambiguous' };
  if (!/^\d+([.,]\d+)?$/.test(s)) return { ok: false, reason: 'invalid' };
  const n = Number(s.replace(',', '.'));
  return Number.isFinite(n) ? { ok: true, value: n } : { ok: false, reason: 'invalid' };
}

const LOAI_PHIEU_ALIAS: Record<string, NhapXuatKhoLoaiPhieu> = {
  nhap_ngoai: 'nhap_ngoai',
  'nhập từ ngoài': 'nhap_ngoai',
  'nhap tu ngoai': 'nhap_ngoai',
  'nhập kho': 'nhap_ngoai',
  nhập: 'nhap_ngoai',
  nhap: 'nhap_ngoai',
  xuat_ngoai: 'xuat_ngoai',
  'xuất ra ngoài': 'xuat_ngoai',
  'xuat ra ngoai': 'xuat_ngoai',
  'xuất kho': 'xuat_ngoai',
  xuất: 'xuat_ngoai',
  xuat: 'xuat_ngoai',
  chuyen_kho: 'chuyen_kho',
  'chuyển kho': 'chuyen_kho',
  'chuyen kho': 'chuyen_kho',
  chuyển: 'chuyen_kho',
};

export function parseImportLoaiPhieu(raw: unknown): NhapXuatKhoLoaiPhieu | null {
  const key = normalizeMatchKey(raw);
  if (!key) return null;
  const direct = NHAP_XUAT_KHO_LOAI_PHIEU.find((v) => v === key);
  if (direct) return direct;
  return LOAI_PHIEU_ALIAS[key] ?? null;
}

/** Kho phải nằm trong đơn vị của người lập, trừ khi người đó xem/ghi toàn tỉnh. */
export function khoTrongPhamViGhi(viewer: NhapXuatKhoImportViewer, kho: NamedKho): boolean {
  if (viewer.canViewAll || viewer.chucVuCapQuanLy === 'Tỉnh') return true;
  if (viewer.chucVuCapQuanLy === 'Xã phường') {
    if (!viewer.viewerDonViId) return false;
    return String(kho.don_vi_id ?? '').trim() === viewer.viewerDonViId;
  }
  return true;
}

type HeaderFields = {
  loai_phieu: NhapXuatKhoLoaiPhieu;
  ngay_phieu: string;
  kho_xuat_id: string;
  kho_nhap_id: string;
  don_vi_cuu_tro_id: string;
  dot_cuu_tro_id: string;
  ghi_chu: string;
  nguoi_giao_nhan: string;
  bo_phan: string;
  chung_tu_goc: string;
};

const HEADER_COMPARE_FIELDS: { key: keyof HeaderFields; labelKey: string }[] = [
  { key: 'loai_phieu', labelKey: 'matTranNhapXuatKho.import.colLoaiPhieu' },
  { key: 'ngay_phieu', labelKey: 'matTranNhapXuatKho.import.colNgayPhieu' },
  { key: 'kho_xuat_id', labelKey: 'matTranNhapXuatKho.import.colKhoXuat' },
  { key: 'kho_nhap_id', labelKey: 'matTranNhapXuatKho.import.colKhoNhap' },
  { key: 'don_vi_cuu_tro_id', labelKey: 'matTranNhapXuatKho.import.colDonViCuuTro' },
  { key: 'dot_cuu_tro_id', labelKey: 'matTranNhapXuatKho.import.colDotCuuTro' },
];

function rowPrefix(rowNum: number): string {
  return txt('matTranNhapXuatKho.import.rowPrefix', { row: rowNum });
}

/** Đầu phiếu: loại, ngày, kho, đơn vị, đợt và các trường in phiếu. */
function parseHeader(
  rowNum: number,
  row: Record<string, unknown>,
  ctx: NhapXuatKhoImportCtx,
): { ok: true; header: HeaderFields } | { ok: false; message: string } {
  const loai = parseImportLoaiPhieu(row.loai_phieu);
  if (!loai) {
    return {
      ok: false,
      message: rowPrefix(rowNum) + txt('matTranNhapXuatKho.import.errLoaiPhieu', { gia_tri: trimCell(row.loai_phieu) }),
    };
  }

  const ngay = parseImportNgay(row.ngay_phieu);
  if (!ngay) {
    return {
      ok: false,
      message: rowPrefix(rowNum) + txt('matTranNhapXuatKho.import.errNgayPhieu', { gia_tri: trimCell(row.ngay_phieu) }),
    };
  }

  const resolveKho = (raw: unknown, labelKey: string): { ok: true; id: string } | { ok: false; message: string } => {
    const s = trimCell(raw);
    if (!s) return { ok: true, id: '' };
    const kho = findByIdOrName(
      ctx.khoList.map((k) => ({ ...k })),
      s,
    );
    if (!kho) {
      return {
        ok: false,
        message: rowPrefix(rowNum) + txt('matTranNhapXuatKho.import.errKhoNotFound', { ten: s, cot: txt(labelKey) }),
      };
    }
    if (!khoTrongPhamViGhi(ctx.viewer, kho)) {
      return {
        ok: false,
        message: rowPrefix(rowNum) + txt('matTranNhapXuatKho.import.errKhoNgoaiPhamVi', { ten: kho.ten }),
      };
    }
    return { ok: true, id: kho.id };
  };

  const khoXuat = resolveKho(row.kho_xuat_id, 'matTranNhapXuatKho.import.colKhoXuat');
  if (!khoXuat.ok) return khoXuat;
  const khoNhap = resolveKho(row.kho_nhap_id, 'matTranNhapXuatKho.import.colKhoNhap');
  if (!khoNhap.ok) return khoNhap;

  let donViCuuTroId = '';
  const dvRaw = trimCell(row.don_vi_cuu_tro_id);
  if (dvRaw) {
    const dv = findByIdOrName(ctx.donViCuuTroList, dvRaw);
    if (!dv) {
      return {
        ok: false,
        message: rowPrefix(rowNum) + txt('matTranNhapXuatKho.import.errDonViCuuTroNotFound', { ten: dvRaw }),
      };
    }
    donViCuuTroId = dv.id;
  }

  let dotCuuTroId = '';
  const dotRaw = trimCell(row.dot_cuu_tro_id);
  if (dotRaw) {
    const dot = findByIdOrName(ctx.dotCuuTroList, dotRaw);
    if (!dot) {
      return {
        ok: false,
        message: rowPrefix(rowNum) + txt('matTranNhapXuatKho.import.errDotCuuTroNotFound', { ten: dotRaw }),
      };
    }
    dotCuuTroId = dot.id;
  }

  return {
    ok: true,
    header: {
      loai_phieu: loai,
      ngay_phieu: ngay,
      kho_xuat_id: khoXuat.id,
      kho_nhap_id: khoNhap.id,
      don_vi_cuu_tro_id: donViCuuTroId,
      dot_cuu_tro_id: dotCuuTroId,
      ghi_chu: trimCell(row.ghi_chu),
      nguoi_giao_nhan: trimCell(row.nguoi_giao_nhan),
      bo_phan: trimCell(row.bo_phan),
      chung_tu_goc: trimCell(row.chung_tu_goc),
    },
  };
}

type LineFields = { hang_hoa_id: string; don_vi_tinh: string; so_luong: string; don_gia: string; ghi_chu: string };

function parseLine(
  rowNum: number,
  row: Record<string, unknown>,
  ctx: NhapXuatKhoImportCtx,
): { ok: true; line: LineFields } | { ok: false; message: string } {
  const hhRaw = trimCell(row.hang_hoa_id);
  if (!hhRaw) {
    return { ok: false, message: rowPrefix(rowNum) + txt('matTranNhapXuatKho.import.errHangHoaEmpty') };
  }
  const hh = findByIdOrName(ctx.hangHoaList, hhRaw);
  if (!hh) {
    return {
      ok: false,
      message: rowPrefix(rowNum) + txt('matTranNhapXuatKho.import.errHangHoaNotFound', { ten: hhRaw }),
    };
  }

  const soLuong = parseImportSo(row.so_luong);
  if (!soLuong.ok) {
    const key =
      soLuong.reason === 'ambiguous'
        ? 'matTranNhapXuatKho.import.errSoLuongPhanCach'
        : 'matTranNhapXuatKho.import.errSoLuong';
    return { ok: false, message: rowPrefix(rowNum) + txt(key, { gia_tri: trimCell(row.so_luong) }) };
  }
  if (soLuong.value <= 0) {
    return {
      ok: false,
      message: rowPrefix(rowNum) + txt('matTranNhapXuatKho.import.errSoLuongDuong', { gia_tri: trimCell(row.so_luong) }),
    };
  }

  let donGia = '';
  const donGiaRaw = trimCell(row.don_gia);
  if (donGiaRaw !== '') {
    const parsed = parseImportSo(row.don_gia);
    if (!parsed.ok) {
      const key =
        parsed.reason === 'ambiguous'
          ? 'matTranNhapXuatKho.import.errDonGiaPhanCach'
          : 'matTranNhapXuatKho.import.errDonGia';
      return { ok: false, message: rowPrefix(rowNum) + txt(key, { gia_tri: donGiaRaw }) };
    }
    if (parsed.value < 0) {
      return { ok: false, message: rowPrefix(rowNum) + txt('matTranNhapXuatKho.import.errDonGia', { gia_tri: donGiaRaw }) };
    }
    donGia = String(parsed.value);
  }

  // ĐVT để trống thì lấy theo hàng hóa trong danh mục — cán bộ khỏi gõ lại.
  const donViTinh = trimCell(row.don_vi_tinh) || hh.don_vi_tinh;
  if (!donViTinh) {
    return {
      ok: false,
      message: rowPrefix(rowNum) + txt('matTranNhapXuatKho.import.errDonViTinhEmpty', { ten: hh.ten }),
    };
  }

  return {
    ok: true,
    line: {
      hang_hoa_id: hh.id,
      don_vi_tinh: donViTinh,
      so_luong: String(soLuong.value),
      don_gia: donGia,
      ghi_chu: trimCell(row.ghi_chu_dong),
    },
  };
}

export interface BuildResult {
  phieus: BuiltPhieu[];
  errors: ImportRowError[];
}

export function buildNhapXuatKhoImportPhieus(
  rows: readonly ImportSourceRow[],
  ctx: NhapXuatKhoImportCtx,
): BuildResult {
  const errors: ImportRowError[] = [];

  type Group = {
    maPhieu: string;
    rows: ImportSourceRow[];
    header: HeaderFields | null;
    headerRowNum: number;
    lines: LineFields[];
    /** Dòng đầu tiên làm hỏng phiếu — cả phiếu bị loại theo. */
    hongTaiDong: number | null;
  };

  const groups = new Map<string, Group>();
  const order: string[] = [];

  for (const src of rows) {
    const maPhieu = trimCell(src.data.ma_phieu);
    if (!maPhieu) {
      const message = rowPrefix(src.rowNum) + txt('matTranNhapXuatKho.import.errMaPhieuEmpty');
      errors.push({ rowNum: src.rowNum, data: src.data, message });
      continue;
    }
    const key = normalizeMatchKey(maPhieu);
    let g = groups.get(key);
    if (!g) {
      g = { maPhieu, rows: [], header: null, headerRowNum: src.rowNum, lines: [], hongTaiDong: null };
      groups.set(key, g);
      order.push(key);
    }
    g.rows.push(src);

    const header = parseHeader(src.rowNum, src.data, ctx);
    if (!header.ok) {
      if (g.hongTaiDong == null) g.hongTaiDong = src.rowNum;
      errors.push({ rowNum: src.rowNum, data: src.data, message: header.message });
      continue;
    }

    if (g.header == null) {
      g.header = header.header;
      g.headerRowNum = src.rowNum;
    } else {
      const lech = HEADER_COMPARE_FIELDS.find((f) => g!.header![f.key] !== header.header[f.key]);
      if (lech) {
        const message =
          rowPrefix(src.rowNum) +
          txt('matTranNhapXuatKho.import.errHeaderLech', {
            cot: txt(lech.labelKey),
            ma_phieu: g.maPhieu,
            row: g.headerRowNum,
          });
        if (g.hongTaiDong == null) g.hongTaiDong = src.rowNum;
        errors.push({ rowNum: src.rowNum, data: src.data, message });
        continue;
      }
    }

    const line = parseLine(src.rowNum, src.data, ctx);
    if (!line.ok) {
      if (g.hongTaiDong == null) g.hongTaiDong = src.rowNum;
      errors.push({ rowNum: src.rowNum, data: src.data, message: line.message });
      continue;
    }
    g.lines.push(line.line);
  }

  const phieus: BuiltPhieu[] = [];

  for (const key of order) {
    const g = groups.get(key)!;

    // Câu lỗi luôn mang tiền tố « Dòng N: » — mọi thông báo ra tới người dùng
    // phải nói được dòng Excel nào, kể cả lỗi ở mức phiếu.
    const failGroup = (message: string, exceptRow: number | null) => {
      for (const r of g.rows) {
        if (exceptRow != null && r.rowNum === exceptRow) continue;
        errors.push({ rowNum: r.rowNum, data: r.data, message: rowPrefix(r.rowNum) + message });
      }
    };

    if (g.hongTaiDong != null) {
      // Dòng gây lỗi đã có câu lỗi riêng; các dòng còn lại của phiếu chỉ cần
      // biết vì sao chúng cũng không được nhập, và phải có mặt trong file lỗi
      // để cán bộ sửa xong nhập lại NGUYÊN phiếu.
      failGroup(
        txt('matTranNhapXuatKho.import.errPhieuHongTheoDong', { ma_phieu: g.maPhieu, row: g.hongTaiDong }),
        g.hongTaiDong,
      );
      continue;
    }

    if (!g.header || g.lines.length === 0) {
      failGroup(txt('matTranNhapXuatKho.import.errPhieuKhongCoDongHang', { ma_phieu: g.maPhieu }), null);
      continue;
    }

    const values: NhapXuatKhoFormValues = {
      loai_phieu: g.header.loai_phieu,
      ngay_phieu: g.header.ngay_phieu,
      kho_xuat_id: g.header.kho_xuat_id || undefined,
      kho_nhap_id: g.header.kho_nhap_id || undefined,
      don_vi_cuu_tro_id: g.header.don_vi_cuu_tro_id || undefined,
      dot_cuu_tro_id: g.header.dot_cuu_tro_id || undefined,
      ghi_chu: g.header.ghi_chu || undefined,
      nguoi_giao_nhan: g.header.nguoi_giao_nhan || undefined,
      bo_phan: g.header.bo_phan || undefined,
      chung_tu_goc: g.header.chung_tu_goc || undefined,
      chi_tiet: g.lines.map((l) => ({
        hang_hoa_id: l.hang_hoa_id,
        don_vi_tinh: l.don_vi_tinh,
        so_luong: l.so_luong,
        don_gia: l.don_gia,
        ghi_chu: l.ghi_chu,
      })),
    };

    // Ràng buộc theo loại phiếu (kho xuất / kho nhập / đơn vị / đợt) nằm sẵn
    // trong `superRefine` của form — dùng lại để nhập và nhập tay không lệch luật.
    const checked = nhapXuatKhoFormSchema.safeParse(values);
    if (!checked.success) {
      const detail = checked.error.issues[0]?.message ?? checked.error.message;
      failGroup(
        txt('matTranNhapXuatKho.import.errPhieuKhongHopLe', { ma_phieu: g.maPhieu, message: detail }),
        null,
      );
      continue;
    }

    phieus.push({ maPhieu: g.maPhieu, rows: g.rows, values: checked.data });
  }

  errors.sort((a, b) => a.rowNum - b.rowNum);
  return { phieus, errors };
}
