/**
 * Xuất `BienBanModel` ra .docx (Times New Roman 13pt, A4, lề 20-15-20-30mm).
 *
 * Cấu trúc bám bản HTML: cùng mô hình, chỉ khác đích vẽ — sửa bố cục biên bản
 * ở builder là cả ba đầu ra (xem trước, Word, Excel) cùng đổi.
 */
import {
  AlignmentType,
  BorderStyle,
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import { getTodayISODate } from '@/lib/utils';
import {
  O_CHON,
  O_TRONG,
  QUOC_HIEU,
  TIEU_NGU,
  runText,
  type BienBanAlign,
  type BienBanBlock,
  type BienBanCotBang,
  type BienBanCotKy,
  type BienBanLuaChon,
  type BienBanModel,
  type BienBanRun,
} from './bien-ban-model';

const FONT = 'Times New Roman';
/** Font có sẵn glyph ☐ ☒ trên Windows — Times New Roman không có. */
const FONT_O = 'Segoe UI Symbol';
const BODY = 26; // 13pt
const TITLE = 28; // 14pt
const SMALL = 24; // 12pt
const LINE = 312; // 1.3

/** Twip: 20mm / 15mm / 20mm / 30mm. */
const PAGE_MARGIN = { top: 1134, right: 850, bottom: 1134, left: 1701 };

const noBorder = { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' } as const;
const TABLE_NO_BORDERS = {
  top: noBorder,
  bottom: noBorder,
  left: noBorder,
  right: noBorder,
  insideHorizontal: noBorder,
  insideVertical: noBorder,
};
const CELL_NO_BORDERS = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };
const line = { style: BorderStyle.SINGLE, size: 4, color: '000000' } as const;
const TABLE_BORDERS = {
  top: line,
  bottom: line,
  left: line,
  right: line,
  insideHorizontal: line,
  insideVertical: line,
};

function tr(text: string, o?: { bold?: boolean; italic?: boolean; size?: number; font?: string }) {
  return new TextRun({
    text,
    font: o?.font ?? FONT,
    bold: o?.bold,
    italics: o?.italic,
    size: o?.size ?? BODY,
  });
}

function align(a: BienBanAlign | undefined) {
  if (a === 'center') return AlignmentType.CENTER;
  if (a === 'right') return AlignmentType.RIGHT;
  if (a === 'justify') return AlignmentType.JUSTIFIED;
  return AlignmentType.LEFT;
}

function para(
  children: TextRun[],
  o?: { align?: BienBanAlign; indent?: boolean; after?: number; leftIndent?: number },
) {
  return new Paragraph({
    alignment: align(o?.align),
    indent: {
      firstLine: o?.indent ? 567 : undefined,
      left: o?.leftIndent,
    },
    spacing: { before: 0, after: o?.after ?? 60, line: LINE },
    children,
  });
}

function runsToText(runs: BienBanRun[], base?: { bold?: boolean; italic?: boolean }): TextRun[] {
  return runs.map((r) =>
    r.kind === 'text'
      ? tr(r.text, { bold: r.bold ?? base?.bold, italic: r.italic ?? base?.italic })
      : tr(runText(r), base),
  );
}

function oChon(checked: boolean) {
  return tr(`${checked ? O_CHON : O_TRONG} `, { font: FONT_O });
}

/** Ô ☐/☒ + nhãn (+ chữ "Khác: ……" nếu có). */
function oLuaChon(o: BienBanLuaChon): TextRun[] {
  return [oChon(o.checked), tr(o.label), ...(o.ghiThem ? runsToText([o.ghiThem]) : [])];
}

function cell(children: Paragraph[], widthPct: number, columnSpan?: number) {
  return new TableCell({
    width: { size: widthPct, type: WidthType.PERCENTAGE },
    borders: CELL_NO_BORDERS,
    columnSpan,
    children,
  });
}

/** Độ rộng từng cột (%): cột có `widthPct` giữ nguyên, phần còn lại chia đều. */
function doRongCot(cols: BienBanCotBang[]): number[] {
  const daDat = cols.reduce((s, c) => s + (c.widthPct ?? 0), 0);
  const conLai = cols.filter((c) => !c.widthPct).length;
  const deu = conLai > 0 ? Math.max(0, 100 - daDat) / conLai : 0;
  return cols.map((c) => c.widthPct ?? deu);
}

function oBang(text: string, widthPct: number, o?: { bold?: boolean; align?: BienBanAlign; span?: number }) {
  return new TableCell({
    width: { size: widthPct, type: WidthType.PERCENTAGE },
    columnSpan: o?.span,
    children: [para([tr(text, { bold: o?.bold, size: SMALL })], { align: o?.align, after: 0 })],
  });
}

function bangToDocx(b: Extract<BienBanBlock, { kind: 'bang' }>): Table {
  const w = doRongCot(b.cols);
  const alignOf = (i: number) => b.cols[i]?.align ?? 'left';
  const rows: TableRow[] = [
    new TableRow({
      tableHeader: true,
      children: b.cols.map((c, i) => oBang(c.title, w[i], { bold: true, align: 'center' })),
    }),
    ...b.rows.map(
      (r) => new TableRow({ children: r.map((cell, i) => oBang(cell, w[i], { align: alignOf(i) })) }),
    ),
  ];
  if (b.footer) {
    const span = Math.max(1, b.footer.span ?? 1);
    const wDau = w.slice(0, span).reduce((s, x) => s + x, 0);
    rows.push(
      new TableRow({
        children: b.footer.cells.map((cell, i) =>
          i === 0
            ? oBang(cell, wDau, { bold: true, align: 'center', span: span > 1 ? span : undefined })
            : oBang(cell, w[i + span - 1], { bold: true, align: alignOf(i + span - 1) }),
        ),
      }),
    );
  }
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, borders: TABLE_BORDERS, rows });
}

function cotKy(c: BienBanCotKy): Paragraph[] {
  const out = [
    para([tr(c.title, { bold: true })], { align: 'center', after: 0 }),
    para([tr(c.note, { italic: true, size: SMALL })], { align: 'center', after: 0 }),
    // Chỗ ký tay: ~4 dòng trống.
    para([tr('')], { after: 0 }),
    para([tr('')], { after: 0 }),
    para([tr('')], { after: 0 }),
    para([tr('')], { after: 0 }),
  ];
  if (c.hoTen?.trim()) out.push(para([tr(c.hoTen.trim(), { bold: true })], { align: 'center' }));
  return out;
}

function blockToDocx(b: BienBanBlock): (Paragraph | Table)[] {
  switch (b.kind) {
    case 'quoc-hieu':
      return [
        para([tr(QUOC_HIEU, { bold: true })], { align: 'center', after: 0 }),
        para([tr(TIEU_NGU, { bold: true })], { align: 'center', after: 0 }),
        para([tr('─'.repeat(18), { size: SMALL })], { align: 'center', after: 200 }),
      ];
    case 'tieu-de':
      return b.lines.map((l, i) =>
        para([tr(l.text, { bold: l.bold, italic: l.italic, size: l.size === 'lg' ? TITLE : BODY })], {
          align: 'center',
          after: i === b.lines.length - 1 ? 240 : 0,
        }),
      );
    case 'doan':
      return [
        para(runsToText(b.runs, { bold: b.bold, italic: b.italic }), {
          align: b.align,
          indent: b.indent,
        }),
      ];
    case 'lua-chon': {
      if (b.layout === 'inline') {
        const children = [...runsToText(b.label)];
        for (const o of b.options) children.push(tr('    '), ...oLuaChon(o));
        return [para(children)];
      }
      if (b.layout === 'luoi') {
        // Hai ô một dòng như mẫu giấy — bảng không viền, mỗi ô một cột.
        const rows: TableRow[] = [];
        for (let i = 0; i < b.options.length; i += 2) {
          const pair = b.options.slice(i, i + 2);
          rows.push(
            new TableRow({
              children: [0, 1].map((k) =>
                cell([para(pair[k] ? oLuaChon(pair[k]) : [tr('')], { after: 0 })], 50),
              ),
            }),
          );
        }
        return [
          para(runsToText(b.label), { after: 0 }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            borders: TABLE_NO_BORDERS,
            indent: { size: 567, type: WidthType.DXA }, // 1cm — khớp bản HTML
            rows,
          }),
          para([tr('')], { after: 0 }),
        ];
      }
      return [
        para(runsToText(b.label), { after: 0 }),
        ...b.options.map((o, i) =>
          para(oLuaChon(o), {
            leftIndent: 1247, // 2.2cm — khớp bản HTML
            after: i === b.options.length - 1 ? 60 : 0,
          }),
        ),
      ];
    }
    case 'chu-ky': {
      const n = Math.max(1, b.cols.length);
      const w = Math.floor(100 / n);
      const out: (Paragraph | Table)[] = [para([tr('')], { after: 120 })];
      if (b.diaDanhNgay) out.push(para([tr(b.diaDanhNgay, { italic: true })], { align: 'right' }));
      const rows: TableRow[] = [];
      if (b.nhomDau) {
        const span = Math.min(b.nhomDau.span, n);
        const head = [cell([para([tr(b.nhomDau.text, { bold: true })], { align: 'center', after: 0 })], w * span, span)];
        for (let i = span; i < n; i += 1) head.push(cell([para([tr('')])], w));
        rows.push(new TableRow({ children: head }));
      }
      rows.push(new TableRow({ children: b.cols.map((c) => cell(cotKy(c), w)) }));
      out.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          borders: TABLE_NO_BORDERS,
          rows,
        }),
      );
      return out;
    }
    case 'bang':
      return [bangToDocx(b), para([tr('')], { after: 0 })];
    default:
      return [];
  }
}

export function buildBienBanDocxChildren(model: BienBanModel): (Paragraph | Table)[] {
  return model.blocks.flatMap(blockToDocx);
}

export async function downloadBienBanDocx(model: BienBanModel, fileName: string): Promise<void> {
  const doc = new Document({
    sections: [
      {
        properties: { page: { size: { width: 11906, height: 16838 }, margin: PAGE_MARGIN } },
        children: buildBienBanDocxChildren(model),
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${fileName}_${getTodayISODate()}.docx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
