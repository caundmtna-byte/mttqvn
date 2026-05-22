import { createGenericStore, type ColumnConfig } from '@/store/createGenericStore';
import { TABLE_COLUMN_PRESETS } from '@/lib/table-column-presets';
import { txt } from '@/lib/text';
import type { LuongThietLapNgachFilters } from '../core/types';

const P = TABLE_COLUMN_PRESETS;

const DEFAULT_COLUMNS: ColumnConfig[] = [
  {
    id: 'thu_tu',
    label: txt('matTranThietLapLuong.store.thuTuCol'),
    visible: true,
    minWidth: 72,
    maxWidth: 96,
    order: 0,
  },
  {
    id: 'ma',
    label: txt('matTranThietLapLuong.store.maCol'),
    visible: true,
    minWidth: 88,
    maxWidth: 140,
    order: 1,
  },
  {
    id: 'ten',
    label: txt('matTranThietLapLuong.store.tenCol'),
    visible: true,
    ...P.titleShort,
    minWidth: 160,
    maxWidth: 320,
    order: 2,
  },
  {
    id: 'mo_ta',
    label: txt('matTranThietLapLuong.store.moTaCol'),
    visible: false,
    minWidth: 140,
    maxWidth: 360,
    order: 3,
  },
  {
    id: 'tg_tao',
    label: txt('matTranThietLapLuong.store.tgTaoCol'),
    visible: false,
    ...P.datetime,
    order: 4,
  },
  {
    id: 'tg_cap_nhat',
    label: txt('matTranThietLapLuong.store.tgCapNhatCol'),
    visible: true,
    ...P.datetime,
    order: 5,
  },
  {
    id: 'actions',
    label: txt('common.actions'),
    visible: true,
    minWidth: 96,
    maxWidth: 120,
    order: 6,
  },
];

const initialFilters: LuongThietLapNgachFilters = {
  columnSearch: {},
};

export const useLuongThietLapNgachStore = createGenericStore<LuongThietLapNgachFilters>(initialFilters, DEFAULT_COLUMNS);
