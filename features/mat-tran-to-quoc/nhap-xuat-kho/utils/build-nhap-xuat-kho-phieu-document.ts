import { txt } from '@/lib/text';
import { formatCurrency, formatDateShort, formatDecimal, getTodayISODate } from '@/lib/utils';
import type { CompanyInfo } from '@/store/useStore';
import type { NhapXuatKhoLoaiPhieu } from '../core/constants';
import type { NhapXuatKhoDetail } from '../core/types';

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

export interface NhapXuatKhoPhieuMetaItem {
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

/** Tách tên cơ quan thành 2 dòng letterhead (UBTQ Việt Nam / Tỉnh …). */
export function splitVnOrgLetterheadName(name: string): { line1: string; line2?: string } {
  const upper = name.trim().toUpperCase();
  const afterVietNam = upper.match(/^(.+?\bVIỆT NAM)\s+(TỈNH\b.+)$/);
  if (afterVietNam) {
    return { line1: afterVietNam[1].trim(), line2: afterVietNam[2].trim() };
  }
  const tinhIdx = upper.search(/\sTỈNH\b/);
  if (tinhIdx > 0) {
    return { line1: upper.slice(0, tinhIdx).trim(), line2: upper.slice(tinhIdx + 1).trim() };
  }
  return { line1: upper };
}

export interface NhapXuatKhoPhieuDocumentModel {
  companyName: string;
  orgNameLine1: string;
  orgNameLine2?: string;
  orgSubTitle: string;
  address?: string;
  phone?: string;
  soPhieu: string;
  loaiPhieuLabel: string;
  docTitle: string;
  ngayPhieu: string;
  signedDateLabel: string;
  signedDateValue: string;
  metaItems: NhapXuatKhoPhieuMetaItem[];
  rows: NhapXuatKhoPhieuDocumentRow[];
  emptyMessage: string;
  tongTien: number;
  tongTienFormatted: string;
  tongTienBangChu: string;
  ghiChu: string;
  sttColumnKey: string;
  nameColumnKey: string;
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

function buildMetaItems(data: NhapXuatKhoDetail): NhapXuatKhoPhieuMetaItem[] {
  const ec = txt('common.emptyCell');
  const items: NhapXuatKhoPhieuMetaItem[] = [
    {
      label: txt('matTranNhapXuatKho.detail.loaiPhieu'),
      value: txt(`matTranNhapXuatKho.loaiPhieu.${data.loai_phieu}`),
    },
  ];

  if (data.loai_phieu === 'nhap_ngoai') {
    items.push(
      {
        label: txt('matTranNhapXuatKho.detail.khoNhap'),
        value: data.ten_kho_nhap?.trim() || ec,
      },
      {
        label: txt('matTranNhapXuatKho.detail.donViCuuTro'),
        value: data.ten_don_vi_cuu_tro?.trim() || ec,
      },
    );
  } else if (data.loai_phieu === 'xuat_ngoai') {
    items.push(
      {
        label: txt('matTranNhapXuatKho.detail.khoXuat'),
        value: data.ten_kho_xuat?.trim() || ec,
      },
      {
        label: txt('matTranNhapXuatKho.detail.dotCuuTro'),
        value: data.ten_dot_cuu_tro?.trim() || ec,
      },
    );
  } else {
    items.push(
      {
        label: txt('matTranNhapXuatKho.detail.khoXuat'),
        value: data.ten_kho_xuat?.trim() || ec,
      },
      {
        label: txt('matTranNhapXuatKho.detail.khoNhap'),
        value: data.ten_kho_nhap?.trim() || ec,
      },
    );
  }

  return items;
}

export function layoutNhapXuatKhoPhieuMetaPairs(
  metaItems: NhapXuatKhoPhieuMetaItem[],
  signedDate: NhapXuatKhoPhieuMetaItem,
): NhapXuatKhoPhieuMetaItem[][] {
  const all = [...metaItems, signedDate];
  const pairs: NhapXuatKhoPhieuMetaItem[][] = [];
  for (let i = 0; i < all.length; i += 2) {
    const row: NhapXuatKhoPhieuMetaItem[] = [all[i]];
    if (all[i + 1]) row.push(all[i + 1]);
    pairs.push(row);
  }
  return pairs;
}

export function buildNhapXuatKhoPhieuDocumentModel(
  data: NhapXuatKhoDetail,
  company: CompanyInfo | null | undefined,
): NhapXuatKhoPhieuDocumentModel {
  const ec = txt('common.emptyCell');
  const sttColumnKey = txt('matTranNhapXuatKho.printPreview.colStt');
  const nameColumnKey = txt('matTranNhapXuatKho.form.hangHoa');
  const donViTinhKey = txt('matTranNhapXuatKho.form.donViTinh');
  const soLuongKey = txt('matTranNhapXuatKho.form.soLuong');
  const donGiaKey = txt('matTranNhapXuatKho.form.donGia');
  const thanhTienKey = txt('matTranNhapXuatKho.form.thanhTien');
  const ghiChuKey = txt('matTranNhapXuatKho.form.chiTietGhiChu');

  const lines = [...(data.chi_tiet ?? [])].sort((a, b) => {
    const ta = a.thu_tu ?? 0;
    const tb = b.thu_tu ?? 0;
    if (ta !== tb) return ta - tb;
    return Number(a.id) - Number(b.id);
  });

  const rows: NhapXuatKhoPhieuDocumentRow[] = lines.map((line, index) => ({
    [sttColumnKey]: String(index + 1),
    [nameColumnKey]: line.ten_hang_hoa?.trim() || `#${line.hang_hoa_id}`,
    [donViTinhKey]: line.don_vi_tinh?.trim() || ec,
    [soLuongKey]: Number.isFinite(line.so_luong) ? formatDecimal(line.so_luong) : ec,
    [donGiaKey]: line.don_gia > 0 ? formatCurrency(line.don_gia) : ec,
    [thanhTienKey]: line.thanh_tien > 0 ? formatCurrency(line.thanh_tien) : ec,
    [ghiChuKey]: line.ghi_chu?.trim() || '',
  }));

  const tongTien = lines.reduce(
    (acc, l) => acc + (Number.isFinite(l.thanh_tien) ? l.thanh_tien : 0),
    0,
  );

  const companyName =
    company?.companyName?.trim() || 'UỶ BAN MẶT TRẬN TỔ QUỐC VIỆT NAM TỈNH NGHỆ AN';
  const orgLines = splitVnOrgLetterheadName(companyName);

  return {
    companyName,
    orgNameLine1: orgLines.line1,
    orgNameLine2: orgLines.line2,
    orgSubTitle: txt('matTranNhapXuatKho.printPreview.orgSubTitle'),
    address: company?.address?.trim() || undefined,
    phone: company?.phone?.trim() || undefined,
    soPhieu: data.so_phieu,
    loaiPhieuLabel: txt(`matTranNhapXuatKho.loaiPhieu.${data.loai_phieu}`),
    docTitle: docTitleForLoai(data.loai_phieu),
    ngayPhieu: data.ngay_phieu ? formatDateShort(data.ngay_phieu) : ec,
    signedDateLabel: txt('matTranNhapXuatKho.printPreview.signedDate'),
    signedDateValue: formatDateShort(getTodayISODate()),
    metaItems: buildMetaItems(data),
    rows,
    emptyMessage: txt('matTranNhapXuatKho.printPreview.empty'),
    tongTien,
    tongTienFormatted: tongTien > 0 ? formatCurrency(tongTien) : '—',
    tongTienBangChu: tongTien > 0 ? formatNumberToWords(tongTien) : '',
    ghiChu: data.ghi_chu?.trim() || txt('matTranNhapXuatKho.printPreview.noGhiChu'),
    sttColumnKey,
    nameColumnKey,
    footer: footerForLoai(data.loai_phieu),
  };
}
