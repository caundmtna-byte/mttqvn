import { txt } from '@/lib/text';
import { getTodayISODate } from '@/lib/utils';
import type { ThucHienPhanBien } from '../../thuc-hien-phan-bien-xa-hoi/core/types';
import type {
  PbxhDonViChuTriTableRow,
  PbxhThongKeKpis,
  LabelCountRow,
  ResolvedDateRange,
} from './aggregate-pbxh-thong-ke-stats';
import { formatPbxhTienDoLabel } from './aggregate-pbxh-thong-ke-stats';

export async function exportPbxhThongKeReportToExcel(input: {
  kpis: PbxhThongKeKpis;
  donViRows: PbxhDonViChuTriTableRow[];
  loaiHinhRows: { label: string; count: number }[];
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
    [txt('pbxhThongKe.stats.tableColAvgPhanTram')]: r.avgPhanTram,
  }));
  if (donViSheet.length > 0) {
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(donViSheet),
      txt('pbxhThongKe.report.byDonViChuTriSheet'),
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
    [txt('pbxhThongKe.stats.tableColTienDo')]: formatPbxhTienDoLabel(r),
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
