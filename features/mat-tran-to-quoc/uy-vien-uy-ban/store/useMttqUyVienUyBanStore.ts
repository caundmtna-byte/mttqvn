import { createGenericStore, type ColumnConfig } from '@/store/createGenericStore';
import { TABLE_COLUMN_PRESETS } from '@/lib/table-column-presets';
import { txt } from '@/lib/text';
import type { MttqUyVienUyBanFilters } from '../core/types';

const P = TABLE_COLUMN_PRESETS;

const DEFAULT_COLUMNS: ColumnConfig[] = [
  {
    id: 'ho_va_ten',
    label: txt('matTranUyVienUyBan.store.hoVaTenCol'),
    visible: true,
    ...P.titleShort,
    order: 0,
  },
  {
    id: 'ten_nhiem_ky',
    label: txt('matTranUyVienUyBan.store.tenNhiemKyCol'),
    visible: true,
    minWidth: 140,
    maxWidth: 220,
    order: 1,
  },
  {
    id: 'ma_uv',
    label: txt('matTranUyVienUyBan.store.maUvCol'),
    visible: true,
    minWidth: 72,
    maxWidth: 100,
    order: 2,
  },
  {
    id: 'ngay_sinh',
    label: txt('matTranUyVienUyBan.form.ngaySinh'),
    visible: true,
    minWidth: 96,
    maxWidth: 112,
    order: 3,
  },
  {
    id: 'ten_don_vi',
    label: txt('matTranUyVienUyBan.store.donViCol'),
    visible: true,
    minWidth: 120,
    maxWidth: 200,
    order: 4,
  },
  {
    id: 'chuc_vu_don_vi',
    label: txt('matTranUyVienUyBan.store.chucVuDonViCol'),
    visible: true,
    minWidth: 140,
    maxWidth: 240,
    order: 5,
  },
  {
    id: 'trang_thai_tham_gia',
    label: txt('matTranUyVienUyBan.store.trangThamGiaCol'),
    visible: true,
    minWidth: 120,
    maxWidth: 160,
    order: 6,
  },
  {
    id: 'ho_va_ten_nguoi_tao',
    label: txt('matTranUyVienUyBan.store.nguoiTaoCol'),
    visible: false,
    minWidth: 120,
    maxWidth: 180,
    order: 7,
  },
  { id: 'tg_cap_nhat', label: txt('matTranUyVienUyBan.store.tgCapNhatCol'), visible: false, ...P.datetime, order: 8 },
];

const initialFilters: MttqUyVienUyBanFilters = {
  columnSearch: {},
  nhiem_ky_filter: [],
  don_vi_filter: [],
};

export const useMttqUyVienUyBanStore = createGenericStore<MttqUyVienUyBanFilters>(initialFilters, DEFAULT_COLUMNS);
