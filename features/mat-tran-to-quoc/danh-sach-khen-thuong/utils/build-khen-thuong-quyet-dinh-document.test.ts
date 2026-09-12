import { describe, expect, it } from 'vitest';
import type { MttqCanBo } from '@/features/mat-tran-to-quoc/danh-sach-can-bo/core/types';
import type { MttqKhenThuong, MttqKhenThuongCt } from '../core/types';
import type { MttqKhenThuongViewer } from '../hooks/use-mttq-khen-thuong-viewer';
import {
  buildKhenThuongNguoiDuocKhen,
  buildKhenThuongQuyetDinhDocumentModel,
  gopDanhHieu,
  gopThanhTich,
} from './build-khen-thuong-quyet-dinh-document';

function line(over: Partial<MttqKhenThuongCt>): MttqKhenThuongCt {
  return {
    id: over.id ?? '1',
    id_khen_thuong: '100',
    can_bo_id: over.can_bo_id ?? '10',
    cap_khen_thuong: over.cap_khen_thuong ?? 'Tỉnh',
    hinh_thuc_khen: over.hinh_thuc_khen ?? 'Thường xuyên',
    danh_hieu: over.danh_hieu ?? 'Giấy khen',
    noi_dung_khen: over.noi_dung_khen ?? null,
    ho_so_khen: null,
    ten_can_bo: over.ten_can_bo ?? 'Nguyễn Văn A',
    can_bo_don_vi_id: over.can_bo_don_vi_id ?? null,
    can_bo_id_nguoi_tao: over.can_bo_id_nguoi_tao ?? null,
  };
}

function khenThuong(chiTiet: MttqKhenThuongCt[], over?: Partial<MttqKhenThuong>): MttqKhenThuong {
  return {
    id: '100',
    so_qd: over?.so_qd ?? '12',
    noi_dung_khen: over?.noi_dung_khen ?? 'Có thành tích xuất sắc trong công tác Mặt trận',
    ngay_khen_thuong: over?.ngay_khen_thuong ?? '2025-09-05',
    don_vi_de_xuat: over?.don_vi_de_xuat ?? null,
    ghi_chu: over?.ghi_chu ?? null,
    trang_thai: over?.trang_thai ?? 'Đã ban hành',
    id_nguoi_tao: '1',
    tg_tao: '2025-09-01T00:00:00Z',
    tg_cap_nhat: '2025-09-01T00:00:00Z',
    chi_tiet: chiTiet,
  };
}

const viewerXem_Het: MttqKhenThuongViewer = {
  canViewAll: true,
  chucVuCapQuanLy: null,
  viewerNhanVienId: '1',
  viewerDonViId: null,
};

const viewerXaPhuong: MttqKhenThuongViewer = {
  canViewAll: false,
  chucVuCapQuanLy: 'Xã phường',
  viewerNhanVienId: '9',
  viewerDonViId: '77',
};

describe('buildKhenThuongNguoiDuocKhen — phạm vi xem', () => {
  const lines = [
    line({ id: '1', ten_can_bo: 'A', can_bo_don_vi_id: '77' }),
    line({ id: '2', ten_can_bo: 'B', can_bo_don_vi_id: '88' }),
    line({ id: '3', ten_can_bo: 'C', can_bo_don_vi_id: '77' }),
  ];

  it('người xem toàn hệ thống thấy đủ dòng, STT liên tục', () => {
    const rows = buildKhenThuongNguoiDuocKhen(khenThuong(lines), viewerXem_Het);
    expect(rows.map((r) => r.hoTen)).toEqual(['A', 'B', 'C']);
    expect(rows.map((r) => r.stt)).toEqual([1, 2, 3]);
  });

  it('cán bộ xã chỉ thấy cán bộ cùng đơn vị — và STT đánh lại liên tục', () => {
    const rows = buildKhenThuongNguoiDuocKhen(khenThuong(lines), viewerXaPhuong);
    expect(rows.map((r) => r.hoTen)).toEqual(['A', 'C']);
    expect(rows.map((r) => r.stt)).toEqual([1, 2]);
  });

  it('cán bộ xã vẫn thấy dòng của cán bộ do mình tạo dù khác đơn vị', () => {
    const rows = buildKhenThuongNguoiDuocKhen(
      khenThuong([line({ ten_can_bo: 'D', can_bo_don_vi_id: '88', can_bo_id_nguoi_tao: '9' })]),
      viewerXaPhuong,
    );
    expect(rows.map((r) => r.hoTen)).toEqual(['D']);
  });

  it('ghép chức vụ và đơn vị công tác từ hồ sơ cán bộ', () => {
    const canBoMap = new Map<string, MttqCanBo>([
      [
        '10',
        {
          ten_chuc_vu: 'Chủ tịch',
          ten_don_vi: 'Xã Nghi Lộc',
          ten_to_chuc_arr: [],
        } as unknown as MttqCanBo,
      ],
    ]);
    const rows = buildKhenThuongNguoiDuocKhen(
      khenThuong([line({ can_bo_id: '10' })]),
      viewerXem_Het,
      canBoMap,
    );
    expect(rows[0].chucVuDonVi).toBe('Chủ tịch - Xã Nghi Lộc');
  });
});

describe('gopDanhHieu / gopThanhTich', () => {
  const rows = buildKhenThuongNguoiDuocKhen(
    khenThuong([
      line({ id: '1', danh_hieu: 'Giấy khen', noi_dung_khen: 'Thành tích X' }),
      line({ id: '2', danh_hieu: 'Bằng khen', noi_dung_khen: 'Thành tích X' }),
      line({ id: '3', danh_hieu: 'Giấy khen', noi_dung_khen: 'Thành tích X' }),
    ]),
    viewerXem_Het,
  );

  it('gộp danh hiệu không trùng lặp, giữ thứ tự xuất hiện', () => {
    expect(gopDanhHieu(rows)).toBe('Giấy khen, Bằng khen');
  });

  it('mọi dòng cùng nội dung khen thì dùng chính nội dung đó làm thành tích', () => {
    expect(gopThanhTich(rows, null, null)).toBe('Thành tích X');
  });

  it('không có nội dung khen thì dùng câu bị nhập nhầm vào so_qd', () => {
    const trong = buildKhenThuongNguoiDuocKhen(khenThuong([line({})]), viewerXem_Het);
    expect(gopThanhTich(trong, 'Có thành tích xuất sắc trong công tác Bầu cử', null)).toBe(
      'Có thành tích xuất sắc trong công tác Bầu cử',
    );
  });

  it('không có gì thì rơi về ghi chú của quyết định', () => {
    const trong = buildKhenThuongNguoiDuocKhen(khenThuong([line({})]), viewerXem_Het);
    expect(gopThanhTich(trong, null, 'Ghi chú A')).toBe('Ghi chú A');
  });
});

describe('buildKhenThuongQuyetDinhDocumentModel', () => {
  it('dựng đủ thể thức: số, ngày tháng, căn cứ, điều khoản, chữ ký', () => {
    const model = buildKhenThuongQuyetDinhDocumentModel(
      khenThuong([line({ ten_can_bo: 'A' }), line({ id: '2', ten_can_bo: 'B' })], {
        so_qd: '12',
        don_vi_de_xuat: 'Ban Dân vận',
      }),
      { viewer: viewerXem_Het },
    );

    expect(model.soKyHieu).toBe('12/QĐ-MTTQ-BTT');
    expect(model.diaDanhNgayThang).toBe('Nghệ An, ngày 05 tháng 9 năm 2025');
    expect(model.canhBaoSoQd).toBe(false);
    expect(model.canCu?.some((c) => c.includes('Ban Dân vận'))).toBe(true);
    expect(model.chuKy.chucDanh).toBeTruthy();
    expect(model.noiNhan?.length).toBeGreaterThan(0);

    const doanText = model.noiDung
      .filter((k) => k.kind === 'doan')
      .map((k) => (k.kind === 'doan' ? k.text : ''))
      .join(' ');
    expect(doanText).toContain('02 (hai)');
    expect(doanText).toContain('Điều 1.');
    expect(doanText).toContain('Điều 2.');
    expect(doanText).toContain('Điều 3.');
  });

  it('bảng người được khen bám đúng số dòng trong phạm vi xem', () => {
    const model = buildKhenThuongQuyetDinhDocumentModel(
      khenThuong([
        line({ id: '1', ten_can_bo: 'A', can_bo_don_vi_id: '77' }),
        line({ id: '2', ten_can_bo: 'B', can_bo_don_vi_id: '88' }),
      ]),
      { viewer: viewerXaPhuong },
    );
    const bang = model.noiDung.find((k) => k.kind === 'bang');
    expect(bang?.kind).toBe('bang');
    if (bang?.kind === 'bang') {
      expect(bang.rows).toHaveLength(1);
      expect(bang.rows[0][1]).toBe('A');
    }
    expect(model.rows).toHaveLength(1);
  });

  it('so_qd chứa câu văn: ô Số để trống, bật cảnh báo, câu đó thành thành tích', () => {
    const cau = 'Có thành tích xuất sắc trong công tác Bầu cử';
    const model = buildKhenThuongQuyetDinhDocumentModel(
      khenThuong([line({})], { so_qd: cau }),
      { viewer: viewerXem_Het },
    );
    expect(model.canhBaoSoQd).toBe(true);
    expect(model.soKyHieu).not.toContain('thành tích');
    expect(model.soKyHieuGon).toBe('');
    const doanText = model.noiDung
      .filter((k) => k.kind === 'doan')
      .map((k) => (k.kind === 'doan' ? k.text : ''))
      .join(' ');
    expect(doanText).toContain(cau);
  });
});
