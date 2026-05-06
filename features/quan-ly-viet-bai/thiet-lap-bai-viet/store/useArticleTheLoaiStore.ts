import { createGenericStore, type ColumnConfig } from '@/store/createGenericStore';
import { TABLE_COLUMN_PRESETS } from '@/lib/table-column-presets';
import { txt } from '@/lib/text';
import type { ArticleTheLoaiFilters } from '../core/types';

const P = TABLE_COLUMN_PRESETS;

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: 'ten_the_loai', label: txt('page.articleSettings.colTenTheLoai'), visible: true, ...P.titleShort, order: 0 },
  { id: 'mo_ta', label: txt('page.articleSettings.colMoTa'), visible: true, minWidth: 160, maxWidth: 360, order: 1 },
  {
    id: 'don_gia',
    label: txt('page.articleSettings.colDonGia'),
    visible: true,
    minWidth: 112,
    maxWidth: 140,
    order: 2,
  },
  { id: 'tg_tao', label: txt('page.articleSettings.colTgTao'), visible: true, ...P.date, order: 3 },
  { id: 'tg_cap_nhat', label: txt('page.articleSettings.colTgCapNhat'), visible: true, ...P.datetime, order: 4 },
];

const initialFilters: ArticleTheLoaiFilters = {
  columnSearch: {},
};

export const useArticleTheLoaiStore = createGenericStore<ArticleTheLoaiFilters>(initialFilters, DEFAULT_COLUMNS);
