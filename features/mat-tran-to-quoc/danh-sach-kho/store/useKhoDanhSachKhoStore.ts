import { createGenericStore, type ColumnConfig } from '@/store/createGenericStore';
import { TABLE_COLUMN_PRESETS } from '@/lib/table-column-presets';
import { txt } from '@/lib/text';
import type { KhoDanhSachKhoFilters } from '../core/types';

const P = TABLE_COLUMN_PRESETS;

const DEFAULT_COLUMNS: ColumnConfig[] = [
  {
    id: 'tt',
    label: txt('matTranKhoDanhSach.store.ttCol'),
    visible: true,
    minWidth: 56,
    maxWidth: 88,
    order: 0,
  },
  {
    id: 'ten_kho',
    label: txt('matTranKhoDanhSach.store.tenKhoCol'),
    visible: true,
    ...P.titleShort,
    minWidth: 160,
    maxWidth: 320,
    order: 1,
  },
  {
    id: 'ten_don_vi',
    label: txt('matTranKhoDanhSach.store.donViCol'),
    visible: true,
    minWidth: 140,
    maxWidth: 220,
    order: 2,
  },
  {
    id: 'ten_tinh',
    label: txt('matTranKhoDanhSach.store.tinhCol'),
    visible: true,
    minWidth: 120,
    maxWidth: 180,
    order: 3,
  },
  {
    id: 'mo_ta',
    label: txt('matTranKhoDanhSach.store.moTaCol'),
    visible: true,
    minWidth: 140,
    maxWidth: 360,
    order: 4,
  },
  {
    id: 'tg_tao',
    label: txt('matTranKhoDanhSach.store.tgTaoCol'),
    visible: false,
    ...P.datetime,
    order: 5,
  },
  {
    id: 'tg_cap_nhat',
    label: txt('matTranKhoDanhSach.store.tgCapNhatCol'),
    visible: true,
    ...P.datetime,
    order: 6,
  },
  {
    id: 'actions',
    label: txt('common.actions'),
    visible: true,
    minWidth: 96,
    maxWidth: 120,
    order: 7,
  },
];

const initialFilters: KhoDanhSachKhoFilters = {
  columnSearch: {},
  don_vi_id: [],
  ten_tinh: [],
};

export const useKhoDanhSachKhoStore = createGenericStore<KhoDanhSachKhoFilters>(
  initialFilters,
  DEFAULT_COLUMNS,
);
