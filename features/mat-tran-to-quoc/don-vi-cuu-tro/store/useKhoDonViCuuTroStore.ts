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
    id: 'dia_chi',
    label: txt('matTranDonViCuuTro.store.diaChiCol'),
    visible: true,
    minWidth: 140,
    maxWidth: 280,
    order: 3,
  },
  {
    id: 'dien_thoai',
    label: txt('matTranDonViCuuTro.store.dienThoaiCol'),
    visible: true,
    minWidth: 120,
    maxWidth: 160,
    order: 4,
  },
  {
    id: 'email',
    label: txt('matTranDonViCuuTro.store.emailCol'),
    visible: false,
    minWidth: 160,
    maxWidth: 240,
    order: 5,
  },
  {
    id: 'ghi_chu',
    label: txt('matTranDonViCuuTro.store.ghiChuCol'),
    visible: false,
    minWidth: 140,
    maxWidth: 320,
    order: 6,
  },
  {
    id: 'tg_tao',
    label: txt('matTranDonViCuuTro.store.tgTaoCol'),
    visible: false,
    ...P.datetime,
    order: 7,
  },
  {
    id: 'tg_cap_nhat',
    label: txt('matTranDonViCuuTro.store.tgCapNhatCol'),
    visible: true,
    ...P.datetime,
    order: 8,
  },
  {
    id: 'actions',
    label: txt('common.actions'),
    visible: true,
    minWidth: 96,
    maxWidth: 120,
    order: 9,
  },
];

const initialFilters: KhoDonViCuuTroFilters = {
  columnSearch: {},
  loai_filter: [],
};

export const useKhoDonViCuuTroStore = createGenericStore<KhoDonViCuuTroFilters>(initialFilters, DEFAULT_COLUMNS);
