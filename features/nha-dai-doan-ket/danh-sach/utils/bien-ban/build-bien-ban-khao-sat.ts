import type { HoNgheo } from '@/features/nha-dai-doan-ket/thong-tin-ho-ngheo/core/types';
import type { NhaDaiDoanKet } from '../../core/types';
import {
  DOTS_LONG,
  DOTS_MEDIUM,
  DOTS_SHORT,
  diaDanhXa,
  doan,
  dongDiaDanhNgay,
  f,
  t,
  tenThonDayDu,
  tenXaDayDu,
  type BienBanBlock,
  type BienBanModel,
} from './bien-ban-model';

/** Dữ liệu đầu vào chung của 3 builder. `ho` null khi hồ sơ cũ chưa gắn hộ. */
export interface BienBanNguon {
  nddk: NhaDaiDoanKet;
  ho: HoNgheo | null;
}

export const TIEU_DE_KHAO_SAT = 'Phiếu khảo sát hộ nghèo, hộ cận nghèo, hộ khó khăn về nhà ở';

/** Mục 12 — đối tượng khó khăn về nhà ở, đúng thứ tự trên mẫu. */
const DOI_TUONG: { value: string; label: string }[] = [
  { value: 'Hộ nghèo', label: 'Hộ nghèo' },
  { value: 'Cận nghèo', label: 'Hộ cận nghèo' },
  { value: 'Khó khăn', label: 'Hộ khó khăn' },
];

/** Mục 16 — tình trạng đất ở. */
const TINH_TRANG_DAT: { value: string; label: string }[] = [
  { value: 'Có GCN QSDĐ', label: 'Có Giấy chứng nhận quyền sử dụng đất' },
  { value: 'Chưa có GCN QSDĐ', label: 'Chưa có Giấy chứng nhận quyền sử dụng đất' },
];

/** Mục 19 — nhu cầu cần hỗ trợ. */
const NHU_CAU: { value: string; label: string }[] = [
  { value: 'Xây dựng nhà lắp ghép', label: 'Hỗ trợ xây dựng nhà lắp ghép' },
  { value: 'Gia đình tự xây mới', label: 'Hỗ trợ gia đình tự xây mới' },
  { value: 'Gia đình tự sửa chữa', label: 'Hỗ trợ gia đình tự sửa chữa' },
];

function luaChon(
  so: string,
  label: string,
  danhMuc: { value: string; label: string }[],
  chon: string | null | undefined,
  layout: 'inline' | 'stack',
): BienBanBlock {
  return {
    kind: 'lua-chon',
    label: [t(`${so}. ${label}:`)],
    options: danhMuc.map((d) => ({ label: d.label, checked: d.value === chon })),
    layout,
  };
}

/**
 * Phiếu khảo sát — bám mẫu "BB Khảo sát" của cơ quan.
 *
 * Mẫu gốc đánh số trùng hai mục 14 (Tôn giáo / Đối tượng ưu tiên); ở đây đánh
 * lại liền mạch 1 → 20.
 */
export function buildBienBanKhaoSat({ nddk, ho }: BienBanNguon): BienBanModel {
  const nk = ho?.nhan_khau;
  const bb = nddk.bien_ban;
  const doiTuong = nddk.doi_tuong ?? ho?.doi_tuong ?? null;

  const blocks: BienBanBlock[] = [
    {
      kind: 'tieu-de',
      lines: [
        { text: 'PHIẾU KHẢO SÁT', bold: true, size: 'lg' },
        { text: 'HỘ NGHÈO, HỘ CẬN NGHÈO, HỘ KHÓ KHĂN VỀ NHÀ Ở', bold: true },
        { text: '------', bold: true },
      ],
    },
    doan([
      t('1. Họ tên chủ hộ: '),
      f(nddk.ho_ten_chu_ho, DOTS_MEDIUM),
      t('   2. Giới tính: '),
      f(nk?.gioi_tinh, 10),
      t('   3. Năm sinh: '),
      f(nk?.nam_sinh, 12),
    ]),
    doan([t('4. Số Căn cước: '), f(ho?.so_cccd, DOTS_LONG)]),
    doan([t('5. Họ tên vợ hoặc chồng: '), f(nk?.ho_ten_vo_chong, DOTS_LONG)]),
    doan([t('6. Số lượng nhân khẩu: '), f(nk?.so_nhan_khau, DOTS_LONG)]),
    doan([t('7. Số điện thoại liên hệ: '), f(ho?.dien_thoai, DOTS_LONG)]),
    doan([
      t('8. Hộ khẩu thường trú: Thôn/bản/khối/xóm: '),
      f(tenThonDayDu(nddk.khoi_xom ?? ho?.khoi_xom), DOTS_MEDIUM),
      t(', xã/phường: '),
      f(tenXaDayDu(nddk.ten_xa_phuong ?? ho?.ten_xa_phuong), DOTS_MEDIUM),
    ]),
    doan([t('9. Nghề nghiệp: '), f(nk?.nghe_nghiep, DOTS_LONG)]),
    doan([t('10. Trình độ học vấn: '), f(nk?.trinh_do_hoc_van, DOTS_LONG)]),
    doan([
      t('11. Tình trạng việc làm (có việc làm/không có việc làm/đang đi học): '),
      f(nk?.tinh_trang_viec_lam, DOTS_SHORT),
    ]),
    luaChon('12', 'Đối tượng khó khăn về nhà ở', DOI_TUONG, doiTuong, 'inline'),
    doan([
      t('13. Dân tộc: '),
      f(ho?.ten_dan_toc, DOTS_MEDIUM),
      t('   14. Tôn giáo: '),
      f(ho?.ton_giao, DOTS_MEDIUM),
    ]),
    doan([t('15. Đối tượng ưu tiên: '), f(nk?.doi_tuong_uu_tien, DOTS_LONG)]),
    luaChon('16', 'Tình trạng đất ở', TINH_TRANG_DAT, nk?.tinh_trang_dat, 'stack'),
    doan([t('17. Hiện trạng nhà ở: '), f(bb?.hien_trang_nha, DOTS_LONG)]),
    doan([t('18. Hoàn cảnh gia đình: '), f(bb?.hoan_canh_gia_dinh, DOTS_LONG)]),
    luaChon('19', 'Nhu cầu cần hỗ trợ', NHU_CAU, bb?.nhu_cau_ho_tro, 'stack'),
    doan([t('20. Ghi chú: '), f(bb?.ghi_chu_khao_sat, DOTS_LONG)]),
  ];
  // Mẫu gốc chừa thêm một dòng trống cho ghi chú viết tay.
  if (!bb?.ghi_chu_khao_sat) blocks.push(doan([f(null, DOTS_LONG + 14)]));

  blocks.push({
    kind: 'chu-ky',
    diaDanhNgay: dongDiaDanhNgay(diaDanhXa(nddk.ten_xa_phuong), bb?.ngay_khao_sat),
    nhomDau: { text: 'ĐẠI DIỆN TỔ CÔNG TÁC', span: 3 },
    cols: [
      { title: 'Bí thư Chi bộ', note: '(Ký, ghi rõ họ tên)' },
      { title: 'Xóm trưởng', note: '(Ký, ghi rõ họ tên)' },
      { title: 'Trưởng ban CTMT', note: '(Ký, ghi rõ họ tên)' },
      { title: 'Đại diện chủ hộ', note: '(Ký, ghi rõ họ tên)', hoTen: nddk.ho_ten_chu_ho },
    ],
  });

  return { tieuDe: TIEU_DE_KHAO_SAT, blocks };
}
