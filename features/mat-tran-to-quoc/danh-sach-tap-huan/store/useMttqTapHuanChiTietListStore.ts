import { createGenericStore, type ColumnConfig } from '@/store/createGenericStore';
import { TABLE_COLUMN_PRESETS } from '@/lib/table-column-presets';
import { txt } from '@/lib/text';
import type { MttqTapHuanChiTietListFilters } from '../core/types';

const P = TABLE_COLUMN_PRESETS;

const DEFAULT_COLUMNS: ColumnConfig[] = [
  {
    id: 'ten_lop_tap_huan',
    label: txt('matTranTapHuan.store.tenLopCol'),
    visible: true,
    ...P.titleShort,
    minWidth: 200,
    maxWidth: 340,
    order: 0,
  },
  {
    id: 'nam_tap_huan',
    label: txt('matTranTapHuan.store.namCol'),
    visible: true,
    minWidth: 72,
    maxWidth: 88,
    order: 1,
  },
  {
    id: 'cap_tap_huan',
    label: txt('matTranTapHuan.store.capCol'),
    visible: true,
    minWidth: 100,
    maxWidth: 140,
    order: 2,
  },
  {
    id: 'ten_don_vi_lop',
    label: txt('matTranTapHuan.chiTietList.cols.donViLop'),
    visible: true,
    minWidth: 120,
    maxWidth: 200,
    order: 3,
  },
  {
    id: 'ten_can_bo',
    label: txt('matTranTapHuan.form.hoVaTen'),
    visible: true,
    minWidth: 140,
    maxWidth: 220,
    order: 4,
  },
  {
    id: 'ten_to_chuc',
    label: txt('matTranCanBo.store.toChucCol'),
    visible: true,
    minWidth: 120,
    maxWidth: 200,
    order: 5,
  },
  {
    id: 'ten_phong_ban',
    label: txt('matTranCanBo.store.phongBanCol'),
    visible: true,
    minWidth: 120,
    maxWidth: 200,
    order: 6,
  },
  {
    id: 'chuc_vu',
    label: txt('matTranTapHuan.form.chucVu'),
    visible: true,
    minWidth: 100,
    maxWidth: 160,
    order: 7,
  },
  {
    id: 'ten_don_vi_can_bo',
    label: txt('matTranTapHuan.form.donViCongTac'),
    visible: true,
    minWidth: 120,
    maxWidth: 200,
    order: 8,
  },
  {
    id: 'thuoc_dien',
    label: txt('matTranTapHuan.form.thuocDien'),
    visible: true,
    minWidth: 120,
    maxWidth: 160,
    order: 9,
  },
  {
    id: 'tg_cap_nhat_lop',
    label: txt('matTranTapHuan.chiTietList.cols.tgCapNhatLop'),
    visible: false,
    ...P.datetime,
    order: 10,
  },
];

const initialFilters: MttqTapHuanChiTietListFilters = {
  columnSearch: {},
  cap_tap_huan: [],
  nam_tap_huan: [],
};

export const useMttqTapHuanChiTietListStore = createGenericStore<MttqTapHuanChiTietListFilters>(
  initialFilters,
  DEFAULT_COLUMNS,
);
