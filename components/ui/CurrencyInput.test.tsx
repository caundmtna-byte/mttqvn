import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React, { useState } from 'react';
import CurrencyInput from './CurrencyInput';

/**
 * Ô nhập tiền không nhóm hàng nghìn bắt cán bộ đếm số 0 để biết `500000000` là
 * năm trăm triệu hay năm tỷ. Đây là bug đã xảy ra thật trên form Nhà đại đoàn
 * kết, nên luồng gõ phím được chốt lại ở đây — `lib/number.test.ts` chỉ phủ
 * được phần đọc chuỗi, không phủ được phần gõ từng ký tự.
 */
function Harness(props: { decimalScale?: number; onChange?: (n: number | null) => void }) {
  const [v, setV] = useState<number | null>(null);
  return (
    <CurrencyInput
      label="Số tiền"
      value={v}
      decimalScale={props.decimalScale}
      onChange={(n) => {
        setV(n);
        props.onChange?.(n);
      }}
    />
  );
}

/** Gõ từng ký tự một như người dùng thật, không set thẳng cả chuỗi. */
function go(input: HTMLInputElement, chuoi: string) {
  for (const ch of chuoi) {
    fireEvent.change(input, { target: { value: input.value + ch } });
  }
}

function oNhap(): HTMLInputElement {
  return screen.getByLabelText(/Số tiền/) as HTMLInputElement;
}

describe('CurrencyInput — nhóm hàng nghìn khi gõ', () => {
  it('gõ 500000000 hiện thành 500.000.000', () => {
    render(<Harness />);
    const input = oNhap();
    go(input, '500000000');
    expect(input.value).toBe('500.000.000');
  });

  it('nhóm lại sau mỗi ký tự, không đợi gõ xong', () => {
    render(<Harness />);
    const input = oNhap();
    go(input, '1234');
    expect(input.value).toBe('1.234');
    go(input, '5');
    expect(input.value).toBe('12.345');
  });

  it('trả về số thực cho form, không phải chuỗi đã format', () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    go(oNhap(), '500000000');
    expect(onChange).toHaveBeenLastCalledWith(500_000_000);
  });

  it('xoá hết thì báo "chưa nhập" (null), không phải 0', () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    const input = oNhap();
    go(input, '150');
    fireEvent.change(input, { target: { value: '' } });
    expect(input.value).toBe('');
    expect(onChange).toHaveBeenLastCalledWith(null);
  });

  it('số 0 hiện ra là 0, không bị coi là ô trống', () => {
    render(<Harness />);
    const input = oNhap();
    go(input, '0');
    expect(input.value).toBe('0');
  });

  it('ô cho phép số lẻ thì gõ tiếp được sau dấu phẩy', () => {
    render(<Harness decimalScale={3} />);
    const input = oNhap();
    go(input, '1500,25');
    expect(input.value).toBe('1.500,25');
  });

  it('dán số đã có dấu phân tách từ Excel vẫn ra đúng', () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    fireEvent.change(oNhap(), { target: { value: '500.000.000' } });
    expect(onChange).toHaveBeenLastCalledWith(500_000_000);
    expect(oNhap().value).toBe('500.000.000');
  });
});
