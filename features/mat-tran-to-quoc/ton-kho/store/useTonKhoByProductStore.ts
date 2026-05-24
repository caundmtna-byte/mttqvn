import { createGenericStore, type ColumnConfig } from '@/store/createGenericStore';
import { txt } from '@/lib/text';
import type { TonKhoByProductFilters } from '../core/types';

const initialFilters: TonKhoByProductFilters = {
  categoryIds: [],
  warehouseIds: [],
};

const DEFAULT_COLUMNS: ColumnConfig[] = [
  {
    id: 'ma_hang',
    label: txt('matTranTonKho.table.maHang'),
    visible: true,
    minWidth: 72,
    maxWidth: 100,
    order: 0,
  },
  {
    id: 'ten_hang',
    label: txt('matTranTonKho.table.tenHang'),
    visible: true,
    minWidth: 160,
    maxWidth: 280,
    order: 1,
  },
  {
    id: 'ten_danh_muc',
    label: txt('matTranTonKho.table.danhMuc'),
    visible: true,
    minWidth: 110,
    maxWidth: 200,
    order: 2,
  },
  {
    id: 'don_vi_tinh',
    label: txt('matTranTonKho.table.dvt'),
    visible: true,
    minWidth: 70,
    maxWidth: 100,
    order: 3,
  },
  {
    id: 'so_kho_co_ton',
    label: txt('matTranTonKho.byProduct.warehouseCount'),
    visible: true,
    minWidth: 88,
    maxWidth: 110,
    order: 4,
  },
  {
    id: 'tong_so_luong',
    label: txt('matTranTonKho.byProduct.totalQty'),
    visible: true,
    minWidth: 100,
    maxWidth: 120,
    order: 5,
  },
];

export const useTonKhoByProductStore = createGenericStore<TonKhoByProductFilters>(
  initialFilters,
  DEFAULT_COLUMNS
);
