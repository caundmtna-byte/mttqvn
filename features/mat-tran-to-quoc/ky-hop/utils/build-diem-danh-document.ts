/**
 * Dựng mô hình "DANH SÁCH ĐIỂM DANH ỦY VIÊN" theo một kỳ họp.
 * Hàm thuần — dùng chung cho xem trước/in, DOCX và PDF.
 */
import { txt } from '@/lib/text';
import { formatDate, getTodayISODate } from '@/lib/utils';
import type { CompanyInfo } from '@/store/useStore';
import type { MttqUyVienUyBanListRow } from '@/features/mat-tran-to-quoc/uy-vien-uy-ban/core/types';
import {
  canViewUyVienUyBanRow,
  type MttqUyVienUyBanViewer,
} from '@/features/mat-tran-to-quoc/uy-vien-uy-ban/hooks/use-mttq-uy-vien-uy-ban-viewer';
import type { MttqDiemDanhTrangThai, MttqDiemDanhUyVien, MttqKyHop } from '../core/types';
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


export interface DiemDanhPrintRow {
  stt: number;
  hoTen: string;
  chucVuUyBan: string;
  donVi: string;
  trangThai: string;
}

export interface DiemDanhTongHop {
  tong: number;
  coMat: number;
  vangMat: number;
  chuaDiemDanh: number;
}

/** Map `uy_vien_id` → trạng thái điểm danh của kỳ họp đang in. */
export function buildTrangThaiMap(
  diemDanhRows: MttqDiemDanhUyVien[],
): Map<string, MttqDiemDanhTrangThai> {
  const m = new Map<string, MttqDiemDanhTrangThai>();
  for (const r of diemDanhRows) m.set(String(r.uy_vien_id), r.trang_thai);
  return m;
}

/**
 * Danh sách ủy viên của kỳ họp, sau hai lớp lọc:
 *
 * 1. **Phạm vi xem** — bản in phải dùng đúng bộ lọc của màn hình điểm danh,
 *    nếu không cán bộ cấp xã in ra được cả ủy viên của xã khác.
 * 2. **Đơn vị của kỳ họp** — kỳ họp của một xã/phường chỉ triệu tập ủy viên của
 *    xã/phường đó; in cả ủy viên toàn tỉnh vào biên bản điểm danh cấp xã là sai
 *    thành phần dự họp. Kỳ họp cấp tỉnh (`don_vi_id` trống) giữ nguyên cả danh
 *    sách. Ủy viên đã có bản ghi điểm danh của chính kỳ họp này luôn được giữ,
 *    dù đơn vị khác — đã điểm danh nghĩa là có dự họp.
 */
export function buildDiemDanhPrintRows(
  uyVienRows: MttqUyVienUyBanListRow[],
  trangThaiMap: Map<string, MttqDiemDanhTrangThai>,
  viewer: MttqUyVienUyBanViewer,
  donViKyHopId?: string | null,
): DiemDanhPrintRow[] {
  const ec = txt('common.emptyCell');
  const chua = txt('matTranKyHop.diemDanh.chuaDiemDanh');
  const donVi = donViKyHopId?.toString().trim();
  return uyVienRows
    .filter((r) => canViewUyVienUyBanRow(viewer, r))
    .filter((r) => {
      if (!donVi) return true;
      if (trangThaiMap.has(String(r.id))) return true;
      return r.don_vi_id?.toString().trim() === donVi;
    })
    .map((r, index) => ({
      stt: index + 1,
      hoTen: r.ho_va_ten?.trim() || ec,
      chucVuUyBan: r.chuc_vu_don_vi?.trim() || ec,
      donVi: r.ten_don_vi?.trim() || r.ten_don_vi_can_bo?.trim() || ec,
      trangThai: trangThaiMap.get(String(r.id)) ?? chua,
    }));
}

/** Đếm có mặt / vắng mặt / chưa điểm danh trên đúng những dòng được in. */
export function tongHopDiemDanh(rows: DiemDanhPrintRow[]): DiemDanhTongHop {
  const coMatLabel = txt('matTranKyHop.diemDanh.coMat');
  const vangMatLabel = txt('matTranKyHop.diemDanh.vangMat');
  let coMat = 0;
  let vangMat = 0;
  for (const r of rows) {
    if (r.trangThai === coMatLabel) coMat += 1;
    else if (r.trangThai === vangMatLabel) vangMat += 1;
  }
  return { tong: rows.length, coMat, vangMat, chuaDiemDanh: rows.length - coMat - vangMat };
}

export interface DiemDanhDocumentContext {
  company?: CompanyInfo | null;
  viewer: MttqUyVienUyBanViewer;
  uyVienRows: MttqUyVienUyBanListRow[];
  diemDanhRows: MttqDiemDanhUyVien[];
  ngayLap?: string | null;
}

export interface DiemDanhDocumentModel extends VanBanHanhChinhModel {
  rows: DiemDanhPrintRow[];
  tongHop: DiemDanhTongHop;
}

export function buildDiemDanhThongTinChung(
  kyHop: MttqKyHop,
  tongHop: DiemDanhTongHop,
): VanBanMucThongTin[] {
  const t = (k: string) => txt(`matTranKyHop.printPreview.${k}`);
  const ec = txt('common.emptyCell');
  return [
    { label: t('metaNhiemKy'), value: rutGonTenNhiemKy(kyHop.ten_nhiem_ky) || ec },
    { label: t('metaKyThu'), value: kyHop.ky_thu?.trim() || ec },
    { label: t('metaNgayHop'), value: kyHop.ngay_hop ? formatDate(kyHop.ngay_hop) : ec },
    { label: t('metaDonVi'), value: kyHop.ten_don_vi?.trim() || txt('matTranKyHop.tinhCap') },
    { label: t('metaTongUyVien'), value: String(tongHop.tong) },
    {
      label: t('metaTongHop'),
      value: `${txt('matTranKyHop.diemDanh.coMat')} ${tongHop.coMat} · ${txt('matTranKyHop.diemDanh.vangMat')} ${tongHop.vangMat} · ${txt('matTranKyHop.diemDanh.chuaDiemDanh')} ${tongHop.chuaDiemDanh}`,
    },
  ];
}

export function buildDiemDanhDocumentModel(
  kyHop: MttqKyHop,
  ctx: DiemDanhDocumentContext,
): DiemDanhDocumentModel {
  const t = (k: string) => txt(`matTranKyHop.printPreview.${k}`);
  const rows = buildDiemDanhPrintRows(
    ctx.uyVienRows,
    buildTrangThaiMap(ctx.diemDanhRows),
    ctx.viewer,
    kyHop.don_vi_id,
  );
  const tongHop = tongHopDiemDanh(rows);
  // Khối tên cơ quan: dòng trên là cơ quan chủ quản (lấy từ Thông tin tổ chức),
  // dòng dưới in đậm là cơ quan ban hành văn bản.
  const coQuanChuQuan = ctx.company?.companyName?.trim() || t('coQuanChuQuan');

  const bang: VanBanKhoiNoiDung = {
    kind: 'bang',
    headers: [
      t('colStt'),
      t('colHoTen'),
      t('colChucVuUyBan'),
      t('colDonVi'),
      t('colTrangThai'),
      t('colKyTen'),
    ],
    rows: rows.map((r) => [
      String(r.stt),
      r.hoTen,
      r.chucVuUyBan,
      r.donVi,
      r.trangThai,
      '',
    ]),
    aligns: ['center', 'left', 'left', 'left', 'center', 'center'],
    widths: [8, 18, 20, 19, 14, 21],
    emptyMessage: t('empty'),
  };

  return {
    coQuanChuQuan: coQuanChuQuan,
    coQuanBanHanh: t('banThuongTruc'),
    soKyHieu: t('soKyHieuTrong'),
    diaDanhNgayThang: formatDiaDanhNgayThang(
      DIA_DANH_MAC_DINH,
      ctx.ngayLap?.trim() || kyHop.ngay_hop || getTodayISODate(),
    ),
    tenLoai: t('tenLoai'),
    trichYeu: t('trichYeu')
      .replace('{{kyThu}}', kyHop.ky_thu?.trim() || '')
      .replace('{{nhiemKy}}', rutGonTenNhiemKy(kyHop.ten_nhiem_ky) || ''),
    thongTinChung: buildDiemDanhThongTinChung(kyHop, tongHop),
    noiDung: [bang],
    chuKy: { chucDanh: t('kyChuToa') },
    chuKyPhu: { chucDanh: t('kyThuKy') },
    rows,
    tongHop,
  };
}
