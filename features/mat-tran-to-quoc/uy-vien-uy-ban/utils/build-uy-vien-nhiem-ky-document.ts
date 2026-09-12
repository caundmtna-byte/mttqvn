/**
 * Dựng mô hình "DANH SÁCH ỦY VIÊN ỦY BAN MTTQ THEO NHIỆM KỲ".
 * Hàm thuần — dùng chung cho xem trước/in, DOCX và PDF.
 */
import { txt } from '@/lib/text';
import { formatDate, getTodayISODate } from '@/lib/utils';
import type { CompanyInfo } from '@/store/useStore';
import type { MttqUyVienUyBanListRow } from '../core/types';
import { canViewUyVienUyBanRow, type MttqUyVienUyBanViewer } from '../hooks/use-mttq-uy-vien-uy-ban-viewer';
import {
  formatDiaDanhNgayThang,
  type VanBanHanhChinhModel,
  type VanBanKhoiNoiDung,
  type VanBanMucThongTin,
} from './van-ban-hanh-chinh';

export const DIA_DANH_MAC_DINH = 'Nghệ An';

/**
 * Bỏ tiền tố "Nhiệm kỳ" đã có sẵn trong dữ liệu để nhãn không thành
 * "Nhiệm kỳ Nhiệm kỳ 2025 -2030".
 */
export function rutGonTenNhiemKy(raw: string | null | undefined): string {
  const s = String(raw ?? '').trim();
  return s.replace(/^nhi\u1ec7m\s*k\u1ef3\s*/i, '').trim();
}


export interface UyVienPrintRow {
  stt: number;
  hoTen: string;
  ngaySinh: string;
  gioiTinh: string;
  danToc: string;
  chucVuDonVi: string;
  trangThaiThamGia: string;
}

/** Ghép chức vụ trong Ủy ban với đơn vị công tác. */
export function moTaChucVuDonViUyVien(r: MttqUyVienUyBanListRow): string {
  const parts = [
    r.chuc_vu_don_vi?.trim(),
    r.ten_phong_ban_hien_thi?.trim(),
    r.ten_don_vi?.trim() || r.ten_don_vi_can_bo?.trim(),
  ].filter((s): s is string => Boolean(s));
  return parts.join(', ');
}

/**
 * Danh sách ủy viên trong phạm vi xem, đánh số thứ tự liên tục sau khi lọc.
 * Không lọc ở đây thì cán bộ cấp xã in ra được ủy viên của toàn tỉnh.
 */
export function buildUyVienPrintRows(
  rows: MttqUyVienUyBanListRow[],
  viewer: MttqUyVienUyBanViewer,
): UyVienPrintRow[] {
  const ec = txt('common.emptyCell');
  return rows
    .filter((r) => canViewUyVienUyBanRow(viewer, r))
    .map((r, index) => ({
      stt: index + 1,
      hoTen: r.ho_va_ten?.trim() || ec,
      ngaySinh: r.ngay_sinh ? formatDate(r.ngay_sinh) : ec,
      gioiTinh: r.gioi_tinh?.trim() || ec,
      danToc: r.dan_toc?.trim() || ec,
      chucVuDonVi: moTaChucVuDonViUyVien(r) || ec,
      trangThaiThamGia: r.trang_thai_tham_gia?.trim() || ec,
    }));
}

export interface UyVienNhiemKyTongHop {
  tong: number;
  nu: number;
  danToc: number;
  dangVien: number;
}

/** Cơ cấu ủy viên — số liệu bắt buộc có trên danh sách nhân sự của Mặt trận. */
export function tongHopCoCauUyVien(
  rows: MttqUyVienUyBanListRow[],
  viewer: MttqUyVienUyBanViewer,
): UyVienNhiemKyTongHop {
  const visible = rows.filter((r) => canViewUyVienUyBanRow(viewer, r));
  let nu = 0;
  let danToc = 0;
  let dangVien = 0;
  for (const r of visible) {
    if (r.gioi_tinh?.trim() === 'Nữ') nu += 1;
    const dt = r.dan_toc?.trim();
    if (dt && dt !== 'Kinh') danToc += 1;
    if (r.dang_vien) dangVien += 1;
  }
  return { tong: visible.length, nu, danToc, dangVien };
}

export interface UyVienNhiemKyContext {
  company?: CompanyInfo | null;
  viewer: MttqUyVienUyBanViewer;
  rows: MttqUyVienUyBanListRow[];
  /** Tên nhiệm kỳ; thiếu thì lấy từ dòng đầu tiên. */
  tenNhiemKy?: string | null;
  ngayLap?: string | null;
}

export interface UyVienNhiemKyDocumentModel extends VanBanHanhChinhModel {
  rows: UyVienPrintRow[];
  tongHop: UyVienNhiemKyTongHop;
  tenNhiemKy: string;
}

export function buildUyVienThongTinChung(
  tenNhiemKy: string,
  tongHop: UyVienNhiemKyTongHop,
): VanBanMucThongTin[] {
  const t = (k: string) => txt(`matTranUyVienUyBan.printPreview.${k}`);
  return [
    { label: t('metaNhiemKy'), value: rutGonTenNhiemKy(tenNhiemKy) || tenNhiemKy },
    { label: t('metaTongSo'), value: String(tongHop.tong) },
    { label: t('metaNu'), value: String(tongHop.nu) },
    { label: t('metaDanTocThieuSo'), value: String(tongHop.danToc) },
    { label: t('metaDangVien'), value: String(tongHop.dangVien) },
    { label: t('metaNgayIn'), value: formatDate(getTodayISODate()) },
  ];
}

export function buildUyVienNhiemKyDocumentModel(
  ctx: UyVienNhiemKyContext,
): UyVienNhiemKyDocumentModel {
  const t = (k: string) => txt(`matTranUyVienUyBan.printPreview.${k}`);
  const ec = txt('common.emptyCell');
  const rows = buildUyVienPrintRows(ctx.rows, ctx.viewer);
  const tongHop = tongHopCoCauUyVien(ctx.rows, ctx.viewer);
  const tenNhiemKy =
    ctx.tenNhiemKy?.trim() || ctx.rows[0]?.ten_nhiem_ky?.trim() || ec;
  // Khối tên cơ quan: dòng trên là cơ quan chủ quản (lấy từ Thông tin tổ chức),
  // dòng dưới in đậm là cơ quan ban hành văn bản.
  const coQuanChuQuan = ctx.company?.companyName?.trim() || t('coQuanChuQuan');

  const bang: VanBanKhoiNoiDung = {
    kind: 'bang',
    headers: [
      t('colStt'),
      t('colHoTen'),
      t('colNgaySinh'),
      t('colGioiTinh'),
      t('colDanToc'),
      t('colChucVuDonVi'),
      t('colTrangThai'),
    ],
    rows: rows.map((r) => [
      String(r.stt),
      r.hoTen,
      r.ngaySinh,
      r.gioiTinh,
      r.danToc,
      r.chucVuDonVi,
      r.trangThaiThamGia,
    ]),
    aligns: ['center', 'left', 'center', 'center', 'center', 'left', 'center'],
    widths: [8, 16, 15, 9, 10, 27, 15],
    nowraps: [true, false, true, true, true, false, false],
    emptyMessage: t('empty'),
  };

  return {
    coQuanChuQuan: coQuanChuQuan,
    coQuanBanHanh: t('banThuongTruc'),
    soKyHieu: t('soKyHieuTrong'),
    diaDanhNgayThang: formatDiaDanhNgayThang(
      DIA_DANH_MAC_DINH,
      ctx.ngayLap?.trim() || getTodayISODate(),
    ),
    tenLoai: t('tenLoai'),
    trichYeu: t('trichYeu').replace('{{nhiemKy}}', rutGonTenNhiemKy(tenNhiemKy) || tenNhiemKy),
    thongTinChung: buildUyVienThongTinChung(tenNhiemKy, tongHop),
    noiDung: [bang],
    chuKy: { thayMat: t('kyThayMat'), chucDanh: t('kyChucDanh') },
    chuKyPhu: { chucDanh: t('kyNguoiLap') },
    rows,
    tongHop,
    tenNhiemKy,
  };
}
