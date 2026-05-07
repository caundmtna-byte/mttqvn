import { createGenericStore, type ColumnConfig } from '@/store/createGenericStore';
import { TABLE_COLUMN_PRESETS } from '@/lib/table-column-presets';
import { txt } from '@/lib/text';
import type { ArticleKhacFilters } from '../core/types';

const P = TABLE_COLUMN_PRESETS;

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: 'thu_tu', label: txt('page.articleSettings.colThuTu'), visible: true, minWidth: 72, maxWidth: 88, order: 0 },
  { id: 'ten', label: txt('page.articleSettings.colTen'), visible: true, ...P.titleShort, order: 1 },
  { id: 'mo_ta', label: txt('page.articleSettings.colMoTa'), visible: true, minWidth: 140, maxWidth: 280, order: 2 },
  { id: 'tg_tao', label: txt('page.articleSettings.colTgTao'), visible: true, ...P.date, order: 3 },
  { id: 'tg_cap_nhat', label: txt('page.articleSettings.colTgCapNhat'), visible: true, ...P.datetime, order: 4 },
];

const initialFilters: ArticleKhacFilters = { columnSearch: {}, mo_ta_bucket: '' };

export const useKhacTrangStore = createGenericStore<ArticleKhacFilters>(initialFilters, DEFAULT_COLUMNS);
