import { docSoTienVND } from '@/features/mat-tran-to-quoc/danh-sach-tang-luong/utils/luong-bang-chu';
import {
  DOTS_LONG,
  TINH_MAC_DINH,
  diaDanhXa,
  doan,
  dongDiaDanhNgay,
  f,
  soVN,
  t,
  tenXaDayDu,
  type BienBanBlock,
  type BienBanCotBang,
  type BienBanModel,
} from '@/lib/bien-ban/bien-ban-model';

/**
 * Danh sách ký nhận hỗ trợ (Nhà đại đoàn kết, Chương trình hỗ trợ) — bám mẫu
 * Excel của cơ quan: A4 ngang, 11 cột, dòng Tổng, tổng tiền bằng chữ, khối ký
 * "Người lập" / "TM. BAN THƯỜNG TRỰC – CHỦ TỊCH".
 */

/** Một dòng danh sách — hai module chuyển hàng của mình về dạng này. */
export interface DongNhanHoTro {
  hoTen: string | null;
  soCccd: string | null;
  noiDung: string | null;
  xaPhuongId: string | null;
  tenXaPhuong: string | null;
  khoiXom: string | null;
  doiTuong: string | null;
  loaiHinh: string | null;
  nguonHoTro: string | null;
  soTien: number | null;
}

/** Một bản danh sách: tiêu đề riêng, bảng + tổng + chữ ký riêng. */
export interface NhomNhanHoTro {
  /** Tiêu đề in hoa, vd "DANH SÁCH NHẬN HỖ TRỢ NHÀ ĐẠI ĐOÀN KẾT". */
  tieuDe: string;
  dong: DongNhanHoTro[];
}

export const TIEU_DE_DANH_SACH_NHAN_HO_TRO = 'DANH SÁCH NHẬN HỖ TRỢ';

/** Tỉ lệ cột lấy theo file mẫu; STT nới ra cho đủ chỗ chữ "STT". */
export const COT_DANH_SACH_NHAN_HO_TRO: BienBanCotBang[] = [
  { title: 'STT', align: 'center', widthPct: 4 },
  { title: 'Họ và tên', widthPct: 13 },
  { title: 'Số căn cước', align: 'center', widthPct: 9.5 },
  { title: 'Nội dung hỗ trợ', widthPct: 12 },
  { title: 'Xã phường', widthPct: 10 },
  { title: 'Khối xóm', widthPct: 9 },
  { title: 'Đối tượng', widthPct: 8 },
  { title: 'Loại hình hỗ trợ', widthPct: 9 },
  { title: 'Nguồn hỗ trợ', widthPct: 9.5 },
  { title: 'Số tiền', align: 'right', widthPct: 9 },
  { title: 'Ký nhận', widthPct: 7 },
];

const CO_QUAN = 'UỶ BAN MTTQ VIỆT NAM';

function chuoi(s: string | null | undefined): string {
  return s?.trim() ?? '';
}

/** Mọi dòng cùng một xã (đã biết) ⇒ xã đó; ngược lại `null` (danh sách cấp tỉnh). */
export function xaChung(dong: readonly DongNhanHoTro[]): { id: string; ten: string | null } | null {
  const dau = dong[0];
  if (!dau || dau.xaPhuongId == null) return null;
  return dong.every((d) => d.xaPhuongId === dau.xaPhuongId)
    ? { id: dau.xaPhuongId, ten: dau.tenXaPhuong }
    : null;
}

/** "UỶ BAN MTTQ VIỆT NAM XÃ MÔN SƠN" (một xã) · "… TỈNH NGHỆ AN" (nhiều xã). */
export function dongCoQuan(dong: readonly DongNhanHoTro[]): string {
  const xa = xaChung(dong);
  const tenXa = xa ? tenXaDayDu(xa.ten) : null;
  const donVi = tenXa ?? `tỉnh ${TINH_MAC_DINH}`;
  return `${CO_QUAN} ${donVi.toLocaleUpperCase('vi')}`;
}

const SO_SANH = new Intl.Collator('vi', { numeric: true, sensitivity: 'base' });

/** Xã → khối xóm → họ tên; ô trống xếp cuối. */
export function sapXepDong(dong: readonly DongNhanHoTro[]): DongNhanHoTro[] {
  const cmp = (a: string, b: string) => {
    if (a === b) return 0;
    if (!a) return 1;
    if (!b) return -1;
    return SO_SANH.compare(a, b);
  };
  return [...dong].sort(
    (a, b) =>
      cmp(chuoi(a.tenXaPhuong), chuoi(b.tenXaPhuong)) ||
      cmp(chuoi(a.khoiXom), chuoi(b.khoiXom)) ||
      cmp(chuoi(a.hoTen), chuoi(b.hoTen)),
  );
}

/**
 * Tách theo lĩnh vực, đúng thứ tự danh mục; lĩnh vực ngoài danh mục xếp sau,
 * lĩnh vực trống xếp cuối (tiêu đề không kèm tên lĩnh vực).
 */
export function tachTheoLinhVuc<T>(
  rows: readonly T[],
  linhVucCua: (r: T) => string | null,
  thuTu: readonly string[],
): { linhVuc: string | null; rows: T[] }[] {
  const nhom = new Map<string, T[]>();
  for (const r of rows) {
    const lv = chuoi(linhVucCua(r));
    const ds = nhom.get(lv);
    if (ds) ds.push(r);
    else nhom.set(lv, [r]);
  }
  const viTri = (lv: string) => {
    if (lv === '') return Number.MAX_SAFE_INTEGER;
    const i = thuTu.indexOf(lv);
    return i === -1 ? thuTu.length : i;
  };
  return [...nhom.entries()]
    .sort(([a], [b]) => viTri(a) - viTri(b) || SO_SANH.compare(a, b))
    .map(([lv, ds]) => ({ linhVuc: lv || null, rows: ds }));
}

export function tieuDeTheoLinhVuc(linhVuc: string | null): string {
  const lv = chuoi(linhVuc);
  return lv ? `${TIEU_DE_DANH_SACH_NHAN_HO_TRO} ${lv.toLocaleUpperCase('vi')}` : TIEU_DE_DANH_SACH_NHAN_HO_TRO;
}

export function tongSoTien(dong: readonly DongNhanHoTro[]): number {
  return dong.reduce((sum, d) => sum + (Number(d.soTien) || 0), 0);
}

function khoiNhom(nhom: NhomNhanHoTro, ngayIso: string): BienBanBlock[] {
  const dong = sapXepDong(nhom.dong);
  const tong = tongSoTien(dong);
  const xa = xaChung(dong);
  const diaDanh = xa ? diaDanhXa(xa.ten) : TINH_MAC_DINH;
  const soCot = COT_DANH_SACH_NHAN_HO_TRO.length;
  const SPAN_TONG = 2;

  return [
    doan([t(dongCoQuan(dong))], { bold: true, align: 'left' }),
    { kind: 'tieu-de', lines: [{ text: nhom.tieuDe, bold: true, size: 'lg' }] },
    {
      kind: 'bang',
      cols: COT_DANH_SACH_NHAN_HO_TRO,
      rows: dong.map((d, i) => [
        String(i + 1),
        chuoi(d.hoTen),
        chuoi(d.soCccd),
        chuoi(d.noiDung),
        chuoi(d.tenXaPhuong),
        chuoi(d.khoiXom),
        chuoi(d.doiTuong),
        chuoi(d.loaiHinh),
        chuoi(d.nguonHoTro),
        soVN(d.soTien) ?? '',
        '',
      ]),
      footer: {
        span: SPAN_TONG,
        // Ô "Tổng" gộp STT + Họ tên; cột Số tiền là áp chót, Ký nhận để trống.
        cells: [
          'Tổng',
          ...Array<string>(soCot - SPAN_TONG - 2).fill(''),
          soVN(tong) ?? '0',
          '',
        ],
      },
    },
    doan([t('Tổng số tiền bằng chữ: '), f(docSoTienVND(tong), DOTS_LONG)]),
    {
      kind: 'chu-ky',
      diaDanhNgay: dongDiaDanhNgay(diaDanh, ngayIso),
      cols: [
        { title: 'Người lập', note: '' },
        { title: 'TM. BAN THƯỜNG TRỰC\nCHỦ TỊCH', note: '' },
      ],
    },
  ];
}

/** Mỗi nhóm một bản, sang trang mới giữa các bản. */
export function buildDanhSachNhanHoTro(input: {
  tieuDe: string;
  nhom: readonly NhomNhanHoTro[];
  /** Ngày ký — `YYYY-MM-DD`. */
  ngayIso: string;
}): BienBanModel {
  const blocks: BienBanBlock[] = [];
  input.nhom
    .filter((n) => n.dong.length > 0)
    .forEach((n, i) => {
      if (i > 0) blocks.push({ kind: 'ngat-trang' });
      blocks.push(...khoiNhom(n, input.ngayIso));
    });
  return { tieuDe: input.tieuDe, blocks, khoGiay: 'ngang' };
}
