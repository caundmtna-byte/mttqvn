export const MTTQ_THIET_LAP_LOAI = [
  'cap_quan_ly',
  'to_chuc',
  'dan_toc',
  'trinh_do',
  'ly_luan_chinh_tri',
  'trang_thai',
] as const;

export type MttqThietLapLoai = (typeof MTTQ_THIET_LAP_LOAI)[number];

export const MTTQ_LOAI_TAB_LABEL_KEY: Record<MttqThietLapLoai, string> = {
  cap_quan_ly: 'page.matTranThietLap.tabCapQuanLy',
  to_chuc: 'page.matTranThietLap.tabToChuc',
  dan_toc: 'page.matTranThietLap.tabDanToc',
  trinh_do: 'page.matTranThietLap.tabTrinhDo',
  ly_luan_chinh_tri: 'page.matTranThietLap.tabLyLuanChinhTri',
  trang_thai: 'page.matTranThietLap.tabTrangThai',
};

export interface MttqThietLap {
  id: string;
  loai: MttqThietLapLoai;
  ten: string;
  mo_ta: string | null;
  thu_tu: number;
  tg_tao: string;
  tg_cap_nhat: string;
}

export type MttqThietLapFilters = {
  columnSearch: Record<string, string>;
  /** '' = tất cả; `has` có mô tả; `empty` không mô tả */
  mo_ta_bucket: '' | 'has' | 'empty';
};
