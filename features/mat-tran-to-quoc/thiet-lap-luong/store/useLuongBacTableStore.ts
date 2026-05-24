import { createGenericStore, type ColumnConfig } from '@/store/createGenericStore';
import { txt } from '@/lib/text';

const DEFAULT_COLUMNS: ColumnConfig[] = [
  {
    id: 'ngach',
    label: txt('matTranThietLapLuong.bac.colNgach'),
    visible: true,
    minWidth: 140,
    maxWidth: 260,
    order: 0,
  },
  {
    id: 'ma_bac',
    label: txt('matTranThietLapLuong.bac.colBac'),
    visible: true,
    minWidth: 72,
    maxWidth: 100,
    order: 1,
  },
  {
    id: 'thu_tu',
    label: txt('matTranThietLapLuong.store.thuTuCol'),
    visible: true,
    minWidth: 72,
    maxWidth: 96,
    order: 2,
  },
  {
    id: 'he_so',
    label: txt('matTranThietLapLuong.bac.colHeSo'),
    visible: true,
    minWidth: 120,
    maxWidth: 180,
    order: 3,
  },
  {
    id: 'luong',
    label: txt('matTranThietLapLuong.bac.colLuong'),
    visible: true,
    minWidth: 140,
    maxWidth: 220,
    order: 4,
  },
  {
    id: 'actions',
    label: txt('common.actions'),
    visible: true,
    minWidth: 96,
    maxWidth: 120,
    order: 5,
  },
];

export interface LuongBacTableFilters {
  columnSearch: Record<string, string>;
}

const initialFilters: LuongBacTableFilters = {
  columnSearch: {},
};

export const useLuongBacTableStore = createGenericStore<LuongBacTableFilters>(initialFilters, DEFAULT_COLUMNS);
