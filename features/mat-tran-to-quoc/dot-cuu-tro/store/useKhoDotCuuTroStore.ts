import { createGenericStore, type ColumnConfig } from '@/store/createGenericStore';
import { TABLE_COLUMN_PRESETS } from '@/lib/table-column-presets';
import { txt } from '@/lib/text';
import type { KhoDotCuuTroFilters } from '../core/types';

const P = TABLE_COLUMN_PRESETS;

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: 'tt', label: txt('matTranDotCuuTro.store.ttCol'), visible: true, minWidth: 56, maxWidth: 88, order: 0 },
  {
    id: 'ten',
    label: txt('matTranDotCuuTro.store.tenCol'),
    visible: true,
    ...P.titleShort,
    minWidth: 180,
    maxWidth: 320,
    order: 1,
  },
  { id: 'loai', label: txt('matTranDotCuuTro.store.loaiCol'), visible: true, minWidth: 120, maxWidth: 180, order: 2 },
  {
    id: 'don_vi_chu_tri_label',
    label: txt('matTranDotCuuTro.store.donViChuTriCol'),
    visible: true,
    minWidth: 140,
    maxWidth: 220,
    order: 3,
  },
  { id: 'thoi_gian', label: txt('matTranDotCuuTro.store.thoiGianCol'), visible: true, minWidth: 150, maxWidth: 210, order: 4 },
  {
    id: 'tai_khoan_tiep_nhan',
    label: txt('matTranDotCuuTro.store.taiKhoanCol'),
    visible: true,
    minWidth: 130,
    maxWidth: 200,
    order: 5,
  },
  { id: 'ngan_hang', label: txt('matTranDotCuuTro.store.nganHangCol'), visible: true, minWidth: 120, maxWidth: 220, order: 6 },
  { id: 'trang_thai', label: txt('matTranDotCuuTro.store.trangThaiCol'), visible: true, minWidth: 120, maxWidth: 160, order: 7 },
  { id: 'tien_do', label: txt('matTranDotCuuTro.store.tienDoCol'), visible: false, minWidth: 140, maxWidth: 320, order: 8 },
  { id: 'link', label: txt('matTranDotCuuTro.store.linkCol'), visible: true, minWidth: 120, maxWidth: 260, order: 9 },
  { id: 'tg_tao', label: txt('matTranDotCuuTro.store.tgTaoCol'), visible: false, ...P.datetime, order: 10 },
  { id: 'tg_cap_nhat', label: txt('matTranDotCuuTro.store.tgCapNhatCol'), visible: false, ...P.datetime, order: 11 },
  { id: 'actions', label: txt('common.actions'), visible: true, minWidth: 96, maxWidth: 120, order: 12 },
];

const initialFilters: KhoDotCuuTroFilters = {
  columnSearch: {},
  loai: '',
  trang_thai: '',
};

export const useKhoDotCuuTroStore = createGenericStore<KhoDotCuuTroFilters>(initialFilters, DEFAULT_COLUMNS);
