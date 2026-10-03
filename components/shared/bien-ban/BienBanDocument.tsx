import React from 'react';
import {
  O_CHON,
  O_TRONG,
  QUOC_HIEU,
  TIEU_NGU,
  runText,
  type BienBanBlock,
  type BienBanModel,
  type BienBanRun,
} from '@/lib/bien-ban/bien-ban-model';

const B = 'bien-ban-doc';

function Runs({ runs }: { runs: BienBanRun[] }) {
  return (
    <>
      {runs.map((r, i) => {
        if (r.kind === 'text') {
          const cls = [r.bold && `${B}__run--bold`, r.italic && `${B}__run--italic`]
            .filter(Boolean)
            .join(' ');
          return (
            <span key={i} className={cls || undefined}>
              {r.text}
            </span>
          );
        }
        return (
          <span key={i} className={r.value == null ? `${B}__dots` : undefined}>
            {runText(r)}
          </span>
        );
      })}
    </>
  );
}

function Block({ block }: { block: BienBanBlock }) {
  switch (block.kind) {
    case 'quoc-hieu':
      return (
        <div className={`${B}__quoc-hieu`}>
          <p className={`${B}__quoc-hieu-dong`}>{QUOC_HIEU}</p>
          <p className={`${B}__tieu-ngu`}>{TIEU_NGU}</p>
          <hr className={`${B}__rule`} />
        </div>
      );
    case 'tieu-de':
      return (
        <div className={`${B}__tieu-de`}>
          {block.lines.map((l, i) => (
            <p
              key={i}
              className={[
                `${B}__tieu-de-dong`,
                l.size === 'lg' && `${B}__tieu-de-dong--lg`,
                l.bold && `${B}__tieu-de-dong--bold`,
                l.italic && `${B}__tieu-de-dong--italic`,
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {l.text}
            </p>
          ))}
        </div>
      );
    case 'doan':
      return (
        <p
          className={[
            `${B}__doan`,
            block.indent && `${B}__doan--indent`,
            block.bold && `${B}__doan--bold`,
            block.italic && `${B}__doan--italic`,
            block.align && `${B}__doan--${block.align}`,
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <Runs runs={block.runs} />
        </p>
      );
    case 'lua-chon': {
      const options = block.options.map((o, i) => (
        <span key={i} className={`${B}__lua-chon-opt`}>
          <span className={`${B}__o`}>{o.checked ? O_CHON : O_TRONG}</span>
          {o.label}
          {o.ghiThem ? <Runs runs={[o.ghiThem]} /> : null}
        </span>
      ));
      if (block.layout === 'luoi') {
        return (
          <div className={`${B}__lua-chon ${B}__lua-chon--luoi`}>
            <p className={`${B}__lua-chon-nhan`}>
              <Runs runs={block.label} />
            </p>
            <div className={`${B}__lua-chon-luoi`}>{options}</div>
          </div>
        );
      }
      return (
        <p className={`${B}__lua-chon ${B}__lua-chon--${block.layout}`}>
          <Runs runs={block.label} />
          {options}
        </p>
      );
    }
    case 'chu-ky': {
      const n = Math.max(1, block.cols.length);
      const gridStyle = { gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` };
      return (
        <div className={`${B}__ky`}>
          {block.diaDanhNgay ? <p className={`${B}__ky-ngay`}>{block.diaDanhNgay}</p> : null}
          {block.nhomDau ? (
            <div className={`${B}__ky-grid`} style={gridStyle}>
              <p
                className={`${B}__ky-nhom`}
                style={{ gridColumn: `span ${Math.min(block.nhomDau.span, n)}` }}
              >
                {block.nhomDau.text}
              </p>
            </div>
          ) : null}
          <div className={`${B}__ky-grid`} style={gridStyle}>
            {block.cols.map((c, i) => (
              <div key={i} className={`${B}__ky-col`}>
                <p className={`${B}__ky-title`}>{c.title}</p>
                <p className={`${B}__ky-note`}>{c.note}</p>
                <div className={`${B}__ky-space`} />
                {c.hoTen?.trim() ? <p className={`${B}__ky-name`}>{c.hoTen.trim()}</p> : null}
              </div>
            ))}
          </div>
        </div>
      );
    }
    case 'bang': {
      const span = Math.max(1, block.footer?.span ?? 1);
      const alignOf = (i: number) => block.cols[i]?.align ?? 'left';
      return (
        <table className={`${B}__bang`}>
          <colgroup>
            {block.cols.map((c, i) => (
              <col key={i} style={c.widthPct ? { width: `${c.widthPct}%` } : undefined} />
            ))}
          </colgroup>
          <thead>
            <tr>
              {block.cols.map((c, i) => (
                <th key={i}>{c.title}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, r) => (
              <tr key={r}>
                {row.map((cell, i) => (
                  <td key={i} className={`${B}__bang-o--${alignOf(i)}`}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
            {block.footer ? (
              <tr className={`${B}__bang-tong`}>
                {block.footer.cells.map((cell, i) => (
                  <td
                    key={i}
                    colSpan={i === 0 ? span : undefined}
                    className={`${B}__bang-o--${i === 0 ? 'center' : alignOf(i + span - 1)}`}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ) : null}
          </tbody>
        </table>
      );
    }
    default:
      return null;
  }
}

interface Props {
  model: BienBanModel;
  rootId: string;
}

/** Một biên bản — cùng phần tử này làm nguồn cho cửa sổ in và bản chụp PDF. */
const BienBanDocument: React.FC<Props> = ({ model, rootId }) => (
  <article id={rootId} className={B}>
    {model.blocks.map((b, i) => (
      <Block key={i} block={b} />
    ))}
  </article>
);

export default BienBanDocument;
