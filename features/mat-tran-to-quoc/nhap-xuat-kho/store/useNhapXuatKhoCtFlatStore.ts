import { createGenericStore, type ColumnConfig } from '@/store/createGenericStore';
import { TABLE_COLUMN_PRESETS } from '@/lib/table-column-presets';
import { txt } from '@/lib/text';
import type { NhapXuatKhoCtFlatFilters } from '../core/types';

const P = TABLE_COLUMN_PRESETS;

const DEFAULT_COLUMNS: ColumnConfig[] = [
  {
    id: 'so_phieu',
    label: txt('matTranNhapXuatKho.store.soPhieuCol'),
    visible: true,
    ...P.code,
    minWidth: 132,
    maxWidth: 180,
    order: 0,
  },
  {
    id: 'loai_phieu',
    label: txt('matTranNhapXuatKho.store.loaiPhieuCol'),
    visible: true,
    ...P.enumBadgeMedium,
    order: 1,
  },
  {
    id: 'ngay_phieu',
    label: txt('matTranNhapXuatKho.store.ngayPhieuCol'),
    visible: true,
    ...P.date,
    order: 2,
  },
  {
    id: 'ten_hang_hoa',
    label: txt('matTranNhapXuatKho.store.hangHoaCol'),
    visible: true,
    ...P.titleShort,
    order: 3,
  },
  {
    id: 'don_vi_tinh',
    label: txt('matTranNhapXuatKho.store.donViTinhCol'),
    visible: true,
    minWidth: 80,
    maxWidth: 112,
    order: 4,
  },
  {
    id: 'so_luong',
    label: txt('matTranNhapXuatKho.store.soLuongCol'),
    visible: true,
    minWidth: 96,
    maxWidth: 140,
    order: 5,
  },
  {
    id: 'don_gia',
    label: txt('matTranNhapXuatKho.store.donGiaCol'),
    visible: false,
    minWidth: 120,
    maxWidth: 160,
    order: 6,
  },
  {
    id: 'thanh_tien',
    label: txt('matTranNhapXuatKho.store.thanhTienCol'),
    visible: true,
    minWidth: 132,
    maxWidth: 180,
    order: 7,
  },
  {
    id: 'ten_kho_xuat',
    label: txt('matTranNhapXuatKho.store.khoXuatCol'),
    visible: true,
    ...P.titleShort,
    order: 8,
  },
  {
    id: 'ten_kho_nhap',
    label: txt('matTranNhapXuatKho.store.khoNhapCol'),
    visible: true,
    ...P.titleShort,
    order: 9,
  },
  {
    id: 'ghi_chu',
    label: txt('matTranNhapXuatKho.store.ghiChuCol'),
    visible: false,
    minWidth: 160,
    maxWidth: 320,
    order: 10,
  },
];

const initialFilters: NhapXuatKhoCtFlatFilters = {
  columnSearch: {},
  loai_phieu: null,
  kho_id: null,
  hang_hoa_id: null,
};

export const useNhapXuatKhoCtFlatStore = createGenericStore<NhapXuatKhoCtFlatFilters>(
  initialFilters,
  DEFAULT_COLUMNS,
);
