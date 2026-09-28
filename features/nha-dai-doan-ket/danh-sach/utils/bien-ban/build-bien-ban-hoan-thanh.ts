import type { NddkNguoiThamGia } from '../../core/types';
import {
  DOTS_LONG,
  DOTS_MEDIUM,
  DOTS_SHORT,
  TINH_MAC_DINH,
  doan,
  f,
  ngayThangNam,
  soVN,
  t,
  tenThonDayDu,
  tenXaDayDu,
  type BienBanBlock,
  type BienBanModel,
} from './bien-ban-model';
import type { BienBanNguon } from './build-bien-ban-khao-sat';

export const TIEU_DE_HOAN_THANH = 'Biên bản kiểm tra việc hoàn thành xây dựng (sửa chữa) nhà ở';

/** Mẫu gốc chừa 3 dòng cho đại diện thôn và 3 dòng cho nguồn khác. */
const SO_DONG_TRONG = 3;

function ongBa(p: NddkNguoiThamGia | null | undefined, prefix = ''): BienBanBlock {
  return doan([
    t(`${prefix}Ông (bà): `),
    f(p?.ho_ten, DOTS_MEDIUM),
    t('   Chức vụ: '),
    f(p?.chuc_vu, DOTS_MEDIUM),
  ]);
}

/**
 * Biên bản kiểm tra hoàn thành — bám mẫu "BB Hoàn thành" của cơ quan.
 *
 * Danh sách có dữ liệu (đại diện thôn, nguồn khác) thì in đúng số dòng đã nhập;
 * chưa nhập gì thì in đủ 3 dòng chấm như mẫu giấy để viết tay.
 */
export function buildBienBanHoanThanh({ nddk, ho }: BienBanNguon): BienBanModel {
  const bb = nddk.bien_ban;
  const tp = bb?.thanh_phan_kiem_tra ?? null;
  const tenXa = tenXaDayDu(nddk.ten_xa_phuong ?? ho?.ten_xa_phuong);
  const thon = tenThonDayDu(nddk.khoi_xom ?? ho?.khoi_xom);

  const blocks: BienBanBlock[] = [
    { kind: 'quoc-hieu' },
    {
      kind: 'tieu-de',
      lines: [
        { text: 'BIÊN BẢN', bold: true, size: 'lg' },
        { text: 'KIỂM TRA VIỆC HOÀN THÀNH XÂY DỰNG (SỬA CHỮA) NHÀ Ở', bold: true },
      ],
    },
    doan([t(`Hôm nay, ${ngayThangNam(bb?.ngay_kiem_tra_hoan_thanh)}`)]),
    doan([t('Tại công trình xây dựng nhà ở của chủ hộ '), f(nddk.ho_ten_chu_ho, DOTS_MEDIUM)]),
    doan([
      t('Địa chỉ: '),
      f(thon, DOTS_SHORT),
      t(', '),
      f(tenXa, DOTS_SHORT),
      t(`, tỉnh ${TINH_MAC_DINH}.`),
    ]),

    doan([t('I. Thành phần kiểm tra:')], { bold: true }),
    doan([t('1. Đại diện Ban Chỉ đạo xã/phường: '), f(tenXa, DOTS_MEDIUM)]),
    ongBa(tp?.bcd),
    doan([t('2. Đại diện Uỷ ban nhân dân xã/phường: '), f(tenXa, DOTS_MEDIUM)]),
    ongBa(tp?.ubnd),
    doan([t('3. Đại diện Mặt trận Tổ quốc xã/phường: '), f(tenXa, DOTS_MEDIUM)]),
    ongBa(tp?.mttq),
    doan([t('4. Đại diện thôn/khối/xóm/bản: '), f(thon, DOTS_MEDIUM)]),
  ];

  const thonRows: (NddkNguoiThamGia | null)[] =
    tp && tp.thon.length > 0 ? tp.thon : Array.from({ length: SO_DONG_TRONG }, () => null);
  for (const p of thonRows) blocks.push(ongBa(p, '- '));

  blocks.push(
    doan([t('5. Đại diện hộ gia đình:')]),
    doan([t('- Ông (bà): '), f(nddk.ho_ten_chu_ho, DOTS_LONG)]),

    doan([t('II. Nội dung')], { bold: true }),
    doan(
      [
        t(
          'Sau khi kiểm tra, xem xét thực tế công trình nhà ở đã hoàn thành, các thành phần tham gia kiểm tra đã thống nhất các nội dung sau:',
        ),
      ],
      { indent: true, align: 'justify' },
    ),
    doan([t('1. Loại hình thực hiện (xây mới hoặc sửa chữa): '), f(nddk.loai_hinh_ho_tro, DOTS_MEDIUM)]),
    doan([
      t('2. Về khối lượng: Đã hoàn thành việc xây dựng (xây mới hoặc sửa chữa) nhà ở với diện tích sàn '),
      f(soVN(bb?.dien_tich_san), DOTS_SHORT),
      t(' m²'),
    ]),
    doan([t('- Phần nền: '), f(bb?.phan_nen, DOTS_LONG)]),
    doan([t('- Phần mái: '), f(bb?.phan_mai, DOTS_LONG)]),
    doan([t('- Phần khung, tường bao: '), f(bb?.phan_khung_tuong, DOTS_LONG)]),
    doan([
      t(
        '3. Về chất lượng: Đảm bảo 03 cứng, an toàn, thẩm mỹ, chất lượng, đủ điều kiện đưa vào sử dụng.',
      ),
    ]),
    doan([
      t('4. Tổng giá trị xây dựng/sửa chữa: '),
      f(soVN(bb?.tong_gia_tri), DOTS_MEDIUM),
      t(' đồng, trong đó:'),
    ]),
    doan([
      t('- Nguồn hỗ trợ từ Chương trình: '),
      f(soVN(nddk.so_tien), DOTS_MEDIUM),
      t(' đồng;'),
    ]),
  );

  const nguonKhac = bb?.nguon_khac ?? [];
  if (nguonKhac.length > 0) {
    for (const n of nguonKhac) {
      blocks.push(
        doan([t('- Nguồn: '), f(n.ten, DOTS_MEDIUM), t(': '), f(soVN(n.so_tien), DOTS_SHORT), t(' đồng.')]),
      );
    }
  } else {
    for (let i = 0; i < SO_DONG_TRONG; i += 1) {
      blocks.push(doan([t('- Nguồn: '), f(null, DOTS_LONG), t(' đồng.')]));
    }
  }

  blocks.push(
    doan([t('III. Kết luận:')], { bold: true }),
    doan(
      [
        t(
          'Công trình đã hoàn thành, đảm bảo chất lượng theo yêu cầu. Tổng kinh phí thực hiện lớn hơn kinh phí được Chương trình hỗ trợ.',
        ),
      ],
      { indent: true, align: 'justify' },
    ),
    doan(
      [
        t('Biên bản lập thành '),
        f(null, 8),
        t(' bản lưu tại Ủy ban MTTQ cấp xã, '),
        f(null, DOTS_MEDIUM),
      ],
      { indent: true },
    ),
    {
      kind: 'chu-ky',
      cols: [{ title: 'CÁC THÀNH PHẦN THAM GIA KIỂM TRA', note: '(Ký và ghi rõ họ tên)' }],
    },
  );

  return { tieuDe: TIEU_DE_HOAN_THANH, blocks };
}
