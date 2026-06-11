import { createGenericStore, type ColumnConfig } from '@/store/createGenericStore';
import { TABLE_COLUMN_PRESETS } from '@/lib/table-column-presets';
import { txt } from '@/lib/text';
import type { DipThamHoiFilters } from '../core/types';

const P = TABLE_COLUMN_PRESETS;

const DEFAULT_COLUMNS: ColumnConfig[] = [
  {
    id: 'ten_dip',
    label: txt('danTocDipThamHoi.store.tenDipCol'),
    visible: true,
    ...P.titleShort,
    minWidth: 160,
    maxWidth: 260,
    order: 0,
  },
  {
    id: 'thoi_gian_du_kien',
    label: txt('danTocDipThamHoi.store.thoiGianDuKienCol'),
    visible: true,
    minWidth: 110,
    maxWidth: 150,
    order: 1,
  },
  {
    id: 'thoi_gian_thuc_te',
    label: txt('danTocDipThamHoi.store.thoiGianThucTeCol'),
    visible: true,
    minWidth: 110,
    maxWidth: 130,
    order: 2,
  },
  {
    id: 'so_luong_du_kien_tong',
    label: txt('danTocDipThamHoi.store.soDuKienTongCol'),
    visible: true,
    minWidth: 90,
    maxWidth: 120,
    order: 3,
  },
  {
    id: 'so_luong_to_chuc_du_kien',
    label: txt('danTocDipThamHoi.store.soDuKienToChucCol'),
    visible: false,
    minWidth: 90,
    maxWidth: 120,
    order: 4,
  },
  {
    id: 'so_luong_ca_nhan_du_kien',
    label: txt('danTocDipThamHoi.store.soDuKienCaNhanCol'),
    visible: false,
    minWidth: 90,
    maxWidth: 120,
    order: 5,
  },
  {
    id: 'so_luong_thuc_te_tong',
    label: txt('danTocDipThamHoi.store.soThucTeTongCol'),
    visible: true,
    minWidth: 90,
    maxWidth: 130,
    order: 6,
  },
  {
    id: 'don_vi_to_chuc',
    label: txt('danTocDipThamHoi.store.donViCol'),
    visible: true,
    minWidth: 120,
    maxWidth: 200,
    order: 7,
  },
  {
    id: 'phong_ban_tham_muu',
    label: txt('danTocDipThamHoi.store.phongBanCol'),
    visible: true,
    minWidth: 120,
    maxWidth: 200,
    order: 8,
  },
  {
    id: 'trang_thai',
    label: txt('danTocDipThamHoi.store.trangThaiCol'),
    visible: true,
    minWidth: 130,
    maxWidth: 170,
    order: 9,
  },
  {
    id: 'tg_cap_nhat',
    label: txt('danTocDipThamHoi.store.tgCapNhatCol'),
    visible: false,
    ...P.datetime,
    order: 10,
  },
  {
    id: 'actions',
    label: txt('common.actions'),
    visible: true,
    minWidth: 96,
    maxWidth: 120,
    order: 11,
  },
];

const initialFilters: DipThamHoiFilters = {
  columnSearch: {},
  trang_thai_filter: [],
};

export const useDipThamHoiStore = createGenericStore<DipThamHoiFilters>(initialFilters, DEFAULT_COLUMNS);
