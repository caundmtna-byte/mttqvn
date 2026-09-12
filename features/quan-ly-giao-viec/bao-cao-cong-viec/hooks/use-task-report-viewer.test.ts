import { describe, it, expect } from 'vitest';
import {
  buildTaskReportViewer,
  canLoadTaskReport,
  type TaskReportViewerInput,
} from './use-task-report-viewer';

const MODULE_ID = 'quan-ly-giao-viec/bao-cao-cong-viec';

function input(over: Partial<TaskReportViewerInput> = {}): TaskReportViewerInput {
  return {
    role: 'user',
    nhanVienId: '7',
    donViId: '42',
    phongBanId: '3',
    matrixActive: true,
    grantsByModule: { [MODULE_ID]: ['view'] },
    chucVuCapBac: 5,
    chucVuCapQuanLy: null,
    ...over,
  };
}

describe('buildTaskReportViewer — ai được xem toàn bộ', () => {
  it('mock admin', () => {
    expect(buildTaskReportViewer(input({ role: 'admin' })).viewAll).toBe(true);
  });

  it('chưa hydrate matrix (luật legacy)', () => {
    expect(buildTaskReportViewer(input({ matrixActive: false })).viewAll).toBe(true);
  });

  it('cap_bac = 1', () => {
    expect(buildTaskReportViewer(input({ chucVuCapBac: 1 })).viewAll).toBe(true);
  });

  it('grant quan_tri (token admin/all) trên module báo cáo', () => {
    expect(buildTaskReportViewer(input({ grantsByModule: { [MODULE_ID]: ['admin'] } })).viewAll).toBe(true);
    expect(buildTaskReportViewer(input({ grantsByModule: { [MODULE_ID]: ['all'] } })).viewAll).toBe(true);
  });

  it('cap_quan_ly = Tỉnh', () => {
    expect(buildTaskReportViewer(input({ chucVuCapQuanLy: 'Tỉnh' })).viewAll).toBe(true);
  });

  it('chỉ có quyền view thường → KHÔNG xem toàn bộ', () => {
    expect(buildTaskReportViewer(input()).viewAll).toBe(false);
  });
});

describe('buildTaskReportViewer — chỉ gửi MỘT tiêu chí phạm vi', () => {
  it('Xã phường: chỉ đơn vị mình, KHÔNG gửi phòng ban', () => {
    const v = buildTaskReportViewer(input({ chucVuCapQuanLy: 'Xã phường' }));
    expect(v).toEqual({ viewerId: 7, viewerDonViId: 42, viewerPhongBanId: null, viewAll: false });
  });

  it('Xã phường có id_phong_ban vẫn không rò sang phòng ban (hồi quy chính)', () => {
    // RPC ghép các tham số bằng OR — gửi kèm phòng ban là thấy cả việc của
    // người cùng phòng ban ở ĐƠN VỊ KHÁC.
    const v = buildTaskReportViewer(input({ chucVuCapQuanLy: 'Xã phường', phongBanId: '99' }));
    expect(v.viewerPhongBanId).toBeNull();
    expect(v.viewerDonViId).toBe(42);
  });

  it('không có cấp quản lý: chỉ việc liên quan cá nhân', () => {
    const v = buildTaskReportViewer(input({ chucVuCapQuanLy: null }));
    expect(v).toEqual({ viewerId: 7, viewerDonViId: null, viewerPhongBanId: null, viewAll: false });
  });

  it('viewAll: không gửi tiêu chí phạm vi nào', () => {
    const v = buildTaskReportViewer(input({ chucVuCapBac: 1 }));
    expect(v.viewerDonViId).toBeNull();
    expect(v.viewerPhongBanId).toBeNull();
  });
});

describe('buildTaskReportViewer — ép kiểu id', () => {
  it('id dạng chuỗi bigint → number', () => {
    const v = buildTaskReportViewer(input({ chucVuCapQuanLy: 'Xã phường', nhanVienId: '108', donViId: '9' }));
    expect(v.viewerId).toBe(108);
    expect(v.viewerDonViId).toBe(9);
  });

  it('id thiếu / không hợp lệ → null', () => {
    const v = buildTaskReportViewer(input({ nhanVienId: null, donViId: 'x' }));
    expect(v.viewerId).toBeNull();
    expect(v.viewerDonViId).toBeNull();
  });
});

describe('canLoadTaskReport', () => {
  it('viewAll → luôn gọi được', () => {
    expect(canLoadTaskReport(buildTaskReportViewer(input({ chucVuCapBac: 1 })))).toBe(true);
  });

  it('Xã phường có đơn vị → gọi được', () => {
    expect(canLoadTaskReport(buildTaskReportViewer(input({ chucVuCapQuanLy: 'Xã phường' })))).toBe(true);
  });

  it('không có cả nhân viên lẫn đơn vị → KHÔNG gọi (tránh RPC phạm vi rỗng)', () => {
    const v = buildTaskReportViewer(input({ nhanVienId: null, donViId: null }));
    expect(canLoadTaskReport(v)).toBe(false);
  });
});
