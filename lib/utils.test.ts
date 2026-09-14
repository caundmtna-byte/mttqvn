import { describe, it, expect } from 'vitest';
import { getErrorMessage } from './utils';
import { __ERROR_MESSAGE_TABLES } from './supabase/error-messages';

const { FALLBACK } = __ERROR_MESSAGE_TABLES;

/**
 * `getErrorMessage` là cổng chung của ~118 điểm `toast.error`. Trước đây nhánh
 * cuối trả thẳng `err.message`, nên lỗi tiếng Anh của thư viện ngoài (xlsx,
 * jspdf, Cloudinary, Edge Function) lọt nguyên văn ra toast.
 */
describe('getErrorMessage — không để lọt tiếng Anh', () => {
  it.each([
    'Maximum call stack size exceeded',
    'Cannot read properties of undefined (reading "length")',
    'File size too large',
    'admin-user resetPassword failed',
  ])('«%s» → câu mặc định tiếng Việt', (raw) => {
    expect(getErrorMessage(new Error(raw))).toBe(FALLBACK);
  });

  it('chuỗi trần tiếng Anh cũng bị thay', () => {
    expect(getErrorMessage('Invalid image file')).toBe(FALLBACK);
  });
});

describe('getErrorMessage — giữ nguyên câu nghiệp vụ tiếng Việt', () => {
  it.each([
    'Bài viết này đã được nhập trước đó',
    'Cán bộ này đã có trong danh sách lớp tập huấn.',
    'Tồn kho không đủ — thao tác này sẽ làm tồn kho âm.',
  ])('giữ nguyên «%s»', (raw) => {
    expect(getErrorMessage(new Error(raw))).toBe(raw);
  });

  it('vẫn ưu tiên bảng tra khi nhận ra lỗi Postgres', () => {
    const out = getErrorMessage(
      new Error('duplicate key value violates unique constraint "uq_var_chuc_vu_ten_lower"'),
    );
    expect(out).toBe('Chức vụ này đã tồn tại.');
  });

  it('message rỗng → câu mặc định', () => {
    expect(getErrorMessage(new Error(''))).toBe(FALLBACK);
    expect(getErrorMessage(undefined)).toBe(FALLBACK);
  });
});
