import { createGenericStore, type ColumnConfig } from '@/store/createGenericStore';
import { TABLE_COLUMN_PRESETS } from '@/lib/table-column-presets';
import { txt } from '@/lib/text';
import type { MttqNhiemKyFilters } from '../core/types';

const P = TABLE_COLUMN_PRESETS;

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: 'ten_nhiem_ky', label: txt('matTranNhiemKy.store.tenCol'), visible: true, ...P.titleShort, order: 0 },
  {
    id: 'tu_nam',
    label: txt('matTranNhiemKy.store.tuNamCol'),
    visible: true,
    minWidth: 80,
    maxWidth: 96,
    order: 1,
  },
  {
    id: 'den_nam',
    label: txt('matTranNhiemKy.store.denNamCol'),
    visible: true,
    minWidth: 80,
    maxWidth: 96,
    order: 2,
  },
  {
    id: 'sl_dang_tham_gia',
    label: txt('matTranNhiemKy.store.slDangThamGiaCol'),
    visible: true,
    minWidth: 88,
    maxWidth: 120,
    order: 3,
  },
  {
    id: 'sl_dau_nhiem_ky',
    label: txt('matTranNhiemKy.store.slDauNhiemKyCol'),
    visible: false,
    minWidth: 88,
    maxWidth: 120,
    order: 4,
  },
  {
    id: 'sl_thoi_tham_gia',
    label: txt('matTranNhiemKy.store.slThoiThamGiaCol'),
    visible: false,
    minWidth: 88,
    maxWidth: 120,
    order: 5,
  },
  {
    id: 'sl_can_bo_sung',
    label: txt('matTranNhiemKy.store.slCanBoSungCol'),
    visible: false,
    minWidth: 88,
    maxWidth: 120,
    order: 6,
  },
  {
    id: 'sl_thieu',
    label: txt('matTranNhiemKy.store.slThieuCol'),
    visible: false,
    minWidth: 72,
    maxWidth: 96,
    order: 7,
  },
  {
    id: 'ho_va_ten_nguoi_tao',
    label: txt('matTranNhiemKy.store.nguoiTaoCol'),
    visible: true,
    minWidth: 120,
    maxWidth: 180,
    order: 8,
  },
  { id: 'tg_cap_nhat', label: txt('matTranNhiemKy.store.tgCapNhatCol'), visible: false, ...P.datetime, order: 9 },
];

const initialFilters: MttqNhiemKyFilters = {
  columnSearch: {},
  tu_nam_filter: [],
  den_nam_filter: [],
};

export const useMttqNhiemKyStore = createGenericStore<MttqNhiemKyFilters>(initialFilters, DEFAULT_COLUMNS);
