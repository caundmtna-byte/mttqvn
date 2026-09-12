/**
 * Đọc số tiền lương thành chữ để ghi vào quyết định nâng bậc lương.
 * Hàm thuần — sai một chữ là sai giấy tờ, nên có test đi kèm.
 */

const CHU_SO = ['không', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];

/**
 * Đọc cụm 3 chữ số. `demTramKhong` = true khi cụm này đứng sau một cụm lớn hơn
 * (lúc đó "không trăm" phải đọc ra để không nhập nhằng: 1.005.000 = "một triệu
 * không trăm lẻ năm nghìn").
 */
function docCumBaChuSo(n: number, demTramKhong: boolean): string {
  const tram = Math.floor(n / 100);
  const chuc = Math.floor((n % 100) / 10);
  const donVi = n % 10;
  const parts: string[] = [];

  if (tram > 0) parts.push(`${CHU_SO[tram]} trăm`);
  else if (demTramKhong && (chuc > 0 || donVi > 0)) parts.push('không trăm');

  if (chuc > 1) {
    parts.push(`${CHU_SO[chuc]} mươi`);
    if (donVi === 1) parts.push('mốt');
    else if (donVi === 5) parts.push('lăm');
    else if (donVi > 0) parts.push(CHU_SO[donVi]);
  } else if (chuc === 1) {
    parts.push('mười');
    if (donVi === 5) parts.push('lăm');
    else if (donVi > 0) parts.push(CHU_SO[donVi]);
  } else if (donVi > 0) {
    if (tram > 0 || demTramKhong) parts.push('lẻ');
    parts.push(CHU_SO[donVi]);
  }

  return parts.join(' ').trim();
}

/** `6300000` → `Sáu triệu ba trăm nghìn đồng`. */
export function docSoTienVND(amount: number | null | undefined): string {
  // `Number(null)` là 0 — phải chặn null/undefined trước, nếu không tiền trống
  // sẽ in thành "Không đồng" trên quyết định.
  if (amount === null || amount === undefined) return '';
  const raw = Number(amount);
  if (!Number.isFinite(raw)) return '';
  const n = Math.round(Math.abs(raw));
  if (n === 0) return 'Không đồng';

  const ty = Math.floor(n / 1_000_000_000);
  const trieu = Math.floor((n % 1_000_000_000) / 1_000_000);
  const nghin = Math.floor((n % 1_000_000) / 1_000);
  const donVi = n % 1_000;

  const parts: string[] = [];
  if (ty > 0) parts.push(`${docCumBaChuSo(ty, false)} tỷ`);
  if (trieu > 0) parts.push(`${docCumBaChuSo(trieu, ty > 0)} triệu`);
  if (nghin > 0) parts.push(`${docCumBaChuSo(nghin, ty > 0 || trieu > 0)} nghìn`);
  if (donVi > 0) parts.push(docCumBaChuSo(donVi, parts.length > 0));

  const text = parts.join(' ').replace(/\s+/g, ' ').trim();
  return `${text.charAt(0).toUpperCase()}${text.slice(1)} đồng`;
}

/** `2.34` → `2,34` — hệ số lương viết theo dấu phẩy thập phân kiểu Việt Nam. */
export function formatHeSoLuong(heSo: number | null | undefined): string {
  const n = Number(heSo);
  if (!Number.isFinite(n) || n <= 0) return '';
  return n.toFixed(2).replace('.', ',');
}
