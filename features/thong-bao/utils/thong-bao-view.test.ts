import { describe, it, expect } from 'vitest';
import {
  sapXepThongBao,
  nhanSoChuaDoc,
  duongDanAnToan,
  moTaThoiGian,
} from './thong-bao-view';
import type { ThongBao } from '../core/types';

function tb(p: Partial<ThongBao> & { id: string }): ThongBao {
  return {
    loai: 'cong_viec_qua_han',
    muc_do: 'canh_bao',
    tieu_de: 'Tiêu đề',
    noi_dung: 'Nội dung',
    duong_dan: '/quan-ly-giao-viec/cong-viec?tab=mine_do',
    da_doc: false,
    tg_tao: '2026-09-11T08:00:00.000Z',
    ...p,
  };
}

describe('sapXepThongBao', () => {
  it('đưa mọi dòng chưa đọc lên trước dòng đã đọc', () => {
    const ra = sapXepThongBao([
      tb({ id: '1', da_doc: true, tg_tao: '2026-09-11T10:00:00.000Z' }),
      tb({ id: '2', da_doc: false, tg_tao: '2026-09-01T10:00:00.000Z' }),
    ]);
    expect(ra.map((x) => x.id)).toEqual(['2', '1']);
  });

  it('trong cùng nhóm thì mới nhất đứng trước', () => {
    const ra = sapXepThongBao([
      tb({ id: '1', tg_tao: '2026-09-09T10:00:00.000Z' }),
      tb({ id: '2', tg_tao: '2026-09-11T10:00:00.000Z' }),
      tb({ id: '3', tg_tao: '2026-09-10T10:00:00.000Z' }),
    ]);
    expect(ra.map((x) => x.id)).toEqual(['2', '3', '1']);
  });

  it('trùng mốc thời gian thì id lớn hơn (mới hơn) đứng trước', () => {
    const ra = sapXepThongBao([tb({ id: '7' }), tb({ id: '12' })]);
    expect(ra.map((x) => x.id)).toEqual(['12', '7']);
  });

  it('mốc thời gian hỏng bị đẩy xuống cuối nhóm, không làm loạn thứ tự', () => {
    const ra = sapXepThongBao([
      tb({ id: '1', tg_tao: 'không phải ngày' }),
      tb({ id: '2', tg_tao: '2026-09-11T10:00:00.000Z' }),
    ]);
    expect(ra.map((x) => x.id)).toEqual(['2', '1']);
  });

  it('không sửa mảng đầu vào (cache TanStack Query là bất biến)', () => {
    const goc = [tb({ id: '1', da_doc: true }), tb({ id: '2', da_doc: false })];
    sapXepThongBao(goc);
    expect(goc.map((x) => x.id)).toEqual(['1', '2']);
  });
});

describe('nhanSoChuaDoc', () => {
  it('không có gì chưa đọc thì không vẽ huy hiệu', () => {
    expect(nhanSoChuaDoc(0)).toBe('');
    expect(nhanSoChuaDoc(-3)).toBe('');
    expect(nhanSoChuaDoc(Number.NaN)).toBe('');
  });

  it('hiện đúng con số khi còn trong ngưỡng', () => {
    expect(nhanSoChuaDoc(1)).toBe('1');
    expect(nhanSoChuaDoc(99)).toBe('99');
  });

  it('vượt ngưỡng thì rút gọn thành 99+', () => {
    expect(nhanSoChuaDoc(100)).toBe('99+');
    expect(nhanSoChuaDoc(4321)).toBe('99+');
  });
});

describe('duongDanAnToan', () => {
  it('cho qua đường dẫn nội bộ', () => {
    expect(duongDanAnToan('/quan-ly-giao-viec/cong-viec?tab=mine_do')).toBe(
      '/quan-ly-giao-viec/cong-viec?tab=mine_do',
    );
    expect(duongDanAnToan('  /trang-chu  ')).toBe('/trang-chu');
  });

  it('chặn mọi đường dẫn ra ngoài hệ thống', () => {
    expect(duongDanAnToan('https://evil.example')).toBeNull();
    expect(duongDanAnToan('//evil.example/thu')).toBeNull();
    expect(duongDanAnToan('javascript:alert(1)')).toBeNull();
    expect(duongDanAnToan('/\\evil.example')).toBeNull();
    expect(duongDanAnToan('quan-ly-giao-viec/cong-viec')).toBeNull();
  });

  it('không có đường dẫn thì trả null', () => {
    expect(duongDanAnToan(null)).toBeNull();
    expect(duongDanAnToan(undefined)).toBeNull();
    expect(duongDanAnToan('')).toBeNull();
  });
});

describe('moTaThoiGian', () => {
  const bayGio = new Date('2026-09-11T10:00:00.000Z');

  it('dưới một phút là "Vừa xong"', () => {
    expect(moTaThoiGian('2026-09-11T09:59:30.000Z', bayGio)).toBe('Vừa xong');
  });

  it('tính theo phút rồi theo giờ trong cùng một ngày', () => {
    expect(moTaThoiGian('2026-09-11T09:45:00.000Z', bayGio)).toBe('15 phút trước');
    expect(moTaThoiGian('2026-09-11T07:00:00.000Z', bayGio)).toBe('3 giờ trước');
  });

  it('quá 24 giờ là "Hôm qua", xa hơn thì ghi ngày tháng', () => {
    expect(moTaThoiGian('2026-09-10T08:00:00.000Z', bayGio)).toBe('Hôm qua');
    const xa = moTaThoiGian('2026-08-30T08:00:00.000Z', bayGio);
    expect(xa).toMatch(/^\d{2}\/\d{2}\/\d{4}$/);
  });

  it('mốc thời gian hỏng thì không hiện gì', () => {
    expect(moTaThoiGian('không phải ngày', bayGio)).toBe('');
  });
});
