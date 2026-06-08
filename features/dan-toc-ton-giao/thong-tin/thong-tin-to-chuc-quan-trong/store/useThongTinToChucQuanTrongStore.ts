import { createGenericStore, type ColumnConfig } from '@/store/createGenericStore';
import { TABLE_COLUMN_PRESETS } from '@/lib/table-column-presets';
import { txt } from '@/lib/text';
import type { ThongTinToChucQuanTrongFilters } from '../core/types';

const P = TABLE_COLUMN_PRESETS;

const DEFAULT_COLUMNS: ColumnConfig[] = [
  {
    id: 'loai_hinh',
    label: txt('danTocToChucQuanTrong.store.loaiHinhCol'),
    visible: true,
    minWidth: 100,
    maxWidth: 140,
    order: 0,
  },
  {
    id: 'ten_co_so',
    label: txt('danTocToChucQuanTrong.store.tenCoSoCol'),
    visible: true,
    ...P.titleShort,
    minWidth: 160,
    maxWidth: 280,
    order: 1,
  },
  {
    id: 'chu_tri',
    label: txt('danTocToChucQuanTrong.store.chuTriCol'),
    visible: true,
    minWidth: 120,
    maxWidth: 200,
    order: 2,
  },
  {
    id: 'ten_don_vi',
    label: txt('danTocToChucQuanTrong.store.donViCol'),
    visible: true,
    minWidth: 120,
    maxWidth: 200,
    order: 3,
  },
  {
    id: 'so_dien_thoai',
    label: txt('danTocToChucQuanTrong.store.soDienThoaiCol'),
    visible: true,
    minWidth: 110,
    maxWidth: 150,
    order: 4,
  },
  {
    id: 'trang_thai',
    label: txt('danTocToChucQuanTrong.store.trangThaiCol'),
    visible: true,
    minWidth: 120,
    maxWidth: 160,
    order: 5,
  },
  {
    id: 'tg_cap_nhat',
    label: txt('danTocToChucQuanTrong.store.tgCapNhatCol'),
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

const initialFilters: ThongTinToChucQuanTrongFilters = {
  columnSearch: {},
  loai_hinh_filter: [],
  trang_thai_filter: [],
  don_vi_filter: [],
};

export const useThongTinToChucQuanTrongStore = createGenericStore<ThongTinToChucQuanTrongFilters>(
  initialFilters,
  DEFAULT_COLUMNS,
);
