import { describe, expect, it } from 'vitest';
import { parseBaiVietThongKeNhom, splitDonViFilter, toBaiVietThongKeRpcParams } from './thong-ke-nhom';

describe('thong-ke-nhom', () => {
  it('parseBaiVietThongKeNhom đọc mảng vị trí và tra tên từ từ điển', () => {
    const r = parseBaiVietThongKeNhom({
      nhom: [
        ['2026-05', 1, 5, 6, 40, 7, 3, '150000.00'],
        ['2026-06', 2, 5, 6, 41, null, 1, 0],
      ],
      ngay_min: '2026-05-02',
      ngay_max: '2026-06-30',
      the_loai: { '1': 'Tin', '2': ' ' },
      khac: { '5': 'Facebook', '6': 'Trang xã' },
      nguoi_tao: { '40': ['An', 'an01'], '41': [null, 'binh'] },
    });
    expect(r.ngayMin).toBe('2026-05-02');
    expect(r.ngayMax).toBe('2026-06-30');
    expect(r.nhom[0]).toEqual({
      ky: '2026-05',
      id_the_loai: '1',
      ten_the_loai: 'Tin',
      id_nguon_dang: '5',
      ten_nguon_dang: 'Facebook',
      id_trang_dang: '6',
      ten_trang_dang: 'Trang xã',
      id_nguoi_tao: '40',
      ho_va_ten_nguoi_tao: 'An',
      ten_tai_khoan_nguoi_tao: 'an01',
      id_don_vi_nguoi_tao: '7',
      so_bai: 3,
      // numeric về dạng chuỗi phải đổi sang số, không được nối chuỗi khi cộng.
      so_tien: 150_000,
    });
    expect(r.nhom[1]).toMatchObject({
      ten_the_loai: null,
      ho_va_ten_nguoi_tao: null,
      ten_tai_khoan_nguoi_tao: 'binh',
      id_don_vi_nguoi_tao: null,
    });
  });

  it('parseBaiVietThongKeNhom: phạm vi không có bài → rỗng, không lỗi', () => {
    expect(
      parseBaiVietThongKeNhom({ nhom: [], ngay_min: null, ngay_max: null, the_loai: {}, khac: {}, nguoi_tao: {} }),
    ).toEqual({ nhom: [], ngayMin: '', ngayMax: '' });
    expect(parseBaiVietThongKeNhom(null)).toEqual({ nhom: [], ngayMin: '', ngayMax: '' });
  });

  it('toBaiVietThongKeRpcParams: ngày rỗng thành null, id đổi sang số', () => {
    expect(
      toBaiVietThongKeRpcParams({
        trucNgay: 'tg_tao',
        tuNgay: '',
        denNgay: null,
        bucket: 'month',
        scope: 'all_don_vi',
        viewerNhanVienId: null,
        viewerDonViId: ' 12 ',
      }),
    ).toEqual({
      p_truc_ngay: 'tg_tao',
      p_tu_ngay: null,
      p_den_ngay: null,
      p_bucket: 'month',
      p_scope: 'all_don_vi',
      p_viewer_nhan_vien_id: null,
      p_viewer_don_vi_id: 12,
    });
  });

  it('splitDonViFilter tách khoá "chưa gắn đơn vị" ra cờ riêng', () => {
    expect(splitDonViFilter(['1', '__x__', '2'], '__x__')).toEqual({
      donViIds: ['1', '2'],
      donViIncludeNull: true,
    });
    expect(splitDonViFilter([], '__x__')).toEqual({ donViIds: [], donViIncludeNull: false });
  });
});
