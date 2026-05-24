import type { TFunction } from 'i18next';
import { getTodayISODate } from '../../../../lib/utils';
import type { NXTPTByPeriodResult, TonKhoPTProductAgg } from '../core/types';
import type { TonKhoPTDisplayRow } from '../core/types';

export async function exportTonKhoPTToExcel(rows: TonKhoPTDisplayRow[], t: TFunction): Promise<void> {
  const XLSX = await import('xlsx');
  const colMaHang = t('tonKhoPhanThuoc.export.maHang');
  const colTenHang = t('tonKhoPhanThuoc.export.tenHang');
  const colDm = t('tonKhoPhanThuoc.export.danhMuc');
  const colDvt = t('tonKhoPhanThuoc.export.dvt');
  const colKho = t('tonKhoPhanThuoc.export.kho');
  const colSl = t('tonKhoPhanThuoc.export.soLuong');
  const sheet = rows.map((r) => ({
    [colMaHang]: r.ma_hang,
    [colTenHang]: r.ten_hang,
    [colDm]: r.ten_danh_muc ?? '',
    [colDvt]: r.don_vi_tinh,
    [colKho]: r.ten_kho,
    [colSl]: r.so_luong,
  }));
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(sheet);
  XLSX.utils.book_append_sheet(wb, ws, 'Ton_kho');
  XLSX.writeFile(wb, `ton_kho_phan_thuoc_${getTodayISODate()}.xlsx`);
}

/** Tab Tồn sản phẩm: gom theo hàng (đồng bộ cột bảng). */
export async function exportTonKhoPTByProductToExcel(rows: TonKhoPTProductAgg[], t: TFunction): Promise<void> {
  const XLSX = await import('xlsx');
  const colMaHang = t('tonKhoPhanThuoc.export.maHang');
  const colTenHang = t('tonKhoPhanThuoc.export.tenHang');
  const colDm = t('tonKhoPhanThuoc.export.danhMuc');
  const colDvt = t('tonKhoPhanThuoc.export.dvt');
  const colSoKho = t('tonKhoPhanThuoc.byProduct.warehouseCount');
  const colTongSl = t('tonKhoPhanThuoc.byProduct.totalQty');
  const sheet = rows.map((r) => ({
    [colMaHang]: r.ma_hang,
    [colTenHang]: r.ten_hang,
    [colDm]: r.ten_danh_muc ?? '',
    [colDvt]: r.don_vi_tinh,
    [colSoKho]: r.so_kho_co_ton,
    [colTongSl]: r.tong_so_luong,
  }));
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(sheet);
  XLSX.utils.book_append_sheet(wb, ws, 'Ton_san_pham');
  XLSX.writeFile(wb, `ton_san_pham_phan_thuoc_${getTodayISODate()}.xlsx`);
}

export async function exportFarmNXTPTToExcel(result: NXTPTByPeriodResult, t: TFunction): Promise<void> {
  const XLSX = await import('xlsx');
  const wb = XLSX.utils.book_new();
  const colMaHang = t('tonKhoPhanThuoc.nxt.maHang');
  const colTenHang = t('tonKhoPhanThuoc.nxt.tenHang');
  const colDm = t('tonKhoPhanThuoc.nxt.danhMuc');
  const colDvt = t('tonKhoPhanThuoc.nxt.dvt');
  const colTd = t('tonKhoPhanThuoc.nxt.tonDau');
  const colNhap = t('tonKhoPhanThuoc.nxt.nhap');
  const colXuat = t('tonKhoPhanThuoc.nxt.xuat');
  const colTc = t('tonKhoPhanThuoc.nxt.tonCuoi');
  const rows = result.byProduct.map((r) => ({
    [colMaHang]: r.ma_hang,
    [colTenHang]: r.ten_hang,
    [colDm]: r.ten_danh_muc ?? '',
    [colDvt]: r.don_vi_tinh,
    [colTd]: r.ton_dau_ky,
    [colNhap]: r.tong_nhap,
    [colXuat]: r.tong_xuat,
    [colTc]: r.ton_cuoi_ky,
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(wb, ws, 'NXT_TheoHang');
  if (result.byWarehouse.length > 0) {
    const colMk = t('tonKhoPhanThuoc.nxt.maKho');
    const colTk = t('tonKhoPhanThuoc.nxt.tenKho');
    const wh = result.byWarehouse.map((r) => ({
      [colMk]: r.ma_kho,
      [colTk]: r.ten_kho,
      [colTd]: r.ton_dau_ky,
      [colNhap]: r.tong_nhap,
      [colXuat]: r.tong_xuat,
      [colTc]: r.ton_cuoi_ky,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(wh), 'NXT_TheoKho');
  }
  XLSX.writeFile(wb, `nxt_phan_thuoc_${getTodayISODate()}.xlsx`);
}
