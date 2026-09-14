import { describe, it, expect, beforeAll } from 'vitest';
import { z } from 'zod';
import { applyZodVietnameseErrors } from './zod-vi';

beforeAll(() => {
  applyZodVietnameseErrors();
});

/** Lấy câu lỗi của field đầu tiên. */
function loi(schema: z.ZodType, input: unknown): string {
  const r = schema.safeParse(input);
  expect(r.success).toBe(false);
  return r.error!.issues[0]!.message;
}

describe('câu tiếng Việt cho từng loại lỗi zod', () => {
  it('ô bắt buộc bỏ trống -> "Vui lòng nhập thông tin."', () => {
    expect(loi(z.string().min(1), '')).toBe('Vui lòng nhập thông tin.');
    expect(loi(z.string(), undefined)).toBe('Vui lòng nhập thông tin.');
  });

  it('chuỗi ngắn hơn ngưỡng > 1 -> nêu số ký tự', () => {
    expect(loi(z.string().min(6), 'abc')).toBe('Phải có ít nhất 6 ký tự.');
  });

  it('chuỗi quá dài -> nêu giới hạn', () => {
    expect(loi(z.string().max(2000), 'x'.repeat(2001))).toBe(
      'Chỉ được nhập tối đa 2000 ký tự.',
    );
  });

  it('số ngoài khoảng', () => {
    expect(loi(z.number().min(10), 1)).toBe('Giá trị phải từ 10 trở lên.');
    expect(loi(z.number().max(100), 101)).toBe('Giá trị không được vượt quá 100.');
  });

  it('mảng chi tiết rỗng', () => {
    expect(loi(z.array(z.string()).min(1), [])).toBe('Phải có ít nhất 1 dòng.');
  });

  it('z.enum sai lựa chọn -> câu chọn lại trong danh sách', () => {
    expect(loi(z.enum(['Phiếu nhập', 'Phiếu xuất']), 'Phiếu lạ')).toBe(
      'Giá trị chưa hợp lệ. Vui lòng chọn lại trong danh sách.',
    );
  });

  it('sai định dạng', () => {
    expect(loi(z.string().email(), 'abc')).toBe('Địa chỉ email chưa đúng định dạng.');
    expect(loi(z.string().url(), 'abc')).toBe('Đường dẫn chưa đúng định dạng.');
    expect(loi(z.string().regex(/^\d+$/), 'abc')).toBe('Nội dung nhập chưa đúng định dạng.');
  });

  it('sai kiểu dữ liệu (không phải bỏ trống)', () => {
    expect(loi(z.string(), 123)).toBe('Giá trị chưa hợp lệ.');
  });
});

describe('không ghi đè message module đã viết tay', () => {
  it('giữ nguyên câu nghiệp vụ của schema', () => {
    const schema = z.string().min(1, { message: 'Vui lòng nhập tên hàng hoá' });
    expect(loi(schema, '')).toBe('Vui lòng nhập tên hàng hoá');
  });

  it('giữ nguyên câu của .refine()', () => {
    const schema = z
      .object({ tu: z.number(), den: z.number() })
      .refine((v) => v.den >= v.tu, { message: 'Năm kết thúc phải bằng hoặc sau năm bắt đầu' });
    expect(loi(schema, { tu: 2026, den: 2020 })).toBe(
      'Năm kết thúc phải bằng hoặc sau năm bắt đầu',
    );
  });
});

describe('bất biến: không lọt chuỗi tiếng Anh kỹ thuật', () => {
  const TIENG_ANH = /expected|Invalid|Too small|Too big|received|character|option|input/i;

  it('mọi câu sinh ra đều không chứa thuật ngữ tiếng Anh của zod', () => {
    const schema = z.object({
      a: z.string().min(1),
      b: z.string().min(5),
      c: z.string().max(3),
      d: z.enum(['x', 'y']),
      e: z.string(),
      f: z.number().min(10),
      g: z.string().email(),
      h: z.array(z.string()).min(1),
      i: z.string().url(),
      j: z.number().max(5),
    });
    const r = schema.safeParse({ a: '', b: 'ab', c: 'abcd', d: 'z', f: 1, g: 'a', h: [], i: 'a', j: 9 });
    expect(r.success).toBe(false);
    expect(r.error!.issues.length).toBeGreaterThan(8);
    for (const issue of r.error!.issues) {
      expect(issue.message, `issue ${issue.code}`).not.toMatch(TIENG_ANH);
    }
  });
});
