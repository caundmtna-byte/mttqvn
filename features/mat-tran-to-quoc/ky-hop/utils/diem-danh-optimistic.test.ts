import { describe, expect, it } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';
import type { MttqDiemDanhMatrixRow, MttqDiemDanhUyVien, MttqKyHop } from '../core/types';
import type { MttqUyVienUyBanListRow } from '@/features/mat-tran-to-quoc/uy-vien-uy-ban/core/types';
import {
  apDungPatchDiemDanh,
  deltaKhacKhong,
  hoanNguyenPatchDiemDanh,
  patchDiemDanhCounters,
  patchDiemDanhKyHopRows,
  patchDiemDanhNhiemKyRows,
  timTrangThaiHienTai,
  tinhDeltaDiemDanh,
} from './diem-danh-optimistic';

const KY_HOP = 'kh-1';
const UY_VIEN = 'uv-1';
const NHIEM_KY = 'nk-1';

describe('tinhDeltaDiemDanh', () => {
  it('chưa điểm danh → Có mặt: chua -1, coMat +1', () => {
    expect(tinhDeltaDiemDanh(null, 'Có mặt')).toEqual({ coMat: 1, vangMat: 0, chua: -1 });
  });

  it('chưa điểm danh → Vắng mặt: chua -1, vangMat +1', () => {
    expect(tinhDeltaDiemDanh(undefined, 'Vắng mặt')).toEqual({ coMat: 0, vangMat: 1, chua: -1 });
  });

  it('Có mặt → Vắng mặt: chuyển 1 đơn vị, không đụng ô chưa', () => {
    expect(tinhDeltaDiemDanh('Có mặt', 'Vắng mặt')).toEqual({ coMat: -1, vangMat: 1, chua: 0 });
  });

  it('Vắng mặt → Có mặt: chuyển ngược lại', () => {
    expect(tinhDeltaDiemDanh('Vắng mặt', 'Có mặt')).toEqual({ coMat: 1, vangMat: -1, chua: 0 });
  });

  it('bấm lại đúng trạng thái đang có: không đổi gì', () => {
    expect(deltaKhacKhong(tinhDeltaDiemDanh('Có mặt', 'Có mặt'))).toBe(false);
    expect(deltaKhacKhong(tinhDeltaDiemDanh('Vắng mặt', 'Vắng mặt'))).toBe(false);
  });

  it('tổng 3 ô luôn giữ nguyên (số ủy viên không đổi)', () => {
    const cases: [null | 'Có mặt' | 'Vắng mặt', 'Có mặt' | 'Vắng mặt'][] = [
      [null, 'Có mặt'],
      [null, 'Vắng mặt'],
      ['Có mặt', 'Vắng mặt'],
      ['Vắng mặt', 'Có mặt'],
      ['Có mặt', 'Có mặt'],
    ];
    for (const [cu, moi] of cases) {
      const d = tinhDeltaDiemDanh(cu, moi);
      expect(d.coMat + d.vangMat + d.chua).toBe(0);
    }
  });
});

describe('patchDiemDanhCounters', () => {
  it('cộng delta vào đúng 3 ô', () => {
    const row = { id: 'x', diem_danh_co_mat: 5, diem_danh_vang_mat: 2, diem_danh_chua: 3 };
    expect(patchDiemDanhCounters(row, { coMat: 1, vangMat: 0, chua: -1 })).toEqual({
      id: 'x',
      diem_danh_co_mat: 6,
      diem_danh_vang_mat: 2,
      diem_danh_chua: 2,
    });
  });

  it('không cho ô đếm xuống âm khi dữ liệu cũ đã lệch', () => {
    const row = { diem_danh_co_mat: 0, diem_danh_vang_mat: 0, diem_danh_chua: 0 };
    expect(patchDiemDanhCounters(row, { coMat: 1, vangMat: 0, chua: -1 })).toEqual({
      diem_danh_co_mat: 1,
      diem_danh_vang_mat: 0,
      diem_danh_chua: 0,
    });
  });

  it('coi null/undefined là 0', () => {
    const row: { diem_danh_co_mat?: number | null; ten?: string } = { ten: 'A' };
    expect(patchDiemDanhCounters(row, { coMat: 2, vangMat: 0, chua: 0 }).diem_danh_co_mat).toBe(2);
  });

  it('không sửa tại chỗ dòng gốc', () => {
    const row = { diem_danh_co_mat: 1, diem_danh_vang_mat: 1, diem_danh_chua: 1 };
    patchDiemDanhCounters(row, { coMat: 5, vangMat: 5, chua: 5 });
    expect(row.diem_danh_co_mat).toBe(1);
  });
});

describe('patchDiemDanhKyHopRows', () => {
  const rows: MttqDiemDanhUyVien[] = [
    { id: '1', ky_hop_id: KY_HOP, uy_vien_id: UY_VIEN, trang_thai: 'Có mặt', ghi_chu: null },
    { id: '2', ky_hop_id: KY_HOP, uy_vien_id: 'uv-2', trang_thai: 'Vắng mặt', ghi_chu: 'ốm' },
  ];

  it('sửa đúng dòng, giữ nguyên dòng khác và ghi chú', () => {
    const next = patchDiemDanhKyHopRows(rows, KY_HOP, UY_VIEN, 'Vắng mặt')!;
    expect(next).toHaveLength(2);
    expect(next[0].trang_thai).toBe('Vắng mặt');
    expect(next[1]).toBe(rows[1]);
    expect(rows[0].trang_thai).toBe('Có mặt');
  });

  it('thêm dòng mới khi ủy viên chưa từng điểm danh', () => {
    const next = patchDiemDanhKyHopRows(rows, KY_HOP, 'uv-9', 'Có mặt')!;
    expect(next).toHaveLength(3);
    expect(next[2]).toEqual({
      id: '',
      ky_hop_id: KY_HOP,
      uy_vien_id: 'uv-9',
      trang_thai: 'Có mặt',
      ghi_chu: null,
    });
  });

  it('không đụng dòng của kỳ họp khác', () => {
    const next = patchDiemDanhKyHopRows(rows, 'kh-khac', UY_VIEN, 'Vắng mặt')!;
    expect(next).toHaveLength(3);
    expect(next[0].trang_thai).toBe('Có mặt');
  });

  it('cache rỗng thì giữ nguyên undefined (không tự dựng danh sách giả)', () => {
    expect(patchDiemDanhKyHopRows(undefined, KY_HOP, UY_VIEN, 'Có mặt')).toBeUndefined();
  });
});

describe('patchDiemDanhNhiemKyRows', () => {
  const rows: MttqDiemDanhMatrixRow[] = [
    { ky_hop_id: KY_HOP, uy_vien_id: UY_VIEN, trang_thai: 'Có mặt' },
    { ky_hop_id: 'kh-2', uy_vien_id: UY_VIEN, trang_thai: 'Vắng mặt' },
  ];

  it('khoá theo cặp (kỳ họp, ủy viên)', () => {
    const next = patchDiemDanhNhiemKyRows(rows, 'kh-2', UY_VIEN, 'Có mặt')!;
    expect(next[0].trang_thai).toBe('Có mặt');
    expect(next[1].trang_thai).toBe('Có mặt');
    expect(rows[1].trang_thai).toBe('Vắng mặt');
  });

  it('thêm ô mới khi chưa có', () => {
    const next = patchDiemDanhNhiemKyRows(rows, 'kh-3', 'uv-5', 'Vắng mặt')!;
    expect(next).toHaveLength(3);
    expect(next[2]).toEqual({ ky_hop_id: 'kh-3', uy_vien_id: 'uv-5', trang_thai: 'Vắng mặt' });
  });
});

describe('timTrangThaiHienTai', () => {
  it('tìm theo cặp kỳ họp + ủy viên', () => {
    const rows: MttqDiemDanhMatrixRow[] = [
      { ky_hop_id: 'kh-2', uy_vien_id: UY_VIEN, trang_thai: 'Vắng mặt' },
      { ky_hop_id: KY_HOP, uy_vien_id: UY_VIEN, trang_thai: 'Có mặt' },
    ];
    expect(timTrangThaiHienTai(rows, KY_HOP, UY_VIEN)).toBe('Có mặt');
    expect(timTrangThaiHienTai(rows, 'kh-9', UY_VIEN)).toBeNull();
    expect(timTrangThaiHienTai(undefined, KY_HOP, UY_VIEN)).toBeNull();
  });
});

// --- Patch + hoàn nguyên trên QueryClient thật ---------------------------------

function uyVien(over: Partial<MttqUyVienUyBanListRow> = {}): MttqUyVienUyBanListRow {
  return {
    id: UY_VIEN,
    ho_va_ten: 'Nguyễn Văn A',
    diem_danh_co_mat: 3,
    diem_danh_vang_mat: 1,
    diem_danh_chua: 2,
    ...over,
  } as MttqUyVienUyBanListRow;
}

function kyHop(over: Partial<MttqKyHop> = {}): MttqKyHop {
  return {
    id: KY_HOP,
    ky_thu: 'Kỳ 1',
    diem_danh_co_mat: 10,
    diem_danh_vang_mat: 4,
    diem_danh_chua: 6,
    ...over,
  } as MttqKyHop;
}

function dungCache() {
  const qc = new QueryClient();
  qc.setQueryData<MttqDiemDanhUyVien[]>(queryKeys.mttqDiemDanhUyVien.byKyHop(KY_HOP), [
    { id: '1', ky_hop_id: KY_HOP, uy_vien_id: UY_VIEN, trang_thai: 'Có mặt', ghi_chu: null },
  ]);
  qc.setQueryData<MttqDiemDanhMatrixRow[]>(queryKeys.mttqDiemDanhUyVien.byNhiemKy(NHIEM_KY), [
    { ky_hop_id: KY_HOP, uy_vien_id: UY_VIEN, trang_thai: 'Có mặt' },
  ]);
  qc.setQueryData<MttqUyVienUyBanListRow[]>(queryKeys.mttqUyVienUyBan.all, [uyVien(), uyVien({ id: 'uv-2' })]);
  qc.setQueryData<MttqUyVienUyBanListRow[]>(queryKeys.mttqUyVienUyBan.byNhiemKy(NHIEM_KY), [uyVien()]);
  qc.setQueryData<MttqKyHop[]>(queryKeys.mttqKyHop.all, [kyHop(), kyHop({ id: 'kh-2' })]);
  qc.setQueryData<MttqKyHop>(queryKeys.mttqKyHop.detail(KY_HOP), kyHop());
  return qc;
}

describe('apDungPatchDiemDanh', () => {
  it('đổi Có mặt → Vắng mặt: patch cả 4 nhánh cache', () => {
    const qc = dungCache();
    apDungPatchDiemDanh(qc, {
      kyHopId: KY_HOP,
      uyVienId: UY_VIEN,
      trangThai: 'Vắng mặt',
      nhiemKyId: NHIEM_KY,
    });

    expect(
      qc.getQueryData<MttqDiemDanhUyVien[]>(queryKeys.mttqDiemDanhUyVien.byKyHop(KY_HOP))![0].trang_thai,
    ).toBe('Vắng mặt');
    expect(
      qc.getQueryData<MttqDiemDanhMatrixRow[]>(queryKeys.mttqDiemDanhUyVien.byNhiemKy(NHIEM_KY))![0].trang_thai,
    ).toBe('Vắng mặt');

    const uv = qc.getQueryData<MttqUyVienUyBanListRow[]>(queryKeys.mttqUyVienUyBan.all)!;
    expect(uv[0]).toMatchObject({ diem_danh_co_mat: 2, diem_danh_vang_mat: 2, diem_danh_chua: 2 });
    expect(uv[1]).toMatchObject({ diem_danh_co_mat: 3, diem_danh_vang_mat: 1 });

    const kh = qc.getQueryData<MttqKyHop[]>(queryKeys.mttqKyHop.all)!;
    expect(kh[0]).toMatchObject({ diem_danh_co_mat: 9, diem_danh_vang_mat: 5, diem_danh_chua: 6 });
    expect(kh[1]).toMatchObject({ diem_danh_co_mat: 10 });

    expect(qc.getQueryData<MttqKyHop>(queryKeys.mttqKyHop.detail(KY_HOP))).toMatchObject({
      diem_danh_co_mat: 9,
      diem_danh_vang_mat: 5,
    });
  });

  it('điểm danh lần đầu: ô "chưa" giảm, thêm dòng mới vào cả 2 danh sách', () => {
    const qc = dungCache();
    apDungPatchDiemDanh(qc, {
      kyHopId: KY_HOP,
      uyVienId: 'uv-2',
      trangThai: 'Có mặt',
      nhiemKyId: NHIEM_KY,
    });

    expect(qc.getQueryData<MttqDiemDanhUyVien[]>(queryKeys.mttqDiemDanhUyVien.byKyHop(KY_HOP))).toHaveLength(2);
    expect(qc.getQueryData<MttqDiemDanhMatrixRow[]>(queryKeys.mttqDiemDanhUyVien.byNhiemKy(NHIEM_KY))).toHaveLength(2);

    const uv = qc.getQueryData<MttqUyVienUyBanListRow[]>(queryKeys.mttqUyVienUyBan.all)!;
    expect(uv[1]).toMatchObject({ diem_danh_co_mat: 4, diem_danh_vang_mat: 1, diem_danh_chua: 1 });

    const kh = qc.getQueryData<MttqKyHop[]>(queryKeys.mttqKyHop.all)!;
    expect(kh[0]).toMatchObject({ diem_danh_co_mat: 11, diem_danh_vang_mat: 4, diem_danh_chua: 5 });
  });

  it('bấm lại đúng trạng thái đang có: ô đếm đứng yên', () => {
    const qc = dungCache();
    apDungPatchDiemDanh(qc, {
      kyHopId: KY_HOP,
      uyVienId: UY_VIEN,
      trangThai: 'Có mặt',
      nhiemKyId: NHIEM_KY,
    });
    expect(qc.getQueryData<MttqKyHop[]>(queryKeys.mttqKyHop.all)![0]).toMatchObject({
      diem_danh_co_mat: 10,
      diem_danh_vang_mat: 4,
      diem_danh_chua: 6,
    });
  });

  it('mở thẳng trang Ma trận (chưa có cache theo kỳ họp) vẫn tính đúng delta', () => {
    const qc = new QueryClient();
    qc.setQueryData<MttqDiemDanhMatrixRow[]>(queryKeys.mttqDiemDanhUyVien.byNhiemKy(NHIEM_KY), [
      { ky_hop_id: KY_HOP, uy_vien_id: UY_VIEN, trang_thai: 'Có mặt' },
    ]);
    qc.setQueryData<MttqKyHop[]>(queryKeys.mttqKyHop.all, [kyHop()]);

    apDungPatchDiemDanh(qc, {
      kyHopId: KY_HOP,
      uyVienId: UY_VIEN,
      trangThai: 'Vắng mặt',
      nhiemKyId: NHIEM_KY,
    });

    // Không được coi là "điểm danh lần đầu" (sẽ trừ nhầm ô chưa điểm danh).
    expect(qc.getQueryData<MttqKyHop[]>(queryKeys.mttqKyHop.all)![0]).toMatchObject({
      diem_danh_co_mat: 9,
      diem_danh_vang_mat: 5,
      diem_danh_chua: 6,
    });
  });

  it('không có nhiemKyId thì bỏ qua ma trận, các nhánh còn lại vẫn patch', () => {
    const qc = dungCache();
    apDungPatchDiemDanh(qc, { kyHopId: KY_HOP, uyVienId: UY_VIEN, trangThai: 'Vắng mặt' });
    expect(
      qc.getQueryData<MttqDiemDanhMatrixRow[]>(queryKeys.mttqDiemDanhUyVien.byNhiemKy(NHIEM_KY))![0].trang_thai,
    ).toBe('Có mặt');
    expect(qc.getQueryData<MttqKyHop[]>(queryKeys.mttqKyHop.all)![0]).toMatchObject({ diem_danh_vang_mat: 5 });
  });
});

describe('hoanNguyenPatchDiemDanh', () => {
  it('trả mọi nhánh cache về đúng trạng thái trước khi tick', () => {
    const qc = dungCache();
    const truoc = {
      kyHop: qc.getQueryData(queryKeys.mttqDiemDanhUyVien.byKyHop(KY_HOP)),
      nhiemKy: qc.getQueryData(queryKeys.mttqDiemDanhUyVien.byNhiemKy(NHIEM_KY)),
      uyVien: qc.getQueryData(queryKeys.mttqUyVienUyBan.all),
      uyVienNk: qc.getQueryData(queryKeys.mttqUyVienUyBan.byNhiemKy(NHIEM_KY)),
      dsKyHop: qc.getQueryData(queryKeys.mttqKyHop.all),
      chiTiet: qc.getQueryData(queryKeys.mttqKyHop.detail(KY_HOP)),
    };

    const snapshot = apDungPatchDiemDanh(qc, {
      kyHopId: KY_HOP,
      uyVienId: UY_VIEN,
      trangThai: 'Vắng mặt',
      nhiemKyId: NHIEM_KY,
    });
    hoanNguyenPatchDiemDanh(qc, snapshot);

    expect(qc.getQueryData(queryKeys.mttqDiemDanhUyVien.byKyHop(KY_HOP))).toEqual(truoc.kyHop);
    expect(qc.getQueryData(queryKeys.mttqDiemDanhUyVien.byNhiemKy(NHIEM_KY))).toEqual(truoc.nhiemKy);
    expect(qc.getQueryData(queryKeys.mttqUyVienUyBan.all)).toEqual(truoc.uyVien);
    expect(qc.getQueryData(queryKeys.mttqUyVienUyBan.byNhiemKy(NHIEM_KY))).toEqual(truoc.uyVienNk);
    expect(qc.getQueryData(queryKeys.mttqKyHop.all)).toEqual(truoc.dsKyHop);
    expect(qc.getQueryData(queryKeys.mttqKyHop.detail(KY_HOP))).toEqual(truoc.chiTiet);
  });

  it('hoàn nguyên được cả dòng vừa thêm mới (điểm danh lần đầu)', () => {
    const qc = dungCache();
    const snapshot = apDungPatchDiemDanh(qc, {
      kyHopId: KY_HOP,
      uyVienId: 'uv-2',
      trangThai: 'Có mặt',
      nhiemKyId: NHIEM_KY,
    });
    hoanNguyenPatchDiemDanh(qc, snapshot);
    expect(qc.getQueryData<MttqDiemDanhUyVien[]>(queryKeys.mttqDiemDanhUyVien.byKyHop(KY_HOP))).toHaveLength(1);
    expect(qc.getQueryData<MttqUyVienUyBanListRow[]>(queryKeys.mttqUyVienUyBan.all)![1]).toMatchObject({
      diem_danh_co_mat: 3,
      diem_danh_chua: 2,
    });
  });

  it('N lần tick liên tiếp rồi hoàn nguyên lần cuối chỉ lùi đúng 1 bước', () => {
    const qc = dungCache();
    apDungPatchDiemDanh(qc, { kyHopId: KY_HOP, uyVienId: UY_VIEN, trangThai: 'Vắng mặt', nhiemKyId: NHIEM_KY });
    const snapshot2 = apDungPatchDiemDanh(qc, {
      kyHopId: KY_HOP,
      uyVienId: 'uv-2',
      trangThai: 'Có mặt',
      nhiemKyId: NHIEM_KY,
    });
    hoanNguyenPatchDiemDanh(qc, snapshot2);

    // Lần tick đầu (uv-1) phải còn nguyên.
    const uv = qc.getQueryData<MttqUyVienUyBanListRow[]>(queryKeys.mttqUyVienUyBan.all)!;
    expect(uv[0]).toMatchObject({ diem_danh_co_mat: 2, diem_danh_vang_mat: 2 });
    expect(uv[1]).toMatchObject({ diem_danh_co_mat: 3, diem_danh_chua: 2 });
    expect(qc.getQueryData<MttqKyHop[]>(queryKeys.mttqKyHop.all)![0]).toMatchObject({
      diem_danh_co_mat: 9,
      diem_danh_vang_mat: 5,
      diem_danh_chua: 6,
    });
  });

  it('snapshot rỗng (undefined) không làm gì', () => {
    const qc = dungCache();
    expect(() => hoanNguyenPatchDiemDanh(qc, undefined)).not.toThrow();
  });
});
