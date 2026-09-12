import { describe, it, expect } from 'vitest';
import { trangThaiKeTiepHopLe, trangThaiChonDuoc } from './luat-trang-thai';

describe('trangThaiKeTiepHopLe — khớp trigger fn_kiem_luat_trang_thai', () => {
  it('đã ban hành thì chỉ còn đường huỷ, không lùi về nháp', () => {
    const r = trangThaiKeTiepHopLe('Đã ban hành');
    expect(r).toContain('Hủy');
    expect(r).toContain('Đã ban hành');
    expect(r).not.toContain('Mới');
    expect(r).not.toContain('Đang xử lý');
  });

  it('đã huỷ thì không ban hành lại được', () => {
    expect(trangThaiKeTiepHopLe('Hủy')).not.toContain('Đã ban hành');
  });

  it('nháp thì đi đâu cũng được', () => {
    expect(trangThaiKeTiepHopLe('Mới')).toHaveLength(4);
    expect(trangThaiKeTiepHopLe('Đang xử lý')).toHaveLength(4);
  });

  it('trạng thái rỗng/null coi như nháp, không khoá người dùng ra ngoài', () => {
    expect(trangThaiKeTiepHopLe(null)).toHaveLength(4);
    expect(trangThaiKeTiepHopLe('')).toHaveLength(4);
    expect(trangThaiKeTiepHopLe('  Đã ban hành  ')).not.toContain('Mới');
  });
});

describe('trangThaiChonDuoc — quyền Duyệt', () => {
  it('không có quyền duyệt thì không thấy "Đã ban hành"', () => {
    expect(trangThaiChonDuoc('Mới', false)).not.toContain('Đã ban hành');
  });

  it('có quyền duyệt thì thấy đủ như luật cho phép', () => {
    expect(trangThaiChonDuoc('Mới', true)).toContain('Đã ban hành');
  });

  it('đang ở "Đã ban hành" mà không có quyền duyệt vẫn giữ được trạng thái hiện tại', () => {
    const r = trangThaiChonDuoc('Đã ban hành', false);
    expect(r).toContain('Đã ban hành');
    expect(r).toContain('Hủy');
  });

  it('không có quyền duyệt, đang ở "Hủy" thì vẫn không có "Đã ban hành"', () => {
    expect(trangThaiChonDuoc('Hủy', false)).not.toContain('Đã ban hành');
  });
});
