import { create } from 'zustand';
import type { NhapXuatKhoLoaiPhieu } from '../../nhap-xuat-kho/core/constants';
import { getDateRangeFromPreset } from '../core/datePresets';

export type TonKhoNxtTabId = 'byProduct' | 'baoCaoNXT';

const defaultNxt = getDateRangeFromPreset('all');

interface TonKhoNxtStoreState {
  nxtDateFrom: string;
  nxtDateTo: string;
  nxtPreset: string;
  setNxtPreset: (preset: string) => void;
  setNxtDateRange: (from: string, to: string) => void;

  nxtWarehouseIds: string[];
  setNxtWarehouseIds: (ids: string[]) => void;
  nxtLoaiPhieu: NhapXuatKhoLoaiPhieu[];
  setNxtLoaiPhieu: (loai: NhapXuatKhoLoaiPhieu[]) => void;
  nxtHangHoaIds: string[];
  setNxtHangHoaIds: (ids: string[]) => void;
  nxtCategoryIds: string[];
  setNxtCategoryIds: (ids: string[]) => void;
  clearNxtFilters: () => void;
}

export const useTonKhoNxtStore = create<TonKhoNxtStoreState>((set) => ({
  nxtDateFrom: defaultNxt.dateFrom,
  nxtDateTo: defaultNxt.dateTo,
  nxtPreset: 'all',
  setNxtPreset: (nxtPreset) => {
    const r = getDateRangeFromPreset(nxtPreset);
    set({ nxtPreset, nxtDateFrom: r.dateFrom, nxtDateTo: r.dateTo });
  },
  setNxtDateRange: (nxtDateFrom, nxtDateTo) => set({ nxtDateFrom, nxtDateTo, nxtPreset: 'custom' }),

  nxtWarehouseIds: [],
  setNxtWarehouseIds: (nxtWarehouseIds) => set({ nxtWarehouseIds }),
  nxtLoaiPhieu: [],
  setNxtLoaiPhieu: (nxtLoaiPhieu) => set({ nxtLoaiPhieu }),
  nxtHangHoaIds: [],
  setNxtHangHoaIds: (nxtHangHoaIds) => set({ nxtHangHoaIds }),
  nxtCategoryIds: [],
  setNxtCategoryIds: (nxtCategoryIds) => set({ nxtCategoryIds }),
  clearNxtFilters: () => {
    const r = getDateRangeFromPreset('all');
    set({
      nxtDateFrom: r.dateFrom,
      nxtDateTo: r.dateTo,
      nxtPreset: 'all',
      nxtWarehouseIds: [],
      nxtLoaiPhieu: [],
      nxtHangHoaIds: [],
      nxtCategoryIds: [],
    });
  },
}));
