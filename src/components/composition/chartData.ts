import type { TreeNode } from '../../domain/index.ts';

/** ツリーマップ 1 セル分のデータ。表示用の付加情報を持つ。 */
export type CellNode = {
  name: string;
  value: number;
  /** 証券会社 > 口座区分 > 銘柄 のパス */
  path: string[];
  /** 全体に占める割合（0〜1） */
  ratio: number;
  /** 証券会社ごとの色番号（0 始まり） */
  colorIndex: number;
  /** 口座区分ごとの濃淡（0〜2）。同じ証券会社内で隣り合う口座を見分ける補助 */
  shade: number;
  children?: CellNode[];
};

export const SHADE_COUNT = 3;

/** 割合を `12.3%` 形式にする。合計が 0 以下のときは `-`。 */
export function ratioText(value: number, total: number): string {
  if (!(total > 0)) return '-';
  const pct = (value / total) * 100;
  return `${pct.toFixed(pct > 0 && pct < 0.1 ? 2 : 1)}%`;
}

/** buildTree の結果に、パス・割合・色番号を付ける。 */
export function toCellNodes(nodes: TreeNode[], total: number): CellNode[] {
  return nodes.map((broker, bi) => ({
    name: broker.name,
    value: broker.value,
    path: [broker.name],
    ratio: total > 0 ? broker.value / total : 0,
    colorIndex: bi,
    shade: 0,
    children: (broker.children ?? []).map((account, ai) => ({
      name: account.name,
      value: account.value,
      path: [broker.name, account.name],
      ratio: total > 0 ? account.value / total : 0,
      colorIndex: bi,
      shade: ai % SHADE_COUNT,
      children: (account.children ?? []).map((leaf) => ({
        name: leaf.name,
        value: leaf.value,
        path: [broker.name, account.name, leaf.name],
        ratio: total > 0 ? leaf.value / total : 0,
        colorIndex: bi,
        shade: ai % SHADE_COUNT,
      })),
    })),
  }));
}

export type CellLabel = { name: string; showRatio: boolean };

const FONT_SIZE = 12;
const PAD = 4;

/**
 * セルの大きさに収まるラベルを返す。収まらないときは null（ラベルなし。名前は説明欄と表で確認できる）。
 * 日本語は全角 1 文字 = フォントサイズ分の幅として見積もり、長い名前は末尾を … で省略する。
 */
export function fitLabel(width: number, height: number, name: string, fontSize = FONT_SIZE): CellLabel | null {
  if (height < fontSize + PAD * 2) return null;
  const maxChars = Math.floor((width - PAD * 2) / fontSize);
  if (maxChars < 2) return null;
  const chars = Array.from(name);
  const shown = chars.length <= maxChars ? name : `${chars.slice(0, maxChars - 1).join('')}…`;
  const showRatio = height >= fontSize * 2 + PAD * 3 && maxChars >= 4;
  return { name: shown, showRatio };
}
