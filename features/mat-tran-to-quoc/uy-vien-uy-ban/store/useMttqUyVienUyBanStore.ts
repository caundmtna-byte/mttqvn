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
    minWidth: 180,
    maxWidth: 220,
    order: 6,
  },
  {
    id: 'so_ky_hop',
    label: txt('matTranUyVienUyBan.store.soKyHopCol'),
    visible: true,
    minWidth: 112,
    maxWidth: 132,
    order: 7,
  },
  {
    id: 'diem_danh_co_mat',
    label: txt('matTranUyVienUyBan.store.diemDanhCoMatCol'),
    visible: true,
    minWidth: 96,
    maxWidth: 116,
    order: 8,
  },
  {
    id: 'diem_danh_vang_mat',
    label: txt('matTranUyVienUyBan.store.diemDanhVangMatCol'),
    visible: true,
    minWidth: 108,
    maxWidth: 128,
    order: 9,
  },
  {
    id: 'diem_danh_chua',
    label: txt('matTranUyVienUyBan.store.diemDanhChuaCol'),
    visible: true,
    minWidth: 144,
    maxWidth: 168,
    order: 10,
  },
  {
    id: 'ho_va_ten_nguoi_tao',
    label: txt('matTranUyVienUyBan.store.nguoiTaoCol'),
    visible: false,
    minWidth: 120,
    maxWidth: 180,
    order: 11,
  },
  { id: 'tg_cap_nhat', label: txt('matTranUyVienUyBan.store.tgCapNhatCol'), visible: false, ...P.datetime, order: 12 },
];

const initialFilters: MttqUyVienUyBanFilters = {
  columnSearch: {},
  nhiem_ky_filter: [],
  don_vi_filter: [],
  trang_thai_tham_gia_filter: [],
};

export const useMttqUyVienUyBanStore = createGenericStore<MttqUyVienUyBanFilters>(initialFilters, DEFAULT_COLUMNS);
