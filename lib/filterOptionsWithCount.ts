/**
 * Quy chuẩn filter chip: chỉ hiện option có dữ liệu (count > 0), hoặc option đang được chọn (để user có thể bỏ chọn).
 * Dùng cho FilterChipMultiSelect (desktop) và MobileFilterSheet (mobile).
 */
/** Option có thể kèm count (chip / header filter) — tương thích `Option` từ `MultiSelect`. */
export interface OptionWithCount {
  value: string;
  label: string;
  count?: number;
}

/**
 * Lọc options: giữ lại option có count > 0 HOẶC đang nằm trong selectedValues.
 * Option không có count (count === undefined) luôn giữ lại.
 */
export function filterOptionsWithCount<T extends OptionWithCount>(
  options: T[] | undefined,
  selectedValues: string[] | undefined,
): T[] {
  const list = options ?? [];
  const selected = selectedValues ?? [];
  return list.filter((o) => {
    if (o.count === undefined) return true;
    return o.count > 0 || selected.includes(o.value);
  });
}
