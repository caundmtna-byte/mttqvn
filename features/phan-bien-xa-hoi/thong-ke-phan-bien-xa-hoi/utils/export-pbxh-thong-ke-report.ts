import { txt } from '@/lib/text';
import { getTodayISODate } from '@/lib/utils';
import type { ThucHienPhanBien } from '../../thuc-hien-phan-bien-xa-hoi/core/types';
import type {
  PbxhDonViChuTriTableRow,
  PbxhNguoiTaoRankRow,
  PbxhThongKeKpis,
  PbxhTopHoatDongRow,
  LabelCountRow,
  PbxhAvgPhanTramBarRow,
  ResolvedDateRange,
} from './aggregate-pbxh-thong-ke-stats';
import { formatPbxhTienDoLabel } from './aggregate-pbxh-thong-ke-stats';

export async function exportPbxhThongKeReportToExcel(input: {
  kpis: PbxhThongKeKpis;
  donViRows: PbxhDonViChuTriTableRow[];
  nguoiTaoRows: PbxhNguoiTaoRankRow[];
  topHoatDongRows: PbxhTopHoatDongRow[];
  loaiHinhRows: { label: string; count: number }[];
  avgPhanTramLoaiHinhRows: PbxhAvgPhanTramBarRow[];
  matrixRows: LabelCountRow[];
  lookupRows: ThucHienPhanBien[];
  range: ResolvedDateRange;
}): Promise<void> {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();

  const summaryRows = [
    {
      [txt('pbxhThongKe.report.indicator')]: txt('pbxhThongKe.report.period'),
      [txt('pbxhThongKe.report.value')]: `${input.range.start} — ${input.range.end}`,
    },
    {
      [txt('pbxhThongKe.report.indicator')]: txt('pbxhThongKe.report.exportDate'),
      [txt('pbxhThongKe.report.value')]: getTodayISODate(),
    },
    {
      [txt('pbxhThongKe.report.indicator')]: txt('pbxhThongKe.stats.kpiTotal'),
      [txt('pbxhThongKe.report.value')]: input.kpis.total,
    },
    {
      [txt('pbxhThongKe.report.indicator')]: txt('pbxhThongKe.stats.kpiDangThucHien'),
      [txt('pbxhThongKe.report.value')]: input.kpis.dangThucHien,
    },
    {
      [txt('pbxhThongKe.report.indicator')]: txt('pbxhThongKe.stats.kpiHoanThanh'),
      [txt('pbxhThongKe.report.value')]: input.kpis.hoanThanh,
    },
    {
      [txt('pbxhThongKe.report.indicator')]: txt('pbxhThongKe.stats.kpiKeHoachDuKien'),
      [txt('pbxhThongKe.report.value')]: input.kpis.keHoachDuKien,
    },
    {
      [txt('pbxhThongKe.report.indicator')]: txt('pbxhThongKe.stats.kpiQuaHan'),
      [txt('pbxhThongKe.report.value')]: input.kpis.quaHan,
    },
    {
      [txt('pbxhThongKe.report.indicator')]: txt('pbxhThongKe.stats.kpiAvgPhanTram'),
      [txt('pbxhThongKe.report.value')]: input.kpis.avgPhanTram,
    },
    {
      [txt('pbxhThongKe.report.indicator')]: txt('pbxhThongKe.stats.kpiSumLanHoanThanh'),
      [txt('pbxhThongKe.report.value')]: input.kpis.sumSoLanHoanThanh,
    },
    {
      [txt('pbxhThongKe.report.indicator')]: txt('pbxhThongKe.stats.kpiSumLanKhaoSat'),
      [txt('pbxhThongKe.report.value')]: input.kpis.sumSoLanKhaoSat,
    },
    {
      [txt('pbxhThongKe.report.indicator')]: txt('pbxhThongKe.stats.kpiTyLeThucTe'),
      [txt('pbxhThongKe.report.value')]: input.kpis.tyLeThucTe,
    },
  ];
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(summaryRows),
    txt('pbxhThongKe.report.overviewSheet'),
  );

  const donViSheet = input.donViRows.map((r) => ({
    [txt('pbxhThongKe.stats.tableColDonVi')]: r.label,
    [txt('pbxhThongKe.stats.tableColTotal')]: r.total,
    [txt('pbxhThongKe.stats.tableColDangTh')]: r.dangThucHien,
    [txt('pbxhThongKe.stats.tableColHoanThanh')]: r.hoanThanh,
    [txt('pbxhThongKe.stats.tableColSoLanHoanThanh')]: r.sumSoLanHoanThanh,
    [txt('pbxhThongKe.stats.tableColSoLanKhaoSat')]: r.sumSoLanKhaoSat,
    [txt('pbxhThongKe.stats.tableColTyLeDonVi')]: r.tyLeThucTe,
    [txt('pbxhThongKe.stats.tableColAvgPhanTram')]: r.avgPhanTram,
  }));
  if (donViSheet.length > 0) {
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(donViSheet),
      txt('pbxhThongKe.report.byDonViChuTriSheet'),
    );
  }

  const nguoiTaoSheet = input.nguoiTaoRows.map((r, i) => ({
    [txt('pbxhThongKe.stats.tableColRank')]: i + 1,
    [txt('pbxhThongKe.stats.tableColNguoiTao')]: r.label,
    [txt('pbxhThongKe.stats.tableColTotal')]: r.total,
    [txt('pbxhThongKe.stats.tableColHoanThanh')]: r.hoanThanh,
    [txt('pbxhThongKe.stats.tableColSoLanHoanThanh')]: r.sumSoLanHoanThanh,
    [txt('pbxhThongKe.stats.tableColSoLanKhaoSat')]: r.sumSoLanKhaoSat,
    [txt('pbxhThongKe.stats.tableColTyLeThucTe')]: r.tyLeThucTe,
    [txt('pbxhThongKe.stats.tableColAvgPhanTram')]: r.avgPhanTram,
  }));
  if (nguoiTaoSheet.length > 0) {
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(nguoiTaoSheet),
      txt('pbxhThongKe.report.byNguoiTaoSheet'),
    );
  }

  const topHoatDongSheet = input.topHoatDongRows.map((r, i) => ({
    [txt('pbxhThongKe.stats.tableColRank')]: i + 1,
    [txt('pbxhThongKe.stats.tableColNoiDung')]: r.noi_dung,
    [txt('pbxhThongKe.stats.tableColNguoiTao')]: r.nguoi_tao_label,
    [txt('pbxhThongKe.stats.tableColLoaiHinh')]: r.loai_hinh,
    [txt('pbxhThongKe.stats.tableColTinhTrang')]: r.tinh_trang,
    [txt('pbxhThongKe.stats.tableColSoLanHoanThanh')]: r.so_lan_hoan_thanh,
    [txt('pbxhThongKe.stats.tableColSoLanKhaoSat')]: r.so_lan_khao_sat,
    [txt('pbxhThongKe.stats.tableColPhanTram')]: r.phan_tram_hoan_thanh,
  }));
  if (topHoatDongSheet.length > 0) {
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(topHoatDongSheet),
      txt('pbxhThongKe.report.topHoatDongSheet'),
    );
  }

  const loaiHinhSheet = input.loaiHinhRows.map((r) => ({
    [txt('pbxhThongKe.stats.tableColLoaiHinh')]: r.label,
    [txt('pbxhThongKe.stats.tableTwoColValue')]: r.count,
  }));
  if (loaiHinhSheet.length > 0) {
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(loaiHinhSheet),
      txt('pbxhThongKe.report.byLoaiHinhSheet'),
    );
  }

  if (input.avgPhanTramLoaiHinhRows.length > 0) {
    const avgLoaiSheet = input.avgPhanTramLoaiHinhRows.map((r) => ({
      [txt('pbxhThongKe.stats.tableColLoaiHinh')]: r.label,
      [txt('pbxhThongKe.stats.tableColAvgPhanTramLoai')]: r.avgPhanTram,
      [txt('pbxhThongKe.stats.tableTwoColValue')]: r.count,
    }));
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(avgLoaiSheet),
      txt('pbxhThongKe.stats.chartAvgPhanTramLoaiHinh'),
    );
  }

  if (input.matrixRows.length > 0) {
    const matrixSheet = input.matrixRows.map((r) => ({
      [txt('pbxhThongKe.stats.tableMatrixCol')]: r.label,
      [txt('pbxhThongKe.stats.tableTwoColValue')]: r.value,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(matrixSheet), txt('pbxhThongKe.stats.tableMatrix'));
  }

  const detail = input.lookupRows.map((r) => ({
    [txt('pbxhThongKe.stats.tableColNoiDung')]: r.noi_dung,
    [txt('pbxhThongKe.stats.tableColLoaiHinh')]: r.loai_hinh,
    [txt('pbxhThongKe.stats.tableColTinhTrang')]: r.tinh_trang,
    [txt('pbxhThongKe.stats.tableColDonViChuTri')]: r.ten_don_vi_chu_tri ?? '',
    [txt('pbxhThongKe.stats.tableColNguoiTao')]:
      (r.ho_va_ten_nguoi_tao ?? r.ten_tai_khoan_nguoi_tao ?? '').trim() || '',
    [txt('pbxhThongKe.stats.tableColTienDo')]: formatPbxhTienDoLabel(r),
    [txt('pbxhThongKe.stats.tableColSoLanHoanThanh')]: r.so_lan_hoan_thanh ?? 0,
    [txt('pbxhThongKe.stats.tableColSoLanKhaoSat')]: r.so_lan_khao_sat ?? 0,
    [txt('pbxhThongKe.stats.tableColPhanTram')]: r.phan_tram_hoan_thanh,
    [txt('pbxhThongKe.stats.tableColNgayKetThuc')]: r.ngay_ket_thuc ?? '',
    [txt('pbxhThucHien.store.ngayBatDauCol')]: r.ngay_bat_dau ?? '',
    [txt('pbxhThucHien.store.capThucHienCol')]: r.cap_thuc_hien,
  }));
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(detail),
    txt('pbxhThongKe.report.detailSheet'),
  );

  XLSX.writeFile(wb, `${txt('pbxhThongKe.exportFileName')}_${getTodayISODate()}.xlsx`);
}
