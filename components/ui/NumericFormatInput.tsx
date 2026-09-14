import React, { useCallback } from 'react';
import CurrencyInput from './CurrencyInput';
import { formatSoInput } from '../../lib/number';

export interface NumericFormatInputProps {
  label?: string;
  error?: string;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  /** Icon hiển thị cạnh label (chuẩn form như module nhân viên) */
  icon?: React.ReactNode;
  /** Hiển thị dấu sao (*) cho trường bắt buộc */
  required?: boolean;
  /** Giá trị số (có thể có phần thập phân) */
  value?: number | string | null;
  /** Callback khi giá trị thay đổi */
  onChange?: (value: number) => void;
  /** Alias cho onChange, nhận (formattedValue, numberValue) - tương thích react-number-format */
  onValueChange?: (_formatted: string, values: { floatValue?: number }) => void;
  onBlur?: () => void;
  name?: string;
  /** Số chữ số thập phân tối đa khi hiển thị (mặc định 2) */
  decimalScale?: number;
  min?: number;
  max?: number;
  /** Gắn id cho `<input>` (vd. label ngoài bọc PercentInput) */
  id?: string;
}

/**
 * Nhập số có phần thập phân — lớp mỏng trên `CurrencyInput`.
 *
 * Hai component từng có hai bộ đọc chuỗi riêng và lệch nhau (`CurrencyInput`
 * bỏ mọi ký tự không phải chữ số nên `1,5` thành `15`). Nay chỉ còn một lõi;
 * file này giữ lại vì API của nó khác — `onChange` luôn trả `number`, thêm
 * `onValueChange` kiểu react-number-format — và `PercentInput` /
 * `NumberStepper` đang dựa vào đó.
 */
const NumericFormatInput = React.forwardRef<HTMLInputElement, NumericFormatInputProps>(
  ({ onChange, onValueChange, decimalScale = 2, ...rest }, ref) => {
    const handleChange = useCallback(
      (n: number | null) => {
        // API cũ không có khái niệm "chưa nhập"; ô trống quy về 0 như trước.
        const so = n ?? 0;
        onChange?.(so);
        onValueChange?.(n == null ? '' : formatSoInput(so, { soLeToiDa: decimalScale }), {
          floatValue: so,
        });
      },
      [onChange, onValueChange, decimalScale],
    );

    return (
      <CurrencyInput
        {...rest}
        ref={ref}
        suffix=""
        decimalScale={decimalScale}
        onChange={handleChange}
      />
    );
  }
);

NumericFormatInput.displayName = 'NumericFormatInput';

export default NumericFormatInput;
