import { createGenericStore, type ColumnConfig } from '@/store/createGenericStore';
import { TABLE_COLUMN_PRESETS } from '@/lib/table-column-presets';
import { txt } from '@/lib/text';
import { STATS_INITIAL_DATE_RANGE } from '@/components/shared/stats';
import type { QuySoThuChiFilters } from '../core/types';

const P = TABLE_COLUMN_PRESETS;

const DEFAULT_COLUMNS: ColumnConfig[] = [
  {
    id: 'so_chung_tu',
    label: txt('quy.soThuChi.store.soChungTuCol'),
    visible: true,
    minWidth: 140,
    maxWidth: 180,
    order: 0,
  },
  {
    id: 'ngay_chung_tu',
    label: txt('quy.soThuChi.store.ngayChungTuCol'),
    visible: true,
    ...P.date,
    order: 1,
  },
  {
    id: 'loai',
    label: txt('quy.soThuChi.store.loaiCol'),
    visible: true,
    minWidth: 110,
    maxWidth: 150,
    order: 2,
  },
  {
    id: 'ten_khoan',
    label: txt('quy.soThuChi.store.khoanCol'),
    visible: true,
    minWidth: 160,
    maxWidth: 280,
    order: 3,
  },
  {
    id: 'so_tien',
    label: txt('quy.soThuChi.store.soTienCol'),
    visible: true,
    minWidth: 140,
    maxWidth: 200,
    order: 4,
  },
  {
    id: 'noi_dung',
    label: txt('quy.soThuChi.store.noiDungCol'),
    visible: true,
    minWidth: 200,
    maxWidth: 420,
    order: 5,
  },
  {
    id: 'ten_tai_khoan',
    label: txt('quy.soThuChi.store.taiKhoanCol'),
    visible: true,
    minWidth: 150,
    maxWidth: 260,
    order: 6,
  },
  {
    id: 'nguoi_nop_nhan',
    label: txt('quy.soThuChi.store.nguoiNopNhanCol'),
    visible: true,
    minWidth: 150,
    maxWidth: 240,
    order: 7,
  },
  {
    id: 'ten_don_vi',
    label: txt('quy.soThuChi.store.donViCol'),
    visible: false,
    minWidth: 140,
    maxWidth: 220,
    order: 8,
  },
  {
    id: 'ghi_chu',
    label: txt('quy.soThuChi.store.ghiChuCol'),
    visible: false,
    minWidth: 160,
    maxWidth: 360,
    order: 9,
  },
  {
    id: 'ho_va_ten_nguoi_tao',
    label: txt('quy.soThuChi.store.nguoiTaoCol'),
    visible: false,
    minWidth: 150,
    maxWidth: 240,
    order: 10,
  },
  {
    id: 'tg_cap_nhat',
    label: txt('quy.soThuChi.store.tgCapNhatCol'),
    visible: false,
    ...P.datetime,
    order: 11,
  },
  {
    id: 'actions',
    label: txt('common.actions'),
    visible: true,
    minWidth: 96,
    maxWidth: 120,
    order: 12,
  },
];

const initialFilters: QuySoThuChiFilters = {
  columnSearch: {},
  loai: [],
  khoan_ids: [],
  tai_khoan_ids: [],
  dateRange: STATS_INITIAL_DATE_RANGE,
};

export const useQuySoThuChiStore = createGenericStore<QuySoThuChiFilters>(
  initialFilters,
  DEFAULT_COLUMNS,
);
