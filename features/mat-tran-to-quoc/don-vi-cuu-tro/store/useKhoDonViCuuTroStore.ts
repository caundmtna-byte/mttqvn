import { createGenericStore, type ColumnConfig } from '@/store/createGenericStore';
import { TABLE_COLUMN_PRESETS } from '@/lib/table-column-presets';
import { txt } from '@/lib/text';
import type { KhoDonViCuuTroFilters } from '../core/types';

const P = TABLE_COLUMN_PRESETS;

const DEFAULT_COLUMNS: ColumnConfig[] = [
  {
    id: 'tt',
    label: txt('matTranDonViCuuTro.store.ttCol'),
    visible: true,
    minWidth: 56,
    maxWidth: 88,
    order: 0,
  },
  {
    id: 'loai',
    label: txt('matTranDonViCuuTro.store.loaiCol'),
    visible: true,
    minWidth: 100,
    maxWidth: 140,
    order: 1,
  },
  {
    id: 'ten',
    label: txt('matTranDonViCuuTro.store.tenCol'),
    visible: true,
    ...P.titleShort,
    minWidth: 160,
    maxWidth: 280,
    order: 2,
  },
  {
    id: 'so_nguoi',
    label: txt('matTranDonViCuuTro.store.soNguoiCol'),
    visible: false,
    minWidth: 80,
    maxWidth: 110,
    order: 3,
  },
  {
    id: 'nguoi_dai_dien',
    label: txt('matTranDonViCuuTro.store.nguoiDaiDienCol'),
    visible: true,
    minWidth: 140,
    maxWidth: 220,
    order: 4,
  },
  {
    id: 'chuc_vu',
    label: txt('matTranDonViCuuTro.store.chucVuCol'),
    visible: false,
    minWidth: 120,
    maxWidth: 180,
    order: 5,
  },
  {
    id: 'dien_thoai',
    label: txt('matTranDonViCuuTro.store.dienThoaiCol'),
    visible: true,
    minWidth: 120,
    maxWidth: 160,
    order: 6,
  },
  {
    id: 'dia_chi',
    label: txt('matTranDonViCuuTro.store.diaChiCol'),
    visible: true,
    minWidth: 140,
    maxWidth: 280,
    order: 7,
  },
  {
    id: 'don_vi_gioi_thieu',
    label: txt('matTranDonViCuuTro.store.donViGioiThieuCol'),
    visible: true,
    minWidth: 150,
    maxWidth: 240,
    order: 8,
  },
  {
    id: 'email',
    label: txt('matTranDonViCuuTro.store.emailCol'),
    visible: false,
    minWidth: 160,
    maxWidth: 240,
    order: 9,
  },
  {
    id: 'ghi_chu',
    label: txt('matTranDonViCuuTro.store.ghiChuCol'),
    visible: false,
    minWidth: 140,
    maxWidth: 320,
    order: 10,
  },
  {
    id: 'tg_tao',
    label: txt('matTranDonViCuuTro.store.tgTaoCol'),
    visible: false,
    ...P.datetime,
    order: 11,
  },
  {
    id: 'tg_cap_nhat',
    label: txt('matTranDonViCuuTro.store.tgCapNhatCol'),
    visible: true,
    ...P.datetime,
    order: 12,
  },
  {
    id: 'actions',
    label: txt('common.actions'),
    visible: true,
    minWidth: 96,
    maxWidth: 120,
    order: 13,
  },
];

const initialFilters: KhoDonViCuuTroFilters = {
  columnSearch: {},
  loai_filter: [],
  don_vi_gioi_thieu_filter: [],
};

export const useKhoDonViCuuTroStore = createGenericStore<KhoDonViCuuTroFilters>(initialFilters, DEFAULT_COLUMNS);
