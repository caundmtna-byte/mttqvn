import { createGenericStore, type ColumnConfig } from '@/store/createGenericStore';
import { TABLE_COLUMN_PRESETS } from '@/lib/table-column-presets';
import { txt } from '@/lib/text';
import type { KhoDotCuuTroFilters } from '../core/types';

const P = TABLE_COLUMN_PRESETS;

const DEFAULT_COLUMNS: ColumnConfig[] = [
  {
    id: 'tt',
    label: txt('matTranDotCuuTro.store.ttCol'),
    visible: true,
    minWidth: 56,
    maxWidth: 88,
    order: 0,
  },
  {
    id: 'ten',
    label: txt('matTranDotCuuTro.store.tenCol'),
    visible: true,
    ...P.titleShort,
    minWidth: 160,
    maxWidth: 280,
    order: 1,
  },
  {
    id: 'link',
    label: txt('matTranDotCuuTro.store.linkCol'),
    visible: true,
    minWidth: 120,
    maxWidth: 320,
    order: 2,
  },
  {
    id: 'tg_tao',
    label: txt('matTranDotCuuTro.store.tgTaoCol'),
    visible: false,
    ...P.datetime,
    order: 3,
  },
  {
    id: 'tg_cap_nhat',
    label: txt('matTranDotCuuTro.store.tgCapNhatCol'),
    visible: true,
    ...P.datetime,
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

const initialFilters: KhoDotCuuTroFilters = {
  columnSearch: {},
};

export const useKhoDotCuuTroStore = createGenericStore<KhoDotCuuTroFilters>(initialFilters, DEFAULT_COLUMNS);
