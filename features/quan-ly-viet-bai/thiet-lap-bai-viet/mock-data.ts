import type { BaiVietTheLoai, BaiVietThietLapKhac, BaiVietThietLapKhacLoai } from './core/types';

const ts = () => new Date().toISOString();

export const MOCK_BAI_VIET_THE_LOAI: BaiVietTheLoai[] = [
  {
    id: 'tl-1',
    ten_the_loai: 'Tin hoạt động',
    mo_ta: 'Tin sự kiện, hoạt động đoàn thể',
    don_gia: 150000,
    tg_tao: ts(),
    tg_cap_nhat: ts(),
  },
  {
    id: 'tl-2',
    ten_the_loai: 'Bài phân tích',
    mo_ta: null,
    don_gia: 300000,
    tg_tao: ts(),
    tg_cap_nhat: ts(),
  },
];

function khac(
  id: string,
  loai: BaiVietThietLapKhacLoai,
  ten: string,
  mo_ta: string | null,
  thu_tu: number,
): BaiVietThietLapKhac {
  const t = ts();
  return { id, loai, ten, mo_ta, thu_tu, tg_tao: t, tg_cap_nhat: t };
}

export const MOCK_BAI_VIET_THIET_LAP_KHAC: BaiVietThietLapKhac[] = [
  khac('kh-1', 'trang_dang', 'Fanpage chính', 'Kênh Facebook chính thức', 1),
  khac('kh-2', 'trang_dang', 'Website MTTQ', null, 2),
  khac('kh-3', 'nguon_dang', 'Phóng viên nội bộ', null, 1),
  khac('kh-4', 'nguon_dang', 'Cộng tác viên', 'CTV địa phương', 2),
];
