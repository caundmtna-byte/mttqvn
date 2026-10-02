import { docSoTienVND } from '@/features/mat-tran-to-quoc/danh-sach-tang-luong/utils/luong-bang-chu';
import {
  DOTS_LONG,
  DOTS_MEDIUM,
  DOTS_SHORT,
  diaChiDayDu,
  doan,
  f,
  ngayGach,
  ngayThangNam,
  soVN,
  t,
  tenXaDayDu,
  type BienBanBlock,
  type BienBanModel,
} from '@/lib/bien-ban/bien-ban-model';
import type { BienBanNguon } from './build-bien-ban-khao-sat';

export const TIEU_DE_BAN_GIAO = 'Biên bản bàn giao tiền mặt hỗ trợ xây mới (sửa chữa) nhà ở';

const QUY = 'Ban Vận động Quỹ “Vì người nghèo”';

/** "Xây mới" → "xây mới" để ghép vào câu "…mục đích xây mới nhà ở". */
function mucDich(loaiHinh: string | null | undefined): string | null {
  const s = loaiHinh?.trim();
  return s ? s.charAt(0).toLowerCase() + s.slice(1) : null;
}

/**
 * Số quyết định: người dùng gõ đủ "12/QĐ-BVĐ" hay chỉ "12" đều in đúng; trống
 * thì giữ khung "………/QĐ-BVĐ" của mẫu.
 */
function soQuyetDinh(so: string | null | undefined): string {
  const s = so?.trim();
  if (!s) return '………/QĐ-BVĐ';
  return s.includes('/') ? s : `${s}/QĐ-BVĐ`;
}

/** Biên bản bàn giao tiền mặt — bám mẫu "BB Bàn giao" của cơ quan. */
export function buildBienBanBanGiao({ nddk, ho }: BienBanNguon): BienBanModel {
  const bb = nddk.bien_ban;
  const nk = ho?.nhan_khau;
  const tenXa = tenXaDayDu(nddk.ten_xa_phuong ?? ho?.ten_xa_phuong);
  const chuHo = nddk.ho_ten_chu_ho?.trim() || null;
  const soTien = soVN(nddk.so_tien);
  const bangChu = docSoTienVND(nddk.so_tien) || null;

  const blocks: BienBanBlock[] = [
    { kind: 'quoc-hieu' },
    {
      kind: 'tieu-de',
      lines: [
        { text: 'BIÊN BẢN BÀN GIAO TIỀN MẶT', bold: true, size: 'lg' },
        { text: 'hỗ trợ xây mới (hoặc sửa chữa) nhà ở cho hộ người nghèo, cận nghèo', bold: true },
        { text: 'hộ có hoàn cảnh khó khăn về nhà ở', bold: true },
      ],
    },
    doan([
      t(`Hôm nay, ${ngayThangNam(bb?.ngay_ban_giao)} tại `),
      f(bb?.dia_diem_ban_giao, DOTS_MEDIUM),
      t(', chúng tôi gồm:'),
    ]),

    doan([t(`BÊN GIAO TIỀN: ${QUY} `, { bold: true }), f(tenXa, DOTS_SHORT)]),
    doan([t('Đại diện: Ông (bà) '), f(bb?.ban_giao_ho_ten, DOTS_LONG)]),
    doan([t('Chức vụ: '), f(bb?.ban_giao_chuc_vu, DOTS_LONG)]),

    doan([t('BÊN NHẬN TIỀN:', { bold: true })]),
    doan([t('Ông (Bà): '), f(chuHo, DOTS_LONG)]),
    doan([
      t('Số Căn cước: '),
      f(ho?.so_cccd, DOTS_SHORT),
      t('   Ngày cấp: '),
      f(ngayGach(nk?.ngay_cap_cccd), 14),
      t('   Nơi cấp: '),
      f(nk?.noi_cap_cccd, DOTS_SHORT),
    ]),
    doan([
      t('Nơi thường trú: '),
      f(diaChiDayDu(nddk.khoi_xom ?? ho?.khoi_xom ?? null, nddk.ten_xa_phuong ?? ho?.ten_xa_phuong ?? null), DOTS_LONG),
    ]),

    doan([
      t('BÊN LÀM CHỨNG ', { bold: true }),
      t('(cán bộ khối, xóm, thôn, bản):', { italic: true }),
    ]),
    doan([
      t('Ông (Bà): '),
      f(bb?.lam_chung_ho_ten, DOTS_MEDIUM),
      t('   Chức vụ: '),
      f(bb?.lam_chung_chuc_vu, DOTS_SHORT),
    ]),

    doan(
      [
        t(`Căn cứ Quyết định số ${soQuyetDinh(bb?.so_quyet_dinh)} ngày `),
        f(ngayGach(bb?.ngay_quyet_dinh), 14),
        t(` của ${QUY} `),
        f(tenXa, DOTS_SHORT),
        t(' về việc hỗ trợ kinh phí xây dựng/sửa chữa nhà ở.'),
      ],
      { indent: true, align: 'justify' },
    ),
    doan(
      [
        t('Ban Vận động “Quỹ Vì người nghèo” '),
        f(tenXa, DOTS_SHORT),
        t(' đã tiến hành bàn giao cho ông (bà) '),
        f(chuHo, DOTS_MEDIUM),
        t(' tổng số tiền là: '),
        f(soTien, DOTS_SHORT),
        t(' VNĐ (bằng chữ: '),
        f(bangChu, DOTS_MEDIUM),
        t(') để sử dụng vào mục đích '),
        f(mucDich(nddk.loai_hinh_ho_tro), 10),
        t(' nhà ở.'),
      ],
      { indent: true, align: 'justify' },
    ),
    doan(
      [
        t('Hộ gia đình ông (bà) '),
        f(chuHo, DOTS_MEDIUM),
        t(
          ` cam kết không khiếu kiện, khiếu nại và tạo mọi điều kiện pháp lý thuận lợi để ${QUY} `,
        ),
        f(tenXa, DOTS_SHORT),
        t(' hoàn tất hồ sơ thanh quyết toán theo quy định.'),
      ],
      { indent: true, align: 'justify' },
    ),
    doan(
      [
        t(
          'Giấy biên nhận được lập thành 02 (hai) bản có giá trị pháp lý như nhau, mỗi bên giữ 01 (một) bản.',
        ),
      ],
      { indent: true, align: 'justify' },
    ),
    {
      kind: 'chu-ky',
      cols: [
        { title: 'BÊN GIAO TIỀN', note: '(Ký và ghi rõ họ tên)', hoTen: bb?.ban_giao_ho_ten },
        { title: 'BÊN NHẬN TIỀN', note: '(Ký và ghi rõ họ tên)', hoTen: chuHo },
      ],
    },
    {
      kind: 'chu-ky',
      cols: [
        {
          title: 'XÁC NHẬN CỦA ĐẠI DIỆN KHỐI/THÔN/XÓM/BẢN',
          note: '(Ký, ghi rõ họ tên)',
          hoTen: bb?.lam_chung_ho_ten,
        },
      ],
    },
  ];

  return { tieuDe: TIEU_DE_BAN_GIAO, blocks };
}
