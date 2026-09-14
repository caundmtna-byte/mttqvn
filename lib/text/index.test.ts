import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { STRINGS } from './index';

/**
 * `txt()` trả về CHÍNH CÁI KEY khi thiếu chuỗi — im lặng, không throw, không
 * cảnh báo. Một key gõ sai vì thế đi thẳng ra màn hình người dùng dưới dạng
 * `common.validationError`. Test này là cách duy nhất bắt được loại lỗi đó.
 */

const GOC = join(__dirname, '..', '..');
const THU_MUC_QUET = ['features', 'components', 'pages', 'lib', 'hooks', 'store'];
const BO_QUA = new Set(['node_modules', 'dist', '.git', 'coverage']);

function lietKeFile(dir: string, ra: string[] = []): string[] {
  for (const ten of readdirSync(dir)) {
    if (BO_QUA.has(ten)) continue;
    const duongDan = join(dir, ten);
    if (statSync(duongDan).isDirectory()) {
      lietKeFile(duongDan, ra);
    } else if (/\.tsx?$/.test(ten) && !/\.(test|spec)\.tsx?$/.test(ten)) {
      ra.push(duongDan);
    }
  }
  return ra;
}

/**
 * Chỉ bóc lời gọi `txt('key')` MỘT tham số. Dạng hai tham số `txt(key, fallback)`
 * và dạng truyền biến đều có đường thoát hợp lệ nên bỏ qua.
 */
const MOT_THAM_SO = /\btxt\(\s*(['"])([A-Za-z0-9_.]+)\1\s*\)/g;
/** Dạng `txt('key', { count })` — vẫn phải có chuỗi, chỉ khác là có biến nội suy. */
const KEM_BIEN = /\btxt\(\s*(['"])([A-Za-z0-9_.]+)\1\s*,\s*\{/g;

function bocKey(noiDung: string): string[] {
  const keys: string[] = [];
  for (const re of [MOT_THAM_SO, KEM_BIEN]) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(noiDung)) !== null) keys.push(m[2]!);
  }
  return keys;
}

describe('mọi key txt() dùng trong mã nguồn đều có chuỗi tiếng Việt', () => {
  it('không có key nào bị thiếu', () => {
    const thieu: string[] = [];
    let tongSoKey = 0;

    for (const thuMuc of THU_MUC_QUET) {
      for (const file of lietKeFile(join(GOC, thuMuc))) {
        const noiDung = readFileSync(file, 'utf8');
        for (const key of bocKey(noiDung)) {
          tongSoKey += 1;
          if (STRINGS[key] === undefined) {
            thieu.push(`${relative(GOC, file)} → txt('${key}')`);
          }
        }
      }
    }

    // Chốt là có quét được thật, không phải regex hỏng nên rỗng rồi xanh giả.
    expect(tongSoKey).toBeGreaterThan(500);
    expect(thieu, `Thiếu chuỗi cho ${thieu.length} key:\n${thieu.join('\n')}`).toEqual([]);
  });
});
