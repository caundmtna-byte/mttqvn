import { txt } from '@/lib/text';
import { formatCurrency, formatDate, formatDecimal } from '@/lib/utils';
import type { CompanyInfo } from '@/store/useStore';
import type { NhapXuatKhoLoaiPhieu } from '../core/constants';
import type { NhapXuatKhoDetail } from '../core/types';

/** Giá trị trống trên mẫu in — không hiển thị "Chưa có". */
const PRINT_EMPTY = '';

const ONES = ['', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

function readThreeDigits(n: number, showZeroHundred = false): string {
  const hundred = Math.floor(n / 100);
  const ten = Math.floor((n % 100) / 10);
  const one = n % 10;
  const parts: string[] = [];

  if (hundred > 0) {
    parts.push(`${ONES[hundred]} trăm`);
  } else if (showZeroHundred && (ten > 0 || one > 0)) {
    parts.push('không trăm');
  }

  if (ten > 1) {
    parts.push(`${ONES[ten]} mươi`);
    if (one === 1) parts.push('mốt');
    else if (one === 5) parts.push('lăm');
    else if (one > 0) parts.push(ONES[one]);
  } else if (ten === 1) {
    parts.push('mười');
    if (one === 5) parts.push('lăm');
    else if (one > 0) parts.push(ONES[one]);
  } else if (one > 0) {
    parts.push(ten === 0 && hundred > 0 ? `lẻ ${ONES[one]}` : ONES[one]);
  }

  return parts.join(' ').trim();
}

/** Đọc số tiền VNĐ thành chữ (làm tròn đồng). */
export function formatNumberToWords(amount: number): string {
  const n = Math.round(Math.abs(amount));
  if (n === 0) return 'Không đồng';
  if (n >= 1_000_000_000_000) return `${formatDecimal(n)} đồng`;

  const billion = Math.floor(n / 1_000_000_000);
  const million = Math.floor((n % 1_000_000_000) / 1_000_000);
  const thousand = Math.floor((n % 1_000_000) / 1_000);
  const remainder = n % 1_000;

  const parts: string[] = [];
  if (billion > 0) parts.push(`${readThreeDigits(billion)} tỷ`);
  if (million > 0) parts.push(`${readThreeDigits(million, billion > 0)} triệu`);
  if (thousand > 0) parts.push(`${readThreeDigits(thousand, billion > 0 || million > 0)} nghìn`);
  if (remainder > 0 || parts.length === 0) {
    parts.push(readThreeDigits(remainder, parts.length > 0));
  }

  const text = parts.join(' ').replace(/\s+/g, ' ').trim();
  return `${text.charAt(0).toUpperCase()}${text.slice(1)} đồng chẵn`;
}

export interface NhapXuatKhoPhieuInfoLine {
  label: string;
  value: string;
}

export interface NhapXuatKhoPhieuFooterModel {
  col1Label: string;
  col2Label: string;
  col3Label: string;
  col4Label: string;
}

/** Một dòng xuất in/PDF/DOCX — key = nhãn cột tiếng Việt. */
export type NhapXuatKhoPhieuDocumentRow = Record<string, string>;

export interface NhapXuatKhoPhieuDocumentModel {
  donViLabel: string;
  donViValue: string;
  diaChiLabel: string;
  diaChiValue: string;
  boPhanLabel: string;
  boPhanValue: string;
  docTitle: string;
  ngayLapPhieuLabel: string;
  ngayPhieu: string;
  soPhieuLabel: string;
  soPhieu: string;
  mauSoLabel: string;
  mauSo: string;
  thongTu: string;
  infoLines: NhapXuatKhoPhieuInfoLine[];
  columnHeaders: string[];
  columnCodes: string[];
  rows: NhapXuatKhoPhieuDocumentRow[];
  emptyMessage: string;
  showCongRow: boolean;
  congLabel: string;
  congValue: string;
  tongTien: number;
  tongTienFormatted: string;
  tongTienBangChuLabel: string;
  tongTienBangChu: string;
  chungTuGocLabel: string;
  chungTuGoc: string;
  signatureDateLine: string;
  ghiChuNoiBo?: string;
  sttColumnKey: string;
  nameColumnKey: string;
  thanhTienColumnKey: string;
  footer: NhapXuatKhoPhieuFooterModel;
}

function docTitleForLoai(loai: NhapXuatKhoLoaiPhieu): string {
  switch (loai) {
    case 'nhap_ngoai':
      return txt('matTranNhapXuatKho.printPreview.docTitleNhap');
    case 'xuat_ngoai':
      return txt('matTranNhapXuatKho.printPreview.docTitleXuat');
    case 'chuyen_kho':
      return txt('matTranNhapXuatKho.printPreview.docTitleChuyen');
  }
}

function mauSoForLoai(loai: NhapXuatKhoLoaiPhieu): string {
  return loai === 'nhap_ngoai'
    ? txt('matTranNhapXuatKho.printPreview.mauSoNhap')
    : txt('matTranNhapXuatKho.printPreview.mauSoXuat');
}

function thongTuForLoai(loai: NhapXuatKhoLoaiPhieu): string {
  return loai === 'nhap_ngoai'
    ? txt('matTranNhapXuatKho.printPreview.thongTuNhap')
    : txt('matTranNhapXuatKho.printPreview.thongTuXuat');
}

function footerForLoai(loai: NhapXuatKhoLoaiPhieu): NhapXuatKhoPhieuFooterModel {
  switch (loai) {
    case 'nhap_ngoai':
      return {
        col1Label: txt('matTranNhapXuatKho.printPreview.footerCol1Nhap'),
        col2Label: txt('matTranNhapXuatKho.printPreview.footerCol2Nhap'),
        col3Label: txt('matTranNhapXuatKho.printPreview.footerCol3Nhap'),
        col4Label: txt('matTranNhapXuatKho.printPreview.footerCol4'),
      };
    case 'xuat_ngoai':
      return {
        col1Label: txt('matTranNhapXuatKho.printPreview.footerCol1Xuat'),
        col2Label: txt('matTranNhapXuatKho.printPreview.footerCol2Xuat'),
        col3Label: txt('matTranNhapXuatKho.printPreview.footerCol3Xuat'),
        col4Label: txt('matTranNhapXuatKho.printPreview.footerCol4'),
      };
    case 'chuyen_kho':
      return {
        col1Label: txt('matTranNhapXuatKho.printPreview.footerCol1Chuyen'),
        col2Label: txt('matTranNhapXuatKho.printPreview.footerCol2Chuyen'),
        col3Label: txt('matTranNhapXuatKho.printPreview.footerCol3Chuyen'),
        col4Label: txt('matTranNhapXuatKho.printPreview.footerCol4'),
      };
  }
}

function buildInfoLines(data: NhapXuatKhoDetail): NhapXuatKhoPhieuInfoLine[] {
  const nguoiValue = data.nguoi_giao_nhan?.trim() || PRINT_EMPTY;

  switch (data.loai_phieu) {
    case 'nhap_ngoai':
      return [
        {
          label: txt('matTranNhapXuatKho.printPreview.nguoiGiaoHang'),
          value: nguoiValue,
        },
        {
          label: txt('matTranNhapXuatKho.printPreview.nhapTaiKho'),
          value: data.ten_kho_nhap?.trim() || PRINT_EMPTY,
        },
        {
          label: txt('matTranNhapXuatKho.printPreview.donViCuuTro'),
          value: data.ten_don_vi_cuu_tro?.trim() || PRINT_EMPTY,
        },
      ];
    case 'xuat_ngoai':
      return [
        {
          label: txt('matTranNhapXuatKho.printPreview.nguoiNhanHang'),
          value: nguoiValue,
        },
        {
          label: txt('matTranNhapXuatKho.printPreview.xuatTaiKho'),
          value: data.ten_kho_xuat?.trim() || PRINT_EMPTY,
        },
        {
          label: txt('matTranNhapXuatKho.printPreview.dotCuuTro'),
          value: data.ten_dot_cuu_tro?.trim() || PRINT_EMPTY,
        },
      ];
    case 'chuyen_kho':
      return [
        {
          label: txt('matTranNhapXuatKho.printPreview.nguoiGiaoHang'),
          value: nguoiValue,
        },
        {
          label: txt('matTranNhapXuatKho.printPreview.xuatTaiKho'),
          value: data.ten_kho_xuat?.trim() || PRINT_EMPTY,
        },
        {
          label: txt('matTranNhapXuatKho.printPreview.nhapTaiKho'),
          value: data.ten_kho_nhap?.trim() || PRINT_EMPTY,
        },
      ];
  }
}

function buildSignatureDateLine(ngayPhieu: string | null | undefined): string {
  const blank = '…';
  if (!ngayPhieu?.trim()) {
    return txt('matTranNhapXuatKho.printPreview.signatureDateLine', {
      day: blank,
      month: blank,
      year: '20…',
    });
  }
  const [year, month, day] = ngayPhieu.slice(0, 10).split('-');
  if (!year || !month || !day) {
    return txt('matTranNhapXuatKho.printPreview.signatureDateLine', {
      day: blank,
      month: blank,
      year: '20…',
    });
  }
  return txt('matTranNhapXuatKho.printPreview.signatureDateLine', { day, month, year });
}

export function buildNhapXuatKhoPhieuDocumentModel(
  data: NhapXuatKhoDetail,
  company: CompanyInfo | null | undefined,
): NhapXuatKhoPhieuDocumentModel {
  const sttColumnKey = txt('matTranNhapXuatKho.printPreview.colStt');
  const nameColumnKey = txt('matTranNhapXuatKho.printPreview.colTenHang');
  const donViTinhKey = txt('matTranNhapXuatKho.form.donViTinh');
  const soLuongKey = txt('matTranNhapXuatKho.form.soLuong');
  const donGiaKey = txt('matTranNhapXuatKho.form.donGia');
  const thanhTienKey = txt('matTranNhapXuatKho.form.thanhTien');
  const ghiChuKey = txt('matTranNhapXuatKho.form.chiTietGhiChu');
  const columnHeaders = [
    sttColumnKey,
    nameColumnKey,
    donViTinhKey,
    soLuongKey,
    donGiaKey,
    thanhTienKey,
    ghiChuKey,
  ];
  const columnCodes = ['A', 'B', 'C', '1', '3', '4', ''];

  const lines = [...(data.chi_tiet ?? [])].sort((a, b) => {
    const ta = a.thu_tu ?? 0;
    const tb = b.thu_tu ?? 0;
    if (ta !== tb) return ta - tb;
    return Number(a.id) - Number(b.id);
  });

  const rows: NhapXuatKhoPhieuDocumentRow[] = lines.map((line, index) => ({
    [sttColumnKey]: String(index + 1),
    [nameColumnKey]: line.ten_hang_hoa?.trim() || `#${line.hang_hoa_id}`,
    [donViTinhKey]: line.don_vi_tinh?.trim() || PRINT_EMPTY,
    [soLuongKey]: Number.isFinite(line.so_luong) ? formatDecimal(line.so_luong) : PRINT_EMPTY,
    [donGiaKey]: line.don_gia > 0 ? formatCurrency(line.don_gia) : PRINT_EMPTY,
    [thanhTienKey]: line.thanh_tien > 0 ? formatCurrency(line.thanh_tien) : PRINT_EMPTY,
    [ghiChuKey]: line.ghi_chu?.trim() || PRINT_EMPTY,
  }));

  const tongTien = lines.reduce(
    (acc, l) => acc + (Number.isFinite(l.thanh_tien) ? l.thanh_tien : 0),
    0,
  );

  const companyName =
    company?.companyName?.trim() || 'UỶ BAN MẶT TRẬN TỔ QUỐC VIỆT NAM TỈNH NGHỆ AN';

  return {
    donViLabel: txt('matTranNhapXuatKho.printPreview.donViLabel'),
    donViValue: companyName,
    diaChiLabel: txt('matTranNhapXuatKho.printPreview.diaChiLabel'),
    diaChiValue: company?.address?.trim() || PRINT_EMPTY,
    boPhanLabel: txt('matTranNhapXuatKho.printPreview.boPhan'),
    boPhanValue: data.bo_phan?.trim() || PRINT_EMPTY,
    docTitle: docTitleForLoai(data.loai_phieu),
    ngayLapPhieuLabel: txt('matTranNhapXuatKho.printPreview.ngayLapPhieu'),
    ngayPhieu: data.ngay_phieu ? formatDate(data.ngay_phieu) : PRINT_EMPTY,
    soPhieuLabel: txt('matTranNhapXuatKho.printPreview.soPhieuLabel'),
    soPhieu: data.so_phieu,
    mauSoLabel: txt('matTranNhapXuatKho.printPreview.mauSoLabel'),
    mauSo: mauSoForLoai(data.loai_phieu),
    thongTu: thongTuForLoai(data.loai_phieu),
    infoLines: buildInfoLines(data),
    columnHeaders,
    columnCodes,
    rows,
    emptyMessage: txt('matTranNhapXuatKho.printPreview.empty'),
    showCongRow: tongTien > 0,
    congLabel: txt('matTranNhapXuatKho.printPreview.cong'),
    congValue: tongTien > 0 ? formatCurrency(tongTien) : '—',
    tongTien,
    tongTienFormatted: tongTien > 0 ? formatCurrency(tongTien) : '—',
    tongTienBangChuLabel: txt('matTranNhapXuatKho.printPreview.tongTienBangChuLabel'),
    tongTienBangChu: tongTien > 0 ? formatNumberToWords(tongTien) : PRINT_EMPTY,
    chungTuGocLabel: txt('matTranNhapXuatKho.printPreview.chungTuGoc'),
    chungTuGoc: data.chung_tu_goc?.trim() || PRINT_EMPTY,
    signatureDateLine: buildSignatureDateLine(data.ngay_phieu),
    ghiChuNoiBo: data.ghi_chu?.trim() || undefined,
    sttColumnKey,
    nameColumnKey,
    thanhTienColumnKey: thanhTienKey,
    footer: footerForLoai(data.loai_phieu),
  };
}
