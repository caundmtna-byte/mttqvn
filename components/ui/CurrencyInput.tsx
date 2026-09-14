import React, { useState, useEffect, useCallback, useId, useRef } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';
import { chuanHoaDangGo, formatSoInput, parseSoInput } from '../../lib/number';
import { renderInputIcon } from './Input';

export interface CurrencyInputProps {
  label?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  suffix?: string;
  /** Giống `Input`: element hoặc Lucide (`Banknote`, …). */
  icon?: React.ReactNode | LucideIcon;
  className?: string;
  /** Giá trị số thực (không format). `null` / `undefined` = chưa nhập. */
  value?: number | string | null;
  /** Callback khi giá trị thay đổi (trả về số thực, `null` khi ô để trống). */
  onChange?: (value: number | null) => void;
  /** Chuyển tiếp cho `field.onBlur` của react-hook-form (validate khi rời ô). */
  onBlur?: () => void;
  /** Tên field cho react-hook-form (dùng với register) */
  name?: string;
  id?: string;
  /** Số chữ số thập phân cho phép. `0` (mặc định) = tiền VND, số nguyên đồng. */
  decimalScale?: number;
  /** Chặn dưới / chặn trên, áp lúc rời ô. */
  min?: number;
  max?: number;
}

/**
 * Ô nhập số tiền — tự nhóm hàng nghìn ngay khi gõ.
 *
 * Không có nhóm hàng nghìn thì `500000000` bắt cán bộ phải đếm số 0 để biết là
 * năm trăm triệu hay năm tỷ; đếm nhầm một chữ số là sai mười lần trên hồ sơ
 * thật, và giao diện không để lại dấu vết nào.
 *
 * Phần đọc chuỗi nằm ở `lib/number.ts` để ô nhập và schema zod dùng chung một
 * luật — trước đây mỗi nơi tự parse một kiểu, có nơi đọc `"500.000.000"` thành
 * `500` mà không báo gì.
 */
const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  (
    {
      label,
      error,
      required,
      disabled = false,
      placeholder = '0',
      suffix = 'VND',
      icon,
      className,
      value,
      onChange,
      onBlur,
      name,
      id: idProp,
      decimalScale = 0,
      min,
      max,
    },
    ref
  ) => {
    const autoId = useId();
    const inputId = idProp ?? `currency-${autoId.replace(/:/g, '')}`;
    const errorId = error ? `${inputId}-error` : undefined;

    /**
     * Số thực từ prop. Chuỗi rỗng và `null` đều là "chưa nhập"; số 0 thì KHÔNG —
     * trước đây `0` bị hiển thị thành ô trống nên không phân biệt được "chưa
     * nhập" với "0 đồng".
     */
    const soHienTai = useCallback((raw: typeof value): number | null => {
      if (raw == null || raw === '') return null;
      return parseSoInput(raw, { choThapPhan: decimalScale > 0 });
    }, [decimalScale]);

    const hienThi = useCallback(
      (raw: typeof value): string => formatSoInput(soHienTai(raw), { soLeToiDa: decimalScale }),
      [soHienTai, decimalScale],
    );

    const [displayValue, setDisplayValue] = useState(() => hienThi(value));
    const dangHienThi = useRef(displayValue);
    dangHienThi.current = displayValue;

    /**
     * Đồng bộ khi giá trị bên ngoài đổi (nạp lại hồ sơ, reset form).
     *
     * Bỏ qua khi chuỗi đang hiện đã đúng bằng con số đưa vào — nếu không thì mỗi
     * lần gõ sẽ có một vòng format đè lên chuỗi dở dang và nuốt mất dấu phẩy vừa
     * gõ ("1.500," bị rút thành "1.500"), không nhập nổi phần thập phân.
     */
    useEffect(() => {
      const so = soHienTai(value);
      const dangCo = parseSoInput(dangHienThi.current, { choThapPhan: decimalScale > 0 });
      if (so === dangCo) return;
      setDisplayValue(formatSoInput(so, { soLeToiDa: decimalScale }));
    }, [value, soHienTai, decimalScale]);

    const ep = useCallback(
      (n: number): number => {
        if (max != null && n > max) return max;
        if (min != null && n < min) return min;
        return n;
      },
      [min, max],
    );

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      // Lúc gõ thì chuỗi thường chưa hợp lệ (`1.`, `12,`), không được xoá những
      // gì người dùng vừa gõ — nên dùng bộ chuẩn hoá khoan dung, không phải
      // `parseSoInput` vốn nghiêm ngặt cho giá trị đã nhập xong.
      const { nguyen, le } = chuanHoaDangGo(e.target.value, decimalScale);

      if (nguyen === '' && (le == null || le === '')) {
        setDisplayValue('');
        onChange?.(null);
        return;
      }

      const n = Number(le == null || le === '' ? nguyen || '0' : `${nguyen || '0'}.${le}`);
      if (!Number.isFinite(n)) return;

      // Giữ nguyên dấu phẩy và các số 0 người dùng đang gõ dở ("12," / "12,50"),
      // nếu format lại ngay thì con trỏ nhảy và không gõ tiếp được phần lẻ.
      const phanNguyen = formatSoInput(Math.trunc(n), { soLeToiDa: 0 });
      setDisplayValue(le == null ? phanNguyen : `${phanNguyen},${le}`);
      onChange?.(n);
    };

    const handleBlur = () => {
      const n = parseSoInput(displayValue, { choThapPhan: decimalScale > 0 });
      if (n != null) {
        const clamped = ep(n);
        setDisplayValue(formatSoInput(clamped, { soLeToiDa: decimalScale }));
        if (clamped !== n) onChange?.(clamped);
      }
      onBlur?.();
    };

    return (
      <div className="w-full">
        {label && (
          <label
            htmlFor={inputId}
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 mb-2 flex items-center gap-1.5 text-foreground"
          >
            {icon != null && <span className="text-muted-foreground shrink-0">{renderInputIcon(icon)}</span>}
            {label}
            {required && <span className="text-red-500 ml-0.5">*</span>}
          </label>
        )}
        <div className="relative">
          {icon != null && !label && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
              {renderInputIcon(icon)}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            type="text"
            inputMode={decimalScale > 0 ? 'decimal' : 'numeric'}
            name={name}
            disabled={disabled}
            placeholder={placeholder}
            value={displayValue}
            onChange={handleChange}
            onBlur={handleBlur}
            aria-required={required ? true : undefined}
            aria-invalid={error ? true : undefined}
            aria-describedby={errorId}
            className={cn(
              'flex h-10 w-full rounded-lg border border-border bg-background py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              'disabled:cursor-not-allowed disabled:opacity-50',
              icon != null && !label ? 'pl-10' : 'pl-3',
              suffix ? 'pr-14' : 'pr-3',
              error ? 'border-destructive focus-visible:ring-destructive' : '',
              className
            )}
          />
          {suffix && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs font-medium pointer-events-none select-none">
              {suffix}
            </div>
          )}
        </div>
        {error && (
          <p id={errorId} role="alert" className="text-xs font-medium text-destructive mt-1.5 ml-1">
            {error}
          </p>
        )}
      </div>
    );
  }
);

CurrencyInput.displayName = 'CurrencyInput';

export default CurrencyInput;
