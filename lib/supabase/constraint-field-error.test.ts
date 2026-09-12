import { describe, it, expect, vi } from 'vitest';
import { SupabaseAppError, handleSupabaseError } from './errors';
import {
  applyConstraintErrorToForm,
  isConstraintFieldError,
  __CONSTRAINT_TO_FIELD,
} from './constraint-field-error';
import { __ERROR_MESSAGE_TABLES } from './error-messages';

/** Lỗi PostgREST thật khi thêm trùng tên phòng ban (chép từ thông báo của Postgres). */
const LOI_TRUNG_PHONG_BAN = {
  code: '23505',
  message: 'duplicate key value violates unique constraint "uq_var_phong_ban_ten_lower"',
  details: 'Key (lower(TRIM(BOTH FROM ten_phong_ban)))=(ban thường trực) already exists.',
};

function batLoi(raw: unknown): SupabaseAppError {
  try {
    handleSupabaseError(raw);
  } catch (e) {
    return e as SupabaseAppError;
  }
  throw new Error('handleSupabaseError phải ném lỗi');
}

describe('chuỗi xử lý đầy đủ: PostgREST → SupabaseAppError → ô nhập', () => {
  it('handleSupabaseError giữ lại mã lỗi và tên ràng buộc', () => {
    const err = batLoi(LOI_TRUNG_PHONG_BAN);
    expect(err).toBeInstanceOf(SupabaseAppError);
    expect(err.code).toBe('23505');
    expect(err.constraint).toBe('uq_var_phong_ban_ten_lower');
    expect(err.retryable).toBe(false);
  });

  it('nhận diện được là lỗi có ô nhập tương ứng', () => {
    expect(isConstraintFieldError(batLoi(LOI_TRUNG_PHONG_BAN))).toBe(true);
  });

  it('gắn đúng ô và đúng câu tiếng Việt', () => {
    const setError = vi.fn();
    const handled = applyConstraintErrorToForm(batLoi(LOI_TRUNG_PHONG_BAN), setError);
    expect(handled).toBe(true);
    expect(setError).toHaveBeenCalledWith('ten_phong_ban', {
      type: 'manual',
      message: 'Phòng ban này đã tồn tại.',
    });
  });

  it('lỗi không có ô tương ứng → không xử lý, để toast lo', () => {
    const setError = vi.fn();
    const err = batLoi({ code: '23503', message: 'violates foreign key constraint "abc_xyz_fkey"' });
    expect(isConstraintFieldError(err)).toBe(false);
    expect(applyConstraintErrorToForm(err, setError)).toBe(false);
    expect(setError).not.toHaveBeenCalled();
  });

  it('lỗi mạng → retryable, không phải lỗi ô nhập', () => {
    const err = batLoi(new TypeError('Failed to fetch'));
    expect(err.retryable).toBe(true);
    expect(isConstraintFieldError(err)).toBe(false);
  });
});

describe('bảng ánh xạ ô nhập', () => {
  it('mọi ràng buộc có ô nhập đều có câu tiếng Việt tương ứng', () => {
    for (const constraint of Object.keys(__CONSTRAINT_TO_FIELD)) {
      expect(
        __ERROR_MESSAGE_TABLES.BY_CONSTRAINT[constraint],
        `thiếu câu cho ${constraint}`,
      ).toBeTruthy();
    }
  });

  it('không ánh xạ nhầm sang tên ô rỗng', () => {
    for (const [c, f] of Object.entries(__CONSTRAINT_TO_FIELD)) {
      expect(f, c).toMatch(/^[a-z_]+$/);
    }
  });
});
