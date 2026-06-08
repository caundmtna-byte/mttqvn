import { createGenericStore, type ColumnConfig } from '@/store/createGenericStore';
import { TABLE_COLUMN_PRESETS } from '@/lib/table-column-presets';
import { txt } from '@/lib/text';
import type { ThamHoiCaNhanFilters } from '../core/types';

const P = TABLE_COLUMN_PRESETS;

const DEFAULT_COLUMNS: ColumnConfig[] = [
  {
    id: 'ho_va_ten',
    label: txt('danTocThamHoiCaNhan.store.hoVaTenCol'),
    visible: true,
    ...P.titleShort,
    minWidth: 160,
    maxWidth: 240,
    order: 0,
  },
  {
    id: 'dip_tham_hoi',
    label: txt('danTocThamHoiCaNhan.store.dipThamHoiCol'),
    visible: true,
    minWidth: 140,
    maxWidth: 220,
    order: 1,
  },
  {
    id: 'thoi_gian_du_kien',
    label: txt('danTocThamHoiCaNhan.store.thoiGianDuKienCol'),
    visible: true,
    minWidth: 110,
    maxWidth: 150,
    order: 2,
  },
  {
    id: 'don_vi_tham_hoi',
    label: txt('danTocThamHoiCaNhan.store.donViThamHoiCol'),
    visible: true,
    minWidth: 120,
    maxWidth: 200,
    order: 3,
  },
  {
    id: 'ten_phong_ban',
    label: txt('danTocThamHoiCaNhan.store.phongBanThamMuuCol'),
    visible: true,
    minWidth: 140,
    maxWidth: 220,
    order: 4,
  },
  {
    id: 'trang_thai',
    label: txt('danTocThamHoiCaNhan.store.trangThaiCol'),
    visible: true,
    minWidth: 130,
    maxWidth: 170,
    order: 5,
  },
  {
    id: 'ket_qua_ghi_chu',
    label: txt('danTocThamHoiCaNhan.store.ketQuaCol'),
    visible: false,
    minWidth: 140,
    maxWidth: 220,
    order: 6,
  },
  {
    id: 'tg_cap_nhat',
    label: txt('danTocThamHoiCaNhan.store.tgCapNhatCol'),
    visible: false,
    ...P.datetime,
    order: 7,
  },
  {
    id: 'actions',
    label: txt('common.actions'),
    visible: true,
    minWidth: 96,
    maxWidth: 120,
    order: 8,
  },
];

const initialFilters: ThamHoiCaNhanFilters = {
  columnSearch: {},
  trang_thai_filter: [],
  ca_nhan_filter: [],
  phong_ban_filter: [],
  don_vi_tham_hoi_filter: [],
  xa_phuong_filter: [],
};

export const useThamHoiCaNhanStore = createGenericStore<ThamHoiCaNhanFilters>(initialFilters, DEFAULT_COLUMNS);
