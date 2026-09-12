import { describe, expect, it } from 'vitest';
import {
  formatDiaDanhNgayThang,
  formatNgayThangNamVanBan,
  layBangDauTien,
  layoutThongTinPairs,
  type VanBanKhoiNoiDung,
} from './van-ban-hanh-chinh';

describe('formatNgayThangNamVanBan', () => {
  it('ngày < 10 thêm số 0, tháng < 10 KHÔNG thêm số 0 (NĐ 30/2020)', () => {
    expect(formatNgayThangNamVanBan('2025-09-05')).toBe('ngày 05 tháng 9 năm 2025');
    expect(formatNgayThangNamVanBan('2025-12-31')).toBe('ngày 31 tháng 12 năm 2025');
    expect(formatNgayThangNamVanBan('2024-01-01')).toBe('ngày 01 tháng 1 năm 2024');
  });

  it('nhận cả chuỗi ISO có phần giờ', () => {
    expect(formatNgayThangNamVanBan('2025-03-08T10:20:00Z')).toBe('ngày 08 tháng 3 năm 2025');
  });

  it('giá trị trống/sai định dạng trả về chuỗi rỗng', () => {
    expect(formatNgayThangNamVanBan('')).toBe('');
    expect(formatNgayThangNamVanBan(null)).toBe('');
    expect(formatNgayThangNamVanBan('08/03/2025')).toBe('');
  });
});

describe('formatDiaDanhNgayThang', () => {
  it('ghép địa danh với ngày tháng', () => {
    expect(formatDiaDanhNgayThang('Nghệ An', '2025-09-05')).toBe(
      'Nghệ An, ngày 05 tháng 9 năm 2025',
    );
  });

  it('thiếu ngày thì chừa chỗ điền tay, không in ngày sai', () => {
    const out = formatDiaDanhNgayThang('Nghệ An', null);
    expect(out.startsWith('Nghệ An, ngày')).toBe(true);
    expect(out).not.toMatch(/\d/);
  });
});

describe('layoutThongTinPairs', () => {
  it('chia thành từng hàng 2 cột, hàng lẻ giữ 1 mục', () => {
    const items = [1, 2, 3].map((i) => ({ label: `l${i}`, value: `v${i}` }));
    const pairs = layoutThongTinPairs(items);
    expect(pairs).toHaveLength(2);
    expect(pairs[0]).toHaveLength(2);
    expect(pairs[1]).toHaveLength(1);
    expect(pairs[1][0].label).toBe('l3');
  });

  it('danh sách rỗng trả về mảng rỗng', () => {
    expect(layoutThongTinPairs([])).toEqual([]);
  });
});

describe('layBangDauTien', () => {
  it('trả về khối bảng đầu tiên trong nội dung', () => {
    const noiDung: VanBanKhoiNoiDung[] = [
      { kind: 'doan', text: 'Điều 1.' },
      { kind: 'bang', headers: ['STT'], rows: [['1']] },
      { kind: 'bang', headers: ['Khác'], rows: [] },
    ];
    expect(layBangDauTien(noiDung)?.headers).toEqual(['STT']);
  });

  it('không có bảng thì trả null', () => {
    expect(layBangDauTien([{ kind: 'doan', text: 'x' }])).toBeNull();
  });
});
