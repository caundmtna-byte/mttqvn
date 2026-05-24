import React from 'react';
import { Bar, Cell } from 'recharts';
import type { BarProps } from 'recharts';

export type ColoredBarProps = Omit<BarProps, 'fill'> & {
  data: readonly unknown[];
  getFill: (row: unknown, index: number) => string;
};

/**
 * Recharts Bar với màu riêng từng cột qua Cell.
 * ChartTooltip đọc fill per segment từ payload.
 */
const ColoredBar: React.FC<ColoredBarProps> = ({ data, getFill, children, ...barProps }) => (
  <Bar {...barProps}>
    {data.map((row, i) => (
      <Cell key={i} fill={getFill(row, i)} />
    ))}
    {children}
  </Bar>
);

export default ColoredBar;
