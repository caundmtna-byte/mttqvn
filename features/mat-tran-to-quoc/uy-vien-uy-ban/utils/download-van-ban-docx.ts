/**
 * Xuất `VanBanHanhChinhModel` ra file .docx đúng thể thức văn bản hành chính.
 *
 * Bản sao của file này nằm trong từng module có biểu mẫu in (giống cách
 * `danh-sach-tap-huan` và `nhap-xuat-kho` mỗi module giữ bộ util in riêng).
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
  VerticalAlign,
  WidthType,
} from 'docx';
import { getTodayISODate } from '@/lib/utils';
import {
  QUOC_HIEU,
  TIEU_NGU,
  layoutThongTinPairs,
  type VanBanAlign,
  type VanBanBang,
  type VanBanHanhChinhModel,
} from './van-ban-hanh-chinh';

const FONT = 'Times New Roman';
const BODY_SIZE = 26; /* 13pt — cỡ chữ chuẩn văn bản hành chính */
const TABLE_SIZE = 22; /* 11pt */
const TITLE_SIZE = 28; /* 14pt */
const SMALL_SIZE = 24; /* 12pt */

const PAGE_MARGIN = { top: 1134, right: 1134, bottom: 1134, left: 1701 };

const thinBorder = { style: BorderStyle.SINGLE, size: 4, color: '000000' } as const;
const noBorder = { style: BorderStyle.NONE, size: 0 } as const;
const NO_BORDERS = {
  top: noBorder,
  bottom: noBorder,
  left: noBorder,
  right: noBorder,
  insideHorizontal: noBorder,
  insideVertical: noBorder,
};
const CELL_NO_BORDERS = { top: noBorder, bottom: noBorder, left: noBorder, right: noBorder };
const CELL_BORDERS = { top: thinBorder, bottom: thinBorder, left: thinBorder, right: thinBorder };

function run(text: string, opts?: { bold?: boolean; italic?: boolean; size?: number }) {
  return new TextRun({
    text,
    font: FONT,
    bold: opts?.bold,
    italics: opts?.italic,
    size: opts?.size ?? BODY_SIZE,
  });
}

function alignOf(a: VanBanAlign | undefined) {
  if (a === 'center') return AlignmentType.CENTER;
  if (a === 'right') return AlignmentType.RIGHT;
  return AlignmentType.LEFT;
}

function p(
  text: string,
  opts?: {
    bold?: boolean;
    italic?: boolean;
    size?: number;
    align?: VanBanAlign;
    before?: number;
    after?: number;
    indentFirstLine?: boolean;
  },
) {
  return new Paragraph({
    alignment: alignOf(opts?.align),
    indent: opts?.indentFirstLine ? { firstLine: 567 } : undefined,
    spacing: { before: opts?.before ?? 0, after: opts?.after ?? 100, line: 312 },
    children: [run(text, { bold: opts?.bold, italic: opts?.italic, size: opts?.size })],
  });
}

function borderlessCell(children: Paragraph[], widthPercent: number) {
  return new TableCell({
    width: { size: widthPercent, type: WidthType.PERCENTAGE },
    borders: CELL_NO_BORDERS,
    children,
  });
}

function twoColumnRow(left: Paragraph[], right: Paragraph[], leftWidth = 45) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: NO_BORDERS,
    rows: [
      new TableRow({
        children: [borderlessCell(left, leftWidth), borderlessCell(right, 100 - leftWidth)],
      }),
    ],
  });
}

/** Gạch chân ngắn dưới tên cơ quan / tiêu ngữ — thể thức quy định. */
function underline(len: number, align: VanBanAlign = 'center') {
  return new Paragraph({
    alignment: alignOf(align),
    spacing: { after: 60 },
    children: [run('─'.repeat(len), { size: SMALL_SIZE })],
  });
}

function buildBang(bang: VanBanBang): (Table | Paragraph)[] {
  if (bang.rows.length === 0) {
    return [
      p(bang.emptyMessage ?? '', { align: 'center', italic: true, before: 120, after: 120 }),
    ];
  }
  const headerRow = new TableRow({
    tableHeader: true,
    children: bang.headers.map(
      (h, i) =>
        new TableCell({
          width: bang.widths?.[i]
            ? { size: bang.widths[i], type: WidthType.PERCENTAGE }
            : undefined,
          shading: { fill: 'F2F2F2' },
          verticalAlign: VerticalAlign.CENTER,
          borders: CELL_BORDERS,
          children: [p(h, { bold: true, align: 'center', size: TABLE_SIZE, after: 20 })],
        }),
    ),
  });
  const bodyRows = bang.rows.map(
    (row) =>
      new TableRow({
        children: row.map(
          (cell, i) =>
            new TableCell({
              verticalAlign: VerticalAlign.CENTER,
              borders: CELL_BORDERS,
              children: [
                p(cell, { align: bang.aligns?.[i] ?? 'left', size: TABLE_SIZE, after: 20 }),
              ],
            }),
        ),
      }),
  );
  return [
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [headerRow, ...bodyRows],
    }),
    p('', { after: 120 }),
  ];
}

function buildChuKyBlock(model: VanBanHanhChinhModel): Table {
  const noiNhanCell: Paragraph[] = [];
  if (model.noiNhan && model.noiNhan.length > 0) {
    noiNhanCell.push(p('Nơi nhận:', { bold: true, italic: true, size: SMALL_SIZE, after: 40 }));
    for (const n of model.noiNhan) {
      noiNhanCell.push(p(`- ${n};`, { size: SMALL_SIZE, after: 20 }));
    }
  } else if (model.chuKyPhu) {
    noiNhanCell.push(p(model.chuKyPhu.chucDanh.toUpperCase(), { bold: true, align: 'center', after: 1000 }));
    noiNhanCell.push(p(model.chuKyPhu.hoTen ?? '', { align: 'center' }));
  } else {
    noiNhanCell.push(p(''));
  }

  const kyCell: Paragraph[] = [];
  if (model.chuKy.thayMat) {
    kyCell.push(p(model.chuKy.thayMat.toUpperCase(), { bold: true, align: 'center', after: 20 }));
  }
  kyCell.push(p(model.chuKy.chucDanh.toUpperCase(), { bold: true, align: 'center', after: 1000 }));
  kyCell.push(p(model.chuKy.hoTen ?? '', { align: 'center' }));

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: NO_BORDERS,
    rows: [
      new TableRow({ children: [borderlessCell(noiNhanCell, 55), borderlessCell(kyCell, 45)] }),
    ],
  });
}

export function buildVanBanDocxChildren(model: VanBanHanhChinhModel): (Paragraph | Table)[] {
  const children: (Paragraph | Table)[] = [];

  // Khối 1 + 2: tên cơ quan ban hành | quốc hiệu — tiêu ngữ
  const leftHead: Paragraph[] = [];
  if (model.coQuanChuQuan) {
    leftHead.push(p(model.coQuanChuQuan.toUpperCase(), { align: 'center', size: SMALL_SIZE, after: 0 }));
  }
  leftHead.push(p(model.coQuanBanHanh.toUpperCase(), { bold: true, align: 'center', size: SMALL_SIZE, after: 0 }));
  leftHead.push(underline(14));
  leftHead.push(p(`Số: ${model.soKyHieu}`, { align: 'center', size: SMALL_SIZE }));

  const rightHead: Paragraph[] = [
    p(QUOC_HIEU, { bold: true, align: 'center', size: SMALL_SIZE, after: 0 }),
    p(TIEU_NGU, { bold: true, align: 'center', after: 0 }),
    underline(22),
    p(model.diaDanhNgayThang, { italic: true, align: 'center', size: SMALL_SIZE }),
  ];
  children.push(twoColumnRow(leftHead, rightHead));
  children.push(p('', { after: 200 }));

  // Khối 3: tên loại + trích yếu
  children.push(p(model.tenLoai.toUpperCase(), { bold: true, align: 'center', size: TITLE_SIZE, after: 60 }));
  if (model.trichYeu) {
    children.push(p(model.trichYeu, { bold: true, align: 'center', after: 160 }));
  }
  if (model.thamQuyen) {
    children.push(p(model.thamQuyen.toUpperCase(), { bold: true, align: 'center', after: 160 }));
  }

  // Căn cứ
  for (const c of model.canCu ?? []) {
    children.push(p(c, { italic: true, indentFirstLine: true, after: 80 }));
  }
  if ((model.canCu ?? []).length > 0) {
    children.push(p('QUYẾT ĐỊNH:', { bold: true, align: 'center', before: 120, after: 160 }));
  }

  // Thông tin chung (biểu mẫu danh sách) — 2 cột
  for (const pair of layoutThongTinPairs(model.thongTinChung ?? [])) {
    children.push(
      twoColumnRow(
        [
          new Paragraph({
            spacing: { after: 40, line: 312 },
            children: [run(`${pair[0].label}: `, { bold: true }), run(pair[0].value)],
          }),
        ],
        pair[1]
          ? [
              new Paragraph({
                spacing: { after: 40, line: 312 },
                children: [run(`${pair[1].label}: `, { bold: true }), run(pair[1].value)],
              }),
            ]
          : [p('')],
        50,
      ),
    );
  }
  if ((model.thongTinChung ?? []).length > 0) children.push(p('', { after: 120 }));

  // Nội dung
  for (const khoi of model.noiDung) {
    if (khoi.kind === 'bang') {
      children.push(...buildBang(khoi));
    } else {
      children.push(
        p(khoi.text, {
          bold: khoi.bold,
          italic: khoi.italic,
          align: khoi.align,
          indentFirstLine: khoi.indent,
          after: 120,
        }),
      );
    }
  }

  children.push(p('', { after: 200 }));
  children.push(buildChuKyBlock(model));

  return children;
}

export async function downloadVanBanDocx(
  model: VanBanHanhChinhModel,
  fileName: string,
): Promise<void> {
  const doc = new Document({
    sections: [
      {
        properties: { page: { size: { width: 11906, height: 16838 }, margin: PAGE_MARGIN } },
        children: buildVanBanDocxChildren(model),
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
