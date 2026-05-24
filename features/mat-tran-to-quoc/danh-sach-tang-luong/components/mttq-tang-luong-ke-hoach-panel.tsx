import React, { useMemo } from 'react';
import { TrendingUp } from 'lucide-react';
import { txt } from '@/lib/text';
import { formatDateShort } from '@/lib/utils';
import Button from '@/components/ui/Button';
import EmptyState from '@/components/shared/EmptyState';
import type { MttqTangLuongKeHoachGroupMode, MttqTangLuongKeHoachRow, MttqTangLuongListRow } from '../core/types';
import { buildKeHoachRows, groupKeHoachRows } from '../utils/build-year-plan';
import { formatNgachBacLabel } from '../utils/display-format';

interface Props {
  allRows: MttqTangLuongListRow[];
  year: number;
  groupMode: MttqTangLuongKeHoachGroupMode;
  onRecord: (row: MttqTangLuongKeHoachRow) => void;
  isLoading: boolean;
}

function warningBadge(level: MttqTangLuongKeHoachRow['warningLevel']) {
  if (level === 'none') return null;
  const label =
    level === 'd30'
      ? txt('matTranTangLuong.keHoach.warnD30')
      : level === 'd60'
        ? txt('matTranTangLuong.keHoach.warnD60')
        : txt('matTranTangLuong.keHoach.warnD90');
  return (
    <span className="inline-flex rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400">
      {label}
    </span>
  );
}

const MttqTangLuongKeHoachPanel: React.FC<Props> = ({
  allRows,
  year,
  groupMode,
  onRecord,
  isLoading,
}) => {
  const keHoachRows = useMemo(() => buildKeHoachRows(allRows, year), [allRows, year]);
  const groups = useMemo(() => groupKeHoachRows(keHoachRows, groupMode), [keHoachRows, groupMode]);

  if (isLoading) {
    return <p className="text-sm text-muted-foreground py-8 text-center">{txt('common.loadingData')}</p>;
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-4 space-y-4">
        {keHoachRows.length === 0 ? (
          <EmptyState
            title={txt('matTranTangLuong.keHoach.emptyTitle')}
            description={txt('matTranTangLuong.keHoach.emptyHint')}
            icon={<TrendingUp className="h-10 w-10 text-muted-foreground" aria-hidden />}
          />
        ) : (
          groups.map((g) => (
            <section key={g.key} className="rounded-xl border border-border bg-card overflow-hidden">
              <header className="px-3 py-2 border-b border-border bg-muted/30 text-sm font-semibold text-foreground">
                {g.label}
                <span className="ml-2 text-xs font-normal text-muted-foreground tabular-nums">({g.rows.length})</span>
              </header>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="px-3 py-2 font-medium">{txt('matTranTangLuong.store.canBoCol')}</th>
                      <th className="px-3 py-2 font-medium">{txt('matTranTangLuong.keHoach.lastRaiseCol')}</th>
                      <th className="px-3 py-2 font-medium">{txt('matTranTangLuong.keHoach.nextDueCol')}</th>
                      <th className="px-3 py-2 font-medium">{txt('matTranTangLuong.keHoach.ngachBacCol')}</th>
                      <th className="px-3 py-2 font-medium w-[7rem]" />
                    </tr>
                  </thead>
                  <tbody>
                    {g.rows.map((row) => (
                      <tr key={`${row.can_bo_id}-${row.next_due}`} className="border-b border-border/60 last:border-0">
                        <td className="px-3 py-2">
                          <p className="font-medium text-foreground">{row.ho_ten}</p>
                          <p className="text-xs text-muted-foreground truncate">{row.ten_phong_ban ?? row.ten_to_chuc ?? '—'}</p>
                        </td>
                        <td className="px-3 py-2 tabular-nums whitespace-nowrap">{formatDateShort(row.ngay_nang_gan_nhat)}</td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <span className="tabular-nums">{formatDateShort(row.next_due)}</span>
                          {warningBadge(row.warningLevel) ? (
                            <span className="ml-2">{warningBadge(row.warningLevel)}</span>
                          ) : null}
                        </td>
                        <td className="px-3 py-2 text-xs">
                          {formatNgachBacLabel(row.ten_ngach_hien_tai, row.ma_bac_hien_tai)}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <Button type="button" size="sm" variant="outline" className="h-8 text-xs" onClick={() => onRecord(row)}>
                            {txt('matTranTangLuong.keHoach.recordAction')}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))
        )}
      </div>
    </div>
  );
};

export default MttqTangLuongKeHoachPanel;
