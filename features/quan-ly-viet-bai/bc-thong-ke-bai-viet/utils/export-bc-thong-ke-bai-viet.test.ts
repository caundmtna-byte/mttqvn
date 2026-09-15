import { describe, expect, it } from 'vitest';
import type { BaiVietDanhSach } from '../../bai-viet/core/types';
import {
  aggregateByNguoiTao,
  aggregateDonViTheLoaiMatrix,
  aggregateTopCounts,
  computeArticleStatsKpis,
} from './aggregate-bai-viet-stats';
import { buildBcThongKeSheets, type BcThongKeExportInput } from './export-bc-thong-ke-bai-viet';

const base = (over: Partial<BaiVietDanhSach>): BaiVietDanhSach => ({
  id: '1',
  ten_bai: 'A',
  id_the_loai: 'a',
  ten_the_loai: 'Tin',
  don_gia: 100_000,
  ngay_dang: '2026-05-01',
  id_nguon_dang: '20',
  ten_nguon_dang: 'Biên tập',
  id_trang_dang: '30',
  ten_trang_dang: 'Zalo OA',
  link: 'https://x.test/1',
  id_nguoi_tao: '40',
  ho_va_ten_nguoi_tao: 'An',
  ten_tai_khoan_nguoi_tao: null,
  id_don_vi_nguoi_tao: '1',
  tg_tao: '2026-05-02T08:00:00.000Z',
  tg_cap_nhat: '2026-05-03T10:00:00.000Z',
  ...over,
});

const tenDonViById = new Map([
  ['1', 'Xã A'],
  ['2', 'Xã B'],
]);

const rows = [
  base({ id: '1' }),
  base({ id: '2', ten_bai: 'B', link: 'https://x.test/2' }),
  base({
    id: '3',
    ten_bai: 'C',
    link: 'https://x.test/3',
    id_the_loai: 'b',
    ten_the_loai: 'Bài viết',
    id_don_vi_nguoi_tao: '2',
    id_nguoi_tao: '41',
    ho_va_ten_nguoi_tao: 'Bình',
  }),
  base({
    id: '4',
    ten_bai: 'D',
    link: 'https://x.test/4',
    id_the_loai: 'b',
    ten_the_loai: 'Bài viết',
    id_don_vi_nguoi_tao: null,
    id_nguoi_tao: '42',
    ho_va_ten_nguoi_tao: 'Cúc',
  }),
];

function buildInput(over: Partial<BcThongKeExportInput> = {}): BcThongKeExportInput {
  const unknown = 'Chưa xác định đơn vị';
  return {
    kpis: computeArticleStatsKpis(rows),
    range: { start: '2026-05-01', end: '2026-05-31' },
    activeFilters: [{ label: 'Thể loại', value: 'Tin' }],
    matrix: aggregateDonViTheLoaiMatrix(rows, tenDonViById, unknown),
    theLoaiRows: aggregateTopCounts(rows, 'the_loai'),
    nguonRows: aggregateTopCounts(rows, 'nguon'),
    trangRows: aggregateTopCounts(rows, 'trang'),
    nguoiTaoRows: aggregateByNguoiTao(rows, tenDonViById, unknown),
    trendRows: [{ key: '2026-05-01', label: '01/05', count: 4 }],
    lookupRows: rows,
    tenDonViById,
    ...over,
  };
}

const cellsOf = (sheets: { rows: Record<string, unknown>[] }[]) =>
  sheets.flatMap((s) => s.rows.flatMap((r) => [...Object.keys(r), ...Object.values(r).map(String)]));

describe('buildBcThongKeSheets', () => {
  it('ra đủ 8 sheet theo đúng thứ tự', () => {
    expect(buildBcThongKeSheets(buildInput()).map((s) => s.name)).toEqual([
      'Tong hop',
      'Theo don vi',
      'Theo the loai',
      'Theo nguon dang',
      'Theo trang dang',
      'Theo nguoi tao',
      'Theo thoi gian',
      'Chi tiet',
    ]);
  });

  it('KHÔNG sheet nào chứa cột tiền hay giá trị tiền', () => {
    const cells = cellsOf(buildBcThongKeSheets(buildInput()));
    for (const cell of cells) {
      expect(cell).not.toMatch(/đơn giá|nhuận bút|thành tiền|số tiền|₫|VNĐ/i);
    }
    // 100.000đ là đơn giá của dữ liệu mẫu — không được lọt vào file dưới mọi dạng.
    expect(cells).not.toContain('100000');
    expect(cells).not.toContain('400000');
  });

  it('bảng chéo có đủ cột thể loại, ô trống điền 0 và dòng Tổng cộng khớp tổng số bài', () => {
    const sheet = buildBcThongKeSheets(buildInput()).find((s) => s.name === 'Theo don vi')!;
    // 3 đơn vị (Xã A, Xã B, chưa xác định) + dòng Tổng cộng
    expect(sheet.rows).toHaveLength(4);

    const xaB = sheet.rows[1];
    expect(xaB['Đơn vị']).toBe('Xã B');
    // Xã B không có bài thể loại "Tin" → phải là số 0, không bỏ trống.
    expect(xaB['Tin']).toBe(0);
    expect(xaB['Bài viết']).toBe(1);

    const tong = sheet.rows[sheet.rows.length - 1];
    expect(tong['Đơn vị']).toBe('Tổng cộng');
    expect(tong['Số bài']).toBe(4);
    expect(tong['Tỷ trọng']).toBe(100);
    // Tổng theo cột thể loại cộng lại đúng bằng tổng số bài.
    expect(Number(tong['Tin']) + Number(tong['Bài viết'])).toBe(4);
    // Và tổng các dòng đơn vị cũng vậy — không đơn vị nào bị rơi.
    expect(
      sheet.rows.slice(0, -1).reduce((s, r) => s + Number(r['Số bài']), 0),
    ).toBe(4);
  });

  it('sheet Tổng hợp ghi lại khoảng ngày và bộ lọc đang áp', () => {
    const sheet = buildBcThongKeSheets(buildInput()).find((s) => s.name === 'Tong hop')!;
    const byLabel = new Map(sheet.rows.map((r) => [String(r['Chỉ tiêu']), r['Giá trị']]));
    expect(byLabel.get('Tổng số bài')).toBe(4);
    expect(byLabel.get('Tổng đơn vị')).toBe(2);
    expect(byLabel.get('Trung bình số bài')).toBe(1.5);
    expect(byLabel.get('Từ ngày (báo cáo)')).toBe('2026-05-01');
    expect(byLabel.get('Thể loại')).toBe('Tin');
  });

  it('khoảng ngày rỗng (preset Tất cả) ghi chữ thay vì để trống', () => {
    const sheet = buildBcThongKeSheets(
      buildInput({ range: { start: '', end: '', allTime: true } }),
    ).find((s) => s.name === 'Tong hop')!;
    const byLabel = new Map(sheet.rows.map((r) => [String(r['Chỉ tiêu']), r['Giá trị']]));
    expect(byLabel.get('Từ ngày (báo cáo)')).toBe('Toàn bộ thời gian');
    expect(byLabel.get('Đến ngày (báo cáo)')).toBe('Toàn bộ thời gian');
  });

  it('sheet Chi tiết đánh STT liên tục và điền tên đơn vị của người tạo', () => {
    const sheet = buildBcThongKeSheets(buildInput()).find((s) => s.name === 'Chi tiet')!;
    expect(sheet.rows.map((r) => r['STT'])).toEqual([1, 2, 3, 4]);
    expect(sheet.rows[0]['Đơn vị']).toBe('Xã A');
    expect(sheet.rows[3]['Đơn vị']).toBe('Chưa xác định đơn vị');
  });

  it('không có bài nào → bảng chéo không có dòng Tổng cộng thừa', () => {
    const empty = buildBcThongKeSheets(
      buildInput({
        kpis: computeArticleStatsKpis([]),
        matrix: aggregateDonViTheLoaiMatrix([], tenDonViById, 'Chưa xác định đơn vị'),
        theLoaiRows: [],
        nguonRows: [],
        trangRows: [],
        nguoiTaoRows: [],
        trendRows: [],
        lookupRows: [],
        activeFilters: [],
      }),
    );
    expect(empty.find((s) => s.name === 'Theo don vi')!.rows).toEqual([]);
    expect(empty.find((s) => s.name === 'Chi tiet')!.rows).toEqual([]);
  });
});
