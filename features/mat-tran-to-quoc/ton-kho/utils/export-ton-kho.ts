import { txt } from '@/lib/text';
import { getTodayISODate } from '@/lib/utils';
import type { NXTByPeriodResult, TonKhoProductAgg } from '../core/types';

export async function exportTonKhoByProductToExcel(rows: TonKhoProductAgg[]): Promise<void> {
  const XLSX = await import('xlsx');
  const sheet = rows.map((r) => ({
    [txt('matTranTonKho.export.maHang')]: r.hang_hoa_id,
    [txt('matTranTonKho.export.tenHang')]: r.ten_hang_hoa,
    [txt('matTranTonKho.export.danhMuc')]: r.ten_danh_muc ?? '',
    [txt('matTranTonKho.export.dvt')]: r.don_vi_tinh,
    [txt('matTranTonKho.byProduct.warehouseCount')]: r.so_kho_co_ton,
    [txt('matTranTonKho.byProduct.totalQty')]: r.tong_so_luong,
  }));
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(sheet);
  XLSX.utils.book_append_sheet(wb, ws, 'Ton_hang_hoa');
  XLSX.writeFile(wb, `ton_kho_${getTodayISODate()}.xlsx`);
}

export async function exportNXTToExcel(result: NXTByPeriodResult): Promise<void> {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();
  const colTd = txt('matTranTonKho.nxt.tonDau');
  const colNhap = txt('matTranTonKho.nxt.nhap');
  const colXuat = txt('matTranTonKho.nxt.xuat');
  const colTc = txt('matTranTonKho.nxt.tonCuoi');

  const rows = result.byProduct.map((r) => ({
    [txt('matTranTonKho.nxt.maHang')]: r.hang_hoa_id,
    [txt('matTranTonKho.nxt.tenHang')]: r.ten_hang_hoa,
    [txt('matTranTonKho.nxt.danhMuc')]: r.ten_danh_muc ?? '',
    [txt('matTranTonKho.nxt.dvt')]: r.don_vi_tinh,
    [colTd]: r.ton_dau_ky,
    [colNhap]: r.tong_nhap,
    [colXuat]: r.tong_xuat,
    [colTc]: r.ton_cuoi_ky,
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'NXT_TheoHang');

  if (result.byWarehouse.length > 0) {
    const wh = result.byWarehouse.map((r) => ({
      [txt('matTranTonKho.nxt.tenKho')]: r.ten_kho,
      [colTd]: r.ton_dau_ky,
      [colNhap]: r.tong_nhap,
      [colXuat]: r.tong_xuat,
      [colTc]: r.ton_cuoi_ky,
    }));
    const wsWh = XLSX.utils.json_to_sheet(wh);
    XLSX.utils.book_append_sheet(wb, wsWh, 'NXT_TheoKho');
  }

  XLSX.writeFile(wb, `bao_cao_nxt_${getTodayISODate()}.xlsx`);
}
