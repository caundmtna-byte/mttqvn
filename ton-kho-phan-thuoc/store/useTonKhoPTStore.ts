import { create } from 'zustand';
import type { LoaiPhieuKhoPT } from '../../phieu-kho-phan-thuoc/core/types';
import { getDateRangeFromPreset } from '../core/datePresets';

export type TonKhoPTTabId = 'byProduct' | 'baoCaoNXT';

const defaultNxt = getDateRangeFromPreset('thisMonth');

interface TonKhoPTStoreState {
  activeTab: TonKhoPTTabId;
  setActiveTab: (t: TonKhoPTTabId) => void;

  nxtDateFrom: string;
  nxtDateTo: string;
  nxtPreset: string;
  setNxtPreset: (preset: string) => void;
  setNxtDateRange: (from: string, to: string) => void;

  nxtWarehouseIds: string[];
  setNxtWarehouseIds: (ids: string[]) => void;
  nxtLoaiPhieu: LoaiPhieuKhoPT[];
  setNxtLoaiPhieu: (loai: LoaiPhieuKhoPT[]) => void;
  nxtHangHoaIds: string[];
  setNxtHangHoaIds: (ids: string[]) => void;
  nxtCategoryIds: string[];
  setNxtCategoryIds: (ids: string[]) => void;
  clearNxtFilters: () => void;
}

export const useTonKhoPTStore = create<TonKhoPTStoreState>((set) => ({
  activeTab: 'byProduct',
  setActiveTab: (activeTab) => set({ activeTab }),

  nxtDateFrom: defaultNxt.dateFrom,
  nxtDateTo: defaultNxt.dateTo,
  nxtPreset: 'thisMonth',
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
    const r = getDateRangeFromPreset('thisMonth');
    set({
      nxtDateFrom: r.dateFrom,
      nxtDateTo: r.dateTo,
      nxtPreset: 'thisMonth',
      nxtWarehouseIds: [],
      nxtLoaiPhieu: [],
      nxtHangHoaIds: [],
      nxtCategoryIds: [],
    });
  },
}));
