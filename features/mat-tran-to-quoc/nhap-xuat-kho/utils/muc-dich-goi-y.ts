import {
  NXK_MUC_DICH_XUAT_HO_NGHEO,
  NXK_MUC_DICH_XUAT_MAC_DINH,
  type NhapXuatKhoLoaiPhieu,
} from '../core/constants';

const chuanHoa = (s: string | null | undefined) => (s ?? '').trim().replace(/\s+/g, ' ').toLowerCase();

/**
 * Phiếu này có phải "xuất cho hộ nghèo" — khi đó BẮT BUỘC chọn đối tượng hỗ trợ.
 * So sau khi cắt hai đầu + gộp khoảng trắng + chữ thường, vì ô mục đích cho gõ tự
 * do. Bản sao của CHECK `kho_nxk_ho_ngheo_chk` dưới DB — sửa một bên phải sửa cả
 * bên kia.
 */
export function laMucDichXuatHoNgheo(
  loaiPhieu: NhapXuatKhoLoaiPhieu | null | undefined,
  mucDich: string | null | undefined,
): boolean {
  return loaiPhieu === 'xuat_ngoai' && chuanHoa(mucDich) === chuanHoa(NXK_MUC_DICH_XUAT_HO_NGHEO);
}

/**
 * Danh sách gợi ý cho ô "Mục đích" (combobox cho gõ mới).
 *
 * - Phiếu xuất: hai mục đích mặc định luôn đứng đầu, theo đúng thứ tự nghiệp vụ.
 * - Mọi loại phiếu: nối thêm mục đích đã dùng (từ DB), sắp theo locale vi.
 * - Khử trùng không phân biệt hoa thường; giá trị đang chọn luôn có mặt để ô
 *   không hiển thị trống khi sửa phiếu cũ.
 */
export function buildMucDichOptions(
  loaiPhieu: NhapXuatKhoLoaiPhieu,
  daDung: readonly string[] | null | undefined,
  hienTai?: string | null,
): string[] {
  const seen = new Set<string>();
  const dau: string[] = [];
  const add = (target: string[], raw: string | null | undefined) => {
    const v = (raw ?? '').trim().replace(/\s+/g, ' ');
    if (!v) return;
    const k = v.toLowerCase();
    if (seen.has(k)) return;
    seen.add(k);
    target.push(v);
  };

  if (loaiPhieu === 'xuat_ngoai') {
    for (const m of NXK_MUC_DICH_XUAT_MAC_DINH) add(dau, m);
  }
  const conLai: string[] = [];
  for (const m of daDung ?? []) add(conLai, m);
  add(conLai, hienTai);
  conLai.sort((a, b) => a.localeCompare(b, 'vi', { sensitivity: 'base' }));
  return [...dau, ...conLai];
}
