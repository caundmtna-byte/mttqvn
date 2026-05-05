import React from 'react';
import { txt } from '../../../lib/text';
import { cn } from '../../../lib/utils';
import type { StatsTableCardProps as Props } from './types';

const StatsTableCard: React.FC<Props> = ({
  title,
  icon: Icon,
  rows,
  columnLabelKey = 'stats.columnLabel',
  columnValueKey = 'stats.columnValue',
  maxHeight = 'max-h-[240px]',
  emptyKey = 'stats.noData',
}) => {
  return (
    <div className="bg-card rounded-xl border border-border overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center gap-2">
        {Icon && <Icon size={18} className="text-muted-foreground shrink-0" />}
        <span className="font-medium text-foreground text-sm">{title}</span>
      </div>
      <div className={cn('p-4 overflow-auto', maxHeight)}>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{txt(emptyKey)}</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground border-b border-border">
                <th className="pb-2 font-medium">{txt(columnLabelKey)}</th>
                <th className="pb-2 font-medium text-right">{txt(columnValueKey)}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={row.id ?? idx} className="border-b border-border/50">
                  <td className="py-2 text-foreground">{row.label}</td>
                  <td className="py-2 text-right font-medium tabular-nums">{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default StatsTableCard;
