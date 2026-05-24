import { createGenericStore, type ColumnConfig } from '../../../../store/createGenericStore';
import i18n from '../../../../lib/i18n';
import type { TonKhoFilters } from '../../../kho-van/ton-kho/store/useTonKhoStore';

const initialFilters: TonKhoFilters = {
  belowMinStock: [],
  categoryIds: [],
  warehouseIds: [],
};

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: 'ma_hang', label: i18n.t('tonKhoPhanThuoc.table.maHang'), visible: true, minWidth: 100, maxWidth: 160, order: 0 },
  { id: 'ten_hang', label: i18n.t('tonKhoPhanThuoc.table.tenHang'), visible: true, minWidth: 160, maxWidth: 280, order: 1 },
  { id: 'ten_danh_muc', label: i18n.t('tonKhoPhanThuoc.table.danhMuc'), visible: true, minWidth: 110, maxWidth: 200, order: 2 },
  { id: 'don_vi_tinh', label: i18n.t('tonKhoPhanThuoc.table.dvt'), visible: true, minWidth: 70, maxWidth: 100, order: 3 },
  { id: 'so_kho_co_ton', label: i18n.t('tonKhoPhanThuoc.byProduct.warehouseCount'), visible: true, minWidth: 88, maxWidth: 110, order: 4 },
  { id: 'tong_so_luong', label: i18n.t('tonKhoPhanThuoc.byProduct.totalQty'), visible: true, minWidth: 100, maxWidth: 120, order: 5 },
];

export const useTonKhoPTByProductStore = createGenericStore<TonKhoFilters>(initialFilters, DEFAULT_COLUMNS);
