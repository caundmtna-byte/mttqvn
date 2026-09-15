/**
 * Xuất BC thống kê bài viết — MỘT FILE, NHIỀU SHEET.
 *
 * `ExportDialog` dùng chung chỉ ghi được một sheet tên cứng `Data`, trong khi
 * người dùng cần bảng chéo "mỗi đơn vị một dòng, tổng bài và tổng từng thể loại".
 * Vì vậy trang này tự dựng workbook, theo đúng tiền lệ `export-bao-cao-ho-tro.ts`
 * và `export-ton-kho.ts`.
 *
 * Mọi sheet gộp đều có cột "Số tiền" — người dùng cần đối chiếu tiền ngay trong
 * file này khi chi trả. Màn hình báo cáo thì vẫn KHÔNG có chỉ tiêu tiền nào
 * (`computeArticleStatsKpis`): tiền trên trang dễ bị hiểu nhầm là khoản sẽ nhận.
 *
 * Tách hai lớp: `buildBcThongKeSheets` thuần (có test) và `exportBcThongKeBaiVietToExcel`
 * mỏng (chỉ ghi file, `xlsx` luôn import động để giữ nguyên tách chunk của vite).
 */
import { txt } from '@/lib/text';
import { getTodayISODate } from '@/lib/utils';
import type { BaiVietDanhSach } from '../../bai-viet/core/types';
import {
  computeArticleStatsKpis,
  getArticleDonViKey,
  getArticleDonViLabel,
  type DonViTheLoaiMatrix,
  type LabelCountRow,
  type NguoiTaoStatsRow,
  type ResolvedDateRange,
  type TrendPoint,
} from './aggregate-bai-viet-stats';

export interface BcThongKeExportInput {
  kpis: ReturnType<typeof computeArticleStatsKpis>;
  range: ResolvedDateRange;
  /** Các bộ lọc đang bật, đã đổi id thành tên — ghi vào sheet Tổng hợp để
   *  người nhận file biết con số này được lọc bằng gì. */
  activeFilters: { label: string; value: string }[];
  matrix: DonViTheLoaiMatrix;
  theLoaiRows: LabelCountRow[];
  nguonRows: LabelCountRow[];
  trangRows: LabelCountRow[];
  nguoiTaoRows: NguoiTaoStatsRow[];
  trendRows: TrendPoint[];
  lookupRows: BaiVietDanhSach[];
  tenDonViById: ReadonlyMap<string, string>;
}

export interface BcThongKeExportSheet {
  name: string;
  rows: Record<string, unknown>[];
}

/** Làm tròn 1 chữ số thập phân, giữ kiểu SỐ để Excel còn cộng được. */
function pct(value: number): number {
  return Math.round(value * 10) / 10;
}

export function buildBcThongKeSheets(input: BcThongKeExportInput): BcThongKeExportSheet[] {
  const colChiTieu = txt('articleStats.exportColChiTieu');
  const colGiaTri = txt('articleStats.exportColGiaTri');
  const colSoBai = txt('articleStats.tableColSoBai');
  const colSoTien = txt('articleStats.tableColSoTien');
  const colDonVi = txt('articleStats.tableColDonVi');
  const unknownLabel = txt('articleStats.donViKhongXacDinh');

  const tongHop: Record<string, unknown>[] = [
    { [colChiTieu]: txt('articleStats.kpiTotal'), [colGiaTri]: input.kpis.totalCount },
    { [colChiTieu]: txt('articleStats.exportTongSoTien'), [colGiaTri]: input.matrix.totals.soTien },
    { [colChiTieu]: txt('articleStats.kpiTongDonVi'), [colGiaTri]: input.kpis.distinctDonVi },
    { [colChiTieu]: txt('articleStats.kpiTbSoBai'), [colGiaTri]: pct(input.kpis.avgBaiMoiDonVi) },
    { [colChiTieu]: txt('articleStats.kpiDistinctAuthors'), [colGiaTri]: input.kpis.distinctNguoiTao },
    { [colChiTieu]: txt('articleStats.kpiDistinctTheLoai'), [colGiaTri]: input.kpis.distinctTheLoai },
    {
      [colChiTieu]: txt('articleStats.exportRangeFrom'),
      [colGiaTri]: input.range.start || txt('articleStats.exportRangeAll'),
    },
    {
      [colChiTieu]: txt('articleStats.exportRangeTo'),
      [colGiaTri]: input.range.end || txt('articleStats.exportRangeAll'),
    },
    ...input.activeFilters.map((f) => ({ [colChiTieu]: f.label, [colGiaTri]: f.value })),
  ];

  // Bảng chéo: mỗi thể loại là một cột. Thể loại không có bài ở đơn vị nào đó
  // ghi 0 chứ không bỏ trống — người đọc file không phải đoán ô rỗng nghĩa là gì.
  const theoDonVi: Record<string, unknown>[] = input.matrix.rows.map((row) => {
    const rec: Record<string, unknown> = {
      [colDonVi]: row.label,
      [colSoBai]: row.soBai,
      [colSoTien]: row.soTien,
    };
    for (const col of input.matrix.theLoaiCols) {
      rec[col.label] = row.theoTheLoai[col.id] ?? 0;
    }
    return rec;
  });
  if (theoDonVi.length > 0) {
    const tongCong: Record<string, unknown> = {
      [colDonVi]: txt('articleStats.tableRowTong'),
      [colSoBai]: input.matrix.totals.soBai,
      [colSoTien]: input.matrix.totals.soTien,
    };
    for (const col of input.matrix.theLoaiCols) {
      tongCong[col.label] = input.matrix.totals.theoTheLoai[col.id] ?? 0;
    }
    theoDonVi.push(tongCong);
  }

  return [
    { name: txt('articleStats.exportSheetTongHop'), rows: tongHop },
    { name: txt('articleStats.exportSheetTheoDonVi'), rows: theoDonVi },
    {
      name: txt('articleStats.exportSheetTheoTheLoai'),
      rows: input.theLoaiRows.map((r) => ({
        [txt('articleStats.tableColTheLoai')]: r.label,
        [colSoBai]: r.value,
        [colSoTien]: r.soTien,
      })),
    },
    {
      name: txt('articleStats.exportSheetTheoNguon'),
      rows: input.nguonRows.map((r) => ({
        [txt('articleStats.tableColNguon')]: r.label,
        [colSoBai]: r.value,
        [colSoTien]: r.soTien,
      })),
    },
    {
      name: txt('articleStats.exportSheetTheoTrang'),
      rows: input.trangRows.map((r) => ({
        [txt('articleStats.tableColTrang')]: r.label,
        [colSoBai]: r.value,
        [colSoTien]: r.soTien,
      })),
    },
    {
      name: txt('articleStats.exportSheetTheoNguoiTao'),
      rows: input.nguoiTaoRows.map((r) => ({
        [txt('articleStats.tableColNguoi')]: r.label,
        [colDonVi]: r.tenDonVi,
        [colSoBai]: r.soBai,
        [colSoTien]: r.soTien,
      })),
    },
    {
      name: txt('articleStats.exportSheetTheoThoiGian'),
      rows: input.trendRows.map((p) => ({
        [txt('articleStats.exportColKy')]: p.label,
        [colSoBai]: p.count,
        [colSoTien]: p.soTien,
      })),
    },
    {
      name: txt('articleStats.exportSheetChiTiet'),
      rows: input.lookupRows.map((item, i) => ({
        [txt('articleStats.exportColStt')]: i + 1,
        [txt('articleStats.tableColTenBai')]: item.ten_bai,
        [txt('articleStats.tableColNgayDang')]: item.ngay_dang,
        [txt('articleStats.tableColTheLoai')]: item.ten_the_loai ?? '',
        [colSoTien]: Number(item.don_gia) || 0,
        [txt('articleStats.tableColNguon')]: item.ten_nguon_dang ?? '',
        [txt('articleStats.tableColTrang')]: item.ten_trang_dang ?? '',
        [txt('articleStats.tableColNguoi')]:
          item.ho_va_ten_nguoi_tao ?? item.ten_tai_khoan_nguoi_tao ?? '',
        [colDonVi]: getArticleDonViLabel(
          getArticleDonViKey(item),
          input.tenDonViById,
          unknownLabel,
        ),
        [txt('articleStats.tableColLink')]: item.link,
      })),
    },
  ];
}

export async function exportBcThongKeBaiVietToExcel(input: BcThongKeExportInput): Promise<void> {
  const mod = await import('xlsx');
  const XLSX = mod.default ?? mod;
  const wb = XLSX.utils.book_new();
  for (const sheet of buildBcThongKeSheets(input)) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheet.rows), sheet.name);
  }
  XLSX.writeFile(wb, `${txt('articleStats.exportFileName')}_${getTodayISODate()}.xlsx`);
}
