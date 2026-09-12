import { createGenericStore, type ColumnConfig } from '@/store/createGenericStore';
import { TABLE_COLUMN_PRESETS } from '@/lib/table-column-presets';
import { txt } from '@/lib/text';
import type { QuyDanhMucTaiKhoanFilters } from '../core/types';

const P = TABLE_COLUMN_PRESETS;

/**
 * Store dùng CHUNG cho cả hai quỹ: mỗi lúc chỉ một trang được gắn, và trang gọi
 * `resetState()` khi rời đi nên bộ lọc không rớt sang quỹ kia.
 */
const DEFAULT_COLUMNS: ColumnConfig[] = [
  {
    id: 'thu_tu',
    label: txt('quy.danhMucTaiKhoan.store.thuTuCol'),
    visible: true,
    minWidth: 56,
    maxWidth: 88,
    order: 0,
  },
  {
    id: 'ten',
    label: txt('quy.danhMucTaiKhoan.store.tenCol'),
    visible: true,
    ...P.titleShort,
    minWidth: 180,
    maxWidth: 340,
    order: 1,
  },
  {
    id: 'so_tai_khoan',
    label: txt('quy.danhMucTaiKhoan.store.soTaiKhoanCol'),
    visible: true,
    minWidth: 140,
    maxWidth: 220,
    order: 2,
  },
  {
    id: 'ngan_hang',
    label: txt('quy.danhMucTaiKhoan.store.nganHangCol'),
    visible: true,
    minWidth: 140,
    maxWidth: 260,
    order: 3,
  },
  {
    id: 'so_du',
    label: txt('quy.danhMucTaiKhoan.store.soDuCol'),
    visible: true,
    minWidth: 140,
    maxWidth: 200,
    order: 4,
  },
  {
    id: 'trang_thai',
    label: txt('quy.danhMucTaiKhoan.store.trangThaiCol'),
    visible: true,
    minWidth: 110,
    maxWidth: 150,
    order: 5,
  },
  {
    id: 'mo_ta',
    label: txt('quy.danhMucTaiKhoan.store.moTaCol'),
    visible: false,
    minWidth: 140,
    maxWidth: 360,
    order: 6,
  },
  {
    id: 'tg_tao',
    label: txt('quy.danhMucTaiKhoan.store.tgTaoCol'),
    visible: false,
    ...P.datetime,
    order: 7,
  },
  {
    id: 'tg_cap_nhat',
    label: txt('quy.danhMucTaiKhoan.store.tgCapNhatCol'),
    visible: false,
    ...P.datetime,
    order: 8,
  },
  {
    id: 'actions',
    label: txt('common.actions'),
    visible: true,
    minWidth: 96,
    maxWidth: 120,
    order: 9,
  },
];

const initialFilters: QuyDanhMucTaiKhoanFilters = {
  columnSearch: {},
  trang_thai: [],
  hinh_thuc: [],
};

export const useQuyDanhMucTaiKhoanStore = createGenericStore<QuyDanhMucTaiKhoanFilters>(
  initialFilters,
  DEFAULT_COLUMNS,
);
