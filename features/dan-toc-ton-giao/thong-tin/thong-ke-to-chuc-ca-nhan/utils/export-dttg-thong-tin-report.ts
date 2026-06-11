import { txt } from '@/lib/text';
import { getTodayISODate } from '@/lib/utils';
import type {
  DttgDonViTableRow,
  DttgThongTinKpis,
  DttgThongTinThongKeRow,
  ResolvedDateRange,
} from './aggregate-dttg-thong-tin-stats';
import { formatDonViLabel, formatLoaiLabel, formatReportPeriodLabel } from './aggregate-dttg-thong-tin-stats';

export async function exportDttgThongTinReportToExcel(input: {
  kpis: DttgThongTinKpis;
  donViRows: DttgDonViTableRow[];
  loaiHinhRows: { label: string; count: number }[];
  doiTuongRows: { label: string; count: number }[];
  trangThaiRows: { label: string; count: number }[];
  lookupRows: DttgThongTinThongKeRow[];
  range: ResolvedDateRange;
  trendRange: ResolvedDateRange;
}): Promise<void> {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();

  const periodLabel = formatReportPeriodLabel(
    input.range,
    input.trendRange,
    txt('dttgThongKeToChucCaNhan.report.allTime'),
  );

  const summaryRows = [
    {
      [txt('dttgThongKeToChucCaNhan.report.indicator')]: txt('dttgThongKeToChucCaNhan.report.period'),
      [txt('dttgThongKeToChucCaNhan.report.value')]: periodLabel,
    },
    {
      [txt('dttgThongKeToChucCaNhan.report.indicator')]: txt('dttgThongKeToChucCaNhan.report.exportDate'),
      [txt('dttgThongKeToChucCaNhan.report.value')]: getTodayISODate(),
    },
    {
      [txt('dttgThongKeToChucCaNhan.report.indicator')]: txt('dttgThongKeToChucCaNhan.stats.kpiTotal'),
      [txt('dttgThongKeToChucCaNhan.report.value')]: input.kpis.total,
    },
    {
      [txt('dttgThongKeToChucCaNhan.report.indicator')]: txt('dttgThongKeToChucCaNhan.stats.kpiToChuc'),
      [txt('dttgThongKeToChucCaNhan.report.value')]: input.kpis.toChuc,
    },
    {
      [txt('dttgThongKeToChucCaNhan.report.indicator')]: txt('dttgThongKeToChucCaNhan.stats.kpiCaNhan'),
      [txt('dttgThongKeToChucCaNhan.report.value')]: input.kpis.caNhan,
    },
    {
      [txt('dttgThongKeToChucCaNhan.report.indicator')]: txt('dttgThongKeToChucCaNhan.stats.kpiDangHoatDong'),
      [txt('dttgThongKeToChucCaNhan.report.value')]: input.kpis.dangHoatDong,
    },
    {
      [txt('dttgThongKeToChucCaNhan.report.indicator')]: txt('dttgThongKeToChucCaNhan.stats.kpiNgungHoatDong'),
      [txt('dttgThongKeToChucCaNhan.report.value')]: input.kpis.ngungHoatDong,
    },
  ];
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(summaryRows),
    txt('dttgThongKeToChucCaNhan.report.overviewSheet'),
  );

  const donViSheet = input.donViRows.map((r) => ({
    [txt('dttgThongKeToChucCaNhan.stats.tableColDonVi')]: r.label,
    [txt('dttgThongKeToChucCaNhan.stats.tableColToChuc')]: r.toChuc,
    [txt('dttgThongKeToChucCaNhan.stats.tableColCaNhan')]: r.caNhan,
    [txt('dttgThongKeToChucCaNhan.stats.tableColTotal')]: r.total,
  }));
  if (donViSheet.length > 0) {
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(donViSheet),
      txt('dttgThongKeToChucCaNhan.report.byDonViSheet'),
    );
  }

  const loaiHinhSheet = input.loaiHinhRows.map((r) => ({
    [txt('dttgThongKeToChucCaNhan.stats.filterLoaiHinh')]: r.label,
    [txt('dttgThongKeToChucCaNhan.stats.tableTwoColValue')]: r.count,
  }));
  if (loaiHinhSheet.length > 0) {
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(loaiHinhSheet),
      txt('dttgThongKeToChucCaNhan.report.byLoaiHinhSheet'),
    );
  }

  const doiTuongSheet = input.doiTuongRows.map((r) => ({
    [txt('dttgThongKeToChucCaNhan.stats.filterDoiTuong')]: r.label,
    [txt('dttgThongKeToChucCaNhan.stats.tableTwoColValue')]: r.count,
  }));
  if (doiTuongSheet.length > 0) {
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(doiTuongSheet),
      txt('dttgThongKeToChucCaNhan.report.byDoiTuongSheet'),
    );
  }

  const trangThaiSheet = input.trangThaiRows.map((r) => ({
    [txt('dttgThongKeToChucCaNhan.stats.filterTrangThai')]: r.label,
    [txt('dttgThongKeToChucCaNhan.stats.tableTwoColValue')]: r.count,
  }));
  if (trangThaiSheet.length > 0) {
    XLSX.utils.book_append_sheet(
      wb,
      XLSX.utils.json_to_sheet(trangThaiSheet),
      txt('dttgThongKeToChucCaNhan.report.byTrangThaiSheet'),
    );
  }

  const detail = input.lookupRows.map((r) => ({
    [txt('dttgThongKeToChucCaNhan.stats.tableColLoai')]: formatLoaiLabel(
      r.loai,
      txt('dttgThongKeToChucCaNhan.stats.filterLoaiToChuc'),
      txt('dttgThongKeToChucCaNhan.stats.filterLoaiCaNhan'),
    ),
    [txt('dttgThongKeToChucCaNhan.stats.tableColTen')]: r.ten,
    [txt('dttgThongKeToChucCaNhan.stats.tableColPhanLoai')]: r.phan_loai,
    [txt('dttgThongKeToChucCaNhan.stats.tableColDonVi')]: formatDonViLabel(r),
    [txt('dttgThongKeToChucCaNhan.stats.tableColTrangThai')]: r.trang_thai,
    [txt('dttgThongKeToChucCaNhan.stats.tableColTgTao')]: r.tg_tao ? r.tg_tao.slice(0, 10) : '',
  }));
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(detail),
    txt('dttgThongKeToChucCaNhan.report.detailSheet'),
  );

  XLSX.writeFile(wb, `${txt('dttgThongKeToChucCaNhan.exportFileName')}_${getTodayISODate()}.xlsx`);
}
