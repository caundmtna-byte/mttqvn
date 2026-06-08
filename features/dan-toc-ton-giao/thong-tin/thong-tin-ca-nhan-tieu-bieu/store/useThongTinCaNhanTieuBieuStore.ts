import { createGenericStore, type ColumnConfig } from '@/store/createGenericStore';
import { TABLE_COLUMN_PRESETS } from '@/lib/table-column-presets';
import { txt } from '@/lib/text';
import type { ThongTinCaNhanTieuBieuFilters } from '../core/types';

const P = TABLE_COLUMN_PRESETS;

const DEFAULT_COLUMNS: ColumnConfig[] = [
  {
    id: 'ho_va_ten',
    label: txt('danTocCaNhanTieuBieu.store.hoVaTenCol'),
    visible: true,
    ...P.titleShort,
    minWidth: 160,
    maxWidth: 280,
    order: 0,
  },
  {
    id: 'doi_tuong',
    label: txt('danTocCaNhanTieuBieu.store.doiTuongCol'),
    visible: true,
    minWidth: 120,
    maxWidth: 160,
    order: 1,
  },
  {
    id: 'chuc_vu_vi_tri',
    label: txt('danTocCaNhanTieuBieu.store.chucVuViTriCol'),
    visible: true,
    minWidth: 120,
    maxWidth: 200,
    order: 2,
  },
  {
    id: 'ton_giao_dan_toc',
    label: txt('danTocCaNhanTieuBieu.store.tonGiaoDanTocCol'),
    visible: true,
    minWidth: 120,
    maxWidth: 180,
    order: 3,
  },
  {
    id: 'ten_don_vi',
    label: txt('danTocCaNhanTieuBieu.store.donViCol'),
    visible: true,
    minWidth: 120,
    maxWidth: 200,
    order: 4,
  },
  {
    id: 'so_dien_thoai',
    label: txt('danTocCaNhanTieuBieu.store.soDienThoaiCol'),
    visible: true,
    minWidth: 110,
    maxWidth: 150,
    order: 5,
  },
  {
    id: 'trang_thai',
    label: txt('danTocCaNhanTieuBieu.store.trangThaiCol'),
    visible: true,
    minWidth: 120,
    maxWidth: 160,
    order: 6,
  },
  {
    id: 'tg_cap_nhat',
    label: txt('danTocCaNhanTieuBieu.store.tgCapNhatCol'),
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

const initialFilters: ThongTinCaNhanTieuBieuFilters = {
  columnSearch: {},
  doi_tuong_filter: [],
  trang_thai_filter: [],
  don_vi_filter: [],
};

export const useThongTinCaNhanTieuBieuStore = createGenericStore<ThongTinCaNhanTieuBieuFilters>(
  initialFilters,
  DEFAULT_COLUMNS,
);
