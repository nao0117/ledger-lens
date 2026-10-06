import type { ParsedAnnual } from '../parser/index.ts';
import { buildHoldingRows } from './holdingRows.ts';
import { groupBySecurity, type SecurityRow } from './securities.ts';
import { indexValues } from './totals.ts';

export type TreeNode = {
  name: string;
  /** 子がある場合は子の合計 */
  value: number;
  /** 銘柄（葉）だけ: 銘柄ID */
  id?: string;
  /** 銘柄（葉）だけ: 資産クラス */
  assetClass?: string;
  children?: TreeNode[];
};

export type Tree = {
  /** 証券会社（現金も 1 つの「証券会社」として含む）→ 口座区分 → 銘柄 */
  nodes: TreeNode[];
  /** ツリーに載せた値の合計 */
  shownTotal: number;
  /** ツリーから除いた銘柄の値の合計（0 以下）。総資産 = shownTotal + excludedTotal */
  excludedTotal: number;
};

/**
 * ツリーマップは面積で表すので負の値は描けない。信用の損益のように値が 0 以下の銘柄は
 * ツリーから除き（評価額ではなく損益で、面積に意味がないため）、除いた合計を excludedTotal で返す。
 * 正の損益は評価額と同じく加算されるので載せる。
 */
export function buildTree(data: Pick<ParsedAnnual, 'holdings' | 'snapshots'>, baseDate: string): Tree {
  const values = indexValues(data).get(baseDate);
  const brokers = new Map<string, Map<string, TreeNode[]>>();
  let shownTotal = 0;
  let excludedTotal = 0;
  for (const h of data.holdings) {
    const v = values?.get(h.id) ?? 0;
    if (v <= 0) {
      excludedTotal += v;
      continue;
    }
    shownTotal += v;
    const accounts = brokers.get(h.broker) ?? new Map<string, TreeNode[]>();
    brokers.set(h.broker, accounts);
    const leaves = accounts.get(h.account) ?? [];
    accounts.set(h.account, leaves);
    leaves.push({ name: h.name, value: v, id: h.id, assetClass: h.assetClass });
  }
  const sum = (ns: TreeNode[]) => ns.reduce((a, n) => a + n.value, 0);
  const bySize = (a: TreeNode, b: TreeNode) => b.value - a.value || a.name.localeCompare(b.name);
  const nodes = [...brokers].map(([broker, accounts]) => {
    const children = [...accounts].map(([account, leaves]): TreeNode => ({
      name: account,
      value: sum(leaves),
      children: leaves.sort(bySize),
    }));
    children.sort(bySize);
    return { name: broker, value: sum(children), children } satisfies TreeNode;
  });
  nodes.sort(bySize);
  return { nodes, shownTotal, excludedTotal };
}

export type SecurityLeaf = {
  /** 名寄せキー */
  id: string;
  name: string;
  assetClass: string;
  /** 評価額の合計（信用は含まない） */
  value: number;
  /** 総資産に対する比率（SecurityRow.ratio） */
  ratio: number;
  /** 評価額のある口座の数 */
  accountCount: number;
};

export type SecurityGroup = {
  /** 資産クラス */
  name: string;
  value: number;
  ratio: number;
  children: SecurityLeaf[];
};

export type SecurityTree = {
  /** 資産クラス → 銘柄（口座をまたいでまとめたもの） */
  nodes: SecurityGroup[];
  shownTotal: number;
  /** 図に含めない信用の損益の合計（なければ 0） */
  excludedMargin: number;
  /** 名寄せキー → 銘柄の行（詳細表示用） */
  securities: Map<string, SecurityRow>;
};

/**
 * 銘柄別のツリー（資産クラス → 銘柄）。面積は評価額の合計で、信用の損益は含めない
 * （信用だけの銘柄と、評価額が 0 以下の銘柄は図から除く）。
 */
export function buildSecurityTree(
  data: Pick<ParsedAnnual, 'holdings' | 'snapshots' | 'dates'>,
  baseDate: string,
): SecurityTree {
  const rows = groupBySecurity(buildHoldingRows(data, baseDate));
  const securities = new Map(rows.map((r) => [r.key, r]));
  const groups = new Map<string, SecurityLeaf[]>();
  let excludedMargin = 0;
  for (const r of rows) {
    excludedMargin += r.marginValue ?? 0;
    if (r.marginOnly || !(r.value > 0)) continue;
    const leaves = groups.get(r.assetClass) ?? [];
    groups.set(r.assetClass, leaves);
    leaves.push({
      id: r.key,
      name: r.name,
      assetClass: r.assetClass,
      value: r.value,
      ratio: r.ratio,
      accountCount: r.members.length,
    });
  }
  const sum = (xs: number[]) => xs.reduce((a, x) => a + x, 0);
  const bySize = (a: { value: number; name: string }, b: { value: number; name: string }) =>
    b.value - a.value || a.name.localeCompare(b.name, 'ja');
  const nodes = [...groups].map(([name, leaves]): SecurityGroup => {
    leaves.sort(bySize);
    return { name, value: sum(leaves.map((l) => l.value)), ratio: sum(leaves.map((l) => l.ratio)), children: leaves };
  });
  nodes.sort(bySize);
  return { nodes, shownTotal: sum(nodes.map((n) => n.value)), excludedMargin, securities };
}
