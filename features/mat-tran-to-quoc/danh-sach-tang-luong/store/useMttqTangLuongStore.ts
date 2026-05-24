import { createGenericStore, type ColumnConfig } from '@/store/createGenericStore';
import { txt } from '@/lib/text';

const DEFAULT_COLUMNS: ColumnConfig[] = [
  {
    id: 'ngay_nang_luong',
    label: txt('matTranTangLuong.store.ngayNangCol'),
    visible: true,
    minWidth: 110,
    maxWidth: 130,
    order: 0,
  },
  {
    id: 'ho_ten_can_bo',
    label: txt('matTranTangLuong.store.canBoCol'),
    visible: true,
    minWidth: 160,
    maxWidth: 240,
    order: 1,
  },
  {
    id: 'loai_ky',
    label: txt('matTranTangLuong.store.loaiKyCol'),
    visible: true,
    minWidth: 120,
    maxWidth: 180,
    order: 2,
  },
  {
    id: 'ten_ngach_moi',
    label: txt('matTranTangLuong.store.ngachMoiCol'),
    visible: true,
    minWidth: 140,
    maxWidth: 220,
    order: 3,
  },
  {
    id: 'luong',
    label: txt('matTranTangLuong.store.luongCol'),
    visible: true,
    minWidth: 110,
    maxWidth: 140,
    order: 4,
  },
  {
    id: 'ten_ngach_cu',
    label: txt('matTranTangLuong.store.ngachCuCol'),
    visible: true,
    minWidth: 120,
    maxWidth: 200,
    order: 5,
  },
  {
    id: 'ghi_chu',
    label: txt('matTranTangLuong.store.ghiChuCol'),
    visible: true,
    minWidth: 120,
    maxWidth: 280,
    order: 6,
  },
  {
    id: 'actions',
    label: txt('common.actions'),
    visible: true,
    minWidth: 96,
    maxWidth: 120,
    order: 7,
  },
];

export interface MttqTangLuongTableFilters {
  columnSearch: Record<string, string>;
  loai_ky: string[];
  can_bo_id: string[];
  phong_ban_id: string[];
  don_vi_id: string[];
  to_chuc_id: string[];
}

const initialFilters: MttqTangLuongTableFilters = {
  columnSearch: {},
  loai_ky: [],
  can_bo_id: [],
  phong_ban_id: [],
  don_vi_id: [],
  to_chuc_id: [],
};

export const useMttqTangLuongStore = createGenericStore<MttqTangLuongTableFilters>(
  initialFilters,
  DEFAULT_COLUMNS,
);
