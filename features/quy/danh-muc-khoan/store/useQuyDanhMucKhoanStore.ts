import { createGenericStore, type ColumnConfig } from '@/store/createGenericStore';
import { TABLE_COLUMN_PRESETS } from '@/lib/table-column-presets';
import { txt } from '@/lib/text';
import type { QuyDanhMucKhoanFilters } from '../core/types';

const P = TABLE_COLUMN_PRESETS;

const DEFAULT_COLUMNS: ColumnConfig[] = [
  {
    id: 'thu_tu',
    label: txt('quy.danhMucKhoan.store.thuTuCol'),
    visible: true,
    minWidth: 56,
    maxWidth: 88,
    order: 0,
  },
  {
    id: 'loai',
    label: txt('quy.danhMucKhoan.store.loaiCol'),
    visible: true,
    minWidth: 110,
    maxWidth: 150,
    order: 1,
  },
  {
    id: 'ten',
    label: txt('quy.danhMucKhoan.store.tenCol'),
    visible: true,
    ...P.titleShort,
    minWidth: 200,
    maxWidth: 380,
    order: 2,
  },
  {
    id: 'mo_ta',
    label: txt('quy.danhMucKhoan.store.moTaCol'),
    visible: true,
    minWidth: 160,
    maxWidth: 400,
    order: 3,
  },
  {
    id: 'trang_thai',
    label: txt('quy.danhMucKhoan.store.trangThaiCol'),
    visible: true,
    minWidth: 110,
    maxWidth: 150,
    order: 4,
  },
  {
    id: 'tg_tao',
    label: txt('quy.danhMucKhoan.store.tgTaoCol'),
    visible: false,
    ...P.datetime,
    order: 5,
  },
  {
    id: 'tg_cap_nhat',
    label: txt('quy.danhMucKhoan.store.tgCapNhatCol'),
    visible: false,
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

const initialFilters: QuyDanhMucKhoanFilters = {
  columnSearch: {},
  loai: [],
  trang_thai: [],
};

export const useQuyDanhMucKhoanStore = createGenericStore<QuyDanhMucKhoanFilters>(
  initialFilters,
  DEFAULT_COLUMNS,
);
