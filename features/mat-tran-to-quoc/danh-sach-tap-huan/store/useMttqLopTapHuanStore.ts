import { createGenericStore, type ColumnConfig } from '@/store/createGenericStore';
import { TABLE_COLUMN_PRESETS } from '@/lib/table-column-presets';
import { txt } from '@/lib/text';
import type { MttqLopTapHuanFilters } from '../core/types';

const P = TABLE_COLUMN_PRESETS;

const DEFAULT_COLUMNS: ColumnConfig[] = [
  {
    id: 'ten_lop_tap_huan',
    label: txt('matTranTapHuan.store.tenLopCol'),
    visible: true,
    ...P.titleShort,
    minWidth: 220,
    maxWidth: 360,
    order: 0,
  },
  {
    id: 'nam_tap_huan',
    label: txt('matTranTapHuan.store.namCol'),
    visible: true,
    minWidth: 80,
    maxWidth: 96,
    order: 1,
  },
  {
    id: 'cap_tap_huan',
    label: txt('matTranTapHuan.store.capCol'),
    visible: true,
    minWidth: 110,
    maxWidth: 150,
    order: 2,
  },
  {
    id: 'ten_to_chuc',
    label: txt('matTranTapHuan.store.toChucCol'),
    visible: true,
    minWidth: 140,
    maxWidth: 220,
    order: 3,
  },
  {
    id: 'ten_don_vi',
    label: txt('matTranTapHuan.store.donViCol'),
    visible: true,
    minWidth: 140,
    maxWidth: 220,
    order: 4,
  },
  {
    id: 'so_dong',
    label: txt('matTranTapHuan.store.soDongCol'),
    visible: true,
    minWidth: 72,
    maxWidth: 96,
    order: 5,
  },
  {
    id: 'ho_va_ten_nguoi_tao',
    label: txt('matTranTapHuan.store.nguoiTaoCol'),
    visible: true,
    minWidth: 120,
    maxWidth: 180,
    order: 6,
  },
  {
    id: 'tg_cap_nhat',
    label: txt('matTranTapHuan.store.tgCapNhatCol'),
    visible: false,
    ...P.datetime,
    order: 7,
  },
];

const initialFilters: MttqLopTapHuanFilters = {
  columnSearch: {},
  cap_tap_huan: [],
  nam_tap_huan: [],
  to_chuc_id: [],
  don_vi_id: [],
};

/** Gộp filter mặc định — tránh crash khi HMR/rehydrate thiếu key mới. */
export function normalizeMttqLopTapHuanFilters(
  partial?: Partial<MttqLopTapHuanFilters>,
): MttqLopTapHuanFilters {
  const f = partial ?? {};
  return {
    columnSearch: f.columnSearch ?? {},
    cap_tap_huan: f.cap_tap_huan ?? [],
    nam_tap_huan: f.nam_tap_huan ?? [],
    to_chuc_id: f.to_chuc_id ?? [],
    don_vi_id: f.don_vi_id ?? [],
  };
}

export const useMttqLopTapHuanStore = createGenericStore<MttqLopTapHuanFilters>(
  initialFilters,
  DEFAULT_COLUMNS,
);

// Một lần khi load module: bổ sung key filter mới nếu state cũ (HMR) chưa có.
useMttqLopTapHuanStore.setState((state) => ({
  filters: normalizeMttqLopTapHuanFilters(state.filters),
}));
