import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface CheckboxGroupOption {
  value: string;
  label: string;
}

export interface CheckboxGroupProps {
  label?: string;
  /** Icon cạnh nhãn (đồng bộ Input / Combobox) */
  labelIcon?: React.ReactNode;
  options: readonly CheckboxGroupOption[];
  /** Các giá trị đang tick. Chế độ `single` vẫn dùng mảng (0 hoặc 1 phần tử). */
  value: readonly string[];
  onChange: (value: string[]) => void;
  /**
   * Chọn một — như RadioGroup nhưng bấm lại ô đang chọn thì bỏ chọn (phiếu giấy
   * cho phép để trống mục).
   */
  single?: boolean;
  /** Ô "Khác: ……" — có chữ coi như đã tick. */
  khac?: {
    value: string;
    onChange: (value: string) => void;
    label?: string;
    placeholder?: string;
  };
  /** Số cột trên màn rộng (mặc định 2). */
  cols?: 1 | 2 | 3;
  error?: string;
  disabled?: boolean;
  className?: string;
}

const COLS: Record<NonNullable<CheckboxGroupProps['cols']>, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-3',
};

function OBox({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        'flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
        checked ? 'border-primary bg-primary text-primary-foreground' : 'border-input bg-background',
      )}
    >
      {checked ? <Check size={11} strokeWidth={3} /> : null}
    </span>
  );
}

/**
 * Nhóm ô ☐ kiểu phiếu khảo sát giấy — chọn nhiều (mặc định) hoặc chọn một,
 * kèm ô "Khác" gõ tự do.
 */
const CheckboxGroup: React.FC<CheckboxGroupProps> = ({
  label,
  labelIcon,
  options,
  value,
  onChange,
  single = false,
  khac,
  cols = 2,
  error,
  disabled = false,
  className,
}) => {
  const chosen = new Set(value);

  const toggle = (v: string) => {
    if (disabled) return;
    if (single) {
      onChange(chosen.has(v) ? [] : [v]);
      return;
    }
    const next = new Set(chosen);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    // Giữ đúng thứ tự trên phiếu, không theo thứ tự bấm.
    onChange(options.map((o) => o.value).filter((x) => next.has(x)));
  };

  const optionClass = (checked: boolean) =>
    cn(
      'flex min-h-9 items-center gap-2 rounded-md border px-3 py-1.5 text-left text-sm transition-colors select-none',
      checked
        ? 'border-primary/40 bg-primary/5 text-foreground'
        : 'border-border text-muted-foreground hover:bg-muted/50 hover:text-foreground',
    );

  return (
    <div className={cn('w-full', className)}>
      {label ? (
        <p className="text-sm font-medium leading-none mb-1.5 flex items-center gap-1.5 text-foreground">
          {labelIcon ? <span className="text-muted-foreground shrink-0">{labelIcon}</span> : null}
          {label}
        </p>
      ) : null}
      <div
        role={single ? 'radiogroup' : 'group'}
        aria-label={label}
        className={cn('grid gap-1.5', COLS[cols], disabled && 'opacity-50 pointer-events-none')}
      >
        {options.map((o) => {
          const checked = chosen.has(o.value);
          return (
            <button
              key={o.value}
              type="button"
              role={single ? 'radio' : 'checkbox'}
              aria-checked={checked}
              onClick={() => toggle(o.value)}
              className={optionClass(checked)}
            >
              <OBox checked={checked} />
              <span className="min-w-0">{o.label}</span>
            </button>
          );
        })}
        {khac ? (
          <label className={cn(optionClass(khac.value.trim() !== ''), 'cursor-text')}>
            <OBox checked={khac.value.trim() !== ''} />
            <span className="shrink-0">{khac.label ?? 'Khác:'}</span>
            <input
              type="text"
              value={khac.value}
              onChange={(e) => khac.onChange(e.target.value)}
              placeholder={khac.placeholder}
              disabled={disabled}
              className="min-w-0 flex-1 bg-transparent text-foreground outline-none placeholder:text-muted-foreground/70"
            />
          </label>
        ) : null}
      </div>
      {error ? <p className="mt-1.5 text-xs text-destructive">{error}</p> : null}
    </div>
  );
};

export default CheckboxGroup;
