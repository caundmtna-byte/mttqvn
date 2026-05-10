import { createGenericStore, type ColumnConfig } from '@/store/createGenericStore';
import { TABLE_COLUMN_PRESETS } from '@/lib/table-column-presets';
import { txt } from '@/lib/text';
import type { ChuongTrinhNamFilters } from '../core/types';

const P = TABLE_COLUMN_PRESETS;

const DEFAULT_COLUMNS: ColumnConfig[] = [
  {
    id: 'ten_chuong_trinh',
    label: txt('chuongTrinhNam.store.tenCol'),
    visible: true,
    ...P.titleShort,
    minWidth: 200,
    maxWidth: 360,
    order: 0,
  },
  {
    id: 'ngay_bat_dau',
    label: txt('chuongTrinhNam.store.ngayBatDauCol'),
    visible: true,
    minWidth: 110,
    maxWidth: 120,
    order: 1,
  },
  {
    id: 'ngay_ket_thuc',
    label: txt('chuongTrinhNam.store.ngayKetThucCol'),
    visible: true,
    minWidth: 110,
    maxWidth: 120,
    order: 2,
  },
  {
    id: 'tien_do',
    label: txt('chuongTrinhNam.store.tienDoCol'),
    visible: true,
    minWidth: 130,
    maxWidth: 200,
    order: 3,
  },
  {
    id: 'trang_thai',
    label: txt('chuongTrinhNam.store.trangThaiCol'),
    visible: true,
    minWidth: 110,
    maxWidth: 140,
    order: 4,
  },
  {
    id: 'ten_phong_ban',
    label: txt('chuongTrinhNam.store.phongBanCol'),
    visible: true,
    minWidth: 140,
    maxWidth: 220,
    order: 5,
  },
  {
    id: 'ho_va_ten_nguoi_tao',
    label: txt('chuongTrinhNam.store.nguoiTaoCol'),
    visible: true,
    minWidth: 120,
    maxWidth: 180,
    order: 6,
  },
  {
    id: 'tg_cap_nhat',
    label: txt('chuongTrinhNam.store.tgCapNhatCol'),
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

const initialFilters: ChuongTrinhNamFilters = {
  columnSearch: {},
  trang_thai: [],
  id_phong_ban: [],
  nam_bat_dau: [],
  tien_do: [],
};

export const useChuongTrinhNamStore = createGenericStore<ChuongTrinhNamFilters>(
  initialFilters,
  DEFAULT_COLUMNS,
);
