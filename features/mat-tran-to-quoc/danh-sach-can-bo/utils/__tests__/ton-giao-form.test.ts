import { describe, expect, it } from 'vitest';
import { normalizeTonGiaoFromDb, parseImportTonGiao } from '../ton-giao-form';

describe('ton-giao-form', () => {
  it('normalizeTonGiaoFromDb maps empty and legacy text', () => {
    expect(normalizeTonGiaoFromDb(null)).toBe('Không');
    expect(normalizeTonGiaoFromDb('')).toBe('Không');
    expect(normalizeTonGiaoFromDb('Không')).toBe('Không');
    expect(normalizeTonGiaoFromDb('Có')).toBe('Có');
    expect(normalizeTonGiaoFromDb('Phật giáo')).toBe('Có');
  });

  it('parseImportTonGiao defaults empty to Không', () => {
    expect(parseImportTonGiao(null)).toBe('Không');
    expect(parseImportTonGiao('')).toBe('Không');
    expect(parseImportTonGiao('Có')).toBe('Có');
  });
});
