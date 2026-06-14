import { createGenericStore, type ColumnConfig } from '@/store/createGenericStore';
import { TABLE_COLUMN_PRESETS } from '@/lib/table-column-presets';
import { txt } from '@/lib/text';
import type { ThamHoiToChucFilters } from '../core/types';

const P = TABLE_COLUMN_PRESETS;

const DEFAULT_COLUMNS: ColumnConfig[] = [
  {
    id: 'ten_co_so',
    label: txt('danTocThamHoiToChuc.store.tenCoSoCol'),
    visible: true,
    ...P.titleShort,
    minWidth: 160,
    maxWidth: 260,
    order: 0,
  },
  {
    id: 'dip_tham_hoi',
    label: txt('danTocThamHoiToChuc.store.dipThamHoiCol'),
    visible: true,
    minWidth: 140,
    maxWidth: 220,
    order: 1,
  },
  {
    id: 'thoi_gian_du_kien',
    label: txt('danTocThamHoiToChuc.store.thoiGianDuKienCol'),
    visible: true,
    minWidth: 110,
    maxWidth: 150,
    order: 2,
  },
  {
    id: 'don_vi_tham_hoi',
    label: txt('danTocThamHoiToChuc.store.donViThamHoiCol'),
    visible: true,
    minWidth: 120,
    maxWidth: 200,
    order: 3,
  },
  {
    id: 'tien_do',
    label: txt('danTocThamHoiToChuc.store.tienDoCol'),
    visible: true,
    minWidth: 130,
    maxWidth: 170,
    order: 4,
  },
  {
    id: 'ket_qua_thuc_hien',
    label: txt('danTocThamHoiToChuc.store.ketQuaCol'),
    visible: false,
    minWidth: 140,
    maxWidth: 220,
    order: 5,
  },
  {
    id: 'tg_cap_nhat',
    label: txt('danTocThamHoiToChuc.store.tgCapNhatCol'),
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

const initialFilters: ThamHoiToChucFilters = {
  columnSearch: {},
  tien_do_filter: [],
  to_chuc_filter: [],
  dip_tham_hoi_filter: [],
  don_vi_tham_hoi_filter: [],
  phong_ban_filter: [],
};

export const useThamHoiToChucStore = createGenericStore<ThamHoiToChucFilters>(initialFilters, DEFAULT_COLUMNS);
