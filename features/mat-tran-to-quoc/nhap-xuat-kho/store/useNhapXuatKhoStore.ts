import { createGenericStore, type ColumnConfig } from '@/store/createGenericStore';
import { TABLE_COLUMN_PRESETS } from '@/lib/table-column-presets';
import { txt } from '@/lib/text';
import type { NhapXuatKhoFilters } from '../core/types';

const P = TABLE_COLUMN_PRESETS;

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: 'tt', label: txt('matTranNhapXuatKho.store.ttCol'), visible: true, minWidth: 56, maxWidth: 88, order: 0 },
  {
    id: 'so_phieu',
    label: txt('matTranNhapXuatKho.store.soPhieuCol'),
    visible: true,
    ...P.code,
    minWidth: 132,
    maxWidth: 180,
    order: 1,
  },
  {
    id: 'loai_phieu',
    label: txt('matTranNhapXuatKho.store.loaiPhieuCol'),
    visible: true,
    ...P.enumBadgeMedium,
    order: 2,
  },
  {
    id: 'ngay_phieu',
    label: txt('matTranNhapXuatKho.store.ngayPhieuCol'),
    visible: true,
    ...P.date,
    order: 3,
  },
  {
    id: 'ten_kho_xuat',
    label: txt('matTranNhapXuatKho.store.khoXuatCol'),
    visible: true,
    ...P.titleShort,
    order: 4,
  },
  {
    id: 'ten_kho_nhap',
    label: txt('matTranNhapXuatKho.store.khoNhapCol'),
    visible: true,
    ...P.titleShort,
    order: 5,
  },
  {
    id: 'ten_don_vi_cuu_tro',
    label: txt('matTranNhapXuatKho.store.donViCuuTroCol'),
    visible: true,
    ...P.titleShort,
    order: 6,
  },
  {
    id: 'ten_dot_cuu_tro',
    label: txt('matTranNhapXuatKho.store.dotCuuTroCol'),
    visible: true,
    ...P.titleShort,
    order: 7,
  },
  {
    id: 'so_dong',
    label: txt('matTranNhapXuatKho.store.soDongCol'),
    visible: true,
    minWidth: 84,
    maxWidth: 112,
    order: 8,
  },
  {
    id: 'tg_cap_nhat',
    label: txt('matTranNhapXuatKho.store.tgCapNhatCol'),
    visible: false,
    ...P.datetime,
    order: 9,
  },
  {
    id: 'actions',
    label: txt('common.actions'),
    visible: true,
    minWidth: 96,
    maxWidth: 120,
    order: 10,
  },
];

const initialFilters: NhapXuatKhoFilters = {
  columnSearch: {},
  loai_phieu: null,
};

export const useNhapXuatKhoStore = createGenericStore<NhapXuatKhoFilters>(initialFilters, DEFAULT_COLUMNS);
