import { createGenericStore, type ColumnConfig } from '@/store/createGenericStore';
import { TABLE_COLUMN_PRESETS } from '@/lib/table-column-presets';
import { txt } from '@/lib/text';
import type { MttqKhenThuongFilters } from '../core/types';

const P = TABLE_COLUMN_PRESETS;

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: 'so_qd', label: txt('matTranKhenThuong.store.soQdCol'), visible: true, ...P.titleShort, order: 0 },
  {
    id: 'ngay_khen_thuong',
    label: txt('matTranKhenThuong.store.ngayCol'),
    visible: true,
    minWidth: 108,
    maxWidth: 120,
    order: 1,
  },
  {
    id: 'don_vi_de_xuat',
    label: txt('matTranKhenThuong.store.donViCol'),
    visible: true,
    minWidth: 140,
    maxWidth: 220,
    order: 2,
  },
  {
    id: 'trang_thai',
    label: txt('matTranKhenThuong.store.trangThaiCol'),
    visible: true,
    minWidth: 120,
    maxWidth: 160,
    order: 3,
  },
  { id: 'so_dong', label: txt('matTranKhenThuong.store.soDongCol'), visible: true, minWidth: 72, maxWidth: 88, order: 4 },
  {
    id: 'ho_va_ten_nguoi_tao',
    label: txt('matTranKhenThuong.store.nguoiTaoCol'),
    visible: true,
    minWidth: 120,
    maxWidth: 180,
    order: 5,
  },
  { id: 'tg_cap_nhat', label: txt('matTranKhenThuong.store.tgCapNhatCol'), visible: false, ...P.datetime, order: 6 },
];

const initialFilters: MttqKhenThuongFilters = {
  columnSearch: {},
  trang_thai: [],
};

export const useMttqKhenThuongStore = createGenericStore<MttqKhenThuongFilters>(initialFilters, DEFAULT_COLUMNS);
