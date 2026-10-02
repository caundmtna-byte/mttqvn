import { describe, expect, it } from 'vitest';
import { O_CHON, O_TRONG, fileSlug, luaChon } from './bien-ban-model';
import { bienBanToRows } from './download-bien-ban-xlsx';

const DM = [
  { value: 'a', label: 'Một' },
  { value: 'b', label: 'Hai' },
  { value: 'c', label: 'Ba' },
];

function text(block: ReturnType<typeof luaChon>): string[] {
  return bienBanToRows({ tieuDe: 'x', blocks: [block] });
}

describe('luaChon', () => {
  it('chọn nhiều — tick đúng các ô có trong mảng', () => {
    expect(text(luaChon('Nhu cầu:', DM, ['a', 'c'], 'inline'))).toEqual([
      `Nhu cầu: ${O_CHON} Một   ${O_TRONG} Hai   ${O_CHON} Ba`,
    ]);
  });

  it('ô "Khác": có chữ ⇒ tự tick và in chữ; trống ⇒ dòng chấm, không tick', () => {
    const co = text(luaChon('X:', DM, null, 'inline', { value: 'Bò giống' }))[0];
    expect(co).toContain(`${O_CHON} Khác: Bò giống`);
    const khong = text(luaChon('X:', DM, null, 'inline', { value: '  ' }))[0];
    expect(khong).toMatch(new RegExp(`${O_TRONG} Khác: \\.+$`));
  });

  it('bố cục lưới: nhãn một dòng, mỗi dòng hai ô', () => {
    expect(text(luaChon('X:', DM, 'b', 'luoi', { value: null }))).toEqual([
      'X:',
      `    ${O_TRONG} Một   ${O_CHON} Hai`,
      `    ${O_TRONG} Ba   ${O_TRONG} Khác: ${'.'.repeat(18)}`,
    ]);
  });
});

describe('fileSlug', () => {
  it('bỏ dấu, đ → d, khoảng trắng → _', () => {
    expect(fileSlug('Phiếu khảo sát — Đặng Thị Thanh')).toBe('Phieu_khao_sat_Dang_Thi_Thanh');
  });
});
