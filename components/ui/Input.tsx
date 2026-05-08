import React, { useId } from 'react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  /** `ReactNode` hoặc icon Lucide (`User`, `Mail`…) — component được render `<Icon className="h-4 w-4" />`. */
  icon?: React.ReactNode | LucideIcon;
  required?: boolean;
}

/** Lucide `User` / `Mail` hoặc element sẵn — dùng chung cho `Input` và `*Input` bọc label. */
export function renderInputIcon(icon: NonNullable<InputProps['icon']>): React.ReactNode {
  if (typeof icon === 'function') {
    const Icon = icon as LucideIcon;
    return <Icon className="h-4 w-4 shrink-0" aria-hidden />;
  }
  return icon;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, icon, required, id: externalId, ...props }, ref) => {
    const autoId = useId();
    const inputId = externalId || autoId;
    const errorId = error ? `${inputId}-error` : undefined;

    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 mb-1.5 flex items-center gap-1.5">
            {icon != null && <span className="text-muted-foreground shrink-0">{renderInputIcon(icon)}</span>}
            {label}
            {required && (
              <span className="text-red-600 dark:text-red-400 font-semibold" aria-hidden="true">
                *
              </span>
            )}
          </label>
        )}
        <div className="relative">
          <input
            id={inputId}
            type={type}
            aria-required={required ? true : undefined}
            aria-invalid={error ? true : undefined}
            aria-describedby={errorId}
            className={cn(
              "flex h-10 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:border-primary/40 disabled:cursor-not-allowed disabled:opacity-50",
              error ? 'border-destructive focus-visible:ring-destructive' : '',
              className
            )}
            ref={ref}
            {...props}
          />
        </div>
        {error && <p id={errorId} role="alert" className="text-xs font-medium text-destructive mt-1">{error}</p>}
      </div>
    );
  }
);
Input.displayName = "Input";

export default Input;
