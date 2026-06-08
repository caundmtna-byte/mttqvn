import React, { isValidElement } from 'react';

export const FILTER_CHIP_DISPLAY_NAMES = new Set([
  'FilterChipMultiSelect',
  'FilterChipSingleSelect',
]);

export function isFilterChipElement(element: React.ReactElement): boolean {
  const type = element.type;
  if (typeof type === 'string') return false;
  const named = type as { displayName?: string; name?: string };
  const name = named.displayName ?? named.name ?? '';
  return FILTER_CHIP_DISPLAY_NAMES.has(name);
}

export function isFilterChipActive(element: React.ReactElement): boolean {
  const { value } = element.props as { value?: string[] | string | null };
  if (value == null) return false;
  if (Array.isArray(value)) return value.length > 0;
  return typeof value === 'string' && value.length > 0;
}

export interface CollectedFilterChipChildren {
  /** Non-chip nodes kept in document order (DateRange, divider, …). */
  prefixNodes: React.ReactNode[];
  /** Filter chip elements in document order. */
  chips: React.ReactElement[];
}

function toChildArray(node: React.ReactNode): React.ReactNode[] {
  return React.Children.toArray(node);
}

/**
 * Walk `children` and split filter chips from other toolbar nodes.
 * Pure chip wrappers (motion.div, div, Fragment) are flattened; nodes like DateRangePicker stay in prefix.
 */
export function collectFilterChipChildren(node: React.ReactNode): CollectedFilterChipChildren {
  const prefixNodes: React.ReactNode[] = [];
  const chips: React.ReactElement[] = [];

  const walk = (current: React.ReactNode) => {
    toChildArray(current).forEach((child) => {
      if (!isValidElement(child)) {
        if (child != null && child !== false) {
          prefixNodes.push(child);
        }
        return;
      }

      if (isFilterChipElement(child)) {
        chips.push(child);
        return;
      }

      if (child.type === React.Fragment) {
        walk((child.props as { children?: React.ReactNode }).children);
        return;
      }

      const nested = collectFilterChipChildren(
        (child.props as { children?: React.ReactNode }).children,
      );

      if (nested.chips.length > 0 && nested.prefixNodes.length === 0) {
        chips.push(...nested.chips);
        return;
      }

      if (nested.chips.length === 0) {
        prefixNodes.push(child);
        return;
      }

      prefixNodes.push(
        React.cloneElement(
          child,
          child.props as Record<string, unknown>,
          ...nested.prefixNodes,
          ...nested.chips,
        ),
      );
    });
  };

  walk(node);
  return { prefixNodes, chips };
}

export function partitionFilterChips(
  chips: React.ReactElement[],
  maxVisible: number,
): { visible: React.ReactElement[]; overflow: React.ReactElement[] } {
  if (chips.length <= maxVisible) {
    return { visible: chips, overflow: [] };
  }

  const active = chips.filter(isFilterChipActive);
  const inactive = chips.filter((chip) => !isFilterChipActive(chip));
  const visible = [...active, ...inactive].slice(0, maxVisible);
  const visibleSet = new Set(visible);
  const overflow = chips.filter((chip) => !visibleSet.has(chip));

  return { visible, overflow };
}
