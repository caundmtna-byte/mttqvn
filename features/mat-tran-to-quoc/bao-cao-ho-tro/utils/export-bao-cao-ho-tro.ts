import { txt } from '@/lib/text';
import { getTodayISODate } from '@/lib/utils';
import type { ReliefSupportKpis, ReliefSupportLabelValueRow, ReliefSupportLookupRow } from '../core/types';

function formatMoney(n: number): number {
  return Math.round(n);
}

export async function exportBaoCaoHoTroToExcel(input: {
  kpis: ReliefSupportKpis;
  topDonVi: ReliefSupportLabelValueRow[];
  topDot: ReliefSupportLabelValueRow[];
  byLoaiDonVi: ReliefSupportLabelValueRow[];
  lookupRows: ReliefSupportLookupRow[];
}): Promise<void> {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();

  const summaryRows = [
    { [txt('matTranReliefSupportReport.exportKpiLabel')]: txt('matTranReliefSupportReport.kpiPhieu'), [txt('matTranReliefSupportReport.exportKpiValue')]: input.kpis.phieuCount },
    { [txt('matTranReliefSupportReport.exportKpiLabel')]: txt('matTranReliefSupportReport.kpiLine'), [txt('matTranReliefSupportReport.exportKpiValue')]: input.kpis.lineCount },
    { [txt('matTranReliefSupportReport.exportKpiLabel')]: txt('matTranReliefSupportReport.kpiNhapSl'), [txt('matTranReliefSupportReport.exportKpiValue')]: input.kpis.nhapSoLuong },
    { [txt('matTranReliefSupportReport.exportKpiLabel')]: txt('matTranReliefSupportReport.kpiNhapTien'), [txt('matTranReliefSupportReport.exportKpiValue')]: formatMoney(input.kpis.nhapThanhTien) },
    { [txt('matTranReliefSupportReport.exportKpiLabel')]: txt('matTranReliefSupportReport.kpiXuatSl'), [txt('matTranReliefSupportReport.exportKpiValue')]: input.kpis.xuatSoLuong },
    { [txt('matTranReliefSupportReport.exportKpiLabel')]: txt('matTranReliefSupportReport.kpiXuatTien'), [txt('matTranReliefSupportReport.exportKpiValue')]: formatMoney(input.kpis.xuatThanhTien) },
    { [txt('matTranReliefSupportReport.exportKpiLabel')]: txt('matTranReliefSupportReport.kpiChuyenSl'), [txt('matTranReliefSupportReport.exportKpiValue')]: input.kpis.chuyenSoLuong },
    { [txt('matTranReliefSupportReport.exportKpiLabel')]: txt('matTranReliefSupportReport.kpiDonVi'), [txt('matTranReliefSupportReport.exportKpiValue')]: input.kpis.donViCoPhatSinh },
    { [txt('matTranReliefSupportReport.exportKpiLabel')]: txt('matTranReliefSupportReport.kpiDot'), [txt('matTranReliefSupportReport.exportKpiValue')]: input.kpis.dotCoXuat },
    { [txt('matTranReliefSupportReport.exportKpiLabel')]: txt('matTranReliefSupportReport.kpiTonSl'), [txt('matTranReliefSupportReport.exportKpiValue')]: input.kpis.tonTongSoLuong },
    { [txt('matTranReliefSupportReport.exportKpiLabel')]: txt('matTranReliefSupportReport.kpiKhoCoHang'), [txt('matTranReliefSupportReport.exportKpiValue')]: input.kpis.khoCoHang },
  ];
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(summaryRows), txt('matTranReliefSupportReport.exportSheetSummary'));

  const topRows = [
    ...input.topDonVi.map((r) => ({
      [txt('matTranReliefSupportReport.tableTwoColLabel')]: `${txt('matTranReliefSupportReport.filterDonVi')}: ${r.label}`,
      [txt('matTranReliefSupportReport.tableTwoColValue')]: formatMoney(r.value),
    })),
    ...input.topDot.map((r) => ({
      [txt('matTranReliefSupportReport.tableTwoColLabel')]: `${txt('matTranReliefSupportReport.filterDot')}: ${r.label}`,
      [txt('matTranReliefSupportReport.tableTwoColValue')]: formatMoney(r.value),
    })),
    ...input.byLoaiDonVi.map((r) => ({
      [txt('matTranReliefSupportReport.tableTwoColLabel')]: `${txt('matTranReliefSupportReport.chartByLoaiDonVi')}: ${r.label}`,
      [txt('matTranReliefSupportReport.tableTwoColValue')]: formatMoney(r.value),
    })),
  ];
  if (topRows.length > 0) {
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(topRows), 'Top');
  }

  const detail = input.lookupRows.map((r) => ({
    [txt('matTranReliefSupportReport.tableColNgay')]: r.ngay_phieu,
    [txt('matTranReliefSupportReport.tableColSoPhieu')]: r.so_phieu,
    [txt('matTranReliefSupportReport.tableColLoai')]: r.loai_phieu_label,
    [txt('matTranReliefSupportReport.tableColKho')]: r.kho_label,
    [txt('matTranReliefSupportReport.tableColNguonDich')]: r.nguon_dich_label,
    [txt('matTranReliefSupportReport.tableColHang')]: r.ten_hang_hoa ?? '',
    [txt('matTranReliefSupportReport.tableColSl')]: r.so_luong,
    [txt('matTranReliefSupportReport.tableColDvt')]: r.don_vi_tinh,
    [txt('matTranReliefSupportReport.tableColTien')]: formatMoney(r.thanh_tien),
  }));
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(detail),
    txt('matTranReliefSupportReport.exportSheetDetail'),
  );

  XLSX.writeFile(wb, `${txt('matTranReliefSupportReport.exportFileName')}_${getTodayISODate()}.xlsx`);
}
