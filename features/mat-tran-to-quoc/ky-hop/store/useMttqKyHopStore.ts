import { createGenericStore, type ColumnConfig } from '@/store/createGenericStore';
import { TABLE_COLUMN_PRESETS } from '@/lib/table-column-presets';
import { txt } from '@/lib/text';
import type { MttqKyHopFilters } from '../core/types';

const P = TABLE_COLUMN_PRESETS;

const DEFAULT_COLUMNS: ColumnConfig[] = [
  {
    id: 'ten_nhiem_ky',
    label: txt('matTranKyHop.store.tenNhiemKyCol'),
    visible: true,
    ...P.titleShort,
    order: 0,
  },
  {
    id: 'ky_thu',
    label: txt('matTranKyHop.store.kyThuCol'),
    visible: true,
    minWidth: 100,
    maxWidth: 140,
    order: 1,
  },
  {
    id: 'ngay_hop',
    label: txt('matTranKyHop.store.ngayHopCol'),
    visible: true,
    minWidth: 112,
    maxWidth: 128,
    order: 2,
  },
  {
    id: 'ten_don_vi',
    label: txt('matTranKyHop.store.donViCol'),
    visible: true,
    minWidth: 120,
    maxWidth: 200,
    order: 3,
  },
  {
    id: 'noi_dung_ky_hop',
    label: txt('matTranKyHop.store.noiDungCol'),
    visible: true,
    minWidth: 160,
    maxWidth: 280,
    order: 4,
  },
  {
    id: 'tai_lieu_hop',
    label: txt('matTranKyHop.form.taiLieuHop'),
    visible: false,
    minWidth: 140,
    maxWidth: 220,
    order: 5,
  },
  {
    id: 'ho_va_ten_nguoi_tao',
    label: txt('matTranKyHop.store.nguoiTaoCol'),
    visible: true,
    minWidth: 120,
    maxWidth: 180,
    order: 6,
  },
  { id: 'tg_cap_nhat', label: txt('matTranKyHop.store.tgCapNhatCol'), visible: false, ...P.datetime, order: 7 },
];

const initialFilters: MttqKyHopFilters = {
  columnSearch: {},
  nhiem_ky_filter: [],
  don_vi_filter: [],
  nam_filter: [],
};

export const useMttqKyHopStore = createGenericStore<MttqKyHopFilters>(initialFilters, DEFAULT_COLUMNS);
