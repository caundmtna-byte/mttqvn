export const PBXH_THIET_LAP_LOAI = ['doi_tuong', 'don_vi_chu_tri', 'hinh_thuc'] as const;
export type PbxhThietLapLoai = (typeof PBXH_THIET_LAP_LOAI)[number];

export const PBXH_LOAI_TAB_LABEL_KEY: Record<PbxhThietLapLoai, string> = {
  doi_tuong: 'page.pbxhThietLap.tabDoiTuong',
  don_vi_chu_tri: 'page.pbxhThietLap.tabDonViChuTri',
  hinh_thuc: 'page.pbxhThietLap.tabHinhThuc',
};

export interface PbxhThietLap {
  id: string;
  loai: PbxhThietLapLoai;
  ten: string;
  mo_ta: string | null;
  thu_tu: number;
  tg_tao: string;
  tg_cap_nhat: string;
}

export type PbxhThietLapFilters = {
  columnSearch: Record<string, string>;
  mo_ta_bucket: '' | 'has' | 'empty';
};
