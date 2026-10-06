import type { Change, TreeNode } from '../../domain/index.ts';
import type { SecurityGroup } from '../../domain/tree.ts';
import { CASH_BROKER, UNCLASSIFIED } from '../../parser/index.ts';

/** ツリーマップ 1 セル分のデータ。表示用の付加情報を持つ。 */
export type CellNode = {
  name: string;
  value: number;
  /** 証券会社 > 口座区分 > 銘柄 のパス */
  path: string[];
  /** 全体に占める割合（0〜1） */
  ratio: number;
  /** 銘柄（葉）だけ: 銘柄ID */
  id?: string;
  /** 銘柄（葉）だけ: 資産クラス */
  assetClass?: string;
  children?: CellNode[];
};

/** 割合を `12.3%` 形式にする。合計が 0 以下のときは `-`。 */
export function ratioText(value: number, total: number): string {
  if (!(total > 0)) return '-';
  const pct = (value / total) * 100;
  return `${pct.toFixed(pct > 0 && pct < 0.1 ? 2 : 1)}%`;
}

/** buildTree の結果に、パスと割合を付ける。 */
export function toCellNodes(nodes: TreeNode[], total: number, parent: string[] = []): CellNode[] {
  return nodes.map((n) => {
    const path = [...parent, n.name];
    const cell: CellNode = { name: n.name, value: n.value, path, ratio: total > 0 ? n.value / total : 0 };
    if (n.id !== undefined) cell.id = n.id;
    if (n.assetClass !== undefined) cell.assetClass = n.assetClass;
    if (n.children) cell.children = toCellNodes(n.children, total, path);
    return cell;
  });
}

/** 銘柄別ツリー（資産クラス → 銘柄）を CellNode にする。割合は総資産比（SecurityRow.ratio）。 */
export function toSecurityCellNodes(groups: SecurityGroup[]): CellNode[] {
  return groups.map((g) => ({
    name: g.name,
    value: g.value,
    path: [g.name],
    ratio: g.ratio,
    assetClass: g.name,
    children: g.children.map((l): CellNode => ({
      name: l.name,
      value: l.value,
      path: [g.name, l.name],
      ratio: l.ratio,
      id: l.id,
      assetClass: l.assetClass,
    })),
  }));
}

/** セルを一意に表すキー。銘柄は銘柄ID、それ以外はパス。 */
export function cellKey(cell: CellNode): string {
  return cell.id ?? cell.path.join('\u0000');
}

/** 銘柄マスタに載っていない（未分類の）銘柄か。現金は対象外。 */
export function isUnclassified(cell: CellNode): boolean {
  return cell.assetClass === UNCLASSIFIED && cell.path[0] !== CASH_BROKER;
}

/** 凡例に出す資産クラス。図に出てくるものだけを、評価額の合計が大きい順に。 */
export function legendClasses(nodes: CellNode[]): string[] {
  const sums = new Map<string, number>();
  const walk = (ns: CellNode[]) => {
    for (const n of ns) {
      if (n.children && n.children.length > 0) walk(n.children);
      else if (n.assetClass !== undefined) sums.set(n.assetClass, (sums.get(n.assetClass) ?? 0) + n.value);
    }
  };
  walk(nodes);
  return [...sums].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ja')).map(([k]) => k);
}

export type ChangeView = {
  kind: 'none' | 'up' | 'down' | 'flat';
  /** ▲ / ▼ / ±（前回なしは空） */
  symbol: string;
  /** 符号付きの % （例: `+4.6%`）。出せないときは null */
  percent: string | null;
};

/** 前回比の表示種別・記号・%。金額は呼び出し側で Money / useMoney を通して出す。 */
export function changeView(change: Change | null): ChangeView {
  if (!change) return { kind: 'none', symbol: '', percent: null };
  const kind = change.amount > 0 ? 'up' : change.amount < 0 ? 'down' : 'flat';
  const symbol = kind === 'up' ? '▲' : kind === 'down' ? '▼' : '±';
  if (change.percent === null) return { kind, symbol, percent: null };
  const s = Math.abs(change.percent).toFixed(1);
  const sign = Number(s) === 0 ? '' : change.percent < 0 ? '-' : '+';
  return { kind, symbol, percent: `${sign}${s}%` };
}

/** `2026-09-30` → `2026年9月30日`。形式が違えばそのまま返す。 */
export function dateJa(date: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date);
  if (!m) return date;
  return `${m[1]}年${Number(m[2])}月${Number(m[3])}日`;
}

export type CellLabel = { name: string; showRatio: boolean };

const FONT_SIZE = 12;
const PAD = 4;

/** 幅に収まるよう名前の末尾を … で省略する（全角 1 文字 = フォントサイズ分の幅で見積もる）。2 文字も入らなければ null。 */
export function truncateToWidth(name: string, width: number, fontSize = FONT_SIZE): string | null {
  const maxChars = Math.floor(width / fontSize);
  if (maxChars < 2) return null;
  const chars = Array.from(name);
  return chars.length <= maxChars ? name : `${chars.slice(0, maxChars - 1).join('')}…`;
}

/**
 * セルの大きさに収まるラベルを返す。収まらないときは null（ラベルなし。名前は詳細欄と表で確認できる）。
 * 日本語は全角 1 文字 = フォントサイズ分の幅として見積もり、長い名前は末尾を … で省略する。
 */
export function fitLabel(width: number, height: number, name: string, fontSize = FONT_SIZE): CellLabel | null {
  if (height < fontSize + PAD * 2) return null;
  const shown = truncateToWidth(name, width - PAD * 2, fontSize);
  if (shown === null) return null;
  const maxChars = Math.floor((width - PAD * 2) / fontSize);
  const showRatio = height >= fontSize * 2 + PAD * 3 && maxChars >= 4;
  return { name: shown, showRatio };
}
